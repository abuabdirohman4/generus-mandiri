/**
 * Student Use Cases - Business logic orchestration
 *
 * This module orchestrates business logic by calling:
 * - Repository layer (database access)
 * - Validation layer (input validation)
 * - Transform layer (data transformation)
 * - Permission checks (from studentPermissions.ts)
 *
 * Use cases are the "glue" between layers.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import * as studentRepository from '@/repositories/studentRepository'
import * as studentTransform from './studentTransform'
import * as studentValidation from './studentValidation'
import type { StudentWithClasses } from '@/types/student'
import type { UserProfile } from '@/repositories/studentRepository'

// ============================================================================
// GET ALL STUDENTS (with role-based filtering)
// ============================================================================

export interface GetAllStudentsParams {
  supabaseClient: SupabaseClient
  adminClient: SupabaseClient
  currentUser: UserProfile
  classId?: string
}

/**
 * Get all students with role-based filtering
 *
 * - Teachers: Only see students in their assigned classes
 * - Admins: See all students in their organizational scope (RLS handles filtering)
 * - Superadmin: See all students
 */
export async function getAllStudents(
  params: GetAllStudentsParams
): Promise<StudentWithClasses[]> {
  const { supabaseClient, adminClient, currentUser, classId } = params

  // TEACHER ROLE: Only see students in assigned classes
  if (currentUser.role === 'teacher') {
    return await getStudentsForTeacher({
      adminClient,
      currentUser,
      classId,
    })
  }

  // ADMIN/SUPERADMIN ROLE: Use RLS filtering (regular supabase client)
  return await getStudentsForAdmin({
    supabaseClient,
    classId,
  })
}

/**
 * Get students for teacher (only assigned classes)
 */
async function getStudentsForTeacher(params: {
  adminClient: SupabaseClient
  currentUser: UserProfile
  classId?: string
}): Promise<StudentWithClasses[]> {
  const { adminClient, currentUser, classId } = params

  // Get teacher's class IDs
  const teacherClassIds = currentUser.classes.map((c) => c.id)

  if (teacherClassIds.length === 0) {
    return []
  }

  // Filter by specific class if provided
  let classIdsToQuery = teacherClassIds
  if (classId) {
    const requestedClassIds = classId.split(',')
    // Intersection: only classes that teacher teaches AND user requested
    classIdsToQuery = teacherClassIds.filter((id) =>
      requestedClassIds.includes(id)
    )

    if (classIdsToQuery.length === 0) {
      return [] // Teacher doesn't teach any of the requested classes
    }
  }

  // Query students from teacher's classes using admin client (bypass RLS)
  const studentRows = await studentRepository.findStudentsByClassIds(
    adminClient,
    classIdsToQuery
  )

  // Transform to domain models
  return studentTransform.transformStudentRows(studentRows)
}

/**
 * Get students for admin (RLS handles organizational filtering)
 */
async function getStudentsForAdmin(params: {
  supabaseClient: SupabaseClient
  classId?: string
}): Promise<StudentWithClasses[]> {
  const { supabaseClient, classId } = params

  // Build query with RLS
  let query = supabaseClient
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
    .order('name')

  // Filter by class if provided
  if (classId) {
    const classIds = classId.split(',')
    // Query students via junction table
    const { data: studentClassData } = await supabaseClient
      .from('student_classes')
      .select('student_id')
      .in('class_id', classIds)

    if (studentClassData && studentClassData.length > 0) {
      const studentIds = studentClassData.map((sc) => sc.student_id)
      query = query.in('id', studentIds)
    } else {
      return [] // No students in requested classes
    }
  }

  const { data: students, error } = await query

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  // Transform to domain models
  return studentTransform.transformStudentRows(students || [])
}

// ============================================================================
// CREATE STUDENT
// ============================================================================

export interface CreateStudentParams {
  adminClient: SupabaseClient
  supabaseClient: SupabaseClient
  currentUser: UserProfile
  formData: FormData
}

export interface CreateStudentResult {
  success: boolean
  error?: string
  studentId?: string
}

/**
 * Create new student with validation and permission checks
 */
