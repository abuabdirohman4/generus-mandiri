'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature } from '@/lib/accessControlServer'

export interface Student {
  id: string
  name: string
  gender: string | null
  class_id?: string | null // Optional untuk backward compatibility
  created_at: string
  updated_at: string
  category?: string | null
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
  classes: Array<{
    id: string
    name: string
  }> // Changed from single object to array for multiple classes support
  daerah_name?: string
  desa_name?: string
  kelompok_name?: string
  class_name?: string // Primary class name (first class) untuk backward compatibility
}


/**
 * Mendapatkan profile user saat ini
 */
export async function getUserProfile() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        role,
        kelompok_id,
        desa_id,
        daerah_id,
        teacher_classes!teacher_classes_teacher_id_fkey(
          class_id,
          classes:class_id(id, name)
        )
      `)
      .eq('id', user.id)
      .single()

    // Transform teacher_classes to classes array
    const classesData = profile?.teacher_classes?.map((tc: any) => tc.classes).filter(Boolean) || [];

    if (!profile) {
      throw new Error('User profile not found')
    }

    return {
      role: profile.role,
      kelompok_id: profile.kelompok_id,
      desa_id: profile.desa_id,
      daerah_id: profile.daerah_id,
      class_id: classesData[0]?.id || null,
      class_name: classesData[0]?.name || null,
      classes: classesData  // Return all classes, not just the first one
    }
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat profile user')
    throw error
  }
}

/**
 * Mendapatkan daftar siswa dengan informasi kelas (mendukung multiple classes via junction table)
 */
export async function getAllStudents(classId?: string): Promise<Student[]> {
  try {
    const supabase = await createClient()

    // Get current user profile to check role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, teacher_classes(class_id)')
      .eq('id', user.id)
      .single()

    // For teacher, use admin client to bypass RLS and filter by teacher's classes
    // Query dengan junction table student_classes untuk support multiple classes
    if (profile?.role === 'teacher' && profile.teacher_classes && profile.teacher_classes.length > 0) {
      const teacherClassIds = profile.teacher_classes.map((tc: any) => tc.class_id)

      // Use admin client to bypass RLS
      const adminClient = await createAdminClient()

      // Get student IDs from both sources:
      // 1. student_classes junction table (for students with multiple classes)
      // 2. students.class_id directly (for students with single class - backward compatibility)
      const studentIdsFromJunction = new Set<string>()
      const studentIdsFromClassId = new Set<string>()

      // Query from junction table
      const { data: studentClassData } = await adminClient
        .from('student_classes')
        .select('student_id')
        .in('class_id', teacherClassIds)

      if (studentClassData && studentClassData.length > 0) {
        studentClassData.forEach((sc: any) => {
          studentIdsFromJunction.add(sc.student_id)
        })
      }

      // Query from students.class_id directly (backward compatibility)
      const { data: studentsFromClassId } = await adminClient
        .from('students')
        .select('id')
        .is('deleted_at', null)
        .in('class_id', teacherClassIds)

      if (studentsFromClassId && studentsFromClassId.length > 0) {
        studentsFromClassId.forEach((s: any) => {
          studentIdsFromClassId.add(s.id)
        })
      }

      // Combine both sources
      const studentIds = [...new Set([...studentIdsFromJunction, ...studentIdsFromClassId])]

      if (studentIds.length === 0) {
        return []
      }

      // Apply additional classId filter if provided
      if (classId) {
        const classIds = classId.split(',')
        const filteredClassIds = classIds.filter(id => teacherClassIds.includes(id))
        if (filteredClassIds.length === 0) {
          return []
        }

        // Get students for specific classes
        const filteredStudentIdsFromJunction = new Set<string>()
        const filteredStudentIdsFromClassId = new Set<string>()

        const { data: filteredStudentClassData } = await adminClient
          .from('student_classes')
          .select('student_id')
          .in('class_id', filteredClassIds)

        if (filteredStudentClassData && filteredStudentClassData.length > 0) {
          filteredStudentClassData.forEach((sc: any) => {
            filteredStudentIdsFromJunction.add(sc.student_id)
          })
        }

        const { data: filteredStudentsFromClassId } = await adminClient
          .from('students')
          .select('id')
          .is('deleted_at', null)
          .in('class_id', filteredClassIds)

        if (filteredStudentsFromClassId && filteredStudentsFromClassId.length > 0) {
          filteredStudentsFromClassId.forEach((s: any) => {
            filteredStudentIdsFromClassId.add(s.id)
          })
        }

        const filteredStudentIds = [...new Set([...filteredStudentIdsFromJunction, ...filteredStudentIdsFromClassId])]
        // Intersect with teacher's students
        const finalStudentIds = studentIds.filter(id => filteredStudentIds.includes(id))

        if (finalStudentIds.length === 0) {
          return []
        }

        // Query students with final filtered IDs using admin client
        const { data: students, error } = await adminClient
          .from('students')
          .select(`
            id,
            name,
            gender,
            class_id,
            kelompok_id,
            desa_id,
            daerah_id,
            created_at,
            updated_at,
            student_classes(
              classes:class_id(id, name)
            ),
            daerah:daerah_id(name),
            desa:desa_id(name),
            kelompok:kelompok_id(name)
          `)
          .is('deleted_at', null)
          .in('id', finalStudentIds)
          .order('name')

        if (error) {
          throw error
        }

        return await transformStudentsData(students || [], adminClient)
      }

      // Query students for all teacher's classes using admin client
      const { data: students, error: studentsError } = await adminClient
        .from('students')
        .select(`
           id,
           name,
           gender,
           class_id,
           kelompok_id,
           desa_id,
           daerah_id,
           created_at,
           updated_at,
           student_classes(
             classes:class_id(id, name)
           ),
           daerah:daerah_id(name),
           desa:desa_id(name),
           kelompok:kelompok_id(name)
         `)
        .is('deleted_at', null)
        .in('id', studentIds)
        .order('name')

      if (studentsError) {
        throw studentsError
      }

      return await transformStudentsData(students || [], adminClient)
    }

    // For non-teacher roles, use existing logic with junction table
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        gender,
        class_id,
        kelompok_id,
        desa_id,
        daerah_id,
        created_at,
        updated_at,
        student_classes(
          classes:class_id(id, name)
        ),
        daerah:daerah_id(name),
        desa:desa_id(name),
        kelompok:kelompok_id(name)
      `)
      .is('deleted_at', null)
      .order('name')

    // Filter by class if classId provided
    // Filter via junction table untuk support multiple classes
    if (classId) {
      const classIds = classId.split(',')
      // Query students yang punya class di junction table
      const { data: studentClassData } = await supabase
        .from('student_classes')
        .select('student_id')
        .in('class_id', classIds)

      if (studentClassData && studentClassData.length > 0) {
        const studentIds = studentClassData.map(sc => sc.student_id)
        query = query.in('id', studentIds)
      } else {
        // Jika tidak ada siswa di kelas tersebut, return empty array
        return []
      }
    }

    const { data: students, error } = await query

    if (error) {
      throw error
    }

    // Transform data dengan support untuk multiple classes
    if (!Array.isArray(students)) {
      return []
    }

    return students
      .filter(student => student && typeof student === 'object')
      .map(student => {
        try {
          // Extract classes dari junction table
          const studentClasses = Array.isArray(student.student_classes) ? student.student_classes : []
          const classesArray = studentClasses
            .filter((sc: any) => sc && sc.classes && typeof sc.classes === 'object')
            .map((sc: any) => sc.classes)
            .filter((cls: any) => cls && (cls.id || cls.name))
            .map((cls: any) => ({
              id: String(cls.id || ''),
              name: String(cls.name || '')
            }))

          // Get primary class (first class) untuk backward compatibility
          const primaryClass = classesArray[0] || null

          // Safely extract daerah, desa, kelompok names
          const getDaerahName = () => {
            if (!student.daerah) return ''
            if (Array.isArray(student.daerah)) {
              if (student.daerah.length > 0 && student.daerah[0] && typeof student.daerah[0] === 'object' && 'name' in student.daerah[0]) {
                return String((student.daerah[0] as any).name || '')
              }
              return ''
            }
            if (typeof student.daerah === 'object' && student.daerah !== null && 'name' in student.daerah) {
              return String((student.daerah as any).name || '')
            }
            return ''
          }

          const getDesaName = () => {
            if (!student.desa) return ''
            if (Array.isArray(student.desa)) {
              if (student.desa.length > 0 && student.desa[0] && typeof student.desa[0] === 'object' && 'name' in student.desa[0]) {
                return String((student.desa[0] as any).name || '')
              }
              return ''
            }
            if (typeof student.desa === 'object' && student.desa !== null && 'name' in student.desa) {
              return String((student.desa as any).name || '')
            }
            return ''
          }

          const getKelompokName = () => {
            if (!student.kelompok) return ''
            if (Array.isArray(student.kelompok)) {
              if (student.kelompok.length > 0 && student.kelompok[0] && typeof student.kelompok[0] === 'object' && 'name' in student.kelompok[0]) {
                return String((student.kelompok[0] as any).name || '')
              }
              return ''
            }
            if (typeof student.kelompok === 'object' && student.kelompok !== null && 'name' in student.kelompok) {
              return String((student.kelompok as any).name || '')
            }
            return ''
          }

          return {
            ...student,
            classes: Array.isArray(classesArray) ? classesArray : [],
            class_id: primaryClass?.id || student.class_id || null,
            class_name: primaryClass?.name || '',
            daerah_name: getDaerahName(),
            desa_name: getDesaName(),
            kelompok_name: getKelompokName()
          }
        } catch (error) {
          console.error('Error transforming student data:', error, student)
          // Return minimal valid student object
          return {
            id: String(student.id || ''),
            name: String(student.name || ''),
            gender: student.gender || null,
            class_id: student.class_id || null,
            kelompok_id: student.kelompok_id || null,
            desa_id: student.desa_id || null,
            daerah_id: student.daerah_id || null,
            created_at: String(student.created_at || ''),
            updated_at: String(student.updated_at || ''),
            classes: [],
            class_name: '',
            daerah_name: '',
            desa_name: '',
            kelompok_name: ''
          }
        }
      })
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar siswa')
    throw error
  }
}

