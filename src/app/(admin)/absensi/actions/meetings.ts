'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

import { revalidatePath } from 'next/cache'
import { canEditOrDeleteMeeting } from '@/app/(admin)/absensi/utils/meetingHelpers'
import { isCaberawitClass, isTeacherClass } from '@/lib/utils/classHelpers'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'
import {
  validateMeetingData,
  buildStudentSnapshot,
  canUserAccessMeeting
} from '../utils/meetingValidation'
import type {
  Meeting,
  CreateMeetingData,
  UpdateMeetingData
} from '@/types/meeting'

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: DATABASE QUERIES (Private - DB access only)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchMeetingById(supabase: any, meetingId: string) {
  const { data, error } = await supabase
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
      updated_at,
      meeting_type_code,
      created_by,
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

  if (error) throw error
  return data
}

async function fetchMeetingsByClass(
  supabase: any,
  classId: string | undefined,
  limit: number,
  cursor: string | undefined
) {
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
      kelompok_ids,
      classes (
        id,
        name
      )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  if (classId) {
    query = query.contains('class_ids', [classId])
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

async function insertMeeting(supabase: any, data: CreateMeetingData, userId: string) {
  const meetingData = {
    class_id: data.classIds[0], // Primary class for backward compatibility
    class_ids: data.classIds,
    kelompok_ids: data.kelompokIds || null,
    teacher_id: userId,
    title: data.title,
    date: data.date,
    topic: data.topic,
    description: data.description,
    student_snapshot: data.studentIds,
    meeting_type_code: data.meetingTypeCode,
    created_by: userId,
  }

  const { data: result, error } = await supabase
    .from('meetings')
    .insert(meetingData)
    .select()
    .single()

  if (error) throw error
  return result
}

async function updateMeetingRecord(
  supabase: any,
  meetingId: string,
  data: UpdateMeetingData
) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (data.title !== undefined) updateData.title = data.title
  if (data.date !== undefined) updateData.date = data.date
  if (data.topic !== undefined) updateData.topic = data.topic
  if (data.description !== undefined) updateData.description = data.description
  if (data.meetingTypeCode !== undefined) updateData.meeting_type_code = data.meetingTypeCode

  if (data.classIds !== undefined && data.classIds.length > 0) {
    updateData.class_id = data.classIds[0]
    updateData.class_ids = data.classIds
  }

  if (data.kelompokIds !== undefined) {
    updateData.kelompok_ids = data.kelompokIds.length > 0 ? data.kelompokIds : null
  }

  if (data.studentIds !== undefined) {
    updateData.student_snapshot = data.studentIds
  }

  const { data: result, error } = await supabase
    .from('meetings')
    .update(updateData)
    .eq('id', meetingId)
    .select()
    .single()

  if (error) throw error
  return result
}

async function softDeleteMeeting(supabase: any, meetingId: string) {
  // First check and delete attendance logs
  const { data: attendanceLogs, error: checkError } = await supabase
    .from('attendance_logs')
    .select('id')
    .eq('meeting_id', meetingId)
    .limit(1)

  if (checkError) throw checkError

  // If attendance logs exist, delete them first
  if (attendanceLogs && attendanceLogs.length > 0) {
    const { error: deleteLogsError } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('meeting_id', meetingId)

    if (deleteLogsError) throw deleteLogsError
  }

  // Now delete the meeting
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId)

  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2: BUSINESS LOGIC - Imported from ../utils/meetingValidation.ts
// ─────────────────────────────────────────────────────────────────────────────
// validateMeetingData, buildStudentSnapshot, canUserAccessMeeting

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3: SERVER ACTIONS (Exported - Thin orchestrators)
// ─────────────────────────────────────────────────────────────────────────────

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

    // Validate meeting data
    const validation = validateMeetingData(data)
    if (!validation.ok) {
      return { success: false, error: validation.error }
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
      // Get student IDs from junction table
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

    // Create meeting data with student snapshot
    const meetingData: CreateMeetingData = {
      ...data,
      studentIds: studentIdsForSnapshot
    }

    // Insert meeting using Layer 1
    const meeting = await insertMeeting(adminClient, meetingData, profile.id)

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

    // If user is a teacher, get meetings where ANY of their classes match
    if (profile.role === 'teacher') {
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', user.id)

      if (teacherClasses && teacherClasses.length > 0) {
        const teacherClassIds = teacherClasses.map(tc => tc.class_id)

        // Fetch all meetings using Layer 1
        const data = await fetchMeetingsByClass(supabase, classId, limit, cursor)

        // Filter meetings that include any of teacher's classes
        const filtered = (data || []).filter((meeting: any) =>
          meeting.class_ids?.some((meetingClassId: string) => teacherClassIds.includes(meetingClassId))
        )

        return {
          success: true,
          data: filtered,
          hasMore: filtered.length === limit
        }
      } else {
        return { success: true, data: [], hasMore: false }
      }
    }

    // For admin/superadmin, fetch meetings using Layer 1
    const data = await fetchMeetingsByClass(supabase, classId, limit, cursor)

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

    // Fetch meeting using Layer 1
    const meeting = await fetchMeetingById(adminClient, meetingId)

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

export async function updateMeeting(meetingId: string, data: UpdateMeetingData) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check permission using existing helper
    const canEdit = await canEditOrDeleteMeeting(meetingId, user.id)
    if (!canEdit) {
      return { success: false, error: 'Anda tidak memiliki izin untuk mengubah pertemuan ini' }
    }

    // Use admin client to bypass RLS for student snapshot update
    const adminClient = await createAdminClient()

    // Handle studentIds validation if provided
    if (data.studentIds !== undefined && data.studentIds.length > 0) {
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
        const validatedStudentIds = data.studentIds.filter(id => validStudentIds.includes(id))

        if (validatedStudentIds.length === 0) {
          return { success: false, error: 'No valid students found in selected classes' }
        }

        // Update data with validated student IDs
        data.studentIds = validatedStudentIds
      }
    }

    // Update meeting using Layer 1
    await updateMeetingRecord(adminClient, meetingId, data)

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

    // Check permission using existing helper
    const canDelete = await canEditOrDeleteMeeting(meetingId, user.id)
    if (!canDelete) {
      return { success: false, error: 'Anda tidak memiliki izin untuk menghapus pertemuan ini' }
    }

    // Use admin client to bypass RLS restrictions when deleting
    // This ensures we can delete attendance_logs and meetings even if they're from different kelompok
    const adminClient = await createAdminClient()

    // Delete meeting using Layer 1 (handles cascade delete of attendance logs)
    await softDeleteMeeting(adminClient, meetingId)

    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteMeeting:', error)

    // Check if it's a foreign key constraint error
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return {
        success: false,
        error: 'Tidak dapat menghapus pertemuan karena masih terdapat data absensi yang terkait. Silakan hapus data absensi terlebih dahulu.'
      }
    }

    return { success: false, error: 'Internal server error' }
  }
}

