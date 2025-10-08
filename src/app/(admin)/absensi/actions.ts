'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface AttendanceData {
  student_id: string
  date: string
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
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