// Helper function to transform students data for teacher (support multiple classes)
async function transformStudentsData(students: any[], adminClient?: any): Promise<Student[]> {
  if (!Array.isArray(students)) {
    return []
  }

  // Get class names for students that don't have junction table entries
  const classIdsToQuery = new Set<string>()
  students.forEach(student => {
    if (!student || typeof student !== 'object') return
    const studentClasses = Array.isArray(student.student_classes) ? student.student_classes : []
    if (studentClasses.length === 0 && student.class_id) {
      classIdsToQuery.add(String(student.class_id))
    }
  })

  // Query class names if needed
  let classNameMap = new Map<string, string>()
  if (classIdsToQuery.size > 0 && adminClient) {
    try {
      const { data: classesData } = await adminClient
        .from('classes')
        .select('id, name')
        .in('id', Array.from(classIdsToQuery))

      if (Array.isArray(classesData)) {
        classesData.forEach((c: any) => {
          if (c && c.id) {
            classNameMap.set(String(c.id), String(c.name || ''))
          }
        })
      }
    } catch (error) {
      console.error('Error fetching class names:', error)
      // Continue without class names
    }
  }

  return students
    .filter(student => student && typeof student === 'object')
    .map(student => {
      try {
        // Extract all classes from junction table
        const studentClasses = Array.isArray(student.student_classes) ? student.student_classes : []
        const classesArray = studentClasses
          .filter((sc: any) => sc && sc.classes && typeof sc.classes === 'object')
          .map((sc: any) => sc.classes)
          .filter((cls: any) => cls && (cls.id || cls.name))
          .map((cls: any) => ({
            id: String(cls.id || ''),
            name: String(cls.name || '')
          }))

        // If no classes from junction table, use class_id directly (backward compatibility)
        if (classesArray.length === 0 && student.class_id) {
          const className = classNameMap.get(String(student.class_id)) || student.class_name || 'Unknown Class'
          classesArray.push({
            id: String(student.class_id),
            name: String(className)
          })
        }

        // Get primary class (first class) for backward compatibility
        const primaryClass = classesArray[0] || null

        // Safely extract student properties without classes
        const studentWithoutClasses: any = { ...student }
        delete studentWithoutClasses.classes
        delete studentWithoutClasses.student_classes

        // Safely extract daerah, desa, kelompok names
        const getDaerahName = () => {
          if (!student.daerah) return ''
          if (Array.isArray(student.daerah)) {
            if (student.daerah.length > 0 && student.daerah[0] && typeof student.daerah[0] === 'object' && 'name' in student.daerah[0]) {
              return String((student.daerah[0] as any).name || '')
            }
            return ''
          }
          if (typeof student.daerah === 'object' && student.daerah !== null && 'name' in student.daerah) {
            return String((student.daerah as any).name || '')
          }
          return ''
        }

        const getDesaName = () => {
          if (!student.desa) return ''
          if (Array.isArray(student.desa)) {
            if (student.desa.length > 0 && student.desa[0] && typeof student.desa[0] === 'object' && 'name' in student.desa[0]) {
              return String((student.desa[0] as any).name || '')
            }
            return ''
          }
          if (typeof student.desa === 'object' && student.desa !== null && 'name' in student.desa) {
            return String((student.desa as any).name || '')
          }
          return ''
        }

        const getKelompokName = () => {
          if (!student.kelompok) return ''
          if (Array.isArray(student.kelompok)) {
            if (student.kelompok.length > 0 && student.kelompok[0] && typeof student.kelompok[0] === 'object' && 'name' in student.kelompok[0]) {
              return String((student.kelompok[0] as any).name || '')
            }
            return ''
          }
          if (typeof student.kelompok === 'object' && student.kelompok !== null && 'name' in student.kelompok) {
            return String((student.kelompok as any).name || '')
          }
          return ''
        }

        return {
          ...studentWithoutClasses,
          classes: Array.isArray(classesArray) ? classesArray : [], // Array of all classes
          class_name: primaryClass?.name || '',
          daerah_name: getDaerahName(),
          desa_name: getDesaName(),
          kelompok_name: getKelompokName()
        }
      } catch (error) {
        console.error('Error transforming student data:', error, student)
        // Return minimal valid student object
        return {
          id: String(student.id || ''),
          name: String(student.name || ''),
          gender: student.gender || null,
          class_id: student.class_id || null,
          kelompok_id: student.kelompok_id || null,
          desa_id: student.desa_id || null,
          daerah_id: student.daerah_id || null,
          created_at: String(student.created_at || ''),
          updated_at: String(student.updated_at || ''),
          classes: [],
          class_name: '',
          daerah_name: '',
          desa_name: '',
          kelompok_name: ''
        }
      }
    })
}


