/**
 * Student Repository - Pure database access layer
 *
 * This module contains ONLY database queries (Supabase operations).
 * NO business logic, NO permission checks, NO data transformation.
 *
 * Functions accept Supabase client as parameter (dependency injection).
 * Returns raw database rows or throws errors.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// AUTHENTICATION & USER PROFILE
// ============================================================================

export interface UserProfileRow {
  role: string
  kelompok_id: string | null
  desa_id: string | null
  daerah_id: string | null
  teacher_classes?: Array<{
    class_id: string
    classes?: { id: string; name: string }
  }>
}

export interface UserProfile {
  role: string
  kelompok_id: string | null
  desa_id: string | null
  daerah_id: string | null
  classes: Array<{ id: string; name: string }>
}

/**
 * Get current authenticated user's profile
 */
export async function getCurrentUserProfile(
  supabaseClient: SupabaseClient
): Promise<UserProfile> {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select(
      `
      role,
      kelompok_id,
      desa_id,
      daerah_id,
      teacher_classes!teacher_classes_teacher_id_fkey(
        class_id,
        classes:class_id(id, name)
      )
    `
    )
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  // Transform teacher_classes to classes array
  const classesData =
    profile.teacher_classes
      ?.map((tc: any) => tc.classes)
      .filter(Boolean) || []

  return {
    role: profile.role,
    kelompok_id: profile.kelompok_id,
    desa_id: profile.desa_id,
    daerah_id: profile.daerah_id,
    classes: classesData,
  }
}

/**
 * Get user role by ID
 */
export async function getUserRole(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role || null
}

// ============================================================================
// STUDENT QUERIES
// ============================================================================

export interface StudentRow {
  id: string
  name: string
  gender: string | null
  class_id: string | null
  kelompok_id: string | null
  desa_id: string | null
  daerah_id: string | null
  status: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  student_classes?: Array<{
    classes?: { id: string; name: string }
  }>
  daerah?: any
  desa?: any
  kelompok?: any
}

/**
 * Find students by class IDs (via junction table + direct class_id)
 */
export async function findStudentsByClassIds(
  adminClient: SupabaseClient,
  classIds: string[]
): Promise<StudentRow[]> {
  // Get student IDs from junction table
  const { data: studentClassData } = await adminClient
    .from('student_classes')
    .select('student_id')
    .in('class_id', classIds)

  const studentIdsFromJunction = new Set<string>(
    studentClassData?.map((sc: any) => sc.student_id) || []
  )

  // Get student IDs from direct class_id field
  const { data: studentsFromClassId } = await adminClient
    .from('students')
    .select('id')
    .is('deleted_at', null)
    .in('class_id', classIds)

  const studentIdsFromClassId = new Set<string>(
    studentsFromClassId?.map((s: any) => s.id) || []
  )

  // Combine both sources
  const studentIds = [
    ...new Set([...studentIdsFromJunction, ...studentIdsFromClassId]),
  ]

  if (studentIds.length === 0) {
    return []
  }

  // Query students with full data
  const { data: students, error } = await adminClient
    .from('students')
    .select(
      `
      id,
      name,
      gender,
      class_id,
      kelompok_id,
      desa_id,
      daerah_id,
      status,
      created_at,
      updated_at,
      student_classes(
        classes:class_id(id, name)
      ),
      daerah:daerah_id(name),
      desa:desa_id(name),
      kelompok:kelompok_id(name)
    `
    )
    .is('deleted_at', null)
    .in('id', studentIds)
    .order('name')

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return students || []
}

/**
 * Find student by ID
 */
export async function findStudentById(
  supabaseClient: SupabaseClient,
  studentId: string
): Promise<StudentRow | null> {
  const { data, error } = await supabaseClient
    .from('students')
    .select(
      `
      id,
      name,
      gender,
      class_id,
      kelompok_id,
      desa_id,
      daerah_id,
      status,
      created_at,
      updated_at,
      deleted_at,
      student_classes(
        classes:class_id(id, name)
      ),
      daerah:daerah_id(name),
      desa:desa_id(name),
      kelompok:kelompok_id(name)
    `
    )
    .eq('id', studentId)
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

/**
 * Find student with complete biodata
 */
export async function findStudentBiodata(
  supabaseClient: SupabaseClient,
  studentId: string
): Promise<any> {
  const { data, error } = await supabaseClient
    .from('students')
    .select(
      `
      id,
      name,
      nomor_induk,
      gender,
      tempat_lahir,
      tanggal_lahir,
      anak_ke,
      alamat,
      nomor_telepon,
      nama_ayah,
      nama_ibu,
      alamat_orangtua,
      telepon_orangtua,
      pekerjaan_ayah,
      pekerjaan_ibu,
      nama_wali,
      alamat_wali,
      pekerjaan_wali,
      kelompok_id,
      kelompok:kelompok_id(id, name),
      desa_id,
      desa:desa_id(id, name),
      daerah_id,
      daerah:daerah_id(id, name),
      created_at,
      updated_at
    `
    )
    .eq('id', studentId)
    .is('deleted_at', null)
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

export interface StudentInsertData {
  name: string
  gender: string
  class_id: string
  kelompok_id: string | null
  desa_id: string | null
  daerah_id: string | null
  status?: string
}

/**
 * Insert new student
 */
export async function insertStudent(
  adminClient: SupabaseClient,
  data: StudentInsertData
): Promise<StudentRow> {
  const { data: newStudent, error } = await adminClient
    .from('students')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return newStudent
}

export interface StudentUpdateData {
  name?: string
  gender?: string
  class_id?: string
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
  updated_at?: string
}

/**
 * Update student data
 */
export async function updateStudentData(
  adminClient: SupabaseClient,
  studentId: string,
  data: StudentUpdateData
): Promise<StudentRow> {
  const { data: updatedStudent, error } = await adminClient
    .from('students')
    .update(data)
    .eq('id', studentId)
    .select(
      `
      id,
      name,
      gender,
      class_id,
      created_at,
      updated_at
    `
    )
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return updatedStudent
}

/**
 * Update student biodata
 */
export async function updateStudentBiodataData(
  adminClient: SupabaseClient,
  studentId: string,
  biodata: any
): Promise<void> {
  const { error } = await adminClient
    .from('students')
    .update(biodata)
    .eq('id', studentId)

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }
}

/**
 * Soft delete student (mark as deleted)
 */
export async function softDeleteStudent(
  adminClient: SupabaseClient,
  studentId: string,
  userId: string
): Promise<void> {
  const { error } = await adminClient
    .from('students')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq('id', studentId)

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }
}

