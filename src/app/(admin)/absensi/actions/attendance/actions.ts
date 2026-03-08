'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  calculateAttendanceStats,
  validateAttendanceData
} from './logic'
import {
  upsertAttendanceLogs,
  fetchAttendanceByDate,
  fetchAttendanceByMeeting,
  fetchStudentsByIds
} from './queries'
import type {
  AttendanceData,
  AttendanceLog,
  AttendanceStats,
  AttendanceSaveResult
} from '@/types/attendance'

// ============================================================================
// LAYER 3: SERVER ACTIONS (Exported)
// ============================================================================

/**
 * Saves attendance for a specific date (non-meeting based)
 */
export async function saveAttendance(
  attendanceData: AttendanceData[]
): Promise<AttendanceSaveResult> {
  try {
    // Validate data
    const validation = validateAttendanceData(attendanceData)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get user profile to get the recorded_by field
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Prepare data for upsert
    const attendanceRecords = attendanceData.map(record => ({
      student_id: record.student_id,
      date: record.date,
      status: record.status,
      reason: record.reason,
      recorded_by: profile.id
    }))

    // Save to database
    const { error } = await upsertAttendanceLogs(supabase, attendanceRecords)

    if (error) {
      console.error('Error saving attendance:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Error in saveAttendance:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Saves attendance for a specific meeting
 */
export async function saveAttendanceForMeeting(
  meetingId: string,
  attendanceData: AttendanceData[]
): Promise<AttendanceSaveResult> {
  try {
    // Validate data
    const validation = validateAttendanceData(attendanceData)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Use admin client to bypass RLS restrictions for teachers accessing "Pengajar" meetings
    // This allows teachers (Paud/Kelas 1-6) to save attendance for "Pengajar" meetings
    const adminClient = await createAdminClient()

    // Get meeting details (including date in one query)
    const { data: meeting, error: meetingError } = await adminClient
      .from('meetings')
      .select('teacher_id, class_ids, date')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return { success: false, error: 'Meeting not found' }
    }

    // Prepare data for upsert
    const attendanceRecords = attendanceData.map(record => ({
      student_id: record.student_id,
      meeting_id: meetingId,
      date: meeting.date, // Include the meeting date
      status: record.status,
      reason: record.reason,
      recorded_by: profile.id
    }))

    // Use upsert to handle both insert and update
    const { error } = await upsertAttendanceLogs(adminClient, attendanceRecords)

    if (error) {
      console.error('Error saving attendance:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Error in saveAttendanceForMeeting:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Gets attendance logs for a specific date
 */
export async function getAttendanceByDate(date: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await fetchAttendanceByDate(supabase, date)

    if (error) {
      console.error('Error fetching attendance by date:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getAttendanceByDate:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}

/**
 * Gets attendance logs for a specific meeting
 */
export async function getAttendanceByMeeting(meetingId: string) {
  try {
    // Use admin client to bypass RLS restrictions for teachers with multiple kelompok
    const adminClient = await createAdminClient()
    const { data, error } = await fetchAttendanceByMeeting(adminClient, meetingId)

    if (error) {
      console.error('Error fetching attendance:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getAttendanceByMeeting:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}

/**
 * Gets attendance statistics for a specific date
 */
export async function getAttendanceStats(date: string) {
  try {
    const result = await getAttendanceByDate(date)

    if (!result.success || !result.data) {
      return { success: false, error: result.error, data: null }
    }

    const stats = calculateAttendanceStats(result.data as AttendanceLog[])

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error in getAttendanceStats:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}

/**
 * Get students from meeting snapshot using admin client to bypass RLS restrictions
 */
export async function getStudentsFromSnapshot(studentIds: string[]) {
  try {
    if (!studentIds || studentIds.length === 0) {
      return { success: true, data: [] }
    }

    const adminClient = await createAdminClient()
    const { data: students, error } = await fetchStudentsByIds(adminClient, studentIds)

    if (error) {
      console.error('Error fetching students from snapshot:', error)
      return { success: false, error: error.message, data: null }
    }

    // Transform to match Student interface used in hook
    const transformedStudents = (students || []).map((student: any) => {
      const classData = Array.isArray(student.classes) ? student.classes[0] : student.classes

      // Get all classes from junction table
      const studentClasses = student.student_classes || []
      const allClasses = studentClasses
        .map((sc: any) => sc.classes)
        .filter(Boolean)
        .map((cls: any) => ({
          id: cls.id,
          name: cls.name
        }))

      // If no classes from junction, use primary class
      if (allClasses.length === 0 && classData) {
        allClasses.push({
          id: classData.id,
          name: classData.name
        })
      }

      return {
        id: student.id,
        name: student.name,
        gender: student.gender || 'L',
        class_name: allClasses[0]?.name || 'Unknown Class',
        class_id: allClasses[0]?.id || student.class_id || '',
        classes: allClasses // Add all classes array
      }
    })

    return { success: true, data: transformedStudents }
  } catch (error) {
    console.error('Error in getStudentsFromSnapshot:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}