/**
 * Membuat siswa baru
 */
export async function createStudent(formData: FormData) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient() // Need admin client for junction table

    // Extract form data
    const name = formData.get('name')?.toString()
    const gender = formData.get('gender')?.toString()
    const classId = formData.get('classId')?.toString()
    const kelompokId = formData.get('kelompok_id')?.toString()

    // Validation
    if (!name || !gender || !classId) {
      throw new Error('Semua field harus diisi')
    }

    if (!['Laki-laki', 'Perempuan'].includes(gender)) {
      throw new Error('Jenis kelamin tidak valid')
    }

    // Get user profile to inherit hierarchy
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('kelompok_id, desa_id, daerah_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      throw new Error('User profile not found')
    }

    // Determine kelompok_id, desa_id, and daerah_id
    let finalKelompokId: string | null = null
    let finalDesaId: string | null = null
    let finalDaerahId: string | null = null

    // If kelompok_id is provided (for admin desa), fetch kelompok data
    if (kelompokId) {
      const { data: kelompokData, error: kelompokError } = await supabase
        .from('kelompok')
        .select(`
          id,
          desa_id,
          desa:desa_id(
            id,
            daerah_id,
            daerah:daerah_id(id)
          )
        `)
        .eq('id', kelompokId)
        .single()

      if (kelompokError || !kelompokData) {
        throw new Error('Kelompok tidak ditemukan')
      }

      // Validate that kelompok is in admin's desa (for admin desa)
      if (userProfile.role === 'admin' && userProfile.desa_id && !userProfile.kelompok_id) {
        const kelompokDesa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
        if (kelompokDesa?.id !== userProfile.desa_id) {
          throw new Error('Kelompok tidak berada di desa Anda')
        }
      }

      finalKelompokId = kelompokId
      const desa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
      finalDesaId = desa?.id || null
      const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah
      finalDaerahId = daerah?.id || null
    } else {
      // Use userProfile values (existing behavior)
      finalKelompokId = userProfile.kelompok_id
      finalDesaId = userProfile.desa_id
      finalDaerahId = userProfile.daerah_id
    }

    // Get class name to determine category
    const { data: classData } = await supabase
      .from('classes')
      .select('name')
      .eq('id', classId)
      .single()

    if (!classData) {
      throw new Error('Class not found')
    }

    // Create student with RLS handling auth + class validation
    // RLS policies will handle user authentication and class access
    const { data: newStudent, error } = await supabase
      .from('students')
      .insert({
        name,
        gender,
        class_id: classId,
        kelompok_id: finalKelompokId,
        desa_id: finalDesaId,
        daerah_id: finalDaerahId
      })
      .select(`
        id,
        name,
        gender,
        class_id,
        kelompok_id,
        desa_id,
        daerah_id,
        created_at,
        updated_at,
        classes!inner(
          id,
          name
        )
      `)
      .single()

    if (error) {
      // Handle specific RLS errors
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk membuat siswa di kelas ini')
      }
      if (error.code === '23503') {
        throw new Error('Kelas tidak ditemukan')
      }
      throw error
    }

    // Also insert ke junction table untuk support multiple classes
    if (newStudent?.id) {
      // Use admin client to bypass RLS for junction table insert
      const { error: junctionError } = await adminClient
        .from('student_classes')
        .insert({
          student_id: newStudent.id,
          class_id: classId
        })
        .select()

      // Don't ignore errors - throw if it's not a duplicate
      if (junctionError) {
        if (junctionError.code === '23505') {
          // Duplicate entry is OK (student already in this class)
          console.log('Student already assigned to this class')
        } else {
          // Other errors should fail the operation
          console.error('Junction table insert failed:', junctionError)
          // Rollback by deleting the student (use admin client for delete too)
          await adminClient.from('students').delete().eq('id', newStudent.id)
          throw new Error(`Failed to assign student to class: ${junctionError.message}`)
        }
      }
    }

    revalidatePath('/users/siswa')
    revalidatePath('/absensi') // Also invalidate meeting/attendance pages
    return { success: true, student: newStudent }
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'Gagal membuat siswa')
    throw error
  }
}

