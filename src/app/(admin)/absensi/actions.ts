'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { canEditOrDeleteMeeting } from '@/app/(admin)/absensi/utils/meetingHelpers'
import { isCaberawitClass, isTeacherClass } from '@/lib/utils/classHelpers'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'

interface AttendanceData {
  student_id: string
  date: string
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
}

interface CreateMeetingData {
  classIds: string[]
  kelompokIds?: string[] // Optional: kelompok IDs for SAMBUNG_DESA meeting type
  date: string
  title: string
  topic?: string
  description?: string
  meetingTypeCode?: string | null
  studentIds?: string[] // Optional: selected student IDs for the meeting
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
          student_classes(
            classes:class_id(id, name)
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

    // Get students for all selected classes to create snapshot (via junction table)
    // Use admin client to bypass RLS restrictions (similar to getAllStudents)
    const adminClient = await createAdminClient()

    // If user is a teacher, verify they teach all selected classes
    // Use admin client to bypass RLS restrictions
    if (profile.role === 'teacher') {
      // First, get ALL classes that the teacher teaches (not filtered by data.classIds)
      // This ensures we get all classes regardless of order or filter state
      const { data: allTeacherClasses } = await adminClient
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', user.id)

      const allTeacherClassIds = new Set(allTeacherClasses?.map(tc => tc.class_id) || [])
      
      // Now validate that all selected classes are in the teacher's classes
      const invalidClasses = data.classIds.filter(id => !allTeacherClassIds.has(id))
      
      if (invalidClasses.length > 0) {
        return { success: false, error: 'You can only create meetings for your own classes' }
      }
    }

    // Determine which students to include in the snapshot
    let studentIdsForSnapshot: string[]
    
    if (data.studentIds && data.studentIds.length > 0) {
      // Use provided student IDs (from user selection)
      // Verify all provided student IDs are valid and in selected classes
      const { data: studentClassData, error: studentClassError } = await adminClient
        .from('student_classes')
        .select('student_id')
        .in('class_id', data.classIds)
        .in('student_id', data.studentIds)

      if (studentClassError) {
        return { success: false, error: studentClassError.message }
      }

      if (!studentClassData || studentClassData.length === 0) {
        return { success: false, error: 'No valid students found in selected classes' }
      }

      // Get unique valid student IDs (filter to only include those in selected classes)
      const validStudentIds = [...new Set(studentClassData.map(sc => sc.student_id))]
      studentIdsForSnapshot = data.studentIds.filter(id => validStudentIds.includes(id))

      if (studentIdsForSnapshot.length === 0) {
        return { success: false, error: 'No valid students found in selected classes' }
      }

      // Verify students exist
      const { data: students, error: studentsError } = await adminClient
        .from('students')
        .select('id, name, class_id, kelompok_id')
        .in('id', studentIdsForSnapshot)

      if (studentsError) {
        return { success: false, error: studentsError.message }
      }

      if (!students || students.length === 0) {
        return { success: false, error: 'No students found' }
      }
    } else {
      // Default: get all students from selected classes (backward compatibility)
      const { data: studentClassData, error: studentClassError } = await adminClient
        .from('student_classes')
        .select('student_id')
        .in('class_id', data.classIds)

      if (studentClassError) {
        return { success: false, error: studentClassError.message }
      }

      if (!studentClassData || studentClassData.length === 0) {
        return { success: false, error: 'No students found in selected classes' }
      }

      // Get unique student IDs (a student might be in multiple selected classes)
      const uniqueStudentIds = [...new Set(studentClassData.map(sc => sc.student_id))]
      
      // Verify students exist and get their details
      const { data: students, error: studentsError } = await adminClient
        .from('students')
        .select('id, name, class_id, kelompok_id')
        .in('id', uniqueStudentIds)

      if (studentsError) {
        return { success: false, error: studentsError.message }
      }

      if (!students || students.length === 0) {
        return { success: false, error: 'No students found in selected classes' }
      }

      studentIdsForSnapshot = students.map(s => s.id)
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
    // Use admin client to bypass RLS restrictions for teachers with multiple kelompok
    // Validation already ensures teacher teaches all selected classes (lines 182-198)
    const { data: meeting, error } = await adminClient
      .from('meetings')
      .insert({
        class_id: data.classIds[0], // Primary class for backward compatibility
        class_ids: data.classIds, // Array of all classes
        kelompok_ids: data.kelompokIds || null, // Array of kelompok IDs for SAMBUNG_DESA
        teacher_id: profile.id,
        title: data.title,
        date: data.date,
        topic: data.topic,
        description: data.description,
        student_snapshot: studentIdsForSnapshot, // Use selected student IDs or all students
        meeting_number: nextMeetingNumber,
        meeting_type_code: data.meetingTypeCode // Meeting type code
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
    // Use admin client to bypass RLS restrictions for teachers with multiple kelompok
    const adminClient = await createAdminClient()
    
    const { data: meeting, error } = await adminClient
      .from('meetings')
      .select(`
        id,
        class_id,
        class_ids,
        kelompok_ids,
        teacher_id,
        title,
        date,
        topic,
        description,
        student_snapshot,
        created_at,
        meeting_type_code,
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
          ),
          class_master_mappings (
            class_master:class_master_id (
              category:category_id (
                is_sambung_capable
              )
            )
          )
        )
      `)
      .eq('id', meetingId)
      .single()

    if (error) {
      console.error('Error fetching meeting:', error)
      return { success: false, error: error.message, data: null }
    }

    if (!meeting) {
      return { success: false, error: 'Meeting not found', data: null }
    }

    // Get all class IDs from meeting
    const allClassIds = new Set<string>()
    if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
      meeting.class_ids.forEach((id: string) => allClassIds.add(id))
    }
    if (meeting.class_id) allClassIds.add(meeting.class_id)

    // Fetch all class details with kelompok info
    const { data: allClassesData } = await adminClient
      .from('classes')
      .select(`
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
      `)
      .in('id', Array.from(allClassIds))

    // Create a map of all classes data for easy lookup
    const allClassesMap = new Map<string, any>()
    if (allClassesData) {
      allClassesData.forEach(c => {
        // Transform kelompok from array to single object if needed
        let kelompok: any = Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
        if (kelompok) {
          // Transform desa from array to single object if needed
          const desa = Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa
          if (desa) {
            // Transform daerah from array to single object if needed
            const daerah = Array.isArray(desa.daerah) ? desa.daerah[0] : desa.daerah
            kelompok = {
              ...kelompok,
              desa: daerah ? { ...desa, daerah } : desa
            }
          }
        }
        allClassesMap.set(c.id, {
          id: c.id,
          name: c.name,
          kelompok_id: c.kelompok_id,
          kelompok
        })
      })
    }

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

    // Add allClasses array with complete information for all class_ids
    const allClasses: any[] = []
    if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
      meeting.class_ids.forEach((classId: string) => {
        const classData = allClassesMap.get(classId)
        if (classData) {
          allClasses.push(classData)
        }
      })
    }
    // Also include primary class_id if not already in class_ids
    if (meeting.class_id && !allClasses.find(c => c.id === meeting.class_id)) {
      const classData = allClassesMap.get(meeting.class_id)
      if (classData) {
        allClasses.push(classData)
      }
    }

    return { 
      success: true, 
      data: {
        ...meeting,
        classes,
        allClasses // Add allClasses array with complete information
      }
    }
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
    
    // Use admin client to bypass RLS for student snapshot update
    const adminClient = await createAdminClient()
    
    // Prepare update data
    const updateData: any = {
      title: data.title,
      date: data.date,
      topic: data.topic,
      description: data.description,
      meeting_type_code: data.meetingTypeCode,
      updated_at: new Date().toISOString()
    }

    // Handle kelompokIds update if provided
    if (data.kelompokIds !== undefined) {
      updateData.kelompok_ids = data.kelompokIds.length > 0 ? data.kelompokIds : null
    }

    // Handle classIds update if provided
    if (data.classIds && data.classIds.length > 0) {
      updateData.class_id = data.classIds[0]
      updateData.class_ids = data.classIds
    }
    
    // Handle studentIds update if provided
    if (data.studentIds !== undefined) {
      if (data.studentIds.length > 0) {
        // Verify all provided student IDs are valid and in selected classes
        const classIdsToCheck = data.classIds || []
        
        if (classIdsToCheck.length > 0) {
          const { data: studentClassData, error: studentClassError } = await adminClient
            .from('student_classes')
            .select('student_id')
            .in('class_id', classIdsToCheck)
            .in('student_id', data.studentIds)

          if (studentClassError) {
            return { success: false, error: studentClassError.message }
          }

          if (!studentClassData || studentClassData.length === 0) {
            return { success: false, error: 'No valid students found in selected classes' }
          }

          // Get unique valid student IDs
          const validStudentIds = [...new Set(studentClassData.map(sc => sc.student_id))]
          updateData.student_snapshot = data.studentIds.filter(id => validStudentIds.includes(id))

          if (updateData.student_snapshot.length === 0) {
            return { success: false, error: 'No valid students found in selected classes' }
          }
        } else {
          // If no classIds provided, just use the studentIds directly (assume they're valid)
          updateData.student_snapshot = data.studentIds
        }
      } else {
        // Empty array means no students selected (should not happen, but handle it)
        updateData.student_snapshot = []
      }
    }
    
    const { error } = await adminClient
      .from('meetings')
      .update(updateData)
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
    
    // Use admin client to bypass RLS restrictions when deleting
    // This ensures we can delete attendance_logs and meetings even if they're from different kelompok
    const adminClient = await createAdminClient()
    
    // 1. Check if meeting has attendance logs
    const { data: attendanceLogs, error: checkError } = await adminClient
      .from('attendance_logs')
      .select('id')
      .eq('meeting_id', meetingId)
      .limit(1)
    
    if (checkError) {
      console.error('Error checking attendance logs:', checkError)
      return { success: false, error: checkError.message }
    }
    
    // 2. If attendance logs exist, delete them first using admin client
    if (attendanceLogs && attendanceLogs.length > 0) {
      const { error: deleteLogsError } = await adminClient
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
    
    // 3. Now delete the meeting using admin client
    const { error } = await adminClient
      .from('meetings')
      .delete()
      .eq('id', meetingId)

    if (error) {
      console.error('Error deleting meeting:', error)
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503') {
        return { 
          success: false, 
          error: 'Tidak dapat menghapus pertemuan karena masih terdapat data absensi yang terkait. Silakan hapus data absensi terlebih dahulu.' 
        }
      }
      
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
    const { error } = await adminClient
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
    // Use admin client to bypass RLS restrictions for teachers with multiple kelompok
    const adminClient = await createAdminClient()
    
    const { data, error } = await adminClient
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
          class_id,
          kelompok_id,
          classes (
            id,
            name
          ),
          student_classes (
            class_id,
            classes:class_id (
              id,
              name,
              kelompok_id,
              kelompok:kelompok_id (
            id,
            name
              )
            )
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

/**
 * Get students from meeting snapshot using admin client to bypass RLS restrictions
 */
export async function getStudentsFromSnapshot(studentIds: string[]) {
  try {
    if (!studentIds || studentIds.length === 0) {
      return { success: true, data: [] }
    }

    const adminClient = await createAdminClient()
    
    const { data: students, error } = await adminClient
      .from('students')
      .select(`
        id,
        name,
        gender,
        class_id,
        kelompok_id,
        classes (
          id,
          name
        ),
        student_classes (
          class_id,
          classes:class_id (
            id,
            name
          )
        )
      `)
      .in('id', studentIds)
      .order('name')

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

export async function getMeetingsWithStats(classId?: string, limit: number = 10, cursor?: string) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated', data: null }
    }

    // Get user profile with hierarchy info for admin filtering
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, kelompok_id, desa_id, daerah_id')
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
        meeting_type_code,
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
          ),
          class_master_mappings (
            class_master:class_master_id (
              category:category_id (
                is_sambung_capable
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
        
        // For teacher, use admin client to bypass RLS restrictions
        // This allows teacher to see meetings from all kelompok (if they teach multiple classes)
        const adminClientTeacher = await createAdminClient()
        
        // Fetch kelompok_id dari semua kelas yang diajarkan teacher
        // Ini diperlukan untuk menampilkan meeting kelas "Pengajar" di kelompok yang sama
        const { data: teacherClassesData } = await adminClientTeacher
          .from('classes')
          .select(`
            id,
            name,
            kelompok_id,
            class_master_mappings (
              class_master:class_master_id (
                id,
                name,
                category:category_id (
                  id,
                  code,
                  name
                )
              )
            )
          `)
          .in('id', teacherClassIds)
        
        const teacherKelompokIds = new Set<string>()
        // Check apakah teacher mengajar Paud atau Kelas 1-6 menggunakan class_master
        const teacherCaberawit = teacherClassesData?.some(c => isCaberawitClass(c)) || false
        
        teacherClassesData?.forEach(c => {
          if (c.kelompok_id) {
            teacherKelompokIds.add(c.kelompok_id)
          }
        })
        const adminQuery = adminClientTeacher
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
            meeting_type_code,
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
              ),
              class_master_mappings (
                class_master:class_master_id (
                  id,
                  name,
                  category:category_id (
                    is_sambung_capable
                  )
                )
              )
            )
          `)
          .order('date', { ascending: false })
          .limit(limit)
        
        // If cursor (last meeting date) is provided, get meetings older than cursor
        if (cursor) {
          adminQuery.lt('date', cursor)
        }
        
        // Fetch ALL meetings using admin client (bypasses RLS)
        const { data: meetings, error: meetingsError } = await adminQuery
        
        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError)
          return { success: false, error: meetingsError.message, data: null }
        }
        
        // Collect all class IDs from meetings (termasuk dari class_ids array)
        // Ini diperlukan untuk fetch class details termasuk kelas "Pengajar"
        const allMeetingClassIds = new Set<string>()
        meetings?.forEach((m: any) => {
          if (m.class_ids && Array.isArray(m.class_ids)) {
            m.class_ids.forEach((id: string) => allMeetingClassIds.add(id))
          }
          if (m.class_id) allMeetingClassIds.add(m.class_id)
        })
        
        // Fetch class details untuk semua class IDs (termasuk "Pengajar")
        const { data: allMeetingClassesData } = await adminClientTeacher
          .from('classes')
          .select(`
            id,
            name,
            kelompok_id,
            class_master_mappings (
              class_master:class_master_id (
                id,
                name
              )
            )
          `)
          .in('id', Array.from(allMeetingClassIds))
        
        // Create mapping: classId -> { name, kelompok_id, class_master_mappings }
        const classDetailsMap = new Map<string, { name: string; kelompok_id: string | null; class_master_mappings?: any[] }>()
        allMeetingClassesData?.forEach(c => {
          classDetailsMap.set(c.id, {
            name: c.name,
            kelompok_id: c.kelompok_id,
            class_master_mappings: c.class_master_mappings || []
          })
        })
        
        // If classId is provided, filter by that specific class (and its kelompok)
        let filteredMeetings: any[]
        if (classId) {
          const classIds = classId.split(',')
          
          // Verify that the requested classId is one of teacher's classes
          const invalidClasses = classIds.filter(id => !teacherClassIds.includes(id))
          if (invalidClasses.length > 0) {
            return { success: false, error: 'You can only view meetings for your own classes', data: null }
          }
          
          // Fetch ALL class details from meetings to get kelompok_id for each class
          // This is important for multi-class meetings where meeting.classes only represents primary class
          const allMeetingClassIds = new Set<string>()
          meetings.forEach((m: any) => {
            if (m.class_ids && Array.isArray(m.class_ids)) {
              m.class_ids.forEach((id: string) => allMeetingClassIds.add(id))
            }
            if (m.class_id) allMeetingClassIds.add(m.class_id)
          })
          
          // Fetch all class details to get kelompok_id mapping
          const { data: allClassesData } = await adminClientTeacher
            .from('classes')
            .select('id, kelompok_id')
            .in('id', Array.from(allMeetingClassIds))
          
          // Create mapping: classId -> kelompok_id for ALL classes
          const allClassToKelompokMap = new Map<string, string>()
          if (allClassesData) {
            allClassesData.forEach(c => {
              if (c.kelompok_id) {
                allClassToKelompokMap.set(c.id, c.kelompok_id)
              }
            })
          }
          
          // Get expected kelompok_id for selected classes
          const { data: selectedClassesData } = await adminClientTeacher
            .from('classes')
            .select('id, name, kelompok_id')
            .in('id', classIds)
          
          // Create mapping: selected classId -> kelompok_id
          const classToKelompokMap = new Map<string, string>()
          if (selectedClassesData) {
            selectedClassesData.forEach(c => {
              if (c.kelompok_id) {
                classToKelompokMap.set(c.id, c.kelompok_id)
              }
            })
          }
          
          // Get expected kelompok_ids for selected classes
          const expectedKelompokIds = new Set<string>()
          classIds.forEach(id => {
            const kelompokId = classToKelompokMap.get(id)
            if (kelompokId) expectedKelompokIds.add(kelompokId)
          })
          
          // Filter meetings by selected class(es) and kelompok
          // PRIMARY filter: meetings must have at least one matching class that teacher teaches
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            // Get all class IDs from this meeting
            const meetingClassIds = new Set<string>()
            if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
              meeting.class_ids.forEach((id: string) => meetingClassIds.add(id))
            }
            if (meeting.class_id) {
              meetingClassIds.add(meeting.class_id)
            }

            // PRIMARY CHECK: Does meeting have ANY of the selected classes?
            // Also verify kelompok matches if applicable
            let hasMatchingClass = false

            for (const classId of classIds) {
              if (meetingClassIds.has(classId)) {
                // Found matching class - verify kelompok if needed
                const matchingClassKelompokId = allClassToKelompokMap.get(classId)
                const expectedKelompokId = classToKelompokMap.get(classId)

                // If both kelompok_ids exist and match, include
                if (expectedKelompokId && matchingClassKelompokId) {
                  if (expectedKelompokId === matchingClassKelompokId) {
                    hasMatchingClass = true
                    break
                  }
                } else if (!expectedKelompokId || !matchingClassKelompokId || expectedKelompokIds.size === 0) {
                  // No kelompok_id check needed (backward compatibility)
                  hasMatchingClass = true
                  break
                }
              }
            }

            if (hasMatchingClass) return true

            // ADDITIONAL ACCESS: Also check if meeting is for "Pengajar" in same kelompok
            // (only if selected class is NOT "Pengajar" AND teacher teaches Paud/Kelas 1-6)
            const selectedClassIsPengajar = classIds.some(id => {
              const classDetails = classDetailsMap.get(id)
              return classDetails ? isTeacherClass(classDetails) : false
            })
            
            if (!selectedClassIsPengajar && teacherCaberawit) {
              // Check from primary class
              if (meeting.classes && isTeacherClass(meeting.classes)) {
                const pengajarKelompokId = meeting.classes?.kelompok_id
                if (pengajarKelompokId && teacherKelompokIds.has(pengajarKelompokId)) {
                  return true
                }
              }
              
              // Check from class_ids array
              if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
                const hasPengajarInSameKelompok = meeting.class_ids.some((classId: string) => {
                  const classDetails = classDetailsMap.get(classId)
                  if (!classDetails) return false
                  
                  if (isTeacherClass(classDetails)) {
                    return classDetails.kelompok_id && teacherKelompokIds.has(classDetails.kelompok_id)
                  }
                  return false
                })
                
                if (hasPengajarInSameKelompok) return true
              }
            }

            // No match - hide meeting
            return false
          })
        } else {
          // If no classId provided, filter to meetings that include ANY of teacher's classes
          // This is the PRIMARY filter - meetings should ONLY appear if teacher teaches at least one class in the meeting
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            // PRIMARY CHECK: Does teacher teach ANY class in this meeting?
            // Check both class_ids array and single class_id
            const meetingClassIds = new Set<string>()

            if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
              meeting.class_ids.forEach((id: string) => meetingClassIds.add(id))
            }
            if (meeting.class_id) {
              meetingClassIds.add(meeting.class_id)
            }

            // Check if teacher teaches ANY of the meeting's classes
            const teachesAnyMeetingClass = teacherClassIds.some(teacherClassId =>
              meetingClassIds.has(teacherClassId)
            )

            if (teachesAnyMeetingClass) return true

            // ADDITIONAL ACCESS: Check if meeting is for "Pengajar" class in same kelompok
            // This is ONLY for Caberawit teachers (Paud/Kelas 1-6) to also see "Pengajar" meetings
            if (teacherCaberawit) {
              // Check from primary class (meeting.classes)
              if (meeting.classes && isTeacherClass(meeting.classes)) {
                const pengajarKelompokId = meeting.classes?.kelompok_id
                if (pengajarKelompokId && teacherKelompokIds.has(pengajarKelompokId)) {
                  return true
                }
              }
              
              // Check from class_ids array (for multi-class meetings)
              if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
                const hasPengajarInSameKelompok = meeting.class_ids.some((classId: string) => {
                  const classDetails = classDetailsMap.get(classId)
                  if (!classDetails) return false
                  
                  if (isTeacherClass(classDetails)) {
                    return classDetails.kelompok_id && teacherKelompokIds.has(classDetails.kelompok_id)
                  }
                  return false
                })
                
                if (hasPengajarInSameKelompok) return true
              }
            }
            
            return false
          })
        }
        
        if (!filteredMeetings || filteredMeetings.length === 0) {
          return { success: true, data: [], hasMore: false }
        }
        
        // Fetch class names for all class_ids
        const allClassIds = new Set<string>()
        filteredMeetings.forEach((meeting: any) => {
          if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            meeting.class_ids.forEach((id: string) => allClassIds.add(id))
          }
          if (meeting.class_id) allClassIds.add(meeting.class_id)
        })

        // Fetch class names and kelompok info in one query (use admin client to bypass RLS)
        const { data: classesData } = await adminClientTeacher
          .from('classes')
          .select(`
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
          `)
          .in('id', Array.from(allClassIds))

        // Create id -> name mapping
        const classNameMap = new Map<string, string>()
        if (classesData) {
          classesData.forEach(c => classNameMap.set(c.id, c.name))
        }
        
        // Create a map of all classes data for easy lookup
        const allClassesMap = new Map<string, any>()
        if (classesData) {
          classesData.forEach(c => {
            // Transform kelompok from array to single object if needed
            let kelompok: any = Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
            if (kelompok) {
              // Transform desa from array to single object if needed
              const desa = Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa
              if (desa) {
                // Transform daerah from array to single object if needed
                const daerah = Array.isArray(desa.daerah) ? desa.daerah[0] : desa.daerah
                kelompok = {
                  ...kelompok,
                  desa: daerah ? { ...desa, daerah } : desa
                }
              }
            }
            allClassesMap.set(c.id, {
              id: c.id,
              name: c.name,
              kelompok_id: c.kelompok_id,
              kelompok
            })
          })
        }
        
        // Continue with stats processing using filteredMeetings
        const meetingIds = filteredMeetings.map(meeting => meeting.id)
        
        // Fetch ALL attendance data for these meetings in batches (fixes N+1 problem)
        // Use admin client to bypass RLS restrictions (similar to detail page)
        const adminClientAttendance = await createAdminClient()
        const { data: attendanceData, error: attendanceError } = await fetchAttendanceLogsInBatches(
          adminClientAttendance,
          meetingIds
        )

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

        // For teachers, get their class IDs to filter students
        let teacherClassIdsTeacher: string[] = []
        if (profile.role === 'teacher') {
          const { data: teacherClasses } = await supabase
            .from('teacher_classes')
            .select('class_id')
            .eq('teacher_id', user.id)
          teacherClassIdsTeacher = teacherClasses?.map(tc => tc.class_id) || []
        }

        // Fetch student class mappings for filtering
        const allStudentIds = new Set<string>()
        filteredMeetings.forEach(meeting => {
          meeting.student_snapshot.forEach((id: string) => allStudentIds.add(id))
        })

        // Query students with junction table for multiple classes support
        // Use admin client to bypass RLS restrictions (similar to detail page)
        // This ensures all students from different kelompok are included
        const { data: studentClassData } = await adminClientTeacher
          .from('students')
          .select(`
            id,
            student_classes(
              classes:class_id(id)
            )
          `)
          .in('id', Array.from(allStudentIds))

        const studentToClassMap = new Map<string, string[]>()
        if (studentClassData) {
          studentClassData.forEach(s => {
            const classIds = (s.student_classes || [])
              .map((sc: any) => sc.classes?.id)
              .filter(Boolean)
            studentToClassMap.set(s.id, classIds)
          })
        }

        // Process meetings with stats
        const meetingsWithStats = filteredMeetings.map(meeting => {
          let meetingAttendance = attendanceByMeeting[meeting.id] || []
          let relevantStudentIds = meeting.student_snapshot
          
          // Check if meeting is for "Pengajar" class
          const isPengajarMeeting = (meeting.classes && isTeacherClass(meeting.classes)) ||
            (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.some((classId: string) => {
              const classDetails = classDetailsMap.get(classId)
              return classDetails ? isTeacherClass(classDetails) : false
            }))
          
          // For teachers: filter to only their class students (EXCEPT for Pengajar meetings)
          // Pengajar meetings should show all students from snapshot
          if (profile.role === 'teacher' && teacherClassIdsTeacher.length > 0 && !isPengajarMeeting) {
            relevantStudentIds = meeting.student_snapshot.filter((studentId: string) => {
              const studentClassIds = studentToClassMap.get(studentId) || []
              // Check if student has at least one class that matches teacher's classes
              return studentClassIds.some(classId => teacherClassIdsTeacher.includes(classId))
            })
            
            // Filter attendance to only relevant students
            const relevantStudentIdSet = new Set(relevantStudentIds)
            meetingAttendance = meetingAttendance.filter((record: any) => 
              relevantStudentIdSet.has(record.student_id)
            )
            
          }
          
          const totalStudents = relevantStudentIds.length
          
          const presentCount = meetingAttendance.filter((record: any) => record.status === 'H').length
          const absentCount = meetingAttendance.filter((record: any) => record.status === 'A').length
          const sickCount = meetingAttendance.filter((record: any) => record.status === 'S').length
          const excusedCount = meetingAttendance.filter((record: any) => record.status === 'I').length
          
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

          // Add class_names array - include both class_ids and primary class_id
          const classNamesSet = new Set<string>()
          if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            meeting.class_ids.forEach((id: string) => {
              const name = classNameMap.get(id)
              if (name) classNamesSet.add(name)
            })
          }
          // Also include primary class_id if not already in class_ids
          if (meeting.class_id) {
            const name = classNameMap.get(meeting.class_id)
            if (name) classNamesSet.add(name)
          }
          const class_names = Array.from(classNamesSet)
          
          // Add allClasses array with complete information for all class_ids
          const allClasses: any[] = []
          if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            meeting.class_ids.forEach((classId: string) => {
              const classData = allClassesMap.get(classId)
              if (classData) {
                allClasses.push(classData)
              }
            })
          }
          // Also include primary class_id if not already in class_ids
          if (meeting.class_id && !allClasses.find(c => c.id === meeting.class_id)) {
            const classData = allClassesMap.get(meeting.class_id)
            if (classData) {
              allClasses.push(classData)
            }
          }

          return {
            ...meeting,
            classes,
            allClasses, // Add allClasses array with complete information
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
    } 
    // Handle admin levels (kelompok, desa, daerah) and superadmin
    else if (profile.role === 'admin' || profile.role === 'superadmin') {
      // For all admin levels, use admin client to bypass RLS and filter client-side
      // This ensures multi-class meetings are properly filtered
      const adminClientAdmin = await createAdminClient()
      
      // Fetch ALL meetings using admin client (bypasses RLS)
      const adminQuery = adminClientAdmin
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
          meeting_type_code,
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
            ),
            class_master_mappings (
              class_master:class_master_id (
                category:category_id (
                  is_sambung_capable
                )
              )
            )
          )
        `)
        .order('date', { ascending: false })
        .limit(limit)
      
      if (cursor) {
        adminQuery.lt('date', cursor)
      }
      
      const { data: meetings, error: meetingsError } = await adminQuery
      
      if (meetingsError) {
        console.error('Error fetching meetings:', meetingsError)
        return { success: false, error: meetingsError.message, data: null }
      }
      
      if (!meetings || meetings.length === 0) {
        return { success: true, data: [], hasMore: false }
      }
      
      // Get all class IDs from meetings (including class_ids array)
      const allMeetingClassIds = new Set<string>()
      meetings.forEach((meeting: any) => {
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
          meeting.class_ids.forEach((id: string) => allMeetingClassIds.add(id))
        }
        if (meeting.class_id) allMeetingClassIds.add(meeting.class_id)
      })
      
      // Fetch all class details to get kelompok_id, desa_id, daerah_id
      const { data: allClassesData } = await adminClientAdmin
        .from('classes')
        .select(`
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
        `)
        .in('id', Array.from(allMeetingClassIds))
      
      // Create mappings: classId -> kelompok_id, desa_id, daerah_id
      const classToKelompokMap = new Map<string, string>()
      const classToDesaMap = new Map<string, string>()
      const classToDaerahMap = new Map<string, string>()
      
      if (allClassesData) {
        allClassesData.forEach(c => {
          if (c.kelompok_id) {
            classToKelompokMap.set(c.id, c.kelompok_id)
          }
          // Handle kelompok as object or array
          const kelompok = Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
          if (kelompok?.desa_id) {
            classToDesaMap.set(c.id, kelompok.desa_id)
          }
          // Handle desa as object or array
          const desa = Array.isArray(kelompok?.desa) ? kelompok.desa[0] : kelompok?.desa
          if (desa?.daerah_id) {
            classToDaerahMap.set(c.id, desa.daerah_id)
          }
        })
      }
      
      // Filter meetings based on admin level
      let filteredMeetings: any[] = []
      
      if (profile.role === 'superadmin') {
        // Superadmin: see all meetings
        filteredMeetings = meetings
      } else if (profile.role === 'admin') {
        // Admin levels: filter by hierarchy
        if (profile.kelompok_id) {
          // Admin Kelompok: filter by kelompok_id
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            const adminKelompokId = profile.kelompok_id
            
            // Check class_ids array first (for multi-class meetings)
            if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 0) {
              return meeting.class_ids.some((classId: string) => {
                const classKelompokId = classToKelompokMap.get(classId)
                return classKelompokId === adminKelompokId
              })
            }
            
            // Check primary class_id
            if (meeting.class_id) {
              const classKelompokId = classToKelompokMap.get(meeting.class_id)
              return classKelompokId === adminKelompokId
            }
            
            return false
          })
        } else if (profile.desa_id) {
          // Admin Desa: filter by desa_id
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            const adminDesaId = profile.desa_id
            
            // Check class_ids array first (for multi-class meetings)
            if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 0) {
              return meeting.class_ids.some((classId: string) => {
                const classDesaId = classToDesaMap.get(classId)
                return classDesaId === adminDesaId
              })
            }
            
            // Check primary class_id
            if (meeting.class_id) {
              const classDesaId = classToDesaMap.get(meeting.class_id)
              return classDesaId === adminDesaId
            }
            
            return false
          })
        } else if (profile.daerah_id) {
          // Admin Daerah: filter by daerah_id
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            const adminDaerahId = profile.daerah_id
            
            // Check class_ids array first (for multi-class meetings)
            if (meeting.class_ids && Array.isArray(meeting.class_ids) && meeting.class_ids.length > 0) {
              return meeting.class_ids.some((classId: string) => {
                const classDaerahId = classToDaerahMap.get(classId)
                return classDaerahId === adminDaerahId
              })
            }
            
            // Check primary class_id
            if (meeting.class_id) {
              const classDaerahId = classToDaerahMap.get(meeting.class_id)
              return classDaerahId === adminDaerahId
            }
            
            return false
          })
        } else {
          // Fallback: no filter (shouldn't happen for admin)
          filteredMeetings = meetings
        }
      }
      
      if (!filteredMeetings || filteredMeetings.length === 0) {
        return { success: true, data: [], hasMore: false }
      }
      
      // Continue with stats processing using filteredMeetings
      // Fetch class names for all class_ids
      const allClassIds = new Set<string>()
      filteredMeetings.forEach((meeting: any) => {
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
          meeting.class_ids.forEach((id: string) => allClassIds.add(id))
        }
        if (meeting.class_id && !allClassIds.has(meeting.class_id)) {
          allClassIds.add(meeting.class_id)
        }
      })
      
      // Fetch class names in one query
      const { data: classesData } = await adminClientAdmin
        .from('classes')
        .select('id, name')
        .in('id', Array.from(allClassIds))
      
      // Create id -> name mapping
      const classNameMap = new Map<string, string>()
      if (classesData) {
        classesData.forEach(c => classNameMap.set(c.id, c.name))
      }
      
      // Get all meeting IDs
      const meetingIds = filteredMeetings.map((meeting: any) => meeting.id)
      
      // Fetch ALL attendance data for these meetings in batches
      const adminClientAttendance = await createAdminClient()
      const { data: attendanceData, error: attendanceError } = await fetchAttendanceLogsInBatches(
        adminClientAttendance,
        meetingIds
      )
      
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
      
      // Create a map of all classes data for easy lookup
      const allClassesMap = new Map<string, any>()
      if (allClassesData) {
        allClassesData.forEach(c => {
          // Transform kelompok from array to single object if needed
          let kelompok: any = Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
          if (kelompok) {
            // Transform desa from array to single object if needed
            const desa = Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa
            if (desa) {
              // Transform daerah from array to single object if needed
              const daerah = Array.isArray(desa.daerah) ? desa.daerah[0] : desa.daerah
              kelompok = {
                ...kelompok,
                desa: daerah ? { ...desa, daerah } : desa
              }
            }
          }
          allClassesMap.set(c.id, {
            id: c.id,
            name: c.name,
            kelompok_id: c.kelompok_id,
            kelompok
          })
        })
      }
      
      // Process meetings with stats
      const meetingsWithStats = filteredMeetings.map((meeting: any) => {
        const meetingAttendance = attendanceByMeeting[meeting.id] || []
        const relevantStudentIds = meeting.student_snapshot
        
        const totalStudents = relevantStudentIds.length
        
        const presentCount = meetingAttendance.filter((record: any) => record.status === 'H').length
        const absentCount = meetingAttendance.filter((record: any) => record.status === 'A').length
        const sickCount = meetingAttendance.filter((record: any) => record.status === 'S').length
        const excusedCount = meetingAttendance.filter((record: any) => record.status === 'I').length
        
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
        
        // Add class_names array - include both class_ids and primary class_id
        const classNamesSet = new Set<string>()
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
          meeting.class_ids.forEach((id: string) => {
            const name = classNameMap.get(id)
            if (name) classNamesSet.add(name)
          })
        }
        // Also include primary class_id if not already in class_ids
        if (meeting.class_id) {
          const name = classNameMap.get(meeting.class_id)
          if (name) classNamesSet.add(name)
        }
        const class_names = Array.from(classNamesSet)
        
        // Add allClasses array with complete information for all class_ids
        const allClasses: any[] = []
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
          meeting.class_ids.forEach((classId: string) => {
            const classData = allClassesMap.get(classId)
            if (classData) {
              allClasses.push(classData)
            }
          })
        }
        // Also include primary class_id if not already in class_ids
        if (meeting.class_id && !allClasses.find(c => c.id === meeting.class_id)) {
          const classData = allClassesMap.get(meeting.class_id)
          if (classData) {
            allClasses.push(classData)
          }
        }
        
        return {
          ...meeting,
          classes,
          allClasses, // Add allClasses array with complete information
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
        hasMore: filteredMeetings.length === limit 
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

    // Fetch ALL attendance data for these meetings in batches (fixes N+1 problem)
    // Use admin client to bypass RLS restrictions (similar to detail page)
    const adminClientAttendanceAdmin = await createAdminClient()
    const { data: attendanceData, error: attendanceError } = await fetchAttendanceLogsInBatches(
      adminClientAttendanceAdmin,
      meetingIds
    )

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

    // For teachers, get their class IDs to filter students (admin/superadmin path)
    let teacherClassIdsAdmin: string[] = []
    if (profile.role === 'teacher') {
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', user.id)
      teacherClassIdsAdmin = teacherClasses?.map(tc => tc.class_id) || []
    }

    // Fetch student class mappings for filtering (admin/superadmin path)
    const allStudentIds = new Set<string>()
    meetings.forEach(meeting => {
      meeting.student_snapshot.forEach((id: string) => allStudentIds.add(id))
    })

    // Use admin client to bypass RLS restrictions (similar to detail page)
    // This ensures all students from different kelompok are included
    const adminClientAdmin = await createAdminClient()
    const { data: studentClassData } = await adminClientAdmin
      .from('students')
      .select('id, class_id')
      .in('id', Array.from(allStudentIds))

    const studentToClassMap = new Map<string, string>()
    if (studentClassData) {
      studentClassData.forEach(s => studentToClassMap.set(s.id, s.class_id))
    }

    // Process meetings with stats
    const meetingsWithStats = meetings.map(meeting => {
      let meetingAttendance = attendanceByMeeting[meeting.id] || []
      let relevantStudentIds = meeting.student_snapshot
      
      // For teachers: filter to only their class students
      if (profile.role === 'teacher' && teacherClassIdsAdmin.length > 0) {
        relevantStudentIds = meeting.student_snapshot.filter((studentId: string) => {
          const studentClassId = studentToClassMap.get(studentId)
          return studentClassId && teacherClassIdsAdmin.includes(studentClassId)
        })
        
        // Filter attendance to only relevant students
        const relevantStudentIdSet = new Set(relevantStudentIds)
        meetingAttendance = meetingAttendance.filter((record: any) => 
          relevantStudentIdSet.has(record.student_id)
        )
        
      }
      
      const totalStudents = relevantStudentIds.length
      
      const presentCount = meetingAttendance.filter((record: any) => record.status === 'H').length
      const absentCount = meetingAttendance.filter((record: any) => record.status === 'A').length
      const sickCount = meetingAttendance.filter((record: any) => record.status === 'S').length
      const excusedCount = meetingAttendance.filter((record: any) => record.status === 'I').length
      
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
