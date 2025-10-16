"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';

export interface Dashboard {
  daerah: number;
  desa: number;
  kelompok: number;
  admin: number;
  guru: number;
  siswa: number;
  kelas: number;
  kehadiranHariIni: number;
  studentDistribution: Array<{ name: string; value: number }>;
  userDistribution: Array<{ name: string; value: number }>;
  attendanceTrend: Array<{ date: string; attendance: number }>;
}

export async function getDashboard(): Promise<Dashboard> {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    const filter = profile ? getDataFilter(profile) : null;

    // Get basic counts with filtering
    let daerahQuery = supabase.from('daerah').select('*', { count: 'exact', head: true });
    let desaQuery = supabase.from('desa').select('*', { count: 'exact', head: true });
    let kelompokQuery = supabase.from('kelompok').select('*', { count: 'exact', head: true });
    let adminQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
    let guruQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
    let siswaQuery = supabase.from('students').select('*', { count: 'exact', head: true });
    let kelasQuery = supabase.from('classes').select('*', { count: 'exact', head: true });

    // Apply filtering
    if (filter?.daerah_id) {
      daerahQuery = daerahQuery.eq('id', filter.daerah_id);
      desaQuery = desaQuery.eq('daerah_id', filter.daerah_id);
      adminQuery = adminQuery.eq('daerah_id', filter.daerah_id);
      guruQuery = guruQuery.eq('daerah_id', filter.daerah_id);
      siswaQuery = siswaQuery.eq('daerah_id', filter.daerah_id);
      
      // Get desa IDs for kelompok and classes filtering
      const { data: desaIds } = await supabase.from('desa').select('id').eq('daerah_id', filter.daerah_id);
      const desaIdList = desaIds?.map(d => d.id) || [];
      if (desaIdList.length > 0) {
        kelompokQuery = kelompokQuery.in('desa_id', desaIdList);
        
        // Get kelompok IDs for classes filtering
        const { data: kelompokIds } = await supabase.from('kelompok').select('id').in('desa_id', desaIdList);
        const kelompokIdList = kelompokIds?.map(k => k.id) || [];
        if (kelompokIdList.length > 0) {
          kelasQuery = kelasQuery.in('kelompok_id', kelompokIdList);
        }
      }
    } else if (filter?.desa_id) {
      desaQuery = desaQuery.eq('id', filter.desa_id);
      kelompokQuery = kelompokQuery.eq('desa_id', filter.desa_id);
      adminQuery = adminQuery.eq('desa_id', filter.desa_id);
      guruQuery = guruQuery.eq('desa_id', filter.desa_id);
      siswaQuery = siswaQuery.eq('desa_id', filter.desa_id);
      
      // Get kelompok IDs for classes filtering
      const { data: kelompokIds } = await supabase.from('kelompok').select('id').eq('desa_id', filter.desa_id);
      const kelompokIdList = kelompokIds?.map(k => k.id) || [];
      if (kelompokIdList.length > 0) {
        kelasQuery = kelasQuery.in('kelompok_id', kelompokIdList);
      }
    } else if (filter?.kelompok_id) {
      kelompokQuery = kelompokQuery.eq('id', filter.kelompok_id);
      adminQuery = adminQuery.eq('kelompok_id', filter.kelompok_id);
      guruQuery = guruQuery.eq('kelompok_id', filter.kelompok_id);
      siswaQuery = siswaQuery.eq('kelompok_id', filter.kelompok_id);
      kelasQuery = kelasQuery.eq('kelompok_id', filter.kelompok_id);
    }

    const [
      { count: daerah },
      { count: desa },
      { count: kelompok },
      { count: admin },
      { count: guru },
      { count: siswa },
      { count: kelas }
    ] = await Promise.all([
      daerahQuery,
      desaQuery,
      kelompokQuery,
      adminQuery,
      guruQuery,
      siswaQuery,
      kelasQuery
    ]);

    // Get student distribution per daerah
    let studentQuery = supabase
      .from('students')
      .select(`
        daerah_id,
        daerah:daerah_id(name)
      `);
    
    if (filter?.daerah_id) {
      studentQuery = studentQuery.eq('daerah_id', filter.daerah_id);
    } else if (filter?.desa_id) {
      studentQuery = studentQuery.eq('desa_id', filter.desa_id);
    } else if (filter?.kelompok_id) {
      studentQuery = studentQuery.eq('kelompok_id', filter.kelompok_id);
    }
    
    const { data: studentDistributionData } = await studentQuery;

    const studentDistribution = studentDistributionData?.reduce((acc: any[], item) => {
      const daerahName = item.daerah?.[0]?.name || 'Unknown';
      const existing = acc.find(existingItem => existingItem.name === daerahName);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: daerahName, value: 1 });
      }
      return acc;
    }, []) || [];

    // Get user distribution per daerah
    let userQuery = supabase
      .from('profiles')
      .select(`
        daerah_id,
        role,
        daerah:daerah_id(name)
      `)
      .in('role', ['admin', 'teacher']);
    
    if (filter?.daerah_id) {
      userQuery = userQuery.eq('daerah_id', filter.daerah_id);
    } else if (filter?.desa_id) {
      userQuery = userQuery.eq('desa_id', filter.desa_id);
    } else if (filter?.kelompok_id) {
      userQuery = userQuery.eq('kelompok_id', filter.kelompok_id);
    }
    
    const { data: userDistributionData } = await userQuery;

    const userDistribution = userDistributionData?.reduce((acc: any[], item) => {
      const daerahName = item.daerah?.[0]?.name || 'Unknown';
      const existing = acc.find(existingItem => existingItem.name === daerahName);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: daerahName, value: 1 });
      }
      return acc;
    }, []) || [];

    // Get attendance trend for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let attendanceQuery = supabase
      .from('attendance_logs')
      .select('date, status')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);
    
    // Apply filtering to attendance logs if needed
    if (filter?.kelompok_id) {
      // Filter by students in the kelompok
      const { data: studentIds } = await supabase.from('students').select('id').eq('kelompok_id', filter.kelompok_id);
      const studentIdList = studentIds?.map(s => s.id) || [];
      if (studentIdList.length > 0) {
        attendanceQuery = attendanceQuery.in('student_id', studentIdList);
      }
    } else if (filter?.desa_id) {
      // Filter by students in the desa
      const { data: studentIds } = await supabase.from('students').select('id').eq('desa_id', filter.desa_id);
      const studentIdList = studentIds?.map(s => s.id) || [];
      if (studentIdList.length > 0) {
        attendanceQuery = attendanceQuery.in('student_id', studentIdList);
      }
    } else if (filter?.daerah_id) {
      // Filter by students in the daerah
      const { data: studentIds } = await supabase.from('students').select('id').eq('daerah_id', filter.daerah_id);
      const studentIdList = studentIds?.map(s => s.id) || [];
      if (studentIdList.length > 0) {
        attendanceQuery = attendanceQuery.in('student_id', studentIdList);
      }
    }
    
    const { data: attendanceData } = await attendanceQuery;

    // Calculate daily attendance percentage
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAttendance = attendanceData?.filter(item => item.date === dateStr) || [];
      const totalRecords = dayAttendance.length;
      const presentRecords = dayAttendance.filter(item => item.status === 'H').length;
      const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
      
      attendanceTrend.push({
        date: dateStr,
        attendance: attendancePercentage
      });
    }

    // Calculate today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendanceData?.filter(item => item.date === today) || [];
    const todayTotal = todayAttendance.length;
    const todayPresent = todayAttendance.filter(item => item.status === 'H').length;
    const kehadiranHariIni = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

    return {
      daerah: daerah || 0,
      desa: desa || 0,
      kelompok: kelompok || 0,
      admin: admin || 0,
      guru: guru || 0,
      siswa: siswa || 0,
      kelas: kelas || 0,
      kehadiranHariIni,
      studentDistribution,
      userDistribution,
      attendanceTrend
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw handleApiError(error, 'memuat data', 'Failed to fetch dashboard statistics');
  }
}