/**
 * Mengupdate data siswa
 */
export async function updateStudent(studentId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user profile to check role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, teacher_classes(class_id), desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Extract form data
    const name = formData.get('name')?.toString()
    const gender = formData.get('gender')?.toString()
    const kelompokId = formData.get('kelompok_id')?.toString()

    // Support both classIds (multiple) and classId (single) for backward compatibility
    const classIdsStr = formData.get('classIds')?.toString() || formData.get('classId')?.toString()
    const classIds = classIdsStr ? classIdsStr.split(',').filter(Boolean) : []

    // Validation
    if (!name || !gender) {
      throw new Error('Nama dan jenis kelamin harus diisi')
    }

    if (classIds.length === 0) {
      throw new Error('Pilih minimal satu kelas')
    }

    if (!['Laki-laki', 'Perempuan'].includes(gender)) {
      throw new Error('Jenis kelamin tidak valid')
    }

    // Set primary class_id = first class in the array
    const primaryClassId = classIds[0]

    // Determine kelompok_id, desa_id, and daerah_id if kelompok_id is provided
    let finalKelompokId: string | null | undefined = undefined
    let finalDesaId: string | null | undefined = undefined
    let finalDaerahId: string | null | undefined = undefined

    // If kelompok_id is provided (for admin desa), fetch kelompok data
    if (kelompokId) {
      const { data: kelompokData, error: kelompokError } = await supabase
        .from('kelompok')
        .select(`
          id,
          desa_id,
          desa:desa_id(
            id,
            daerah_id,
            daerah:daerah_id(id)
          )
        `)
        .eq('id', kelompokId)
        .single()

      if (kelompokError || !kelompokData) {
        throw new Error('Kelompok tidak ditemukan')
      }

      // Validate that kelompok is in admin's desa (for admin desa)
      if (profile.role === 'admin' && profile.desa_id && !profile.kelompok_id) {
        const kelompokDesa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
        if (kelompokDesa?.id !== profile.desa_id) {
          throw new Error('Kelompok tidak berada di desa Anda')
        }
      }

      finalKelompokId = kelompokId
      const desa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
      finalDesaId = desa?.id || null
      const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah
      finalDaerahId = daerah?.id || null
    }

    // For teacher, validate that selected classes are their assigned classes
    if (profile.role === 'teacher') {
      const teacherClassIds = profile.teacher_classes?.map((tc: any) => tc.class_id) || []
      const invalidClasses = classIds.filter(id => !teacherClassIds.includes(id))
      if (invalidClasses.length > 0) {
        throw new Error('Anda hanya dapat mengupdate siswa ke kelas yang Anda ajarkan')
      }
    }

    // Use admin client for teacher and admin to bypass RLS issues
    // Admin juga perlu adminClient karena query dengan junction table dan RLS bisa gagal
    const client = (profile.role === 'teacher' || profile.role === 'admin' || profile.role === 'superadmin')
      ? await createAdminClient()
      : supabase

    // Prepare update data
    const updateData: any = {
      name,
      gender,
      class_id: primaryClassId,
      updated_at: new Date().toISOString()
    }

    // Add kelompok_id, desa_id, daerah_id if kelompok_id is provided
    if (finalKelompokId !== undefined) {
      updateData.kelompok_id = finalKelompokId
      updateData.desa_id = finalDesaId
      updateData.daerah_id = finalDaerahId
    }

    // Update student with RLS handling auth + validation
    // For teacher, use admin client to bypass RLS
    // For admin, RLS policies will handle user authentication and access control
    const { data: updatedStudent, error } = await client
      .from('students')
      .update(updateData)
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

    if (error) {
      // Handle specific RLS errors
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk mengupdate siswa ini')
      }
      if (error.code === '23503') {
        throw new Error('Kelas tidak ditemukan')
      }
      if (error.code === 'PGRST116') {
        throw new Error('Siswa tidak ditemukan')
      }
      throw error
    }

    // Sync dengan junction table untuk support multiple classes
    if (updatedStudent?.id) {
      // Use same client (admin for teacher, regular for admin) for junction table operations
      // Get current classes from junction table
      const { data: currentClasses, error: currentClassesError } = await client
        .from('student_classes')
        .select('class_id')
        .eq('student_id', studentId)

      if (currentClassesError) {
        console.error('Error fetching current classes:', currentClassesError)
        // Continue anyway, will try to sync
      }

      const currentClassIds = new Set(currentClasses?.map(c => c.class_id) || [])
      const newClassIds = new Set(classIds)

      // Delete removed classes
      const toDelete = Array.from(currentClassIds).filter(id => !newClassIds.has(id))
      if (toDelete.length > 0) {
        const { error: deleteError } = await client
          .from('student_classes')
          .delete()
          .eq('student_id', studentId)
          .in('class_id', toDelete)

        if (deleteError && deleteError.code !== 'PGRST301') {
          console.error('Error deleting classes from junction table:', deleteError)
          // Don't throw, continue with inserts
        }
      }

      // Insert new classes
      const toInsert = Array.from(newClassIds).filter(id => !currentClassIds.has(id))
      if (toInsert.length > 0) {
        const assignmentsToInsert = toInsert.map(classId => ({
          student_id: studentId,
          class_id: classId
        }))

        const { error: insertError } = await client
          .from('student_classes')
          .insert(assignmentsToInsert)

        // Ignore duplicate error (UNIQUE constraint)
        if (insertError && insertError.code !== '23505' && insertError.code !== 'PGRST301') {
          console.error('Error inserting to junction table:', insertError)
          // Don't throw, karena student sudah diupdate
        }
      }
    }

    revalidatePath('/users/siswa')
    return { success: true, student: updatedStudent }
  } catch (error) {
    handleApiError(error, 'mengupdate data', 'Gagal mengupdate siswa')
    throw error
  }
}

