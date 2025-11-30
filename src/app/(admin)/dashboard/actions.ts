"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';
import {
  buildFilterConditions,
  getValidClassIds,
  fetchByIds,
  type DashboardFilters
} from './dashboardHelpers';

// Re-export for external use
export type { DashboardFilters } from './dashboardHelpers';

export interface TodayMeeting {
  id: string;
  title: string;
  date: string;
  class_id: string;
  class_name: string;
  teacher_name: string;
  meeting_type_code: string | null;
  total_students: number;
  present_count: number;
  attendance_percentage: number;
}

// Legacy interfaces - kept for backward compatibility with unused components
export interface ClassPerformance {
  class_id: string;
  class_name: string;
  attendance_percentage: number;
  total_meetings: number;
}

export interface MeetingTypeDistribution {
  type: string;
  label: string;
  count: number;
}

export interface Dashboard {
  // Core Stats
  siswa: number;
  kelas: number;

  // Meeting Stats
  meetingsToday: number;
  meetingsWeekly: number;
  meetingsMonthly: number;

  // Attendance Stats
  kehadiranHariIni: number;
  kehadiranMingguan: number;
  kehadiranBulanan: number;
}

export async function getDashboard(filters?: DashboardFilters): Promise<Dashboard> {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    const rlsFilter = profile ? getDataFilter(profile) : null;

    // Define date ranges using Jakarta timezone
    const jakartaDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const today = jakartaDate.toISOString().split('T')[0];

    const weekAgo = new Date(jakartaDate);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const monthAgo = new Date(jakartaDate);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    // Build filter conditions once - reuse for all queries
    const filterConditions = await buildFilterConditions(supabase, filters, rlsFilter);
    const { classIds, studentIds, hasFilters } = filterConditions;

    // Parallel fetch: basic counts
    const [siswaCount, kelasCount] = await Promise.all([
      // Students count
      (async () => {
        if (hasFilters && studentIds.length === 0) return 0;

        let query = supabase.from('students').select('*', { count: 'exact', head: true });
        if (hasFilters && studentIds.length > 0) {
          query = query.in('id', studentIds);
        }
        const { count } = await query;
        return count || 0;
      })(),

      // Classes count
      (async () => {
        if (hasFilters && classIds.length === 0) return 0;

        let query = supabase.from('classes').select('*', { count: 'exact', head: true });
        if (hasFilters && classIds.length > 0) {
          query = query.in('id', classIds);
        }
        const { count } = await query;
        return count || 0;
      })()
    ]);

    // Fetch all meetings with joins (apply class filter)
    let meetingsQuery = supabase
      .from('meetings')
      .select(`
        id,
        title,
        date,
        class_id,
        meeting_type_code,
        classes:class_id(
          id,
          name,
          kelompok_id
        ),
        profiles:teacher_id(
          full_name
        )
      `)
      .order('date', { ascending: false });

    if (hasFilters && classIds.length > 0) {
      meetingsQuery = meetingsQuery.in('class_id', classIds);
    } else if (hasFilters && classIds.length === 0) {
      // No valid classes, return early
      return {
        siswa: siswaCount,
        kelas: kelasCount,
        meetingsToday: 0,
        meetingsWeekly: 0,
        meetingsMonthly: 0,
        kehadiranHariIni: 0,
        kehadiranMingguan: 0,
        kehadiranBulanan: 0
      };
    }

    const { data: allMeetingsData } = await meetingsQuery;

    // Count meetings by period
    const meetingsToday = allMeetingsData?.filter(m => m.date === today).length || 0;
    const meetingsWeekly = allMeetingsData?.filter(m => m.date >= weekAgoStr).length || 0;
    const meetingsMonthly = allMeetingsData?.filter(m => m.date >= monthAgoStr).length || 0;

    // Fetch all attendance logs for the month (with student filter if needed)
    let attendanceQuery = supabase
      .from('attendance_logs')
      .select('date, status, student_id, meeting_id')
      .gte('date', monthAgoStr);

    if (hasFilters && studentIds.length > 0) {
      attendanceQuery = attendanceQuery.in('student_id', studentIds);
    } else if (hasFilters && studentIds.length === 0) {
      // No valid students - empty attendance
      const attendanceData: any[] = [];

      return {
        siswa: siswaCount,
        kelas: kelasCount,
        meetingsToday,
        meetingsWeekly,
        meetingsMonthly,
        kehadiranHariIni: 0,
        kehadiranMingguan: 0,
        kehadiranBulanan: 0
      };
    }

    const { data: attendanceData } = await attendanceQuery;

    // Calculate attendance percentages
    const todayAttendance = attendanceData?.filter(a => a.date === today) || [];
    const weekAttendance = attendanceData?.filter(a => a.date >= weekAgoStr) || [];
    const monthAttendance = attendanceData || [];

    const kehadiranHariIni = todayAttendance.length > 0
      ? Math.round((todayAttendance.filter(a => a.status === 'H').length / todayAttendance.length) * 100)
      : 0;

    const kehadiranMingguan = weekAttendance.length > 0
      ? Math.round((weekAttendance.filter(a => a.status === 'H').length / weekAttendance.length) * 100)
      : 0;

    const kehadiranBulanan = monthAttendance.length > 0
      ? Math.round((monthAttendance.filter(a => a.status === 'H').length / monthAttendance.length) * 100)
      : 0;

    return {
      siswa: siswaCount,
      kelas: kelasCount,
      meetingsToday,
      meetingsWeekly,
      meetingsMonthly,
      kehadiranHariIni,
      kehadiranMingguan,
      kehadiranBulanan
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw handleApiError(error, 'memuat data', 'Failed to fetch dashboard statistics');
  }
}

