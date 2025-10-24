'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { canEditOrDeleteMeeting } from '@/app/(admin)/absensi/utils/meetingHelpers'

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
  classIds: string[]
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

    // If user is a teacher, verify they teach all selected classes
    if (profile.role === 'teacher') {
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', user.id)
        .in('class_id', data.classIds)

      const teacherClassIds = teacherClasses?.map(tc => tc.class_id) || []
      const invalidClasses = data.classIds.filter(id => !teacherClassIds.includes(id))
      
      if (invalidClasses.length > 0) {
        return { success: false, error: 'You can only create meetings for your own classes' }
      }
    }

    // Get students for all selected classes to create snapshot
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .in('class_id', data.classIds)

    if (studentsError) {
      return { success: false, error: studentsError.message }
    }

    if (!students || students.length === 0) {
      return { success: false, error: 'No students found in this class' }
    }

    // Generate meeting number (highest from all classes + 1)
    const { data: lastMeetings } = await supabase
      .from('meetings')
      .select('meeting_number')
      .in('class_id', data.classIds)
      .order('meeting_number', { ascending: false })
      .limit(1)

    const nextMeetingNumber = (lastMeetings?.[0]?.meeting_number || 0) + 1

    // Create meeting with student snapshot
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        class_id: data.classIds[0], // Primary class for backward compatibility
        class_ids: data.classIds, // Array of all classes
        teacher_id: profile.id,
        title: data.title,
        date: data.date,
        topic: data.topic,
        description: data.description,
        student_snapshot: students.map(s => s.id),
        meeting_number: nextMeetingNumber
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
        class_ids,
        teacher_id,
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

    // If user is a teacher, get meetings where ANY of their classes match
    if (profile.role === 'teacher') {
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', user.id)

      if (teacherClasses && teacherClasses.length > 0) {
        const teacherClassIds = teacherClasses.map(tc => tc.class_id)
        
        // Fetch all meetings and filter client-side
        const { data, error } = await query
        
        if (error) {
          console.error('Error fetching meetings:', error)
          return { success: false, error: error.message, data: null }
        }
        
        // Filter meetings that include any of teacher's classes
        const filtered = (data || []).filter((meeting: any) => 
          meeting.class_ids?.some((classId: string) => teacherClassIds.includes(classId))
        )
        
        return { 
          success: true, 
          data: filtered,
          hasMore: filtered.length === limit 
        }
      } else {
        return { success: true, data: [], hasMore: false }
      }
    } else if (classId) {
      const classIds = classId.split(',')
      query = query.in('class_id', classIds)
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
        class_ids,
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
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    // Check permission
    const canEdit = await canEditOrDeleteMeeting(meetingId, user.id)
    if (!canEdit) {
      return { success: false, error: 'Anda tidak memiliki izin untuk mengubah pertemuan ini' }
    }
    
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
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    // Check permission
    const canDelete = await canEditOrDeleteMeeting(meetingId, user.id)
    if (!canDelete) {
      return { success: false, error: 'Anda tidak memiliki izin untuk menghapus pertemuan ini' }
    }
    
    // 1. Check if meeting has attendance logs
    const { data: attendanceLogs, error: checkError } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('meeting_id', meetingId)
      .limit(1)
    
    if (checkError) {
      console.error('Error checking attendance logs:', checkError)
      return { success: false, error: checkError.message }
    }
    
    // 2. If attendance logs exist, delete them first
    if (attendanceLogs && attendanceLogs.length > 0) {
      const { error: deleteLogsError } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('meeting_id', meetingId)
      
      if (deleteLogsError) {
        console.error('Error deleting attendance logs:', deleteLogsError)
        return { 
          success: false, 
          error: 'Gagal menghapus data absensi: ' + deleteLogsError.message 
        }
      }
    }
    
    // 3. Now delete the meeting
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
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('teacher_id, class_ids')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return { success: false, error: 'Meeting not found' }
    }

    // Get meeting date
    const { data: meetingDate, error: meetingError } = await supabase
      .from('meetings')
      .select('date')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meetingDate) {
      return { success: false, error: 'Meeting not found' }
    }

    // Prepare data for upsert
    const attendanceRecords = attendanceData.map(record => ({
      student_id: record.student_id,
      meeting_id: meetingId,
      date: meetingDate.date, // Include the meeting date
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

export async function getMeetingsWithStats(classId?: string, limit: number = 10, cursor?: string) {
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

    // Build meetings query
    let query = supabase
      .from('meetings')
      .select(`
        id,
        class_id,
        class_ids,
        teacher_id,
        title,
        date,
        topic,
        description,
        student_snapshot,
        created_at,
        classes (
          id,
          name,
          kelompok_id,
          kelompok:kelompok_id (
            id,
            name,
            desa_id,
            desa:desa_id (
              id,
              name,
              daerah_id,
              daerah:daerah_id (
                id,
                name
              )
            )
          )
        )
      `)
      .order('date', { ascending: false })
      .limit(limit)

    // If cursor (last meeting date) is provided, get meetings older than cursor
    if (cursor) {
      query = query.lt('date', cursor)
    }

    // If user is a teacher, get meetings where ANY of their classes match
    if (profile.role === 'teacher') {
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', user.id)

      if (teacherClasses && teacherClasses.length > 0) {
        const teacherClassIds = teacherClasses.map(tc => tc.class_id)
        
        // Fetch meetings and filter client-side
        const { data: meetings, error: meetingsError } = await query
        
        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError)
          return { success: false, error: meetingsError.message, data: null }
        }
        
        // Filter meetings that include any of teacher's classes
        const filteredMeetings = (meetings || []).filter((meeting: any) => 
          meeting.class_ids?.some((classId: string) => teacherClassIds.includes(classId))
        )
        
        if (!filteredMeetings || filteredMeetings.length === 0) {
          return { success: true, data: [], hasMore: false }
        }
        
        // Fetch class names for all class_ids
        const allClassIds = new Set<string>()
        filteredMeetings.forEach(meeting => {
          if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            meeting.class_ids.forEach(id => allClassIds.add(id))
          }
        })

        // Fetch class names in one query
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', Array.from(allClassIds))

        // Create id -> name mapping
        const classNameMap = new Map<string, string>()
        if (classesData) {
          classesData.forEach(c => classNameMap.set(c.id, c.name))
        }
        
        // Continue with stats processing using filteredMeetings
        const meetingIds = filteredMeetings.map(meeting => meeting.id)
        
        // Fetch ALL attendance data for these meetings in ONE query (fixes N+1 problem)
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_logs')
          .select('meeting_id, status')
          .in('meeting_id', meetingIds)

        if (attendanceError) {
          console.error('Error fetching attendance data:', attendanceError)
          return { success: false, error: attendanceError.message, data: null }
        }

        // Group attendance by meeting_id
        const attendanceByMeeting = (attendanceData || []).reduce((acc, record) => {
          if (!acc[record.meeting_id]) acc[record.meeting_id] = []
          acc[record.meeting_id].push(record)
          return acc
        }, {} as Record<string, any[]>)

        // Process meetings with stats
        const meetingsWithStats = filteredMeetings.map(meeting => {
          const meetingAttendance = attendanceByMeeting[meeting.id] || []
          const totalStudents = meeting.student_snapshot.length
          
          const presentCount = meetingAttendance.filter(record => record.status === 'H').length
          const absentCount = meetingAttendance.filter(record => record.status === 'A').length
          const sickCount = meetingAttendance.filter(record => record.status === 'S').length
          const excusedCount = meetingAttendance.filter(record => record.status === 'I').length
          
          const attendancePercentage = totalStudents > 0 
            ? Math.round((presentCount / totalStudents) * 100)
            : 0

          // Transform classes from array to single object to match our interface
          let classes: any = meeting.classes
          if (Array.isArray(meeting.classes) && meeting.classes.length > 0) {
            classes = meeting.classes[0]
          }
          
          // Transform kelompok from array to single object if needed
          if (classes && Array.isArray(classes.kelompok) && classes.kelompok.length > 0) {
            classes = {
              ...classes,
              kelompok: classes.kelompok[0]
            }
          }
          
          // Transform desa from array to single object if needed
          if (classes?.kelompok && Array.isArray(classes.kelompok.desa) && classes.kelompok.desa.length > 0) {
            classes = {
              ...classes,
              kelompok: {
                ...classes.kelompok,
                desa: classes.kelompok.desa[0]
              }
            }
          }
          
          // Transform daerah from array to single object if needed
          if (classes?.kelompok?.desa && Array.isArray(classes.kelompok.desa.daerah) && classes.kelompok.desa.daerah.length > 0) {
            classes = {
              ...classes,
              kelompok: {
                ...classes.kelompok,
                desa: {
                  ...classes.kelompok.desa,
                  daerah: classes.kelompok.desa.daerah[0]
                }
              }
            }
          }

          // Add class_names array
          const class_names = meeting.class_ids?.map((id: string) => classNameMap.get(id) || 'Unknown').filter(Boolean) || []

          return {
            ...meeting,
            classes,
            class_names,
            attendancePercentage,
            totalStudents,
            presentCount,
            absentCount,
            sickCount,
            excusedCount
          }
        })

        return { 
          success: true, 
          data: meetingsWithStats, 
          hasMore: meetingsWithStats.length === limit 
        }
      } else {
        return { success: true, data: [], hasMore: false }
      }
    } else if (classId) {
      const classIds = classId.split(',')
      query = query.in('class_id', classIds)
    }

    const { data: meetings, error: meetingsError } = await query

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError)
      return { success: false, error: meetingsError.message, data: null }
    }

    if (!meetings || meetings.length === 0) {
      return { success: true, data: [], hasMore: false }
    }

    // Fetch class names for all class_ids
    const allClassIds = new Set<string>()
    meetings.forEach(meeting => {
      if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
        meeting.class_ids.forEach(id => allClassIds.add(id))
      }
    })

    // Fetch class names in one query
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', Array.from(allClassIds))

    // Create id -> name mapping
    const classNameMap = new Map<string, string>()
    if (classesData) {
      classesData.forEach(c => classNameMap.set(c.id, c.name))
    }

    // Get all meeting IDs
    const meetingIds = meetings.map(meeting => meeting.id)

    // Fetch ALL attendance data for these meetings in ONE query (fixes N+1 problem)
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('meeting_id, status')
      .in('meeting_id', meetingIds)

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError)
      return { success: false, error: attendanceError.message, data: null }
    }

    // Group attendance by meeting_id
    const attendanceByMeeting = (attendanceData || []).reduce((acc, record) => {
      if (!acc[record.meeting_id]) acc[record.meeting_id] = []
      acc[record.meeting_id].push(record)
      return acc
    }, {} as Record<string, any[]>)

    // Process meetings with stats
    const meetingsWithStats = meetings.map(meeting => {
      const meetingAttendance = attendanceByMeeting[meeting.id] || []
      const totalStudents = meeting.student_snapshot.length
      
      const presentCount = meetingAttendance.filter(record => record.status === 'H').length
      const absentCount = meetingAttendance.filter(record => record.status === 'A').length
      const sickCount = meetingAttendance.filter(record => record.status === 'S').length
      const excusedCount = meetingAttendance.filter(record => record.status === 'I').length
      
      const attendancePercentage = totalStudents > 0 
        ? Math.round((presentCount / totalStudents) * 100)
        : 0

      // Transform classes from array to single object to match our interface
      let classes: any = meeting.classes
      if (Array.isArray(meeting.classes) && meeting.classes.length > 0) {
        classes = meeting.classes[0]
      }
      
      // Transform kelompok from array to single object if needed
      if (classes && Array.isArray(classes.kelompok) && classes.kelompok.length > 0) {
        classes = {
          ...classes,
          kelompok: classes.kelompok[0]
        }
      }
      
      // Transform desa from array to single object if needed
      if (classes?.kelompok && Array.isArray(classes.kelompok.desa) && classes.kelompok.desa.length > 0) {
        classes = {
          ...classes,
          kelompok: {
            ...classes.kelompok,
            desa: classes.kelompok.desa[0]
          }
        }
      }
      
      // Transform daerah from array to single object if needed
      if (classes?.kelompok?.desa && Array.isArray(classes.kelompok.desa.daerah) && classes.kelompok.desa.daerah.length > 0) {
        classes = {
          ...classes,
          kelompok: {
            ...classes.kelompok,
            desa: {
              ...classes.kelompok.desa,
              daerah: classes.kelompok.desa.daerah[0]
            }
          }
        }
      }

      // Add class_names array
      const class_names = meeting.class_ids?.map((id: string) => classNameMap.get(id) || 'Unknown').filter(Boolean) || []

      return {
        ...meeting,
        classes,
        class_names,
        attendancePercentage,
        totalStudents,
        presentCount,
        absentCount,
        sickCount,
        excusedCount
      }
    })

    return { 
      success: true, 
      data: meetingsWithStats, 
      hasMore: meetings.length === limit 
    }
  } catch (error) {
    console.error('Error in getMeetingsWithStats:', error)
    return { success: false, error: 'Internal server error', data: null }
  }
}