/**
 * Check if student has attendance records
 */
export async function checkStudentHasAttendance(studentId: string): Promise<boolean> {
  try {
    const adminClient = await createAdminClient()
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
 * Menghapus siswa (admin only)
 * @param studentId - ID siswa yang akan dihapus
 * @param permanent - Jika true, hard delete (permanent). Jika false, soft delete (default)
 * Returns { success: boolean, error?: string } to ensure error messages are properly displayed in production
 */
export async function deleteStudent(
  studentId: string,
  permanent: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, email, daerah_id, desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile || !canAccessFeature(profile, 'users')) {
      return { success: false, error: 'Unauthorized: Hanya admin yang dapat menghapus siswa' }
    }

    // Use admin client to bypass RLS issues for admin
    // RLS policies can be too restrictive for delete operations
    const adminClient = await createAdminClient()

    // Check if student exists
    const { data: existingStudent, error: studentError } = await adminClient
      .from('students')
      .select('id, name, class_id, kelompok_id, desa_id, daerah_id')
      .eq('id', studentId)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return { success: false, error: 'Siswa tidak ditemukan' }
      }
      handleApiError(studentError, 'menghapus data', 'Gagal menghapus siswa')
      return { success: false, error: 'Gagal menghapus siswa' }
    }

    if (!existingStudent) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // For Admin Kelompok: verify student belongs to their kelompok
    if (profile.kelompok_id) {
      // Check if student's kelompok_id matches admin's kelompok_id
      if (existingStudent.kelompok_id !== profile.kelompok_id) {
        // If student doesn't have kelompok_id, check via class
        if (!existingStudent.kelompok_id && existingStudent.class_id) {
          const { data: classData } = await adminClient
            .from('classes')
            .select('kelompok_id')
            .eq('id', existingStudent.class_id)
            .single()

          if (!classData) {
            return { success: false, error: 'Tidak dapat menghapus siswa: kelas siswa tidak ditemukan' }
          }

          if (classData.kelompok_id !== profile.kelompok_id) {
            return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa dari kelompok lain' }
          }
        } else {
          return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa dari kelompok lain' }
        }
      }
    }

    // For Admin Desa: verify student belongs to their desa
    if (profile.desa_id && !profile.kelompok_id) {
      if (existingStudent.desa_id !== profile.desa_id) {
        // If student doesn't have desa_id, check via class -> kelompok -> desa
        if (!existingStudent.desa_id && existingStudent.class_id) {
          const { data: classData } = await adminClient
            .from('classes')
            .select('kelompok_id, kelompok:kelompok_id(desa_id)')
            .eq('id', existingStudent.class_id)
            .single()

          if (!classData || !classData.kelompok) {
            return { success: false, error: 'Tidak dapat menghapus siswa: data kelas siswa tidak valid' }
          }

          const kelompok = Array.isArray(classData.kelompok) ? classData.kelompok[0] : classData.kelompok
          if (kelompok?.desa_id !== profile.desa_id) {
            return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa dari desa lain' }
          }
        } else {
          return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa dari desa lain' }
        }
      }
    }

    // For Admin Daerah: verify student belongs to their daerah
    if (profile.daerah_id && !profile.desa_id && !profile.kelompok_id) {
      if (existingStudent.daerah_id !== profile.daerah_id) {
        // If student doesn't have daerah_id, check via class -> kelompok -> desa -> daerah
        if (!existingStudent.daerah_id && existingStudent.class_id) {
          const { data: classData } = await adminClient
            .from('classes')
            .select('kelompok_id, kelompok:kelompok_id(desa_id, desa:desa_id(daerah_id))')
            .eq('id', existingStudent.class_id)
            .single()

          if (!classData || !classData.kelompok) {
            return { success: false, error: 'Tidak dapat menghapus siswa: data kelas siswa tidak valid' }
          }

          const kelompok = Array.isArray(classData.kelompok) ? classData.kelompok[0] : classData.kelompok
          const desa = Array.isArray(kelompok.desa) ? kelompok.desa[0] : kelompok.desa
          if (desa?.daerah_id !== profile.daerah_id) {
            return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa dari daerah lain' }
          }
        } else {
          return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa dari daerah lain' }
        }
      }
    }

    if (permanent) {
      // HARD DELETE: Permanent deletion
      // Delete student from junction table first (if exists)
      const { error: junctionDeleteError } = await adminClient
        .from('student_classes')
        .delete()
        .eq('student_id', studentId)

      if (junctionDeleteError && junctionDeleteError.code !== 'PGRST301') {
        console.error('Error deleting from junction table:', junctionDeleteError)
        // Continue anyway, will try to delete student
      }

      // Delete student using admin client to bypass RLS
      // Cascade will automatically delete attendance_logs
      const { error: deleteError } = await adminClient
        .from('students')
        .delete()
        .eq('id', studentId)

      if (deleteError) {
        // Handle specific RLS errors
        if (deleteError.code === 'PGRST301' || deleteError.message.includes('permission denied') || deleteError.message.includes('new row violates row-level security')) {
          return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
        }
        if (deleteError.code === '23503') {
          return { success: false, error: 'Tidak dapat menghapus siswa: terdapat data terkait yang masih digunakan' }
        }
        handleApiError(deleteError, 'menghapus data', 'Gagal menghapus siswa')
        return { success: false, error: 'Gagal menghapus siswa' }
      }
    } else {
      // SOFT DELETE: Mark as deleted
      const { error: updateError } = await adminClient
        .from('students')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', studentId)

      if (updateError) {
        // Handle specific RLS errors
        if (updateError.code === 'PGRST301' || updateError.message.includes('permission denied') || updateError.message.includes('new row violates row-level security')) {
          return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
        }
        handleApiError(updateError, 'menghapus data', 'Gagal menghapus siswa')
        return { success: false, error: 'Gagal menghapus siswa' }
      }
    }

    revalidatePath('/users/siswa')
    return { success: true }
  } catch (error) {
    // Extract error message for unknown errors
    let errorMessage = 'Gagal menghapus siswa'

    if (error instanceof Error) {
      errorMessage = error.message
    }

    handleApiError(error, 'menghapus data', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Helper: Mendapatkan semua kelas siswa berdasarkan studentId
 */
export async function getStudentClasses(studentId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const supabase = await createClient()

    const { data: studentClasses, error } = await supabase
      .from('student_classes')
      .select(`
        classes:class_id(id, name)
      `)
      .eq('student_id', studentId)

    if (error) {
      throw error
    }

    return (studentClasses || [])
      .map((sc: any) => sc.classes)
      .filter(Boolean)
      .map((cls: any) => ({
        id: String(cls.id || ''),
        name: String(cls.name || '')
      }))
  } catch (error) {
    console.error('Error getting student classes:', error)
    return []
  }
}

/**
 * Assign siswa yang sudah ada ke kelas tertentu (batch)
 * Function ini menambahkan siswa ke kelas tanpa menghapus kelas yang sudah ada
 */
export async function assignStudentsToClass(
  studentIds: string[],
  classId: string
): Promise<{ success: boolean; assigned: number; skipped: string[] }> {
  try {
    const supabase = await createClient()

    // Get user profile untuk validasi
    const profile = await getUserProfile()

    // Validasi kelas tujuan exists
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      throw new Error('Kelas tidak ditemukan')
    }

    if (!studentIds || studentIds.length === 0) {
      throw new Error('Pilih minimal satu siswa')
    }

    // Check siswa yang sudah ada di kelas tersebut
    const { data: existingAssignments } = await supabase
      .from('student_classes')
      .select('student_id')
      .eq('class_id', classId)
      .in('student_id', studentIds)

    const existingStudentIds = new Set(existingAssignments?.map(a => a.student_id) || [])
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id))

    // Batch insert ke junction table untuk siswa yang belum ada
    if (newStudentIds.length > 0) {
      const assignmentsToInsert = newStudentIds.map(studentId => ({
        student_id: studentId,
        class_id: classId
      }))

      const { error } = await supabase
        .from('student_classes')
        .insert(assignmentsToInsert)

      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          throw new Error('Tidak memiliki izin untuk mengassign siswa ke kelas ini')
        }
        throw error
      }
    }

    revalidatePath('/users/siswa')
    return {
      success: true,
      assigned: newStudentIds.length,
      skipped: Array.from(existingStudentIds)
    }
  } catch (error) {
    handleApiError(error, 'mengupdate data', 'Gagal mengupdate siswa ke kelas')
    throw error
  }
}