// TODO: This function is 986 lines and needs further refactoring
// For pilot, copied from actions.ts:986-2524 as-is
// Will be broken down in future iterations
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
        // === REGULAR TEACHER: Has assigned classes ===
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
      } else if (profile.kelompok_id || profile.desa_id || profile.daerah_id) {
        // === HIERARCHICAL TEACHER: Guru Desa/Daerah ===
        // Use the same pattern as Admin filtering (lines 1651-1846)
        const adminClientTeacher = await createAdminClient()

        // Fetch ALL meetings using admin client (bypasses RLS)
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
        const { data: allClassesData } = await adminClientTeacher
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

        // Filter meetings based on hierarchical level
        let filteredMeetings: any[] = []

        if (profile.kelompok_id) {
          // Teacher Kelompok: filter by kelompok_id
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            const meetingClassIds = meeting.class_ids?.length > 0
              ? meeting.class_ids
              : [meeting.class_id].filter(Boolean)

            return meetingClassIds.some((classId: string) =>
              classToKelompokMap.get(classId) === profile.kelompok_id
            )
          })
        } else if (profile.desa_id) {
          // Teacher Desa: filter by desa_id
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            const meetingClassIds = meeting.class_ids?.length > 0
              ? meeting.class_ids
              : [meeting.class_id].filter(Boolean)

            return meetingClassIds.some((classId: string) =>
              classToDesaMap.get(classId) === profile.desa_id
            )
          })
        } else if (profile.daerah_id) {
          // Teacher Daerah: filter by daerah_id
          filteredMeetings = (meetings || []).filter((meeting: any) => {
            const meetingClassIds = meeting.class_ids?.length > 0
              ? meeting.class_ids
              : [meeting.class_id].filter(Boolean)

            return meetingClassIds.some((classId: string) =>
              classToDaerahMap.get(classId) === profile.daerah_id
            )
          })
        }

        if (!filteredMeetings || filteredMeetings.length === 0) {
          return { success: true, data: [], hasMore: false }
        }

        // Continue with stats processing (same as Admin section)
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
        const { data: classesData } = await adminClientTeacher
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
        const { data: attendanceData, error: attendanceError } = await fetchAttendanceLogsInBatches(
          adminClientTeacher,
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
        const allClassesMap = new Map()
        if (allClassesData) {
          allClassesData.forEach(c => {
            const kelompok = Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
            const desa = Array.isArray(kelompok?.desa) ? kelompok?.desa[0] : kelompok?.desa
            const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah

            allClassesMap.set(c.id, {
              id: c.id,
              name: c.name,
              kelompok_id: c.kelompok_id,
              kelompok: kelompok ? {
                id: kelompok.id,
                name: kelompok.name,
                desa_id: kelompok.desa_id,
                desa: desa ? {
                  id: desa.id,
                  name: desa.name,
                  daerah_id: desa.daerah_id,
                  daerah: daerah ? {
                    id: daerah.id,
                    name: daerah.name
                  } : null
                } : null
              } : null
            })
          })
        }

        // Calculate statistics for each meeting
        const meetingsWithStats = filteredMeetings.map((meeting: any) => {
          const attendance = attendanceByMeeting[meeting.id] || []
          const totalStudents = attendance.length
          const presentCount = attendance.filter((a: any) => a.status === 'H').length
          const absentCount = attendance.filter((a: any) => a.status === 'A').length
          const sickCount = attendance.filter((a: any) => a.status === 'S').length
          const excusedCount = attendance.filter((a: any) => a.status === 'I').length
          const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

          // Build classes object (primary class from meeting.classes)
          let classes = meeting.classes
          if (Array.isArray(classes)) {
            classes = classes[0]
          }

          // Build class_names array from all class_ids
          const classNamesSet = new Set<string>()
          if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            meeting.class_ids.forEach((classId: string) => {
              const name = classNameMap.get(classId)
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
            allClasses,
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
        // Teacher with no classes and no hierarchy - return empty
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
