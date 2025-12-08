'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'

export interface Class {
  id: string
  name: string
  kelompok_id?: string | null
  kelompok?: {
    id: string
    name: string
  } | null
}

/**
 * Mendapatkan daftar kelas berdasarkan role user
 */
export async function getAllClasses(): Promise<Class[]> {
  try {
    const supabase = await createClient()
    
    // Get user profile to determine role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // If user is admin or superadmin, get all classes in their hierarchy
    // If user is teacher, get only their assigned classes
    if (profile.role === 'admin' || profile.role === 'superadmin') {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok(id, name)')
        .order('name')

      if (error) {
        throw error
      }

      // Transform: kelompok comes as array, take first element
      return (classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok: Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
      }))
    } else if (profile.role === 'teacher') {
      // Get classes assigned to this teacher
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          kelompok_id,
          kelompok:kelompok(id, name),
          teacher_classes!inner(teacher_id)
        `)
        .eq('teacher_classes.teacher_id', user.id)
        .order('name')

      if (error) {
        throw error
      }

      // Transform: kelompok comes as array, take first element
      return (classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok: Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
      }))
    } else {
      // For other roles, get all classes (fallback)
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok(id, name)')
        .order('name')

      if (error) {
        throw error
      }

      // Transform: kelompok comes as array, take first element
      return (classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        kelompok_id: c.kelompok_id,
        kelompok: Array.isArray(c.kelompok) ? c.kelompok[0] : c.kelompok
      }))
    }
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}