// ============================================================================
// CLASS MONITORING TABLE
// ============================================================================

export interface ClassMonitoringData {
  class_id: string;
  class_name: string;
  kelompok_name?: string;
  desa_name?: string;
  daerah_name?: string;
  has_meeting: boolean;
  meeting_count: number;
  attendance_rate: number;
}

export interface ClassMonitoringFilters extends DashboardFilters {
  period: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}

function getDateRangeForPeriod(period: 'today' | 'week' | 'month' | 'custom', customRange?: { start: string; end: string }) {
  const jakartaDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const today = jakartaDate.toISOString().split('T')[0];

  if (period === 'custom' && customRange) {
    return { startDate: customRange.start, endDate: customRange.end };
  }

  if (period === 'today') {
    return { startDate: today, endDate: today };
  }

  if (period === 'week') {
    const weekAgo = new Date(jakartaDate);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { startDate: weekAgo.toISOString().split('T')[0], endDate: today };
  }

  // Default: month
  const monthAgo = new Date(jakartaDate);
  monthAgo.setDate(monthAgo.getDate() - 30);
  return { startDate: monthAgo.toISOString().split('T')[0], endDate: today };
}

export async function getClassMonitoring(filters: ClassMonitoringFilters): Promise<ClassMonitoringData[]> {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    const rlsFilter = profile ? getDataFilter(profile) : null;

    const { startDate, endDate } = getDateRangeForPeriod(
      filters.period,
      filters.startDate && filters.endDate ? { start: filters.startDate, end: filters.endDate } : undefined
    );

    // Build filter conditions using helper (RLS-aware)
    const filterConditions = await buildFilterConditions(supabase, filters, rlsFilter);
    const { classIds, hasFilters } = filterConditions;

    // Get all classes with organizational info (RLS filtered)
    let classesQuery = supabase
      .from('classes')
      .select(`
        id,
        name,
        kelompok:kelompok_id(
          id,
          name,
          desa:desa_id(
            id,
            name,
            daerah:daerah_id(
              id,
              name
            )
          )
        )
      `);

    if (hasFilters && classIds.length > 0) {
      classesQuery = classesQuery.in('id', classIds);
    } else if (hasFilters && classIds.length === 0) {
      return [];
    }

    const { data: classes } = await classesQuery;

    if (!classes || classes.length === 0) {
      return [];
    }

    // Get all meetings in the date range for these classes
    const allClassIds = classes.map(c => c.id);
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id, class_id')
      .in('class_id', allClassIds)
      .gte('date', startDate)
      .lte('date', endDate);

    // Group meetings by class
    const meetingsByClass = new Map<string, string[]>();
    meetings?.forEach(meeting => {
      const existing = meetingsByClass.get(meeting.class_id) || [];
      existing.push(meeting.id);
      meetingsByClass.set(meeting.class_id, existing);
    });

    // Get all attendance logs for these meetings
    const allMeetingIds = meetings?.map(m => m.id) || [];
    let attendanceLogs: any[] = [];

    if (allMeetingIds.length > 0) {
      // Use fetchByIds for batch fetching (handles >1000 IDs)
      attendanceLogs = await fetchByIds(
        supabase,
        'attendance_logs',
        'meeting_id',
        allMeetingIds,
        'meeting_id, status'
      );
    }

    // Group attendance by meeting
    const attendanceByMeeting = new Map<string, { total: number; present: number }>();
    (attendanceLogs as any[]).forEach(log => {
      const existing = attendanceByMeeting.get(log.meeting_id) || { total: 0, present: 0 };
      existing.total += 1;
      if (log.status === 'H') existing.present += 1;
      attendanceByMeeting.set(log.meeting_id, existing);
    });

    // Build result array
    const result: ClassMonitoringData[] = classes.map((cls: any) => {
      const kelompokData = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
      const desaData = kelompokData?.desa ? (Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa) : null;
      const daerahData = desaData?.daerah ? (Array.isArray(desaData.daerah) ? desaData.daerah[0] : desaData.daerah) : null;

      const classMeetingIds = meetingsByClass.get(cls.id) || [];

      if (classMeetingIds.length === 0) {
        return {
          class_id: cls.id,
          class_name: cls.name,
          kelompok_name: kelompokData?.name,
          desa_name: desaData?.name,
          daerah_name: daerahData?.name,
          has_meeting: false,
          meeting_count: 0,
          attendance_rate: 0
        };
      }

      // Calculate average attendance across all meetings
      let totalAttendance = 0;
      let totalPresent = 0;

      classMeetingIds.forEach(meetingId => {
        const attendance = attendanceByMeeting.get(meetingId);
        if (attendance) {
          totalAttendance += attendance.total;
          totalPresent += attendance.present;
        }
      });

      const attendanceRate = totalAttendance > 0
        ? Math.round((totalPresent / totalAttendance) * 100)
        : 0;

      return {
        class_id: cls.id,
        class_name: cls.name,
        kelompok_name: kelompokData?.name,
        desa_name: desaData?.name,
        daerah_name: daerahData?.name,
        has_meeting: true,
        meeting_count: classMeetingIds.length,
        attendance_rate: attendanceRate
      };
    });

    return result;
  } catch (error) {
    console.error('Error fetching class monitoring:', error);
    throw handleApiError(error, 'memuat data', 'Failed to fetch class monitoring');
  }
}