export async function createStudent(
  params: CreateStudentParams
): Promise<CreateStudentResult> {
  const { adminClient, supabaseClient, formData } = params

  // 1. Extract and validate input
  const data = studentValidation.extractFormData(formData)
  const validation = studentValidation.validateStudentCreate(data)

  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  const validData = validation.data

  // 2. Get organizational hierarchy (daerah/desa from kelompok)
  let kelompokId: string | null = validData.kelompokId || null
  let desaId: string | null = null
  let daerahId: string | null = null

  if (kelompokId) {
    const kelompok = await studentRepository.findKelompokById(
      supabaseClient,
      kelompokId
    )
    if (!kelompok) {
      return { success: false, error: 'Kelompok tidak ditemukan' }
    }

    const desa = Array.isArray(kelompok.desa)
      ? kelompok.desa[0]
      : kelompok.desa
    desaId = desa?.id || null
    const daerah = Array.isArray(desa?.daerah)
      ? desa?.daerah[0]
      : desa?.daerah
    daerahId = daerah?.id || null
  } else {
    // Use current user's organizational hierarchy
    const currentUser = await studentRepository.getCurrentUserProfile(
      supabaseClient
    )
    kelompokId = currentUser.kelompok_id
    desaId = currentUser.desa_id
    daerahId = currentUser.daerah_id
  }

  // 3. Insert student to database
  const insertData = {
    name: validData.name,
    gender: validData.gender,
    class_id: validData.classId,
    kelompok_id: kelompokId,
    desa_id: desaId,
    daerah_id: daerahId,
    status: 'active' as const,
  }

  const newStudent = await studentRepository.insertStudent(
    adminClient,
    insertData
  )

  // 4. Insert to junction table for multi-class support
  if (newStudent?.id) {
    await studentRepository.upsertStudentClasses(adminClient, newStudent.id, [
      validData.classId,
    ])
  }

  return { success: true, studentId: newStudent.id }
}

// ============================================================================
// UPDATE STUDENT
// ============================================================================

export interface UpdateStudentParams {
  adminClient: SupabaseClient
  supabaseClient: SupabaseClient
  currentUser: UserProfile
  studentId: string
  formData: FormData
}

export interface UpdateStudentResult {
  success: boolean
  error?: string
}

/**
 * Update student with multi-class support and validation
 */
export async function updateStudent(
  params: UpdateStudentParams
): Promise<UpdateStudentResult> {
  const { adminClient, supabaseClient, studentId, formData, currentUser } =
    params

  // 1. Extract and validate input
  const data = studentValidation.extractUpdateFormData(formData)
  const validation = studentValidation.validateStudentUpdate(data)

  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  const validData = validation.data

  // 2. For teacher, validate that selected classes are their assigned classes
  if (currentUser.role === 'teacher') {
    const teacherClassIds = currentUser.classes.map((c) => c.id)
    const invalidClasses = validData.classIds.filter(
      (id) => !teacherClassIds.includes(id)
    )
    if (invalidClasses.length > 0) {
      return {
        success: false,
        error: 'Anda hanya dapat mengupdate siswa ke kelas yang Anda ajarkan',
      }
    }
  }

  // 3. Get organizational hierarchy if kelompok_id provided
  let updateData: {
    name: string
    gender: string
    class_id: string
    kelompok_id?: string | null
    desa_id?: string | null
    daerah_id?: string | null
    updated_at: string
  } = {
    name: validData.name,
    gender: validData.gender,
    class_id: validData.classIds[0], // Primary class
    updated_at: new Date().toISOString(),
  }

  if (validData.kelompokId) {
    const kelompok = await studentRepository.findKelompokById(
      supabaseClient,
      validData.kelompokId
    )
    if (!kelompok) {
      return { success: false, error: 'Kelompok tidak ditemukan' }
    }

    const desa = Array.isArray(kelompok.desa)
      ? kelompok.desa[0]
      : kelompok.desa
    const daerah = Array.isArray(desa?.daerah)
      ? desa?.daerah[0]
      : desa?.daerah

    updateData.kelompok_id = validData.kelompokId
    updateData.desa_id = desa?.id || null
    updateData.daerah_id = daerah?.id || null
  }

  // 4. Update student
  await studentRepository.updateStudentData(adminClient, studentId, updateData)

  // 5. Sync junction table (multi-class support)
  const currentClassIds = await studentRepository.findStudentClassIds(
    adminClient,
    studentId
  )
  const newClassIds = new Set(validData.classIds)
  const currentClassIdsSet = new Set(currentClassIds)

  // Delete removed classes
  const toDelete = currentClassIds.filter((id) => !newClassIds.has(id))
  if (toDelete.length > 0) {
    await studentRepository.deleteStudentFromClasses(
      adminClient,
      studentId,
      toDelete
    )
  }

  // Insert new classes
  const toInsert = validData.classIds.filter(
    (id) => !currentClassIdsSet.has(id)
  )
  if (toInsert.length > 0) {
    await studentRepository.upsertStudentClasses(
      adminClient,
      studentId,
      toInsert
    )
  }

  return { success: true }
}

