'use client'

import useSWR from 'swr'
import dayjs from 'dayjs'
import { 
  getStudentInfo, 
  getStudentAttendanceHistory,
  type StudentInfo,
  type AttendanceHistoryResponse 
} from '@/app/(admin)/users/siswa/actions'

export function useStudentDetail(studentId: string, currentDate: dayjs.Dayjs) {
  // Fetch student info (doesn't change with month)
  const { data: studentInfo, error: studentError, isLoading: studentLoading } = useSWR<StudentInfo>(
    studentId ? `student-${studentId}` : null,
    () => getStudentInfo(studentId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  // Fetch attendance history (changes with month)
  const year = currentDate.year()
  const month = currentDate.month() + 1
  
  const { data: attendanceData, error: attendanceError, isLoading: attendanceLoading } = useSWR<AttendanceHistoryResponse>(
    studentId ? `attendance-${studentId}-${year}-${month}` : null,
    () => getStudentAttendanceHistory(studentId, year, month),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  )

  return {
    student: studentInfo,
    attendanceLogs: attendanceData?.attendanceLogs || [],
    stats: attendanceData?.stats || null,
    isLoading: studentLoading || attendanceLoading,
    error: (() => {
      // Return the first error that exists, but ensure it's safe to render
      const error = studentError || attendanceError
      if (!error) return null
      if (error instanceof Error) return error.message
      if (typeof error === 'string') return error
      if (typeof error === 'object' && error !== null) {
        if ('message' in error && typeof error.message === 'string') {
          return error.message
        }
        if ('name' in error && typeof error.name === 'string') {
          return error.name
        }
        return 'Terjadi kesalahan saat memuat data'
      }
      return 'Terjadi kesalahan saat memuat data'
    })(),
  }
}