'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface AttendanceData {
  student_id: string
  date: string
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
}

interface Meeting {
  id: string
  class_id: string
  teacher_id: string
  title: string
  date: string
  topic?: string
  description?: string
  student_snapshot: string[]
  created_at: string
  updated_at: string
}

interface CreateMeetingData {
  classId: string
  date: string
  title: string
  topic?: string
  description?: string
}

export async function saveAttendance(attendanceData: AttendanceData[]) {
  try {
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

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from('attendance_logs')
      .upsert(attendanceRecords, {
        onConflict: 'student_id,date' // This will update if record exists for same student and date
      })

    if (error) {
      console.error('Error saving attendance:', error)
      return { success: false, error: error.message }
    }

    // Revalidate the attendance page to show updated data
    revalidatePath('/absensi')
    
    return { success: true }
  } catch (error) {
    console.error('Error in saveAttendance:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function getAttendanceByDate(date: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        student_id,
        status,
        reason,
        students (
          id,
          name,
          gender,
          classes (
            id,
            name
          )
        )
      `)
      .eq('date', date)
      .order('students(name)')

    if (error) {
      console.error('Error fetching attendance:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getAttendanceByDate:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}

export async function getAttendanceStats(date: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('status')
      .eq('date', date)

    if (error) {
      console.error('Error fetching attendance stats:', error)
      return { success: false, error: error.message, data: null }
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      hadir: data.filter(record => record.status === 'H').length,
      izin: data.filter(record => record.status === 'I').length,
      sakit: data.filter(record => record.status === 'S').length,
      absen: data.filter(record => record.status === 'A').length
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error in getAttendanceStats:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}

// Meeting CRUD operations
export async function createMeeting(data: CreateMeetingData) {
  try {
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

    // Get students for the class to create snapshot
    let query = supabase
      .from('students')
      .select('id')
      .eq('class_id', data.classId)

    // If user is a teacher, verify they teach this class
    if (profile.role === 'teacher') {
      const { data: teacherClass } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('id', data.classId)
        .single()

      if (!teacherClass) {
        return { success: false, error: 'You can only create meetings for your own class' }
      }
    }

    const { data: students, error: studentsError } = await query

    if (studentsError) {
      return { success: false, error: studentsError.message }
    }

    if (!students || students.length === 0) {
      return { success: false, error: 'No students found in this class' }
    }

    // Create meeting with student snapshot
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        class_id: data.classId,
        teacher_id: profile.id,
        title: data.title,
        date: data.date,
        topic: data.topic,
        description: data.description,
        student_snapshot: students.map(s => s.id)
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating meeting:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/absensi')
    return { success: true, data: meeting }
  } catch (error) {
    console.error('Error in createMeeting:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function getMeetingsByClass(classId?: string, limit: number = 10, cursor?: string) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated', data: null }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found', data: null }
    }

    let query = supabase
      .from('meetings')
      .select(`
        id,
        class_id,
        title,
        date,
        topic,
        description,
        student_snapshot,
        created_at,
        classes (
          id,
          name
        )
      `)
      .order('date', { ascending: false })
      .limit(limit)

    // If cursor (last meeting date) is provided, get meetings older than cursor
    if (cursor) {
      query = query.lt('date', cursor)
    }

    // If user is a teacher, only get their class meetings
    if (profile.role === 'teacher') {
      const { data: teacherClass } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .single()

      if (teacherClass) {
        query = query.eq('class_id', teacherClass.id)
      } else {
        return { success: true, data: [], hasMore: false }
      }
    } else if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching meetings:', error)
      return { success: false, error: error.message, data: null }
    }

    return { 
      success: true, 
      data: data || [], 
      hasMore: data?.length === limit 
    }
  } catch (error) {
    console.error('Error in getMeetingsByClass:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}

export async function getMeetingById(meetingId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        id,
        class_id,
        title,
        date,
        topic,
        description,
        student_snapshot,
        created_at,
        classes (
          id,
          name
        )
      `)
      .eq('id', meetingId)
      .single()

    if (error) {
      console.error('Error fetching meeting:', error)
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in getMeetingById:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}

export async function updateMeeting(meetingId: string, data: Partial<CreateMeetingData>) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('meetings')
      .update({
        title: data.title,
        date: data.date,
        topic: data.topic,
        description: data.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    if (error) {
      console.error('Error updating meeting:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Error in updateMeeting:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function deleteMeeting(meetingId: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId)

    if (error) {
      console.error('Error deleting meeting:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteMeeting:', error)
    return { success: false, error: 'Internal server error' }
  }
}

export async function saveAttendanceForMeeting(meetingId: string, attendanceData: AttendanceData[]) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get meeting details to get the date
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('date')
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
    const { error } = await supabase
      .from('attendance_logs')
      .upsert(attendanceRecords, {
        onConflict: 'student_id,meeting_id'
      })

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

export async function getAttendanceByMeeting(meetingId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        id,
        student_id,
        status,
        reason,
        students (
          id,
          name,
          gender,
          classes (
            id,
            name
          )
        )
      `)
      .eq('meeting_id', meetingId)
      .order('students(name)')

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
