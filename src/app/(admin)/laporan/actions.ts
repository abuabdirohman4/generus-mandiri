'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'
import {
  calculateAttendanceStats,
  type AttendanceLog,
  type Meeting
} from '@/lib/utils/attendanceCalculation'

/**
 * Helper function to get week start date
 */
function getWeekStartDate(year: number, month: number, weekNumber: number): string {
  const firstDay = new Date(year, month - 1, 1)
  const firstWeekDays = 7 - firstDay.getDay() + 1 // Days in first week

  if (weekNumber === 1) {
    return firstDay.toISOString().split('T')[0]
  }

  const startDay = firstWeekDays + (weekNumber - 2) * 7
  const startDate = new Date(year, month - 1, startDay)
  return startDate.toISOString().split('T')[0]
}

/**
 * Helper function to get week end date
 */
function getWeekEndDate(year: number, month: number, weekNumber: number): string {
  const firstDay = new Date(year, month - 1, 1)
  const firstWeekDays = 7 - firstDay.getDay() + 1 // Days in first week

  if (weekNumber === 1) {
    const endDay = firstWeekDays
    const endDate = new Date(year, month - 1, endDay)
    return endDate.toISOString().split('T')[0]
  }

  const startDay = firstWeekDays + (weekNumber - 2) * 7
  const endDay = Math.min(startDay + 6, new Date(year, month, 0).getDate())
  const endDate = new Date(year, month - 1, endDay)
  return endDate.toISOString().split('T')[0]
}

/**
 * Helper function to get week number in month
 */
function getWeekNumberInMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstWeekDays = 7 - firstDay.getDay() + 1 // Days in first week
  const dayOfMonth = date.getDate()

  if (dayOfMonth <= firstWeekDays) {
    return 1
  }

  const remainingDays = dayOfMonth - firstWeekDays
  return Math.ceil(remainingDays / 7) + 1
}

export interface ReportFilters {
  // General mode filters
  month?: number
  year?: number
  viewMode?: 'general' | 'detailed'

  // Detailed mode filters - Period-specific
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  classId?: string
  kelompokId?: string
  gender?: string
  meetingType?: string

  // Daily filters
  startDate?: string
  endDate?: string

  // Weekly filters
  weekYear?: number
  weekMonth?: number
  startWeekNumber?: number
  endWeekNumber?: number

  // Monthly filters
  monthYear?: number
  startMonth?: number
  endMonth?: number

  // Yearly filters
  startYear?: number
  endYear?: number
}

export interface ReportData {
  summary: {
    total: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
  }
  chartData: Array<{ name: string; value: number }>
  trendChartData: Array<{
    date: string
    fullDate: string
    attendancePercentage: number
    presentCount: number
    absentCount: number
    excusedCount: number
    sickCount: number
    totalRecords: number
    meetingsCount: number
  }>
  detailedRecords: Array<{
    student_id: string
    student_name: string
    student_gender: string
    class_name: string
    all_classes?: Array<{ id: string; name: string }> // All classes for multi-class support
    kelompok_name?: string | null
    desa_name?: string | null
    daerah_name?: string | null
    total_days: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    attendance_rate: number
  }>
  meetings?: Array<{
    id: string
    title: string
    date: string
    student_snapshot: string[]
    class_id: string
    class_ids?: string[]
  }>
  period: string
  dateRange: {
    start: string | null
    end: string | null
  }
}

/**
 * Mendapatkan data laporan kehadiran berdasarkan filter
 */
