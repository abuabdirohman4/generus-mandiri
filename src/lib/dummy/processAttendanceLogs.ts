import attendanceLogs from './attendance-logs.json'
import meetings from './meetings.json'
import dayjs from 'dayjs'

// Types for dummy data processing
interface AttendanceLog {
  id: string
  student_id: string
  meeting_id: string
  date: string
  status: 'H' | 'A' | 'I' | 'S'
  reason: string | null
}

interface Meeting {
  id: string
  class_id: string
  title: string
  date: string
  topic?: string
  description?: string
  student_snapshot: string[]
  created_at: string
}

interface ReportFilters {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  classId?: string
  startDate?: string
  endDate?: string
  month?: number
  year?: number
  viewMode?: 'general' | 'detailed'
}

interface StudentSummary {
  student_id: string
  student_name: string
  total_meetings: number
  present_count: number
  absent_count: number
  excused_count: number
  sick_count: number
  attendance_percentage: number
}

interface ChartData {
  student_id: string
  student_name: string
  attendance_percentage: number
  present_count: number
  absent_count: number
  excused_count: number
  sick_count: number
  total_meetings: number
}

interface TrendChartData {
  date: string
  fullDate: string
  attendancePercentage: number
  presentCount: number
  absentCount: number
  excusedCount: number
  sickCount: number
  totalRecords: number
}

interface DetailedRecord {
  student_id: string
  student_name: string
  meeting_id: string
  meeting_title: string
  date: string
  status: 'H' | 'A' | 'I' | 'S'
  reason: string | null
  attendance_percentage: number
}