/**
 * Membuat siswa dalam batch
 */
export async function createStudentsBatch(
  students: Array<{ name: string; gender: string }>,
  classId: string
) {
  try {
    const supabase = await createClient()

    // Get user profile for hierarchy fields
    const profile = await getUserProfile()

    // Get class info for category determination
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      throw new Error('Kelas tidak ditemukan')
    }

    // Filter out empty students (name === '')
    const validStudents = students.filter(s => s.name.trim() !== '')

    if (validStudents.length === 0) {
      throw new Error('Tidak ada siswa yang valid untuk ditambah')
    }

    // Prepare students with hierarchy fields
    const studentsToInsert = validStudents.map(s => ({
      name: s.name.trim(),
      gender: s.gender,
      class_id: classId,
      kelompok_id: profile.kelompok_id,
      desa_id: profile.desa_id,
      daerah_id: profile.daerah_id
    }))

    // Bulk insert with RLS handling
    const { data: insertedStudents, error } = await supabase
      .from('students')
      .insert(studentsToInsert)
      .select(`
        id,
        name,
        gender,
        class_id,
        kelompok_id,
        desa_id,
        daerah_id,
        created_at,
        updated_at,
        classes!inner(
          id,
          name
        )
      `)

    if (error) {
      // Handle specific RLS errors
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk membuat siswa di kelas ini')
      }
      if (error.code === '23503') {
        throw new Error('Kelas tidak ditemukan')
      }
      throw error
    }

    // Also insert ke junction table untuk support multiple classes
    if (insertedStudents && insertedStudents.length > 0) {
      const junctionInserts = insertedStudents.map(student => ({
        student_id: student.id,
        class_id: classId
      }))

      const { error: junctionError } = await supabase
        .from('student_classes')
        .insert(junctionInserts)

      // Ignore duplicate errors (shouldn't happen, but safe)
      if (junctionError && junctionError.code !== '23505') {
        console.error('Error inserting to junction table:', junctionError)
        // Don't throw, karena students sudah dibuat
      }
    }

    revalidatePath('/users/siswa')
    return {
      success: true,
      imported: insertedStudents?.length || 0,
      total: validStudents.length,
      errors: []
    }
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'Gagal mengimport siswa')
    throw error
  }
}

