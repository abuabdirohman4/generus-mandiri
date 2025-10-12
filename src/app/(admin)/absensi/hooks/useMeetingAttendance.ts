'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { getAttendanceByMeeting, getMeetingById } from '../actions'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
}

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
    }
  }
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

const fetcher = async (url: string): Promise<{ meeting: any; attendance: AttendanceData; students: Student[] }> => {
  const meetingId = url.split('/').pop()
  if (!meetingId) {
    throw new Error('Invalid meeting ID')
  }

  // Fetch meeting details
  const meetingResult = await getMeetingById(meetingId)
  if (!meetingResult.success) {
    throw new Error(meetingResult.error || 'Failed to fetch meeting')
  }

  // Fetch attendance data
  const attendanceResult = await getAttendanceByMeeting(meetingId)
  if (!attendanceResult.success) {
    throw new Error(attendanceResult.error || 'Failed to fetch attendance')
  }

  // Transform attendance data
  const attendanceData: AttendanceData = {}
  const students: Student[] = []

  if (attendanceResult.data) {
    attendanceResult.data.forEach((record: any, index) => {
      attendanceData[record.student_id] = {
        status: record.status,
        reason: record.reason || undefined
      }

      // Build students array from attendance records
      const studentData = record.students // It's an object, not an array
      const studentId = studentData?.id || `temp-${index}-${record.student_id}`
      const studentName = studentData?.name || 'Unknown Student'
      
      // Only add if we have a valid student ID or can generate one
      if (studentId && studentId !== '') {
        students.push({
          id: studentId,
          name: studentName,
          gender: studentData?.gender || 'L', // Default to 'L' for Laki-laki
          class_name: studentData?.classes?.name || 'Unknown Class',
          class_id: studentData?.classes?.id || ''
        })
      }
    })
  }

  // If no attendance records, fetch students from meeting snapshot
  if (students.length === 0 && meetingResult.data?.student_snapshot) {
    try {
      // Import the supabase client
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Fetch student details from the snapshot IDs
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          gender,
          classes!inner(
            id,
            name
          )
        `)
        .in('id', meetingResult.data.student_snapshot)
        .order('name')

      if (studentError) {
        console.error('Error fetching students from snapshot:', studentError)
        throw new Error(studentError.message)
      }

      if (studentData) {
        studentData.forEach((student: any) => {
          students.push({
            id: student.id,
            name: student.name,
            gender: student.gender,
            class_name: student.classes.name,
            class_id: student.classes.id
          })
        })
      }
    } catch (error) {
      console.error('Error fetching students from snapshot:', error)
      // Fallback to placeholder students
      meetingResult.data.student_snapshot.forEach((studentId: string, index: number) => {
        students.push({
          id: studentId || `snapshot-${index}`,
          name: `Student ${index + 1}`,
          gender: 'L',
          class_name: meetingResult.data?.classes?.[0]?.name || 'Unknown Class',
          class_id: meetingResult.data?.classes?.[0]?.id || ''
        })
      })
    }
  }

  // Initialize default attendance with "Alfa" (A) for all students if no attendance data exists
  // This ensures that even if there are no attendance records in the database,
  // all students will have a default "Alfa" status
  if (students.length > 0) {
    students.forEach(student => {
      // Only set default if this student doesn't have attendance data yet
      if (!attendanceData[student.id]) {
        attendanceData[student.id] = {
          status: 'A', // Default to "Alfa" (Absent)
          reason: undefined
        }
      }
    })
  }

  return {
    meeting: meetingResult.data,
    attendance: attendanceData,
    students
  }
}

export function useMeetingAttendance(meetingId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ meeting: any; attendance: AttendanceData; students: Student[] }>(
    meetingId ? `/api/meeting-attendance/${meetingId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      onError: (error) => {
        console.error('Error fetching meeting attendance:', error)
      }
    }
  )

  const calculateAttendancePercentage = () => {
    if (!data || !data.meeting) return 0
    
    const totalStudents = data.meeting.student_snapshot?.length || 0
    if (totalStudents === 0) return 0
    
    const presentCount = Object.values(data.attendance).filter(
      record => record.status === 'H'
    ).length
    
    return Math.round((presentCount / totalStudents) * 100)
  }

  const getAttendanceStats = () => {
    if (!data) {
      return {
        total: 0,
        hadir: 0,
        izin: 0,
        sakit: 0,
        absen: 0
      }
    }

    const records = Object.values(data.attendance)
    return {
      total: records.length,
      hadir: records.filter(record => record.status === 'H').length,
      izin: records.filter(record => record.status === 'I').length,
      sakit: records.filter(record => record.status === 'S').length,
      absen: records.filter(record => record.status === 'A').length
    }
  }

  // Memoize the attendance object to prevent unnecessary re-renders
  const memoizedAttendance = useMemo(() => {
    return data?.attendance ?? {}
  }, [data?.attendance])

  const memoizedStudents = useMemo(() => {
    return data?.students ?? []
  }, [data?.students])

  return {
    meeting: data?.meeting,
    attendance: memoizedAttendance,
    students: memoizedStudents,
    loading: isLoading,
    error,
    mutate,
    calculateAttendancePercentage,
    getAttendanceStats
  }
}
