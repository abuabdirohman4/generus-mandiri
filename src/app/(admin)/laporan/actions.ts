'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'

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

    // Get user profile with teacher classes
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        teacher_classes!teacher_classes_teacher_id_fkey(
          class_id,
          classes:class_id(id, name)
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

    // DEBUG Step 1: Teacher Classes
    // if (profile.role === 'teacher') {
    //   console.log('[LAPORAN DEBUG] Teacher Classes:', {
    //     teacherClassIds,
    //     classCount: teacherClassIds.length,
    //     teacher_classes: profile.teacher_classes?.map((tc: any) => ({
    //       id: tc.classes?.id || tc.class_id,
    //       name: tc.classes?.name,
    //       kelompok_id: tc.classes?.kelompok_id
    //     }))
    //   })
    // }

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

    // For teachers, filter meetings to get relevant meeting IDs
    let meetingIdsForAttendance: string[] = []

    if (profile.role === 'teacher' && teacherClassIds.length > 0 && meetingsForFilter) {
      const teacherMeetingsForRange = meetingsForFilter.filter((meeting: any) => {
        if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 0) {
          return meeting.class_ids.some((id: string) => teacherClassIds.includes(id))
        }
        return meeting.class_id && teacherClassIds.includes(meeting.class_id)
      })

      meetingIdsForAttendance = teacherMeetingsForRange.map((m: any) => m.id)
    } else {
      // For admin, use all meetings in date range
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

    // Fetch student details with classes info
    const { data: studentsData, error: studentsError } = await adminClient
      .from('students')
      .select(`
        id,
        name,
        gender,
        class_id,
        kelompok_id,
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

    // DEBUG Step 2: Meetings Fetched
    // console.log('[LAPORAN DEBUG] Meetings Fetched:', {
    //   totalMeetings: meetings?.length || 0,
    //   filters: { classId: filters.classId, kelompokId: filters.kelompokId },
    //   sampleMeetings: meetings?.slice(0, 3).map((m: any) => ({
    //     id: m.id,
    //     title: m.title,
    //     class_id: m.class_id,
    //     class_ids: m.class_ids,
    //     kelompok_id: m.classes?.kelompok_id
    //   }))
    // })

    // Build class-to-kelompok mapping for validation
    // CRITICAL: Build from meetings first (to ensure all classes in date range are included)
    const classKelompokMap = new Map<string, string>()
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

    // DEBUG Step 3: ClassKelompokMap
    // console.log('[LAPORAN DEBUG] ClassKelompokMap:', {
    //   size: classKelompokMap.size,
    //   entries: Array.from(classKelompokMap.entries()),
    //   hasWarlob2Class: filters.classId ? classKelompokMap.has(filters.classId.split(',')[0]) : false
    // })

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

    // DEBUG Step 4: Teacher Meetings Filter
    // if (profile.role === 'teacher' && teacherClassIds.length > 0) {
    //   console.log('[LAPORAN DEBUG] Teacher Meetings Filter:', {
    //     beforeFilter: meetingsToFilterForTeacher.length,
    //     afterFilter: teacherMeetings.length,
    //     teacherClassIds,
    //     sampleFilteredMeetings: teacherMeetings.slice(0, 3).map((m: any) => ({
    //       id: m.id,
    //       class_id: m.class_id,
    //       class_ids: m.class_ids
    //     }))
    //   })
    // }

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

    // DEBUG Step 5: Attendance Logs Teacher Filter
    // if (profile.role === 'teacher') {
    //   console.log('[LAPORAN DEBUG] Attendance Logs Teacher Filter:', {
    //     beforeFilter: attendanceLogs?.length || 0,
    //     afterFilter: filteredLogs.length,
    //     teacherMeetingIds: teacherMeetings.length,
    //     hasMeetings: teacherMeetings.length > 0
    //   })
    // }

    // Apply class filter - check MEETING's class, not student's class
    // This ensures we only show attendance from meetings for the selected class
    if (filters.classId) {
      const classIds = filters.classId.split(',')
      filteredLogs = filteredLogs.filter((log: any) => {
        const meeting = meetingMap.get(log.meeting_id)
        if (!meeting) return false

        // Check if meeting is for the selected class
        // Check primary class_id
        if (classIds.includes(meeting.class_id)) return true

        // Check class_ids array for multi-class meetings
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
          return meeting.class_ids.some((id: string) => classIds.includes(id))
        }

        return false
      })

      // DEBUG Step 6: Class Filter
      // console.log('[LAPORAN DEBUG] Class Filter:', {
      //   classIds: classIds,
      //   afterFilter: filteredLogs.length,
      //   sampleLogs: filteredLogs.slice(0, 3).map((l: any) => ({
      //     meeting_id: l.meeting_id,
      //     student_id: l.student_id,
      //     meeting_class: meetingMap.get(l.meeting_id)?.class_id
      //   }))
      // })
    }

    // Apply kelompok filter - validate students AND meetings belong to selected kelompok
    if (filters.kelompokId) {
      const kelompokIds = filters.kelompokId.split(',')

      filteredLogs = filteredLogs.filter((log: any) => {
        const student = log.students
        const meeting = meetingMap.get(log.meeting_id)
        if (!student || !meeting) return false

        // Validation 1: Check if meeting belongs to selected kelompok
        // For multi-class meetings, check if ANY class in the meeting belongs to selected kelompok
        let meetingBelongsToKelompok = false

        // Check primary class_id
        const primaryClassKelompok = classKelompokMap.get(meeting.class_id)
        if (primaryClassKelompok && kelompokIds.includes(primaryClassKelompok)) {
          meetingBelongsToKelompok = true
        }

        // Also check class_ids array for multi-class meetings
        if (!meetingBelongsToKelompok && meeting.class_ids && Array.isArray(meeting.class_ids)) {
          meetingBelongsToKelompok = meeting.class_ids.some((classId: string) => {
            const kelompok = classKelompokMap.get(classId)
            return kelompok && kelompokIds.includes(kelompok)
          })
        }

        // If meeting doesn't belong to selected kelompok at all, exclude it
        if (!meetingBelongsToKelompok) {
          return false
        }

        // Validation 2: Check if student belongs to selected kelompok
        // Check student's primary kelompok_id
        if (student.kelompok_id && kelompokIds.includes(student.kelompok_id)) {
          return true
        }

        // For multi-kelompok students, check via student_classes
        if (student.student_classes && Array.isArray(student.student_classes)) {
          return student.student_classes.some((sc: any) => {
            const cls = sc.classes
            return cls && cls.kelompok_id && kelompokIds.includes(cls.kelompok_id)
          })
        }

        return false
      })

      // DEBUG Step 7: Kelompok Filter
      // console.log('[LAPORAN DEBUG] Kelompok Filter:', {
      //   kelompokIds,
      //   afterFilter: filteredLogs.length,
      //   classKelompokMapSize: classKelompokMap.size,
      //   sampleValidation: filteredLogs.slice(0, 3).map((l: any) => {
      //     const meeting = meetingMap.get(l.meeting_id)
      //     const student = l.students
      //     return {
      //       meeting_class: meeting?.class_id,
      //       meeting_class_ids: meeting?.class_ids,
      //       meeting_kelompok: classKelompokMap.get(meeting?.class_id),
      //       meeting_has_selected_kelompok: meeting?.class_ids?.some((cid: string) =>
      //         kelompokIds.includes(classKelompokMap.get(cid) || '')
      //       ),
      //       student_kelompok: student?.kelompok_id,
      //       passed: true
      //     }
      //   })
      // })
    }

    // Apply gender filter client-side
    if (filters.gender) {
      filteredLogs = filteredLogs.filter((log: any) =>
        log.students.gender === filters.gender
      )
    }

    // Process data for summary (after all filtering, including teacher meetings filter)
    const summary = {
      total: filteredLogs.length,
      hadir: filteredLogs.filter((log: any) => log.status === 'H').length,
      izin: filteredLogs.filter((log: any) => log.status === 'I').length,
      sakit: filteredLogs.filter((log: any) => log.status === 'S').length,
      alpha: filteredLogs.filter((log: any) => log.status === 'A').length,
    }

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
      total_days: student.total_days,
      hadir: student.hadir,
      izin: student.izin,
      sakit: student.sakit,
      alpha: student.alpha,
      attendance_rate: student.attendance_rate
    }))

    // DEBUG Step 8: Final Output
    // console.log('[LAPORAN DEBUG] Final Output:', {
    //   filters: { classId: filters.classId, kelompokId: filters.kelompokId },
    //   finalLogsCount: filteredLogs.length,
    //   studentsCount: detailedRecords.length,
    //   meetingsCount: Array.from(meetingMap.values()).length,
    //   summary: {
    //     total: summary.total,
    //     hadir: summary.hadir,
    //     attendanceRate: summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0
    //   }
    // })

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
    handleApiError(error, 'memuat data', 'Gagal memuat laporan kehadiran')
    throw error
  }
}

/**
 * Mendapatkan daftar kelas untuk filter dropdown
 */
