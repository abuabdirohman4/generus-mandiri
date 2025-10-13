'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'

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
  }>
  detailedRecords: Array<{
    student_id: string
    student_name: string
    student_gender: string
    class_name: string
    total_days: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    attendance_rate: number
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


    // Build query
    let query = supabase
      .from('attendance_logs')
      .select(`
        id,
        student_id,
        meeting_id,
        date,
        status,
        reason,
        students!inner(
          id,
          name,
          gender,
          classes!inner(
            id,
            name
          )
        )
      `)

    // Apply filters
    if (filters.classId) {
      query = query.eq('students.class_id', filters.classId)
    }

    // Apply date filter
    if (dateFilter.date?.eq) {
      query = query.eq('date', dateFilter.date.eq)
    } else if (dateFilter.date?.gte && dateFilter.date?.lte) {
      query = query
        .gte('date', dateFilter.date.gte)
        .lte('date', dateFilter.date.lte)
    }

    const { data: attendanceLogs, error } = await query

    if (error) {
      throw error
    }

    // Process data for summary
    const summary = {
      total: attendanceLogs?.length || 0,
      hadir: attendanceLogs?.filter(log => log.status === 'H').length || 0,
      izin: attendanceLogs?.filter(log => log.status === 'I').length || 0,
      sakit: attendanceLogs?.filter(log => log.status === 'S').length || 0,
      alpha: attendanceLogs?.filter(log => log.status === 'A').length || 0,
    }

    // Prepare chart data
    const chartData = [
      { name: 'Hadir', value: summary.hadir },
      { name: 'Izin', value: summary.izin },
      { name: 'Sakit', value: summary.sakit },
      { name: 'Alpha', value: summary.alpha },
    ].filter(item => item.value > 0) // Only include non-zero values

    // Fetch meetings for the date range to ensure all meetings appear in chart
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id, title, date, student_snapshot, class_id')
      .gte('date', dateFilter.date?.gte || '1900-01-01')
      .lte('date', dateFilter.date?.lte || '2100-12-31')
      .order('date')

    // Apply class filter to meetings if specified
    const filteredMeetings = filters.classId 
      ? meetings?.filter(meeting => meeting.class_id === filters.classId) || []
      : meetings || []

    // Generate trend chart data from meetings (not just attendance logs)
    console.log('🔍 Debug: Processing trend data for period =', filters.period, 'viewMode =', filters.viewMode)
    console.log('🔍 Debug: filteredMeetings count =', filteredMeetings.length)
    
    const dailyData = filteredMeetings.reduce((acc: any, meeting: any) => {
      const meetingDate = new Date(meeting.date)
      const meetingLogs = attendanceLogs?.filter(log => log.meeting_id === meeting.id) || []
      const totalStudents = meeting.student_snapshot?.length || 0
      
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
          totalRecords: 0
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
          totalRecords: day.totalRecords
        }
      })
    

    // Group by student for detailed view
    const studentSummary = attendanceLogs?.reduce((acc: any, log: any) => {
      const studentId = log.student_id
      if (!acc[studentId]) {
        acc[studentId] = {
          student_id: studentId,
          student_name: log.students.name,
          student_gender: log.students.gender,
          class_name: log.students.classes.name,
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

    const detailedRecords = Object.values(studentSummary) as Array<{
      student_id: string
      student_name: string
      student_gender: string
      class_name: string
      total_days: number
      hadir: number
      izin: number
      sakit: number
      alpha: number
      attendance_rate: number
    }>

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
export async function getClasses() {
  try {
    const supabase = await createClient()
    
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, kelompok_id')
      .order('name')

    if (error) {
      throw error
    }

    return classes || []
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}