/**
 * Mendapatkan role user saat ini
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

export interface StudentInfo {
  id: string
  name: string
  gender: string | null
  class_id?: string | null
  classes: Array<{
    id: string
    name: string
  }> // Changed to array for multiple classes support
}

export interface AttendanceLog {
  id: string
  date: string
  status: string
  reason: string | null
  meeting_id: string
  meetings: {
    id: string
    title: string
    topic: string | null
    description: string | null
    meeting_type_code?: string | null
    classes?: {
      id: string
      name: string
      class_master_mappings?: Array<{
        class_master?: {
          category?: {
            is_sambung_capable: boolean
          }
        }
      }>
    } | null
  }
}

export interface MonthlyStats {
  total: number
  hadir: number
  izin: number
  sakit: number
  absen: number
}

export interface AttendanceHistoryResponse {
  attendanceLogs: AttendanceLog[]
  stats: MonthlyStats
}

/**
 * Mendapatkan informasi siswa berdasarkan ID
 */
export async function getStudentInfo(studentId: string): Promise<StudentInfo> {
  try {
    const supabase = await createClient()

    // Get current user profile for access control
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, daerah_id, desa_id, kelompok_id, teacher_classes(class_id)')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Query student with junction table for multiple classes support
    const { data: student, error } = await supabase
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

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Siswa tidak ditemukan')
      }
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk melihat siswa ini')
      }
      throw error
    }

    // Extract classes dari junction table
    const studentClasses = student.student_classes || []
    const classesArray = studentClasses
      .map((sc: any) => sc.classes)
      .filter(Boolean)
      .map((cls: any) => ({
        id: String(cls.id || ''),
        name: String(cls.name || '')
      }))

    // Get primary class untuk backward compatibility
    const primaryClass = classesArray[0] || null

    return {
      id: student.id,
      name: student.name,
      gender: student.gender,
      class_id: primaryClass?.id || student.class_id || null,
      classes: classesArray
    } as StudentInfo
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat informasi siswa')
    throw new Error(errorInfo.message)
  }
}

