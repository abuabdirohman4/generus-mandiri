"use server";

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';
import {
  buildFilterConditions,
  getValidClassIds,
  fetchByIds,
  type DashboardFilters
} from './dashboardHelpers';
import {
  filterAttendanceForClass,
  calculateAttendanceRate,
  type AttendanceLog,
  type Meeting
} from '@/lib/utils/attendanceCalculation';
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching';

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

        // CRITICAL FIX: Chunk large studentIds array to avoid HTTP headers overflow
        // PostgREST has 16KB header limit; 478 UUIDs = ~18KB → "HeadersOverflowError"
        // Each UUID ~36 chars, so max ~200 UUIDs per chunk to stay under 16KB limit
        if (hasFilters && studentIds.length > 0) {
          const CHUNK_SIZE = 200; // Safe limit to avoid 16KB HTTP header overflow
          let totalCount = 0;

          for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
            const chunk = studentIds.slice(i, i + CHUNK_SIZE);

            const { count, error } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .in('id', chunk);

            if (error) {
              console.error('[Student count chunk error]', error);
              throw error;
            }

            totalCount += count || 0;
          }

          return totalCount;
        }

        // No filters - count all (with RLS)
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });
        return count || 0;
      })(),

      // Classes count
      (async () => {
        if (hasFilters && classIds.length === 0) return 0;

        // CRITICAL FIX: Chunk large classIds array to avoid URL length limit
        if (hasFilters && classIds.length > 0) {
          const CHUNK_SIZE = 100;
          let totalCount = 0;

          for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
            const chunk = classIds.slice(i, i + CHUNK_SIZE);
            const { count } = await supabase
              .from('classes')
              .select('*', { count: 'exact', head: true })
              .in('id', chunk);
            totalCount += count || 0;
          }

          return totalCount;
        }

        // No filters - count all (with RLS)
        const { count } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true });
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
    let attendanceData: any[] = [];

    if (hasFilters && studentIds.length === 0) {
      // No valid students - empty attendance
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
    } else if (hasFilters && studentIds.length > 0) {
      // CRITICAL FIX: Use chunked queries for large student ID arrays to avoid URL length limit
      // For 500+ students across multiple desa, single .in() query may exceed ~8000 char limit
      const CHUNK_SIZE = 500;

      if (studentIds.length > CHUNK_SIZE) {
        // Batch large student arrays to avoid URL length limit
        for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
          const chunk = studentIds.slice(i, i + CHUNK_SIZE);

          const { data, error } = await supabase
            .from('attendance_logs')
            .select('date, status, student_id, meeting_id')
            .gte('date', monthAgoStr)
            .in('student_id', chunk);

          if (error) {
            console.error('[getDashboard] Attendance batch error:', error);
          }

          if (data) {
            attendanceData.push(...data);
          }
        }
      } else {
        // Small array, single query is fine
        const { data } = await supabase
          .from('attendance_logs')
          .select('date, status, student_id, meeting_id')
          .gte('date', monthAgoStr)
          .in('student_id', studentIds);

        attendanceData = data || [];
      }
    } else {
      // No filters - fetch all attendance
      const { data } = await supabase
        .from('attendance_logs')
        .select('date, status, student_id, meeting_id')
        .gte('date', monthAgoStr);

      attendanceData = data || [];
    }

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
  meeting_ids?: string[]; // Array of meeting IDs for deduplication in aggregation
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

    // CRITICAL FIX: Create ISO date strings directly to avoid timezone conversion issues
    // Using new Date(year, month, day) causes timezone offset problems (Jakarta GMT+7)
    // which shifts dates backward by 1 day when converted to ISO string
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

    // Calculate last day of month (works correctly even with timezone)
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    return {
      startDate: monthStart,
      endDate: monthEnd
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
    const adminClient = await createAdminClient();
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
    const { classIds, studentIds, hasFilters } = filterConditions;

    // Get all classes with organizational info (RLS filtered)
    let classes: any[] = [];

    if (hasFilters && classIds.length === 0) {
      return [];
    } else if (hasFilters && classIds.length > 0) {
      // CRITICAL FIX: Chunk large classIds array to avoid URL length limit
      // When many desa selected (5-6), classIds can be 200-500+ UUIDs
      // Unchunked .in() query exceeds ~8000 char URL limit → returns null
      const CHUNK_SIZE = 100; // Conservative for nested select query

      for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
        const chunk = classIds.slice(i, i + CHUNK_SIZE);

        const { data: chunkClasses, error } = await supabase
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
          `)
          .in('id', chunk);

        if (error) {
          console.error('[getClassMonitoring] Classes chunk error:', error);
          throw error;
        }

        if (chunkClasses && chunkClasses.length > 0) {
          classes.push(...chunkClasses);
        }
      }
    } else {
      // No filters - fetch all (with RLS)
      const { data, error } = await supabase
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

      if (error) {
        console.error('[getClassMonitoring] Classes query error:', error);
        throw error;
      }

      classes = data || [];
    }

    if (!classes || classes.length === 0) {
      return [];
    }

    // Get all class IDs for subsequent queries
    const allClassIds = classes.map(c => c.id);

    // Get all meetings in the date range
    // CRITICAL FIX: Use admin client to avoid RLS timeout on large date ranges
    // RLS policies cause statement timeout when querying month-long ranges
    // We apply organizational filters manually after fetching
    const { data: allMeetings } = await adminClient
      .from('meetings')
      .select('id, class_id, class_ids, date')
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
    // Use Set to prevent duplicate meeting IDs for the same class
    const meetingsByClass = new Map<string, Set<string>>();

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
      // CRITICAL: Use Set to prevent duplicate meeting IDs (e.g., if class appears in both class_id and class_ids)
      involvedClassIds.forEach(classId => {
        if (allClassIds.includes(classId)) {
          if (!meetingsByClass.has(classId)) {
            meetingsByClass.set(classId, new Set());
          }
          meetingsByClass.get(classId)!.add(meeting.id);
        }
      });
    });

    // Get all attendance logs for these meetings
    const allMeetingIds = meetings?.map(m => m.id) || [];
    let attendanceLogs: any[] = [];

    if (allMeetingIds.length > 0) {
      // CRITICAL FIX: Use fetchAttendanceLogsInBatches to handle >1000 logs
      // fetchByIds was limiting results to first 1000 logs, causing data loss
      const { data: logsData, error: logsError } = await fetchAttendanceLogsInBatches(
        supabase,
        allMeetingIds
      );

      if (logsError) {
        console.error('[DASHBOARD] Error fetching attendance logs:', logsError);
        throw logsError;
      }

      attendanceLogs = logsData || [];
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

    // Create meeting map for shared utility function
    const meetingMap = new Map<string, Meeting>();
    meetings.forEach(meeting => {
      meetingMap.set(meeting.id, meeting);
    });
    const enrollmentsByClass = new Map<string, Set<string>>();

    // Fetch all enrollments for all classes in batches
    const ENROLLMENT_CHUNK_SIZE = 100; // Chunk class IDs to avoid URL length limit
    let allEnrollments: any[] = [];

    for (let i = 0; i < allClassIds.length; i += ENROLLMENT_CHUNK_SIZE) {
      const chunk = allClassIds.slice(i, i + ENROLLMENT_CHUNK_SIZE);

      let enrollmentQuery = supabase
        .from('student_classes')
        .select('student_id, class_id')
        .in('class_id', chunk);

      // Apply student filter if active (gender/organizational filters)
      if (hasFilters && studentIds.length > 0) {
        // CRITICAL FIX: Always chunk student IDs to avoid URL length limit
        // Combined URL with chunk (100 class IDs) + studentIds can exceed 8000 chars
        const STUDENT_CHUNK_SIZE = 200; // Conservative for combined query

        for (let j = 0; j < studentIds.length; j += STUDENT_CHUNK_SIZE) {
          const studentChunk = studentIds.slice(j, j + STUDENT_CHUNK_SIZE);
          const { data, error } = await supabase
            .from('student_classes')
            .select('student_id, class_id')
            .in('class_id', chunk)
            .in('student_id', studentChunk);

          if (error) {
            console.error('[getClassMonitoring] Enrollment chunk error:', error);
            throw error;
          }

          if (data) allEnrollments.push(...data);
        }
        continue; // Skip the query below, already done in chunks
      }

      const { data, error } = await enrollmentQuery;

      if (error) {
        console.error('[getClassMonitoring] Enrollment query error:', error);
        throw error;
      }

      if (data) allEnrollments.push(...data);
    }

    // Build class_id -> Set<student_id> map
    allEnrollments.forEach((enrollment: any) => {
      if (!enrollmentsByClass.has(enrollment.class_id)) {
        enrollmentsByClass.set(enrollment.class_id, new Set());
      }
      enrollmentsByClass.get(enrollment.class_id)!.add(enrollment.student_id);
    });

    // Build result array WITHOUT database queries (use pre-fetched enrollments)
    let result: ClassMonitoringData[] = classes.map((cls: any) => {
      const kelompokData = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
      const desaData = kelompokData?.desa ? (Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa) : null;
      const daerahData = desaData?.daerah ? (Array.isArray(desaData.daerah) ? desaData.daerah[0] : desaData.daerah) : null;

      const classMeetingIdsSet = meetingsByClass.get(cls.id) || new Set<string>();
      const classMeetingIds = Array.from(classMeetingIdsSet);

      // Get pre-fetched enrollments for this class
      const enrolledStudents = enrollmentsByClass.get(cls.id) || new Set<string>();
      const studentCount = enrolledStudents.size;

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
          student_count: studentCount,
          meeting_ids: [] // Empty array for classes without meetings
        };
      }

      // Use shared utility to filter attendance logs by meeting class + enrollment
      const filteredLogs = filterAttendanceForClass(
        attendanceLogs as AttendanceLog[],
        meetingMap,
        cls.id,
        enrolledStudents
      );

      // Calculate meeting count: Only count meetings that have attendance logs
      // This prevents misleading UI where meeting_count=2 but only 1 meeting has logs
      const meetingsWithLogs = new Set(filteredLogs.map(log => log.meeting_id));
      const actualMeetingCount = meetingsWithLogs.size;

      // Calculate attendance rate using shared utility
      const attendanceRate = calculateAttendanceRate(filteredLogs);

      return {
        class_id: cls.id,
        class_name: cls.name,
        kelompok_name: kelompokData?.name,
        desa_name: desaData?.name,
        daerah_name: daerahData?.name,
        has_meeting: true,
        meeting_count: actualMeetingCount,
        attendance_rate: attendanceRate,
        student_count: studentCount,
        meeting_ids: Array.from(meetingsWithLogs) // For aggregation deduplication
      };
    });

    // Add secondary sorting: class_name ASC, then kelompok_name ASC
    result.sort((a, b) => {
      const classCompare = a.class_name.localeCompare(b.class_name);
      if (classCompare !== 0) return classCompare;
      return (a.kelompok_name || '').localeCompare(b.kelompok_name || '');
    });

    // If combined mode, group by class name
    // Now that individual calculations are correct, combined mode just aggregates them
    if (filters.classViewMode === 'combined') {
      const combinedMap = new Map<string, {
        classIds: string[];
        kelompokNames: Set<string>;
        desaNames: Set<string>;
        daerahNames: Set<string>;
        meetingIds: Set<string>;
        totalStudents: number;
        hasMeeting: boolean;
        allLogs: AttendanceLog[];
        allEnrolledStudents: Set<string>;
      }>();

      result.forEach(item => {
        if (!combinedMap.has(item.class_name)) {
          combinedMap.set(item.class_name, {
            classIds: [],
            kelompokNames: new Set(),
            desaNames: new Set(),
            daerahNames: new Set(),
            meetingIds: new Set(),
            totalStudents: 0,
            hasMeeting: false,
            allLogs: [],
            allEnrolledStudents: new Set<string>()
          });
        }

        const combined = combinedMap.get(item.class_name)!;
        combined.classIds.push(item.class_id);
        if (item.kelompok_name) combined.kelompokNames.add(item.kelompok_name);
        if (item.desa_name) combined.desaNames.add(item.desa_name);
        if (item.daerah_name) combined.daerahNames.add(item.daerah_name);

        // Aggregate student count from all kelompok
        combined.totalStudents += (item.student_count || 0);

        // Aggregate meetings
        const classMeetingIdsSet = meetingsByClass.get(item.class_id) || new Set<string>();
        classMeetingIdsSet.forEach(id => combined.meetingIds.add(id));

        if (item.has_meeting) combined.hasMeeting = true;
      });

      // For each combined class, re-filter attendance logs with ALL class IDs combined
      result = await Promise.all(
        Array.from(combinedMap.entries()).map(async ([className, data]) => {
          // Get enrollment for ALL class IDs in this combined group
          // OPTIMIZED: Use single .in() query instead of loop with .eq()
          const allEnrolledStudents = new Set<string>();

          const { data: classEnrollments } = await supabase
            .from('student_classes')
            .select('student_id')
            .in('class_id', data.classIds);

          classEnrollments?.forEach((sc: any) => {
            allEnrolledStudents.add(sc.student_id);
          });

          // Filter attendance logs for ALL meetings of this combined class with deduplication
          const processedLogs = new Set<string>();
          const filteredLogs: AttendanceLog[] = [];

          for (const classId of data.classIds) {
            const classLogs = filterAttendanceForClass(
              attendanceLogs as AttendanceLog[],
              meetingMap,
              classId,
              allEnrolledStudents
            );

            // Deduplicate: only add logs we haven't processed yet
            classLogs.forEach(log => {
              const logKey = `${log.meeting_id}-${log.student_id}`;
              if (!processedLogs.has(logKey)) {
                processedLogs.add(logKey);
                filteredLogs.push(log);
              }
            });
          }

          // Calculate meeting count: Only count meetings that have attendance logs
          const meetingsWithLogs = new Set(filteredLogs.map(log => log.meeting_id));
          const actualMeetingCount = meetingsWithLogs.size;

          const attendanceRate = calculateAttendanceRate(filteredLogs);

          return {
            class_id: data.classIds.join(','),
            class_name: className,
            kelompok_name: Array.from(data.kelompokNames).sort().join(', '),
            desa_name: Array.from(data.desaNames).sort().join(', '),
            daerah_name: Array.from(data.daerahNames).sort().join(', '),
            has_meeting: data.hasMeeting,
            meeting_count: actualMeetingCount,
            attendance_rate: attendanceRate,
            student_count: data.totalStudents,
            meeting_ids: Array.from(meetingsWithLogs) // For aggregation deduplication
          };
        })
      );

      // Sort combined results by class name
      result.sort((a, b) => a.class_name.localeCompare(b.class_name));
    }

    // PANGALENGAN 0% NAMBO 100%
    // Filter out classes with no students OR no meetings
    // Classes without meetings should not appear in monitoring table
    result = result.filter(item =>
      (item.student_count ?? 0) > 0 &&
      item.has_meeting === true
    );

    return result;
  } catch (error) {
    console.error('Error fetching class monitoring:', error);
    throw handleApiError(error, 'memuat data', 'Failed to fetch class monitoring');
  }
}
