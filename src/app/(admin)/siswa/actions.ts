'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { determineCategoryFromClassName } from '@/lib/categoryUtils'

export interface Student {
  id: string
  name: string
  gender: string | null
  class_id: string
  created_at: string
  updated_at: string
  category?: string | null
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
  classes: {
    id: string
    name: string
  } | null
}

export interface Class {
  id: string
  name: string
  kelompok_id?: string | null
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
      class_name: classesData[0]?.name || null
    }
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat profile user')
    throw error
  }
}

/**
 * Mendapatkan daftar siswa dengan informasi kelas
 */
export async function getStudents(classId?: string): Promise<Student[]> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        gender,
        category,
        class_id,
        kelompok_id,
        desa_id,
        daerah_id,
        created_at,
        updated_at,
        class:classes(
          id,
          name
        )
      `)

    // Filter by class if classId provided
    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data: students, error } = await query.order('name')

    if (error) {
      throw error
    }

    const transformedStudents = students?.map(student => {
      // Handle class data - it could be an array or single object
      const classData = Array.isArray(student.class) ? student.class[0] : student.class;
      return {
        id: student.id,
        name: student.name,
        gender: student.gender,
        category: student.category,
        class_id: student.class_id,
        kelompok_id: student.kelompok_id,
        desa_id: student.desa_id,
        daerah_id: student.daerah_id,
        created_at: student.created_at,
        updated_at: student.updated_at,
        classes: classData ? {
          id: String(classData.id || ''),
          name: String(classData.name || '')
        } : null
      };
    }) || []

    return transformedStudents
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar siswa')
    throw error
  }
}

/**
 * Mendapatkan daftar kelas untuk dropdown
 */
export async function getClasses(): Promise<Class[]> {
  try {
    const supabase = await createClient()
    
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, kelompok_id')
      .order('name')

    if (error) {
      throw error
    }

    return classes || []
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}

/**
 * Membuat siswa baru
 */
export async function createStudent(formData: FormData) {
  try {
    const supabase = await createClient()
    
    // Extract form data
    const name = formData.get('name')?.toString()
    const gender = formData.get('gender')?.toString()
    const classId = formData.get('classId')?.toString()

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
      .select('kelompok_id, desa_id, daerah_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      throw new Error('User profile not found')
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

    const category = determineCategoryFromClassName(classData.name)

    // Create student with RLS handling auth + class validation
    // RLS policies will handle user authentication and class access
    const { data: newStudent, error } = await supabase
      .from('students')
      .insert({
        name,
        gender,
        class_id: classId,
        category,
        kelompok_id: userProfile.kelompok_id,
        desa_id: userProfile.desa_id,
        daerah_id: userProfile.daerah_id
      })
      .select(`
        id,
        name,
        gender,
        category,
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

    revalidatePath('/siswa')
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
    
    // Extract form data
    const name = formData.get('name')?.toString()
    const gender = formData.get('gender')?.toString()
    const classId = formData.get('classId')?.toString()

    // Validation
    if (!name || !gender || !classId) {
      throw new Error('Semua field harus diisi')
    }

    if (!['Laki-laki', 'Perempuan'].includes(gender)) {
      throw new Error('Jenis kelamin tidak valid')
    }

    // Update student with RLS handling auth + validation
    // RLS policies will handle user authentication and access control
    const { data: updatedStudent, error } = await supabase
      .from('students')
      .update({
        name,
        gender,
        class_id: classId,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .select(`
        id,
        name,
        gender,
        class_id,
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

    revalidatePath('/siswa')
    return { success: true, student: updatedStudent }
  } catch (error) {
    handleApiError(error, 'mengupdate data', 'Gagal mengupdate siswa')
    throw error
  }
}

/**
 * Menghapus siswa (admin only)
 */
export async function deleteStudent(studentId: string) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Unauthorized: Hanya admin yang dapat menghapus siswa')
    }

    // Check if student exists
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', studentId)
      .single()

    if (!existingStudent) {
      throw new Error('Siswa tidak ditemukan')
    }

    // Check if student has attendance records
    const { data: attendanceRecords } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('student_id', studentId)
      .limit(1)

    if (attendanceRecords && attendanceRecords.length > 0) {
      throw new Error('Tidak dapat menghapus siswa yang memiliki riwayat absensi')
    }

    // Delete student
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)

    if (error) {
      throw error
    }

    revalidatePath('/siswa')
    return { success: true }
  } catch (error) {
    handleApiError(error, 'menghapus data', 'Gagal menghapus siswa')
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
