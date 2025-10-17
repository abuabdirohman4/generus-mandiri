'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { isAdmin } from '@/lib/userUtils'

export interface Class {
  id: string
  name: string
  kelompok_id?: string | null
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
    if (isAdmin(profile.role)) {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, kelompok_id')
        .order('name')

      if (error) {
        throw error
      }

      return classes || []
    } else if (profile.role === 'teacher') {
      // Get classes assigned to this teacher
      const { data: classes, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          kelompok_id,
          teacher_classes!inner(teacher_id)
        `)
        .eq('teacher_classes.teacher_id', user.id)
        .order('name')

      if (error) {
        throw error
      }

      return classes || []
    } else {
      // For other roles, get all classes (fallback)
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, kelompok_id')
        .order('name')

      if (error) {
        throw error
      }

      return classes || []
    }
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}
