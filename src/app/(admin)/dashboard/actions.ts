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
  student_count?: number; // Number of enrolled students (per kelompok in separated mode)
}

export interface ClassMonitoringFilters extends DashboardFilters {
  period: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  classViewMode?: 'separated' | 'combined';
  // Dynamic date selector parameters
  specificDate?: string;      // For 'today' with custom date
  weekOffset?: number;         // For 'week' (0=this week, 1=last week, etc.)
  monthString?: string;        // For 'month' (format: "YYYY-MM")
}

function getDateRangeForPeriod(
  period: 'today' | 'week' | 'month' | 'custom',
  customRange?: { start: string; end: string },
  specificDate?: string,
  weekOffset?: number,
  monthString?: string
) {
  const jakartaDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const today = jakartaDate.toISOString().split('T')[0];

  if (period === 'custom' && customRange) {
    return { startDate: customRange.start, endDate: customRange.end };
  }

  if (period === 'today') {
    // Use specific date if provided, otherwise use today
    const targetDate = specificDate || today;
    return { startDate: targetDate, endDate: targetDate };
  }

  if (period === 'week') {
    // Calculate week range based on offset (0 = this week, 1 = last week, etc.)
    const offset = weekOffset ?? 0;
    const targetDate = new Date(jakartaDate);
    targetDate.setDate(targetDate.getDate() - (offset * 7));

    // Get start of week (assuming week starts on Monday)
    const dayOfWeek = targetDate.getDay();
    const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const weekStart = new Date(targetDate);
    weekStart.setDate(diff);

    // Get end of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0]
    };
  }

  if (period === 'month' && monthString) {
    // Use specific month if provided
    const [year, month] = monthString.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of the month

    return {
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0]
    };
  }

  // Default: current month
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
      filters.startDate && filters.endDate ? { start: filters.startDate, end: filters.endDate } : undefined,
      filters.specificDate,
      filters.weekOffset,
      filters.monthString
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

    // Get all class IDs for subsequent queries
    const allClassIds = classes.map(c => c.id);

    // Query student enrollments per class (via student_classes junction table)
    // This ensures we only count attendance for students actually enrolled
    const { data: studentClasses } = await supabase
      .from('student_classes')
      .select('class_id, student_id, students!inner(kelompok_id)')
      .in('class_id', allClassIds);

    // Build class -> students mapping for strict enrollment checking
    const classStudentsByKelompok = new Map<string, Map<string, Set<string>>>();

    studentClasses?.forEach((sc: any) => {
      const kelompokId = sc.students?.kelompok_id;

      // Students grouped by kelompok within each class
      if (!classStudentsByKelompok.has(sc.class_id)) {
        classStudentsByKelompok.set(sc.class_id, new Map());
      }
      const kelompokMap = classStudentsByKelompok.get(sc.class_id)!;
      if (!kelompokMap.has(kelompokId)) {
        kelompokMap.set(kelompokId, new Set());
      }
      kelompokMap.get(kelompokId)!.add(sc.student_id);
    });

    // Get all meetings in the date range
    // Fetch ALL meetings first, then filter to include those involving our classes
    // This handles both primary class_id AND classes in class_ids array
    const { data: allMeetings } = await supabase
      .from('meetings')
      .select('id, class_id, class_ids')
      .gte('date', startDate)
      .lte('date', endDate);

    // Filter to only meetings involving our classes (either as primary class or in class_ids array)
    const meetings = allMeetings?.filter(meeting => {
      // Check primary class_id
      if (allClassIds.includes(meeting.class_id)) return true;

      // Check class_ids array for multi-class meetings
      if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
        return meeting.class_ids.some(id => allClassIds.includes(id));
      }

      return false;
    }) || [];

    // Group meetings by class (support multi-class meetings)
    // A meeting counts for ALL classes involved (both primary class_id and classes in class_ids array)
    const meetingsByClass = new Map<string, string[]>();

    meetings.forEach(meeting => {
      // Collect all classes involved in this meeting
      const involvedClassIds = new Set<string>();

      // Add primary class
      if (meeting.class_id) {
        involvedClassIds.add(meeting.class_id);
      }

      // Add all classes from class_ids array (multi-class meetings)
      if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
        meeting.class_ids.forEach((id: string) => involvedClassIds.add(id));
      }

      // Count this meeting for ALL involved classes that are in our filter
      involvedClassIds.forEach(classId => {
        if (allClassIds.includes(classId)) {
          const existing = meetingsByClass.get(classId) || [];
          existing.push(meeting.id);
          meetingsByClass.set(classId, existing);
        }
      });
    });

    // Get all attendance logs for these meetings
    const allMeetingIds = meetings?.map(m => m.id) || [];
    let attendanceLogs: any[] = [];

    if (allMeetingIds.length > 0) {
      // Use fetchByIds for batch fetching (handles >1000 IDs)
      // Fetch student_id to enable per-kelompok filtering
      attendanceLogs = await fetchByIds(
        supabase,
        'attendance_logs',
        'meeting_id',
        allMeetingIds,
        'meeting_id, student_id, status'
      );
    }

    // Fetch student data to map student_id -> kelompok_id
    const uniqueStudentIds = [...new Set(attendanceLogs.map(log => log.student_id).filter(Boolean))];
    let studentsData: any[] = [];
    const studentKelompokMap = new Map<string, string>();

    if (uniqueStudentIds.length > 0) {
      studentsData = await fetchByIds(
        supabase,
        'students',
        'id',
        uniqueStudentIds,
        'id, kelompok_id'
      );

      // Build student_id -> kelompok_id mapping
      studentsData.forEach(s => {
        if (s.id && s.kelompok_id) {
          studentKelompokMap.set(s.id, s.kelompok_id);
        }
      });
    }

    // Group attendance by meeting with full log details
    const attendanceByMeeting = new Map<string, {
      total: number;
      present: number;
      logs: Array<{ student_id: string; status: string }>;
    }>();

    (attendanceLogs as any[]).forEach(log => {
      const existing = attendanceByMeeting.get(log.meeting_id) || {
        total: 0,
        present: 0,
        logs: []
      };
      existing.total += 1;
      if (log.status === 'H') existing.present += 1;
      existing.logs.push({ student_id: log.student_id, status: log.status });
      attendanceByMeeting.set(log.meeting_id, existing);
    });

    // Build result array
    let result: ClassMonitoringData[] = classes.map((cls: any) => {
      const kelompokData = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
      const desaData = kelompokData?.desa ? (Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa) : null;
      const daerahData = desaData?.daerah ? (Array.isArray(desaData.daerah) ? desaData.daerah[0] : desaData.daerah) : null;

      const classMeetingIds = meetingsByClass.get(cls.id) || [];

      // Get enrolled students for this class+kelompok for strict checking
      const kelompokId = kelompokData?.id;
      const enrolledStudents = classStudentsByKelompok.get(cls.id)?.get(kelompokId);
      const studentCount = enrolledStudents?.size || 0;

      if (classMeetingIds.length === 0) {
        return {
          class_id: cls.id,
          class_name: cls.name,
          kelompok_name: kelompokData?.name,
          desa_name: desaData?.name,
          daerah_name: daerahData?.name,
          has_meeting: false,
          meeting_count: 0,
          attendance_rate: 0,
          student_count: studentCount
        };
      }

      // Calculate attendance with STRICT enrollment check
      let totalAttendance = 0;
      let totalPresent = 0;

      // Only calculate if there are enrolled students
      if (studentCount > 0 && enrolledStudents) {
        classMeetingIds.forEach(meetingId => {
          const attendance = attendanceByMeeting.get(meetingId);
          if (attendance && attendance.logs) {
            attendance.logs.forEach(log => {
              // CRITICAL FIX: Only count if student is ENROLLED in THIS class+kelompok
              // This prevents cross-kelompok contamination and multi-class meeting leaks
              if (enrolledStudents.has(log.student_id)) {
                totalAttendance++;
                if (log.status === 'H') totalPresent++;
              }
            });
          }
        });
      }

      const attendanceRate = studentCount > 0 && totalAttendance > 0
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
        attendance_rate: attendanceRate,
        student_count: studentCount
      };
    });

    // Add secondary sorting: class_name ASC, then kelompok_name ASC
    result.sort((a, b) => {
      const classCompare = a.class_name.localeCompare(b.class_name);
      if (classCompare !== 0) return classCompare;
      return (a.kelompok_name || '').localeCompare(b.kelompok_name || '');
    });

    // If combined mode, group by class name
    if (filters.classViewMode === 'combined') {
      const combinedMap = new Map<string, {
        classIds: string[];
        kelompokNames: Set<string>;
        desaNames: Set<string>;
        daerahNames: Set<string>;
        meetingIds: Set<string>;
        totalAttendance: number;
        totalPresent: number;
        totalStudents: number;
        hasMeeting: boolean;
      }>();

      result.forEach(item => {
        if (!combinedMap.has(item.class_name)) {
          combinedMap.set(item.class_name, {
            classIds: [],
            kelompokNames: new Set(),
            desaNames: new Set(),
            daerahNames: new Set(),
            meetingIds: new Set(),
            totalAttendance: 0,
            totalPresent: 0,
            totalStudents: 0,
            hasMeeting: false
          });
        }

        const combined = combinedMap.get(item.class_name)!;
        combined.classIds.push(item.class_id);
        if (item.kelompok_name) combined.kelompokNames.add(item.kelompok_name);
        if (item.desa_name) combined.desaNames.add(item.desa_name);
        if (item.daerah_name) combined.daerahNames.add(item.daerah_name);

        // Aggregate student count from all kelompok
        combined.totalStudents += (item.student_count || 0);

        // For meetings, we need to aggregate from the original data
        const classMeetingIds = meetingsByClass.get(item.class_id) || [];
        classMeetingIds.forEach(id => combined.meetingIds.add(id));

        if (item.has_meeting) combined.hasMeeting = true;

        // Aggregate attendance with STRICT enrollment check (combined from all kelompok)
        const kelompokData = classes.find((c: any) => c.id === item.class_id)?.kelompok;
        const kelompokDataResolved = Array.isArray(kelompokData) ? kelompokData[0] : kelompokData;
        const kelompokId = kelompokDataResolved?.id;
        const enrolledStudents = classStudentsByKelompok.get(item.class_id)?.get(kelompokId);

        if (enrolledStudents) {
          classMeetingIds.forEach(meetingId => {
            const attendance = attendanceByMeeting.get(meetingId);
            if (attendance && attendance.logs) {
              attendance.logs.forEach(log => {
                // CRITICAL FIX: Only count if student is enrolled in THIS class+kelompok
                if (enrolledStudents.has(log.student_id)) {
                  combined.totalAttendance++;
                  if (log.status === 'H') combined.totalPresent++;
                }
              });
            }
          });
        }
      });

      // Convert to array
      result = Array.from(combinedMap.entries()).map(([className, data]) => ({
        class_id: data.classIds.join(','),
        class_name: className,
        kelompok_name: Array.from(data.kelompokNames).sort().join(', '),
        desa_name: Array.from(data.desaNames).sort().join(', '),
        daerah_name: Array.from(data.daerahNames).sort().join(', '),
        has_meeting: data.hasMeeting,
        meeting_count: data.meetingIds.size,
        attendance_rate: data.totalStudents > 0 && data.totalAttendance > 0
          ? Math.round((data.totalPresent / data.totalAttendance) * 100)
          : 0,
        student_count: data.totalStudents
      }));

      // Sort combined results by class name
      result.sort((a, b) => a.class_name.localeCompare(b.class_name));
    }

    // Filter out classes with no students
    result = result.filter(item => (item.student_count ?? 0) > 0);

    return result;
  } catch (error) {
    console.error('Error fetching class monitoring:', error);
    throw handleApiError(error, 'memuat data', 'Failed to fetch class monitoring');
  }
}
