/**
 * Student Queries (Layer 1)
 *
 * Database queries for student operations.
 * NO 'use server' directive - pure query builders.
 * All functions accept supabase client as parameter for testability.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const STUDENT_SELECT = `
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

export async function fetchAllStudents(
  supabase: SupabaseClient,
  classId?: string
) {
  let query = supabase
    .from('students')
    .select(STUDENT_SELECT)
    .is('deleted_at', null)
    .order('name')

  if (classId) {
    const classIds = classId.split(',')
    const { data: studentClassData } = await supabase
      .from('student_classes')
      .select('student_id')
      .in('class_id', classIds)

    if (studentClassData && studentClassData.length > 0) {
      const studentIds = studentClassData.map(sc => sc.student_id)
      query = query.in('id', studentIds)
    } else {
      return { data: [], error: null }
    }
  }

  return await query
}

export async function fetchStudentsByIds(
  supabase: SupabaseClient,
  studentIds: string[]
) {
  return await supabase
    .from('students')
    .select(STUDENT_SELECT)
    .is('deleted_at', null)
    .in('id', studentIds)
    .order('name')
}

export async function insertStudent(
  supabase: SupabaseClient,
  data: {
    name: string
    gender: string
    class_id: string
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
  }
) {
  return await supabase
    .from('students')
    .insert(data)
    .select()
    .single()
}

export async function insertStudentClass(
  supabase: SupabaseClient,
  studentId: string,
  classId: string
) {
  return await supabase
    .from('student_classes')
    .insert({
      student_id: studentId,
      class_id: classId
    })
    .select()
}

export async function updateStudentRecord(
  supabase: SupabaseClient,
  studentId: string,
  data: {
    name: string
    gender: string
    class_id: string
    kelompok_id?: string | null
    desa_id?: string | null
    daerah_id?: string | null
    updated_at: string
  }
) {
  return await supabase
    .from('students')
    .update(data)
    .eq('id', studentId)
    .select(`
      id,
      name,
      gender,
      class_id,
      created_at,
      updated_at
    `)
    .single()
}

export async function fetchCurrentStudentClasses(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId)
}

export async function deleteStudentClasses(
  supabase: SupabaseClient,
  studentId: string,
  classIds: string[]
) {
  return await supabase
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)
    .in('class_id', classIds)
}

export async function insertStudentClasses(
  supabase: SupabaseClient,
  studentId: string,
  classIds: string[]
) {
  const assignments = classIds.map(classId => ({
    student_id: studentId,
    class_id: classId
  }))

  return await supabase
    .from('student_classes')
    .insert(assignments)
}

export async function softDeleteStudent(
  supabase: SupabaseClient,
  studentId: string,
  userId: string
) {
  return await supabase
    .from('students')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', studentId)
}

export async function hardDeleteStudent(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .delete()
    .eq('id', studentId)
}

export async function deleteStudentClassesByStudentId(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)
}

export async function fetchStudentById(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .select(`
      id,
      name,
      gender,
      class_id,
      student_classes(
        classes:class_id(id, name)
      )
    `)
    .is('deleted_at', null)
    .eq('id', studentId)
    .single()
}

export async function fetchStudentBiodata(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .select(`
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
    `)
    .eq('id', studentId)
    .is('deleted_at', null)
    .single()
}

export async function updateStudentBiodata(
  supabase: SupabaseClient,
  studentId: string,
  biodata: any
) {
  return await supabase
    .from('students')
    .update(biodata)
    .eq('id', studentId)
}

export async function fetchStudentAttendanceHistory(
  supabase: SupabaseClient,
  studentId: string,
  startDate: string,
  endDate: string
) {
  return await supabase
    .from('attendance_logs')
    .select(`
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
    `)
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
}

export async function checkStudentHasAttendance(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('attendance_logs')
    .select('id')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle()
}

export async function fetchClassNames(
  supabase: SupabaseClient,
  classIds: string[]
) {
  return await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds)
}

export async function insertStudentsBatch(
  supabase: SupabaseClient,
  students: Array<{
    name: string
    gender: string
    class_id: string
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
  }>
) {
  return await supabase
    .from('students')
    .insert(students)
    .select()
}

export async function insertStudentClassesBatch(
  supabase: SupabaseClient,
  assignments: Array<{
    student_id: string
    class_id: string
  }>
) {
  return await supabase
    .from('student_classes')
    .insert(assignments)
}
