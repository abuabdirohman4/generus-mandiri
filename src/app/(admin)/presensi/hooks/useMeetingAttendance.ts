'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { getAttendanceByMeeting, getMeetingById, getStudentsFromSnapshot } from '../actions'
import { buildAttendanceData } from './useMeetingAttendance.logic'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
  classes?: Array<{ id: string; name: string }> // Add all classes array for multi-class students
  kelompok_id?: string
  kelompok_name?: string
  desa_id?: string
  desa_name?: string
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
    check_in_time?: string | null
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

  // Roster is always derived from the meeting's student_snapshot -- the source
  // of truth for who's in the meeting -- never from attendance_logs. Deriving
  // students from attendance records caused a bug: once even one student got
  // an attendance row (e.g. via QR scan), students without a row vanished
  // from the roster entirely instead of showing as "Alfa" (not yet marked).
  const students: Student[] = []
  const meetingData = meetingResult.data
  const snapshot: string[] = meetingData?.student_snapshot || []

  if (snapshot.length > 0) {
    try {
      const studentsResult = await getStudentsFromSnapshot(snapshot)

      if (studentsResult.success && studentsResult.data) {
        students.push(...studentsResult.data)
      } else {
        console.error('Error fetching students from snapshot:', studentsResult.error)
        snapshot.forEach((studentId: string, index: number) => {
          students.push({
            id: studentId || `snapshot-${index}`,
            name: `Student ${index + 1}`,
            gender: 'L',
            class_name: meetingData?.classes?.[0]?.name || 'Unknown Class',
            class_id: meetingData?.classes?.[0]?.id || ''
          })
        })
      }
    } catch (error) {
      console.error('Error fetching students from snapshot:', error)
      snapshot.forEach((studentId: string, index: number) => {
        students.push({
          id: studentId || `snapshot-${index}`,
          name: `Student ${index + 1}`,
          gender: 'L',
          class_name: meetingData?.classes?.[0]?.name || 'Unknown Class',
          class_id: meetingData?.classes?.[0]?.id || ''
        })
      })
    }
  }

  const attendanceLogs = (attendanceResult.data || []).map((record: any) => ({
    student_id: record.student_id,
    status: record.status,
    reason: record.reason,
    check_in_time: record.check_in_time
  }))

  const attendanceData: AttendanceData = buildAttendanceData(students, attendanceLogs)

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
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,       // 30 seconds — prevent spam refetch on tab-switch
      revalidateOnMount: true,
      revalidateIfStale: true,
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
