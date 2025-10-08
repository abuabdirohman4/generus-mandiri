'use client'

import useSWR from 'swr'
import { getAttendanceByDate } from '../actions'

interface AttendanceRecord {
  id: any
  student_id: any
  status: any
  reason: any
  students: {
    id: any
    name: any
    gender: any
    classes: {
      id: any
      name: any
    }[]
  }[]
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

const fetcher = async (url: string): Promise<AttendanceData> => {
  const date = url.split('/').pop() // Extract date from URL
  if (!date) {
    throw new Error('Invalid date')
  }

  const result = await getAttendanceByDate(date)
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch attendance')
  }

  // Transform the data to match our expected format
  const attendanceData: AttendanceData = {}
  
  if (result.data) {
    result.data.forEach((record: AttendanceRecord) => {
      attendanceData[record.student_id] = {
        status: record.status as 'H' | 'I' | 'S' | 'A',
        reason: record.reason || undefined
      }
    })
  }

  return attendanceData
}

export function useAttendanceData(selectedDate: Date | string) {
  // Ensure selectedDate is a proper Date object
  const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate)
  
  // Format date as YYYY-MM-DD for the cache key
  const dateKey = date.toLocaleDateString('en-CA')
  const swrKey = `/api/attendance/${dateKey}`

  const { data, error, isLoading, mutate } = useSWR<AttendanceData>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds cache
      onError: (error) => {
        console.error('Error fetching attendance:', error)
      }
    }
  )

  return {
    attendance: data || {},
    error,
    isLoading,
    mutate
  }
}