interface ReportData {
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

// Student names mapping
const studentNames: Record<string, string> = {
  'student-1': 'Ahmad Rizki',
  'student-2': 'Siti Nurhaliza',
  'student-3': 'Muhammad Fauzi',
  'student-4': 'Fatimah Azzahra',
  'student-5': 'Abdul Rahman',
  'student-6': 'Aisyah Putri',
  'student-7': 'Umar Faruq',
  'student-8': 'Khadijah Salsabila',
  'student-9': 'Ali Murtadha',
  'student-10': 'Zainab Khairunisa',
  'student-11': 'Hasan Basri',
  'student-12': 'Aminah Sari',
  'student-13': 'Yusuf Al-Hakim',
  'student-14': 'Maryam Zahra',
  'student-15': 'Ibrahim Khalil',
  'student-16': 'Khadijah Fatimah',
  'student-17': 'Musa Al-Rasyid',
  'student-18': 'Aisha Binti',
  'student-19': 'Isa Al-Masih',
  'student-20': 'Ruqayyah Nisa',
  'student-21': 'Daud Sulaiman',
  'student-22': 'Hajar Al-Mutahharah',
  'student-23': 'Sulaiman Al-Hakim',
  'student-24': 'Zainab Al-Kubra',
  'student-25': 'Muhammad Al-Amin'
}

// Helper function to filter meetings by date range
function filterMeetingsByDateRange(
  data: Meeting[],
  startDate?: string,
  endDate?: string,
  month?: number,
  year?: number,
  viewMode?: 'general' | 'detailed'
): Meeting[] {
  if (viewMode === 'general' && month && year) {
    // Filter by month and year for general mode
    return data.filter(item => {
      const itemDate = dayjs(item.date)
      return itemDate.month() === month - 1 && itemDate.year() === year
    })
  } else if (startDate && endDate) {
    // Filter by date range for detailed mode
    return data.filter(item => {
      const itemDate = dayjs(item.date)
      return itemDate.isAfter(dayjs(startDate).subtract(1, 'day')) && 
             itemDate.isBefore(dayjs(endDate).add(1, 'day'))
    })
  }
  return data
}

// Helper function to filter attendance logs by date range
function filterLogsByDateRange(
  data: AttendanceLog[],
  startDate?: string,
  endDate?: string,
  month?: number,
  year?: number,
  viewMode?: 'general' | 'detailed'
): AttendanceLog[] {
  if (viewMode === 'general' && month && year) {
    // Filter by month and year for general mode
    return data.filter(item => {
      const itemDate = dayjs(item.date)
      return itemDate.month() === month - 1 && itemDate.year() === year
    })
  } else if (startDate && endDate) {
    // Filter by date range for detailed mode
    return data.filter(item => {
      const itemDate = dayjs(item.date)
      return itemDate.isAfter(dayjs(startDate).subtract(1, 'day')) && 
             itemDate.isBefore(dayjs(endDate).add(1, 'day'))
    })
  }
  return data
}

// Helper function to get date range based on period
function getDateRangeByPeriod(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): { startDate: string; endDate: string } {
  const now = dayjs()
  
  switch (period) {
    case 'daily':
      return {
        startDate: now.format('YYYY-MM-DD'),
        endDate: now.format('YYYY-MM-DD')
      }
    case 'weekly':
      return {
        startDate: now.startOf('week').format('YYYY-MM-DD'),
        endDate: now.endOf('week').format('YYYY-MM-DD')
      }
    case 'monthly':
      return {
        startDate: now.startOf('month').format('YYYY-MM-DD'),
        endDate: now.endOf('month').format('YYYY-MM-DD')
      }
    case 'yearly':
      return {
        startDate: now.startOf('year').format('YYYY-MM-DD'),
        endDate: now.endOf('year').format('YYYY-MM-DD')
      }
    default:
      return {
        startDate: now.startOf('month').format('YYYY-MM-DD'),
        endDate: now.endOf('month').format('YYYY-MM-DD')
      }
  }
}

// Main function to generate dummy report data
export function generateDummyReportData(filters: ReportFilters): ReportData {
  const { period = 'monthly', classId, startDate, endDate, month, year, viewMode = 'general' } = filters

  // Determine date range
  let dateRange: { startDate: string; endDate: string }
  
  if (viewMode === 'general' && month && year) {
    // For general mode with month/year
    const startOfMonth = dayjs().year(year).month(month - 1).startOf('month')
    const endOfMonth = dayjs().year(year).month(month - 1).endOf('month')
    dateRange = {
      startDate: startOfMonth.format('YYYY-MM-DD'),
      endDate: endOfMonth.format('YYYY-MM-DD')
    }
  } else if (startDate && endDate) {
    // For detailed mode with date range
    dateRange = { startDate, endDate }
  } else {
    // Fallback to period-based range
    dateRange = getDateRangeByPeriod(period)
  }

  // Filter meetings and logs by date range and class
  const filteredMeetings = filterMeetingsByDateRange(
    meetings as Meeting[],
    dateRange.startDate,
    dateRange.endDate,
    month,
    year,
    viewMode
  )
  
  // For dummy data, ignore classId filtering since we use 'class-1' in dummy data
  // Always use all filtered meetings for dummy data
  const finalFilteredMeetings = filteredMeetings

  const filteredLogs = filterLogsByDateRange(
    attendanceLogs as AttendanceLog[],
    dateRange.startDate,
    dateRange.endDate,
    month,
    year,
    viewMode
  ).filter(log => {
    const meeting = finalFilteredMeetings.find(m => m.id === log.meeting_id)
    // For dummy data, ignore classId filtering since we use 'class-1' in dummy data
    return meeting
  })

  // Get unique students
  const studentIds = [...new Set(filteredLogs.map(log => log.student_id))]

  // Calculate student summaries
  const studentSummaries: StudentSummary[] = studentIds.map(studentId => {
    const studentLogs = filteredLogs.filter(log => log.student_id === studentId)
    const totalMeetings = finalFilteredMeetings.length
    const presentCount = studentLogs.filter(log => log.status === 'H').length
    const absentCount = studentLogs.filter(log => log.status === 'A').length
    const excusedCount = studentLogs.filter(log => log.status === 'I').length
    const sickCount = studentLogs.filter(log => log.status === 'S').length
    const attendancePercentage = totalMeetings > 0 ? Math.round((presentCount / totalMeetings) * 100) : 0

    return {
      student_id: studentId,
      student_name: studentNames[studentId] || `Student ${studentId}`,
      total_meetings: totalMeetings,
      present_count: presentCount,
      absent_count: absentCount,
      excused_count: excusedCount,
      sick_count: sickCount,
      attendance_percentage: attendancePercentage
    }
  })

  // Generate chart data (pie chart format)
  const chartData = [
    { name: 'Hadir', value: studentSummaries.reduce((sum, s) => sum + s.present_count, 0) },
    { name: 'Izin', value: studentSummaries.reduce((sum, s) => sum + s.excused_count, 0) },
    { name: 'Sakit', value: studentSummaries.reduce((sum, s) => sum + s.sick_count, 0) },
    { name: 'Alpha', value: studentSummaries.reduce((sum, s) => sum + s.absent_count, 0) }
  ]

  // Generate trend chart data (daily attendance percentage)
  const trendChartData: TrendChartData[] = finalFilteredMeetings.map(meeting => {
    const meetingLogs = filteredLogs.filter(log => log.meeting_id === meeting.id)
    const totalStudents = studentIds.length
    const presentCount = meetingLogs.filter(log => log.status === 'H').length
    const absentCount = meetingLogs.filter(log => log.status === 'A').length
    const excusedCount = meetingLogs.filter(log => log.status === 'I').length
    const sickCount = meetingLogs.filter(log => log.status === 'S').length
    const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

    return {
      date: dayjs(meeting.date).format('DD MMM'),
      fullDate: dayjs(meeting.date).format('DD MMM YYYY'),
      attendancePercentage,
      presentCount,
      absentCount,
      excusedCount,
      sickCount,
      totalRecords: totalStudents
    }
  }).sort((a, b) => dayjs(a.fullDate).valueOf() - dayjs(b.fullDate).valueOf())

  // Generate detailed records (student summary format)
  const detailedRecords = studentSummaries.map(summary => ({
    student_id: summary.student_id,
    student_name: summary.student_name,
    student_gender: 'L', // Default gender
    class_name: 'Kelas Pengajian',
    total_days: summary.total_meetings,
    hadir: summary.present_count,
    izin: summary.excused_count,
    sakit: summary.sick_count,
    alpha: summary.absent_count,
    attendance_rate: summary.attendance_percentage
  }))

  // Calculate summary statistics
  const totalStudents = studentIds.length
  const totalMeetings = filteredMeetings.length
  const totalPresent = studentSummaries.reduce((sum, s) => sum + s.present_count, 0)
  const totalExcused = studentSummaries.reduce((sum, s) => sum + s.excused_count, 0)
  const totalSick = studentSummaries.reduce((sum, s) => sum + s.sick_count, 0)
  const totalAbsent = studentSummaries.reduce((sum, s) => sum + s.absent_count, 0)

  const result = {
    summary: {
      total: totalStudents * totalMeetings, // Total possible attendance records
      hadir: totalPresent,
      izin: totalExcused,
      sakit: totalSick,
      alpha: totalAbsent
    },
    chartData,
    trendChartData,
    detailedRecords,
    period: period,
    dateRange: {
      start: dateRange.startDate,
      end: dateRange.endDate
    }
  }
  
  return result
}

// Helper function to get dummy meetings data
export function getDummyMeetings(classId?: string) {
  // For dummy data, ignore classId filtering since we use 'class-1' in dummy data
  const filteredMeetings = (meetings as Meeting[])
    .map(meeting => ({
      ...meeting,
      classes: [{ id: meeting.class_id, name: 'Kelas Pengajian' }],
      attendancePercentage: 0, // Will be calculated
      totalStudents: 25,
      presentCount: 0,
      absentCount: 0,
      sickCount: 0,
      excusedCount: 0
    }))

  // Calculate attendance statistics for each meeting
  return filteredMeetings.map(meeting => {
    const meetingLogs = (attendanceLogs as AttendanceLog[]).filter(log => log.meeting_id === meeting.id)
    const totalStudents = 25
    const presentCount = meetingLogs.filter(log => log.status === 'H').length
    const absentCount = meetingLogs.filter(log => log.status === 'A').length
    const excusedCount = meetingLogs.filter(log => log.status === 'I').length
    const sickCount = meetingLogs.filter(log => log.status === 'S').length
    const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

    return {
      ...meeting,
      attendancePercentage,
      totalStudents,
      presentCount,
      absentCount,
      excusedCount,
      sickCount
    }
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  return filteredMeetings
}