/**
 * Mendapatkan riwayat kehadiran siswa untuk bulan tertentu
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  year: number,
  month: number
): Promise<AttendanceHistoryResponse> {
  try {
    const supabase = await createClient()

    // Get current user profile for access control
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, daerah_id, desa_id, kelompok_id, teacher_classes(class_id)')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Format date range for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    // Get the last day of the month properly
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

    // Query attendance_logs for specific student and month
    // RLS policies will handle access control
    const { data: attendanceLogs, error } = await supabase
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

    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk melihat riwayat kehadiran siswa ini')
      }
      throw error
    }

    // Calculate monthly statistics
    const stats = {
      total: attendanceLogs?.length || 0,
      hadir: attendanceLogs?.filter(log => log.status === 'H').length || 0,
      izin: attendanceLogs?.filter(log => log.status === 'I').length || 0,
      sakit: attendanceLogs?.filter(log => log.status === 'S').length || 0,
      absen: attendanceLogs?.filter(log => log.status === 'A').length || 0
    }

    return {
      attendanceLogs: (attendanceLogs || []) as unknown as AttendanceLog[],
      stats: stats as MonthlyStats
    }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')
    throw new Error(errorInfo.message)
  }
}

/**
 * Get student with complete biodata
 */
export async function getStudentBiodata(
  studentId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
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

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching student biodata:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch student biodata',
    }
  }
}

/**
 * Update student biodata
 */
export async function updateStudentBiodata(
  studentId: string,
  biodata: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Extract only the fields that exist in the database
    const updateData: any = {}

    if (biodata.name !== undefined) updateData.name = biodata.name
    if (biodata.nomor_induk !== undefined) updateData.nomor_induk = biodata.nomor_induk
    if (biodata.gender !== undefined) updateData.gender = biodata.gender
    if (biodata.tempat_lahir !== undefined) updateData.tempat_lahir = biodata.tempat_lahir
    if (biodata.tanggal_lahir !== undefined) updateData.tanggal_lahir = biodata.tanggal_lahir
    if (biodata.anak_ke !== undefined) updateData.anak_ke = biodata.anak_ke
    if (biodata.alamat !== undefined) updateData.alamat = biodata.alamat
    if (biodata.nomor_telepon !== undefined) updateData.nomor_telepon = biodata.nomor_telepon
    if (biodata.nama_ayah !== undefined) updateData.nama_ayah = biodata.nama_ayah
    if (biodata.nama_ibu !== undefined) updateData.nama_ibu = biodata.nama_ibu
    if (biodata.alamat_orangtua !== undefined)
      updateData.alamat_orangtua = biodata.alamat_orangtua
    if (biodata.telepon_orangtua !== undefined)
      updateData.telepon_orangtua = biodata.telepon_orangtua
    if (biodata.pekerjaan_ayah !== undefined) updateData.pekerjaan_ayah = biodata.pekerjaan_ayah
    if (biodata.pekerjaan_ibu !== undefined) updateData.pekerjaan_ibu = biodata.pekerjaan_ibu
    if (biodata.nama_wali !== undefined) updateData.nama_wali = biodata.nama_wali
    if (biodata.alamat_wali !== undefined) updateData.alamat_wali = biodata.alamat_wali
    if (biodata.pekerjaan_wali !== undefined) updateData.pekerjaan_wali = biodata.pekerjaan_wali

    updateData.updated_at = new Date().toISOString()

    const { error } = await supabase.from('students').update(updateData).eq('id', studentId)

    if (error) throw error

    revalidatePath('/users/siswa')
    revalidatePath(`/users/siswa/${studentId}`)
    revalidatePath('/rapot')

    return { success: true }
  } catch (error) {
    console.error('Error updating student biodata:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update student biodata',
    }
  }
}