// ============================================================================
// DELETE STUDENT
// ============================================================================

export interface DeleteStudentParams {
  adminClient: SupabaseClient
  supabaseClient: SupabaseClient
  currentUser: UserProfile
  studentId: string
  permanent: boolean
}

export interface DeleteStudentResult {
  success: boolean
  error?: string
}

/**
 * Delete student (soft or hard delete) with permission checks
 */
export async function deleteStudent(
  params: DeleteStudentParams
): Promise<DeleteStudentResult> {
  const { adminClient, supabaseClient, currentUser, studentId, permanent } =
    params

  // 1. Get student data
  const student = await studentRepository.findStudentById(
    adminClient,
    studentId
  )

  if (!student) {
    return { success: false, error: 'Siswa tidak ditemukan' }
  }

  // 2. Permission checks (using existing studentPermissions.ts)
  // For now, we'll implement basic checks - in Phase 3 we'll integrate fully
  if (permanent) {
    // Hard delete: Only superadmin
    if (currentUser.role !== 'superadmin') {
      return {
        success: false,
        error: 'Hanya superadmin yang dapat menghapus siswa secara permanen',
      }
    }

    // Must be soft deleted first
    if (!student.deleted_at) {
      return {
        success: false,
        error: 'Siswa harus di-soft delete terlebih dahulu sebelum hard delete',
      }
    }

    // Delete from junction table first
    await studentRepository.deleteAllStudentClasses(adminClient, studentId)

    // Delete permanently
    await studentRepository.hardDeleteStudent(adminClient, studentId)
  } else {
    // Soft delete: Check permissions
    // Basic check - full permission check will be in Phase 3
    if (
      currentUser.role !== 'admin' &&
      currentUser.role !== 'superadmin'
    ) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk menghapus siswa ini',
      }
    }

    // Get current user ID for deleted_by field
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Soft delete
    await studentRepository.softDeleteStudent(adminClient, studentId, user.id)
  }

  return { success: true }
}

// ============================================================================
// GET STUDENT INFO
// ============================================================================

export interface GetStudentInfoParams {
  supabaseClient: SupabaseClient
  studentId: string
}

/**
 * Get student info with classes
 */
export async function getStudentInfo(params: GetStudentInfoParams) {
  const { supabaseClient, studentId } = params

  const student = await studentRepository.findStudentById(
    supabaseClient,
    studentId
  )

  if (!student) {
    throw new Error('Siswa tidak ditemukan')
  }

  const classes = studentTransform.extractStudentClasses(
    student.student_classes || []
  )
  const primaryClass = studentTransform.getPrimaryClass(classes)

  return {
    id: student.id,
    name: student.name,
    gender: student.gender,
    class_id: primaryClass?.id || student.class_id || null,
    classes,
  }
}

// ============================================================================
// GET STUDENT BIODATA
// ============================================================================

export interface GetStudentBiodataParams {
  supabaseClient: SupabaseClient
  studentId: string
}

export interface GetStudentBiodataResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * Get student biodata
 */
export async function getStudentBiodata(
  params: GetStudentBiodataParams
): Promise<GetStudentBiodataResult> {
  const { supabaseClient, studentId } = params

  try {
    const data = await studentRepository.findStudentBiodata(
      supabaseClient,
      studentId
    )
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch biodata',
    }
  }
}

// ============================================================================
// UPDATE STUDENT BIODATA
// ============================================================================

export interface UpdateStudentBiodataParams {
  supabaseClient: SupabaseClient
  studentId: string
  biodata: any
}

export interface UpdateStudentBiodataResult {
  success: boolean
  error?: string
}

/**
 * Update student biodata
 */
export async function updateStudentBiodata(
  params: UpdateStudentBiodataParams
): Promise<UpdateStudentBiodataResult> {
  const { supabaseClient, studentId, biodata } = params

  // Validate biodata
  const validation = studentValidation.validateBiodataUpdate(biodata)
  if (!validation.success) {
    return { success: false, error: validation.error }
  }

  try {
    await studentRepository.updateStudentBiodataData(
      supabaseClient,
      studentId,
      validation.data
    )
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update biodata',
    }
  }
}