/**
 * Hard delete student (permanent removal)
 */
export async function hardDeleteStudent(
  adminClient: SupabaseClient,
  studentId: string
): Promise<void> {
  const { error } = await adminClient
    .from('students')
    .delete()
    .eq('id', studentId)

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }
}

// ============================================================================
// STUDENT CLASSES (Junction Table)
// ============================================================================

/**
 * Get student's class IDs from junction table
 */
export async function findStudentClassIds(
  adminClient: SupabaseClient,
  studentId: string
): Promise<string[]> {
  const { data, error } = await adminClient
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId)

  if (error) {
    console.error('Error fetching student class IDs:', error)
    return []
  }

  return data?.map((sc: any) => sc.class_id) || []
}

/**
 * Upsert student classes (sync junction table)
 */
export async function upsertStudentClasses(
  adminClient: SupabaseClient,
  studentId: string,
  classIds: string[]
): Promise<void> {
  const assignments = classIds.map((classId) => ({
    student_id: studentId,
    class_id: classId,
  }))

  const { error } = await adminClient
    .from('student_classes')
    .upsert(assignments, { onConflict: 'student_id,class_id' })

  if (error && error.code !== '23505') {
    // Ignore duplicate errors
    console.error('Error upserting student classes:', error)
  }
}

/**
 * Delete student from specific classes
 */
export async function deleteStudentFromClasses(
  adminClient: SupabaseClient,
  studentId: string,
  classIds: string[]
): Promise<void> {
  const { error } = await adminClient
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)
    .in('class_id', classIds)

  if (error && error.code !== 'PGRST301') {
    console.error('Error deleting student from classes:', error)
  }
}

/**
 * Delete all student class assignments (for hard delete)
 */
export async function deleteAllStudentClasses(
  adminClient: SupabaseClient,
  studentId: string
): Promise<void> {
  const { error } = await adminClient
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)

  if (error && error.code !== 'PGRST301') {
    console.error('Error deleting all student classes:', error)
  }
}

// ============================================================================
// ATTENDANCE CHECKS
// ============================================================================

/**
 * Check if student has any attendance logs
 */
export async function hasAttendanceLogs(
  adminClient: SupabaseClient,
  studentId: string
): Promise<boolean> {
  try {
    const { data } = await adminClient
      .from('attendance_logs')
      .select('id')
      .eq('student_id', studentId)
      .limit(1)
      .maybeSingle()

    return !!data
  } catch (error) {
    console.error('Error checking student attendance:', error)
    return false
  }
}

/**
 * Find attendance history for student in specific month
 */
export async function findAttendanceHistory(
  adminClient: SupabaseClient,
  studentId: string,
  year: number,
  month: number
): Promise<any[]> {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const endDate = `${year}-${month
    .toString()
    .padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

  const { data, error } = await adminClient
    .from('attendance_logs')
    .select(
      `
      id,
      date,
      status,
      reason,
      meeting_id,
      meetings!inner(
        id,
        title,
        topic,
        description,
        meeting_type_code,
        classes (
          id,
          name,
          class_master_mappings (
            class_master:class_master_id (
              category:category_id (
                is_sambung_capable
              )
            )
          )
        )
      )
    `
    )
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// ORGANIZATIONAL HIERARCHY
// ============================================================================

/**
 * Find kelompok with organizational hierarchy
 */
export async function findKelompokById(
  supabaseClient: SupabaseClient,
  kelompokId: string
): Promise<any> {
  const { data, error } = await supabaseClient
    .from('kelompok')
    .select(
      `
      id,
      desa_id,
      desa:desa_id(
        id,
        daerah_id,
        daerah:daerah_id(id)
      )
    `
    )
    .eq('id', kelompokId)
    .single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  return data
}

/**
 * Find class name by ID
 */
export async function findClassById(
  supabaseClient: SupabaseClient,
  classId: string
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabaseClient
    .from('classes')
    .select('id, name')
    .eq('id', classId)
    .single()

  if (error) {
    console.error('Error fetching class:', error)
    return null
  }

  return data
}

/**
 * Find multiple class names by IDs (batch query)
 */
export async function findClassesByIds(
  supabaseClient: SupabaseClient,
  classIds: string[]
): Promise<Array<{ id: string; name: string }>> {
  if (classIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseClient
    .from('classes')
    .select('id, name')
    .in('id', classIds)

  if (error) {
    console.error('Error fetching classes:', error)
    return []
  }

  return data || []
}