export async function getAttendanceReport(filters: ReportFilters): Promise<ReportData> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile with teacher classes and organizational IDs
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        daerah_id,
        desa_id,
        kelompok_id,
        teacher_classes!teacher_classes_teacher_id_fkey(
          class_id,
          classes:class_id(id, name, kelompok_id)
        )
      `)
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Get teacher class IDs if user is a teacher
    const teacherClassIds = profile.role === 'teacher' && profile.teacher_classes
      ? profile.teacher_classes.map((tc: any) => tc.classes?.id || tc.class_id).filter(Boolean)
      : []

    // Build date range based on filter mode
    let dateFilter: {
      date?: {
        eq?: string
        gte?: string
        lte?: string
      }
    } = {}
    const now = new Date()


    if (filters.viewMode === 'general' && filters.month && filters.year) {
      // General mode: use month and year
      const startDate = new Date(filters.year, filters.month - 1, 1)
      const endDate = new Date(filters.year, filters.month, 0) // Last day of the month

      dateFilter = {
        date: {
          gte: startDate.toISOString().split('T')[0],
          lte: endDate.toISOString().split('T')[0]
        }
      }
    } else {
      // Detailed mode: period-specific filtering
      switch (filters.period) {
        case 'daily':
          if (filters.startDate && filters.endDate) {
            dateFilter = {
              date: {
                gte: filters.startDate,
                lte: filters.endDate
              }
            }
          } else {
            const today = now.toISOString().split('T')[0]
            dateFilter = { date: { eq: today } }
          }
          break

        case 'weekly':
          if (filters.weekYear && filters.weekMonth && filters.startWeekNumber && filters.endWeekNumber) {
            const startDate = getWeekStartDate(filters.weekYear, filters.weekMonth, filters.startWeekNumber)
            const endDate = getWeekEndDate(filters.weekYear, filters.weekMonth, filters.endWeekNumber)
            dateFilter = {
              date: {
                gte: startDate,
                lte: endDate
              }
            }
          } else {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            dateFilter = {
              date: {
                gte: weekAgo.toISOString().split('T')[0],
                lte: now.toISOString().split('T')[0]
              }
            }
          }
          break

        case 'monthly':
          if (filters.monthYear && filters.startMonth && filters.endMonth) {
            const startDate = new Date(filters.monthYear, filters.startMonth - 1, 1)
            const endDate = new Date(filters.monthYear, filters.endMonth, 0) // Last day of end month
            dateFilter = {
              date: {
                gte: startDate.toISOString().split('T')[0],
                lte: endDate.toISOString().split('T')[0]
              }
            }
          } else {
            // Default to current month if monthly filters not set
            const currentMonth = now.getMonth() + 1
            const currentYear = now.getFullYear()
            const startDate = new Date(currentYear, currentMonth - 1, 1)
            const endDate = new Date(currentYear, currentMonth, 0) // Last day of current month
            dateFilter = {
              date: {
                gte: startDate.toISOString().split('T')[0],
                lte: endDate.toISOString().split('T')[0]
              }
            }
          }
          break

        case 'yearly':
          if (filters.startYear && filters.endYear) {
            const startDate = new Date(filters.startYear, 0, 1)
            const endDate = new Date(filters.endYear, 11, 31)
            dateFilter = {
              date: {
                gte: startDate.toISOString().split('T')[0],
                lte: endDate.toISOString().split('T')[0]
              }
            }
          } else {
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            dateFilter = {
              date: {
                gte: yearAgo.toISOString().split('T')[0],
                lte: now.toISOString().split('T')[0]
              }
            }
          }
          break
      }
    }


    // Use admin client to bypass RLS restrictions for teachers with multiple kelompok
    const adminClient = await createAdminClient()

    // Parse meeting type filter
    const meetingTypeFilter = filters.meetingType
      ? filters.meetingType.split(',').filter(Boolean)
      : null

    // Fetch meetings first to determine date range and meeting IDs
    let meetingsForFilterQuery = adminClient
      .from('meetings')
      .select('id, date, class_id, class_ids')
      .gte('date', dateFilter.date?.gte || '1900-01-01')
      .lte('date', dateFilter.date?.lte || '2100-12-31')

    // Apply meeting type filter
    if (meetingTypeFilter && meetingTypeFilter.length > 0) {
      meetingsForFilterQuery = meetingsForFilterQuery.in('meeting_type_code', meetingTypeFilter)
    }

    const { data: meetingsForFilter } = await meetingsForFilterQuery.order('date')

    // Build hierarchical maps for filtering (CRITICAL: must be built BEFORE filtering)
    // Collect all class IDs from meetings
    const allClassIdsFromMeetings = new Set<string>()
    ;(meetingsForFilter || []).forEach((meeting: any) => {
      if (meeting.class_id) allClassIdsFromMeetings.add(meeting.class_id)
      if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
        meeting.class_ids.forEach((id: string) => allClassIdsFromMeetings.add(id))
      }
    })

    // Fetch class details to build maps
    const { data: classesForMapping } = await adminClient
      .from('classes')
      .select(`
        id,
        kelompok_id,
        kelompok:kelompok_id (
          id,
          desa_id,
          desa:desa_id (
            id,
            daerah_id
          )
        )
      `)
      .in('id', Array.from(allClassIdsFromMeetings))

    // Build maps: class_id -> kelompok_id, desa_id, daerah_id
    const classKelompokMap = new Map<string, string>()
    const classToDesaMap = new Map<string, string>()
    const classToDaerahMap = new Map<string, string>()

    if (classesForMapping) {
      classesForMapping.forEach((cls: any) => {
        if (cls.kelompok_id) {
          classKelompokMap.set(cls.id, cls.kelompok_id)
        }

        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok
        if (kelompok?.desa_id) {
          classToDesaMap.set(cls.id, kelompok.desa_id)

          const desa = Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa
          if (desa?.daerah_id) {
            classToDaerahMap.set(cls.id, desa.daerah_id)
          }
        }
      })
    }

    // Filter meetings based on user role and scope
    let meetingIdsForAttendance: string[] = []

    if (profile.role === 'teacher') {
      const teacherMeetingsForRange = (meetingsForFilter || []).filter((meeting: any) => {
        // Get all class IDs for this meeting
        const meetingClassIds = meeting.class_ids || [meeting.class_id]

        // Check if teacher has access via assigned classes
        if (teacherClassIds.length > 0 && meetingClassIds.some((id: string) => teacherClassIds.includes(id))) {
          return true
        }

        // Check if teacher has hierarchical access (Guru Desa/Daerah)
        if (profile.kelompok_id) {
          // Teacher Kelompok: only their assigned classes (already checked above)
          return false
        } else if (profile.desa_id) {
          // Teacher Desa: all classes in their desa
          return meetingClassIds.some((classId: string) => classToDesaMap.get(classId) === profile.desa_id)
        } else if (profile.daerah_id) {
          // Teacher Daerah: all classes in their daerah
          return meetingClassIds.some((classId: string) => classToDaerahMap.get(classId) === profile.daerah_id)
        }

        return false
      })

      meetingIdsForAttendance = teacherMeetingsForRange.map((m: any) => m.id)

    } else if (profile.role === 'admin') {
      let filteredMeetings = meetingsForFilter || []

      if (profile.kelompok_id) {
        // Admin Kelompok: filter by kelompok_id
        filteredMeetings = filteredMeetings.filter((meeting: any) => {
          const meetingClassIds = meeting.class_ids || [meeting.class_id]
          return meetingClassIds.some((classId: string) => classKelompokMap.get(classId) === profile.kelompok_id)
        })
      } else if (profile.desa_id) {
        // Admin Desa: filter by desa_id
        filteredMeetings = filteredMeetings.filter((meeting: any) => {
          const meetingClassIds = meeting.class_ids || [meeting.class_id]
          return meetingClassIds.some((classId: string) => classToDesaMap.get(classId) === profile.desa_id)
        })
      } else if (profile.daerah_id) {
        // Admin Daerah: filter by daerah_id
        filteredMeetings = filteredMeetings.filter((meeting: any) => {
          const meetingClassIds = meeting.class_ids || [meeting.class_id]
          return meetingClassIds.some((classId: string) => classToDaerahMap.get(classId) === profile.daerah_id)
        })
      }
      // else: Superadmin sees all meetings (no filtering)

      meetingIdsForAttendance = filteredMeetings.map((m: any) => m.id)
    } else {
      // For other roles (student, etc.), use all meetings
      meetingIdsForAttendance = (meetingsForFilter || []).map((m: any) => m.id)
    }

    // Fetch attendance logs in batches to avoid query limits
    // This ensures all attendance data is retrieved regardless of dataset size
    const { data: attendanceLogsData, error: attendanceError } = await fetchAttendanceLogsInBatches(
      adminClient,
      meetingIdsForAttendance
    )

    if (attendanceError) {
      throw attendanceError
    }

    // Create meeting map to get date for each log
    const meetingMap = new Map<string, any>()
    if (meetingsForFilter) {
      meetingsForFilter.forEach(meeting => {
        meetingMap.set(meeting.id, meeting)
      })
    }

    // Enrich attendance logs with student data
    // Get unique student IDs from attendance logs
    const studentIds = [...new Set((attendanceLogsData || []).map((log: any) => log.student_id))]

    // Fetch student details with classes info and organizational hierarchy
    const { data: studentsData, error: studentsError } = await adminClient
      .from('students')
      .select(`
        id,
        name,
        gender,
        class_id,
        kelompok_id,
        desa_id,
        daerah_id,
        classes(
          id,
          name
        ),
        student_classes (
          class_id,
          classes:class_id (
            id,
            name,
            kelompok_id,
            kelompok:kelompok_id (
              id,
              name
            )
          )
        ),
        kelompok:kelompok_id (
          id,
          name
        ),
        desa:desa_id (
          id,
          name
        ),
        daerah:daerah_id (
          id,
          name
        )
      `)
      .in('id', studentIds)

    if (studentsError) {
      throw studentsError
    }

    // Create student map for quick lookup
    const studentMap = new Map<string, any>()
    if (studentsData) {
      studentsData.forEach(student => {
        studentMap.set(student.id, student)
      })
    }

    // Enrich attendance logs with student data and date from meetings
    const attendanceLogs = (attendanceLogsData || []).map((log: any) => {
      const meeting = meetingMap.get(log.meeting_id)
      return {
        id: log.meeting_id + '-' + log.student_id, // Generate unique ID
        student_id: log.student_id,
        meeting_id: log.meeting_id,
        date: meeting?.date || null,
        status: log.status,
        reason: null, // Not included in batch fetch
        students: studentMap.get(log.student_id)
      }
    }).filter((log: any) => log.students && log.date) // Filter out logs with missing student or date

    // Use admin client to bypass RLS
    let meetingsQuery = adminClient
      .from('meetings')
      .select(`
        id,
        title,
        date,
        student_snapshot,
        class_id,
        class_ids,
        classes:class_id(
          id,
          kelompok_id
        )
      `)
      .gte('date', dateFilter.date?.gte || '1900-01-01')
      .lte('date', dateFilter.date?.lte || '2100-12-31')

    // Apply meeting type filter
    if (meetingTypeFilter && meetingTypeFilter.length > 0) {
      meetingsQuery = meetingsQuery.in('meeting_type_code', meetingTypeFilter)
    }

    const { data: meetings } = await meetingsQuery.order('date')

    // Enrich maps from meetings with full details (to ensure all classes in date range are included)
    if (meetings) {
      meetings.forEach((meeting: any) => {
        if (meeting.class_id && meeting.classes?.kelompok_id) {
          classKelompokMap.set(meeting.class_id, meeting.classes.kelompok_id)
        }
      })
    }

    // Then enrich from student_classes (for any additional classes)
    if (studentsData) {
      studentsData.forEach(student => {
        student.student_classes?.forEach((sc: any) => {
          if (sc.classes?.id && sc.classes?.kelompok_id) {
            classKelompokMap.set(sc.classes.id, sc.classes.kelompok_id)
          }
        })
      })
    }

    // CRITICAL: Build strict enrollment mapping (class+kelompok → enrolled students)
    // Query student_classes junction table DIRECTLY like Dashboard
    // This ensures we get ALL enrollments, not just students with attendance logs

    // Get all unique class IDs from meetings
    const allClassIdsSet = new Set<string>()
    if (meetings) {
      meetings.forEach((meeting: any) => {
        if (meeting.class_id) allClassIdsSet.add(meeting.class_id)
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
          meeting.class_ids.forEach((id: string) => allClassIdsSet.add(id))
        }
      })
    }
    const allClassIds = Array.from(allClassIdsSet)

    // Query student_classes junction table directly (same as Dashboard)
    // CRITICAL: Use LEFT JOIN (not INNER) to include students without kelompok_id
    const { data: studentClassesData } = await adminClient
      .from('student_classes')
      .select('class_id, student_id, students(id, kelompok_id)')
      .in('class_id', allClassIds)

    // Build enrollment mapping from junction table data
    const classStudentsByKelompok = new Map<string, Map<string, Set<string>>>()

    if (studentClassesData) {
      studentClassesData.forEach((sc: any) => {
        const classId = sc.class_id
        const studentId = sc.student_id
        // CRITICAL: Handle null kelompok_id by using 'null' string as key
        const kelompokId = sc.students?.kelompok_id || 'null'

        if (classId && studentId) {
          // Initialize maps if needed
          if (!classStudentsByKelompok.has(classId)) {
            classStudentsByKelompok.set(classId, new Map())
          }
          const kelompokMap = classStudentsByKelompok.get(classId)!
          if (!kelompokMap.has(kelompokId)) {
            kelompokMap.set(kelompokId, new Set())
          }
          // Add student to this class+kelompok combination
          kelompokMap.get(kelompokId)!.add(studentId)
        }
      })
    }

    // For teacher, filter meetings by their classes first
    // Use meetingsForFilter if available, otherwise use full meetings
    const meetingsToFilterForTeacher = meetingsForFilter || meetings || []
    let teacherMeetings = meetingsToFilterForTeacher || []
    if (profile.role === 'teacher' && teacherClassIds.length > 0) {
      teacherMeetings = meetingsToFilterForTeacher.filter((meeting: any) => {
        // Check class_ids array first (for multi-class meetings)
        if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 0) {
          return meeting.class_ids.some((id: string) => teacherClassIds.includes(id))
        }
        // Check class_id
        return meeting.class_id && teacherClassIds.includes(meeting.class_id)
      }) || []

      if (teacherMeetings.length > 0) {
        // Get full meeting details for teacher meetings
        const teacherMeetingIds = teacherMeetings.map((m: any) => m.id)
        teacherMeetings = (meetings || []).filter((m: any) => teacherMeetingIds.includes(m.id))
      }
    }

    // Filter attendance_logs to only include logs from teacher's meetings (if teacher)
    let filteredLogs = attendanceLogs || []

    if (profile.role === 'teacher') {
      if (teacherMeetings.length > 0) {
        const teacherMeetingIds = new Set(teacherMeetings.map((m: any) => m.id))
        filteredLogs = filteredLogs.filter((log: any) =>
          teacherMeetingIds.has(log.meeting_id)
        )
      } else {
        // If teacher but no meetings match, set filteredLogs to empty array
        filteredLogs = []
      }
    }

    // Apply class filter - check MEETING's class, not student's class
    // CRITICAL: Also validate strict enrollment (student must be enrolled in this class)
    if (filters.classId) {
      const classIds = filters.classId.split(',')
      filteredLogs = filteredLogs.filter((log: any) => {
        const student = log.students
        const meeting = meetingMap.get(log.meeting_id)
        if (!meeting || !student) return false

        // Step 1: Check if meeting is for the selected class
        let meetingClassId: string | null = null

        // Check primary class_id
        if (classIds.includes(meeting.class_id)) {
          meetingClassId = meeting.class_id
        }

        // Check class_ids array for multi-class meetings
        if (!meetingClassId && meeting.class_ids && Array.isArray(meeting.class_ids)) {
          for (const id of meeting.class_ids) {
            if (classIds.includes(id)) {
              meetingClassId = id
              break
            }
          }
        }

        // If meeting is not for selected class, exclude
        if (!meetingClassId) return false

        // Step 2: STRICT enrollment check
        // Only count attendance if student is enrolled in this specific class
        const kelompokMapForClass = classStudentsByKelompok.get(meetingClassId)
        if (!kelompokMapForClass) return false

        // Check if student is enrolled in this class (in any kelompok)
        for (const [kelompokId, enrolledStudents] of kelompokMapForClass.entries()) {
          if (enrolledStudents.has(student.id)) {
            return true // Student is enrolled in this class
          }
        }

        return false // Student not enrolled in this class
      })
    }

    // Apply kelompok filter - validate meetings belong to selected kelompok
    // Note: We only check meeting location, not student enrollment kelompok
    // This allows students from any kelompok to be counted if they attended meetings in the selected kelompok
    if (filters.kelompokId) {
      // ('[FILTER DEBUG] Before kelompok filter:', filteredLogs.length, 'kelompokIds:', filters.kelompokId)
      const kelompokIds = filters.kelompokId.split(',')

      filteredLogs = filteredLogs.filter((log: any) => {
        const student = log.students
        const meeting = meetingMap.get(log.meeting_id)
        if (!student || !meeting) return false

        // Validation 1: Check if meeting belongs to selected kelompok
        // For multi-class meetings, check if ANY class in the meeting belongs to selected kelompok
        let meetingBelongsToKelompok = false
        let meetingClassId: string | null = null

        // Check primary class_id
        const primaryClassKelompok = classKelompokMap.get(meeting.class_id)
        if (primaryClassKelompok && kelompokIds.includes(primaryClassKelompok)) {
          meetingBelongsToKelompok = true
          meetingClassId = meeting.class_id
        }

        // Also check class_ids array for multi-class meetings
        if (!meetingBelongsToKelompok && meeting.class_ids && Array.isArray(meeting.class_ids)) {
          for (const classId of meeting.class_ids) {
            const kelompok = classKelompokMap.get(classId)
            if (kelompok && kelompokIds.includes(kelompok)) {
              meetingBelongsToKelompok = true
              meetingClassId = classId
              break
            }
          }
        }

        // If meeting belongs to selected kelompok, include ALL its attendance
        // Don't check student enrollment kelompok - students can be enrolled in different kelompok
        // but still attend meetings in the filtered kelompok
        return meetingBelongsToKelompok
      })
    }

    // Apply gender filter client-side
    if (filters.gender) {
      filteredLogs = filteredLogs.filter((log: any) =>
        log.students.gender === filters.gender
      )
    }

    // Process data for summary using shared utility function
    // This ensures consistency with Dashboard calculations
    const summary = calculateAttendanceStats(filteredLogs as AttendanceLog[])

    // Prepare chart data
    const chartData = [
      { name: 'Hadir', value: summary.hadir },
      { name: 'Izin', value: summary.izin },
      { name: 'Sakit', value: summary.sakit },
      { name: 'Alpha', value: summary.alpha },
    ].filter(item => item.value > 0) // Only include non-zero values

    // Apply class filter to meetings if specified - support multiple classes per meeting
    // Check both class_id and class_ids array
    // For teacher, use teacherMeetings (already filtered by teacher classes)
    // For admin, use all meetings
    const meetingsToFilter = profile.role === 'teacher' && teacherMeetings.length > 0
      ? teacherMeetings
      : meetings || []

    const filteredMeetings = filters.classId
      ? meetingsToFilter.filter((meeting: any) => {
        const classIds = filters.classId!.split(',')
        // Check primary class_id
        if (classIds.includes(meeting.class_id)) {
          // NEW: If kelompok filter active, validate class belongs to kelompok
          if (filters.kelompokId) {
            const kelompokIds = filters.kelompokId.split(',')
            const meetingClassKelompok = classKelompokMap.get(meeting.class_id)
            if (!meetingClassKelompok || !kelompokIds.includes(meetingClassKelompok)) {
              return false
            }
          }
          return true
        }
        // Check class_ids array for multi-class meetings
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
          return meeting.class_ids.some((id: string) => {
            if (!classIds.includes(id)) return false

            // NEW: Validate kelompok for multi-class meetings
            if (filters.kelompokId) {
              const kelompokIds = filters.kelompokId.split(',')
              const classKelompok = classKelompokMap.get(id)
              if (!classKelompok || !kelompokIds.includes(classKelompok)) {
                return false
              }
            }
            return true
          })
        }
        return false
      })
      : meetingsToFilter

    // First, group meetings by period to count unique meetings per period
    const meetingsByPeriod = filteredMeetings.reduce((acc: any, meeting: any) => {
      const meetingDate = new Date(meeting.date)

      // Group by period type
      let groupKey: string

      // For general mode, always show daily data
      if (filters.viewMode === 'general') {
        groupKey = meeting.date
      } else {
        // For detailed mode, use period-specific grouping
        switch (filters.period) {
          case 'daily':
            groupKey = meeting.date
            break
          case 'weekly':
            // Group by week number in month
            const weekNumber = getWeekNumberInMonth(meetingDate)
            groupKey = `week-${weekNumber}`
            break
          case 'monthly':
            // Group by month for detailed mode with monthly period
            groupKey = `${meetingDate.getFullYear()}-${meetingDate.getMonth() + 1}`
            break
          case 'yearly':
            // Group by year
            groupKey = meetingDate.getFullYear().toString()
            break
          default:
            groupKey = meeting.date
        }
      }

      if (!acc[groupKey]) {
        acc[groupKey] = []
      }
      acc[groupKey].push(meeting)

      return acc
    }, {})

    // Then process attendance data and count meetings per period
    const dailyData = filteredMeetings.reduce((acc: any, meeting: any) => {
      const meetingDate = new Date(meeting.date)
      const meetingLogs = filteredLogs.filter((log: any) => log.meeting_id === meeting.id) || []

      // Calculate total students that are visible (based on filters)
      // Count unique student IDs from meetingLogs, or use snapshot length if no logs
      const visibleStudentIds = new Set(meetingLogs.map((log: any) => log.student_id))
      const totalStudents = visibleStudentIds.size > 0
        ? visibleStudentIds.size
        : meeting.student_snapshot?.length || 0

      // Group by period type
      let groupKey: string
      let displayDate: string

      // For general mode, always show daily data
      if (filters.viewMode === 'general') {
        groupKey = meeting.date
        displayDate = meetingDate.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short'
        })
      } else {
        // For detailed mode, use period-specific grouping
        switch (filters.period) {
          case 'daily':
            groupKey = meeting.date
            displayDate = meetingDate.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short'
            })
            break
          case 'weekly':
            // Group by week number in month
            const weekNumber = getWeekNumberInMonth(meetingDate)
            groupKey = `week-${weekNumber}`
            displayDate = `Minggu ${weekNumber}`
            break
          case 'monthly':
            // Group by month for detailed mode with monthly period
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
            groupKey = `${meetingDate.getFullYear()}-${meetingDate.getMonth() + 1}`
            displayDate = monthNames[meetingDate.getMonth()]
            break
          case 'yearly':
            // Group by year
            groupKey = meetingDate.getFullYear().toString()
            displayDate = meetingDate.getFullYear().toString()
            break
          default:
            groupKey = meeting.date
            displayDate = meetingDate.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short'
            })
        }
      }

      if (!acc[groupKey]) {
        acc[groupKey] = {
          date: groupKey,
          displayDate,
          presentCount: 0,
          absentCount: 0,
          excusedCount: 0,
          sickCount: 0,
          totalRecords: 0,
          meetingsCount: meetingsByPeriod[groupKey]?.length || 0
        }
      }

      acc[groupKey].presentCount += meetingLogs.filter(log => log.status === 'H').length
      acc[groupKey].absentCount += meetingLogs.filter(log => log.status === 'A').length
      acc[groupKey].excusedCount += meetingLogs.filter(log => log.status === 'I').length
      acc[groupKey].sickCount += meetingLogs.filter(log => log.status === 'S').length
      acc[groupKey].totalRecords += totalStudents

      return acc
    }, {})

    // Convert to array and format for chart

    const trendChartData = Object.values(dailyData)
      .sort((a: any, b: any) => {
        // Sort by period-specific criteria
        switch (filters.period) {
          case 'daily':
            return new Date(a.date).getTime() - new Date(b.date).getTime()
          case 'weekly':
            return parseInt(a.date.split('-')[1]) - parseInt(b.date.split('-')[1])
          case 'monthly':
            return new Date(a.date).getTime() - new Date(b.date).getTime()
          case 'yearly':
            return parseInt(a.date) - parseInt(b.date)
          default:
            return new Date(a.date).getTime() - new Date(b.date).getTime()
        }
      })
      .map((day: any) => {
        const attendancePercentage = day.totalRecords > 0
          ? Math.round((day.presentCount / day.totalRecords) * 100)
          : 0

        return {
          date: day.displayDate,
          fullDate: day.displayDate, // Use displayDate for both
          attendancePercentage,
          presentCount: day.presentCount,
          absentCount: day.absentCount,
          excusedCount: day.excusedCount,
          sickCount: day.sickCount,
          totalRecords: day.totalRecords,
          meetingsCount: day.meetingsCount
        }
      })


    // Fetch all kelompok data for formatting class names
    const { data: kelompokData } = await adminClient
      .from('kelompok')
      .select('id, name')

    const kelompokMap = new Map<string, string>()
    if (kelompokData) {
      kelompokData.forEach((k: any) => {
        kelompokMap.set(k.id, k.name)
      })
    }

    // Group by student for detailed view
    const studentSummary = filteredLogs.reduce((acc: any, log: any) => {
      const studentId = log.student_id

      // Get all classes from junction table (support multiple classes with kelompok info)
      const studentClasses = log.students?.student_classes || []
      const allClasses = studentClasses
        .map((sc: any) => sc.classes)
        .filter(Boolean)
        .map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          kelompok_id: cls.kelompok_id,
          kelompok_name: cls.kelompok?.name || kelompokMap.get(cls.kelompok_id) || null
        }))

      // If no classes from junction, use primary class
      if (allClasses.length === 0) {
        if (log.students.classes) {
          const primaryClass = log.students.classes
          allClasses.push({
            id: primaryClass.id,
            name: primaryClass.name,
            kelompok_id: null,
            kelompok_name: null
          })
        } else if (log.students.class_id) {
          // Fallback: if classes relation is null but class_id exists, try to get from kelompokMap
          // Note: This is a fallback - ideally student_classes should have the data
          allClasses.push({
            id: log.students.class_id,
            name: 'Unknown Class', // Will be updated if we can fetch it
            kelompok_id: null,
            kelompok_name: null
          })
        }
      }

      // Get primary class (first class) for backward compatibility
      const primaryClass = allClasses[0] || null

      if (!acc[studentId]) {
        // Format class names: if duplicate names, add kelompok name
        const nameCounts = allClasses.reduce((counts: Record<string, number>, cls: any) => {
          counts[cls.name] = (counts[cls.name] || 0) + 1
          return counts
        }, {})

        const formattedClassNames = allClasses.map((cls: any) => {
          const hasDuplicate = nameCounts[cls.name] > 1
          if (hasDuplicate && cls.kelompok_name) {
            return `${cls.name} (${cls.kelompok_name})`
          }
          return cls.name
        })

        acc[studentId] = {
          student_id: studentId,
          student_name: log.students?.name || 'Unknown Student',
          student_gender: log.students?.gender || null,
          class_name: formattedClassNames.length > 0
            ? formattedClassNames.join(', ') // Join all class names with kelompok info
            : primaryClass?.name || 'Unknown Class', // Fallback to primary class
          all_classes: allClasses.map((cls: any) => ({
            id: cls.id,
            name: cls.name
          })),
          // Add organizational fields for Guru Desa/Daerah
          kelompok_name: log.students?.kelompok?.name || null,
          desa_name: log.students?.desa?.name || null,
          daerah_name: log.students?.daerah?.name || null,
          total_days: 0,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          attendance_rate: 0
        }
      }

      acc[studentId].total_days++
      acc[studentId][log.status === 'H' ? 'hadir' :
        log.status === 'I' ? 'izin' :
          log.status === 'S' ? 'sakit' : 'alpha']++

      return acc
    }, {})

    // Calculate attendance rate for each student
    Object.values(studentSummary).forEach((student: any) => {
      student.attendance_rate = student.total_days > 0
        ? Math.round((student.hadir / student.total_days) * 100)
        : 0
    })

    const detailedRecords = Object.values(studentSummary).map((student: any) => ({
      student_id: student.student_id,
      student_name: student.student_name,
      student_gender: student.student_gender,
      class_name: student.class_name,
      all_classes: student.all_classes || [], // Include all classes
      // Organizational fields for Guru Desa/Daerah
      kelompok_name: student.kelompok_name || null,
      desa_name: student.desa_name || null,
      daerah_name: student.daerah_name || null,
      total_days: student.total_days,
      hadir: student.hadir,
      izin: student.izin,
      sakit: student.sakit,
      alpha: student.alpha,
      attendance_rate: student.attendance_rate
    }))

    return {
      summary,
      chartData,
      trendChartData,
      detailedRecords,
      period: filters.period,
      dateRange: {
        start: dateFilter.date?.gte || null,
        end: dateFilter.date?.lte || dateFilter.date?.eq || null
      }
    }

  } catch (error) {
    // Log error for debugging (server-side only)
    console.error('[MEMUAT DATA] Error:', {
      message: 'Gagal memuat laporan kehadiran',
      originalError: error,
      timestamp: new Date().toISOString()
    })

    // Re-throw error for SWR to handle
    // SWR will manage retry logic and error display
    throw error
  }
}

/**
 * Mendapatkan daftar kelas untuk filter dropdown
 */
