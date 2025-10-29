'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { LearningMaterial, MaterialFilters, ClassMaster } from './types'

/**
 * Get available class masters for the current user
 */
export async function getAvailableClassMasters(): Promise<ClassMaster[]> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, daerah_id, desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    let query = supabase
      .from('class_masters')
      .select(`
        id,
        name,
        category_id,
        category:category_id (
          name
        )
      `)
      .order('name')

    // Filter based on user role
    if (profile.role === 'teacher') {
      // Teachers can only see class masters for their assigned classes
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select(`
          classes!inner(
            class_master_mappings!inner(
              class_master_id
            )
          )
        `)
        .eq('teacher_id', user.id)

      if (teacherClasses && teacherClasses.length > 0) {
        const classMasterIds = teacherClasses
          .map((tc: any) => tc.classes?.class_master_mappings?.map((cmm: any) => cmm.class_master_id))
          .flat()
          .filter(Boolean)
        
        if (classMasterIds.length > 0) {
          query = query.in('id', classMasterIds)
        }
      }
    } else if (profile.role === 'admin' && profile.kelompok_id) {
      // Admin Kelompok
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('kelompok_id', profile.kelompok_id)

      if (classes && classes.length > 0) {
        const classIds = classes.map(c => c.id)
        const { data: mappings } = await supabase
          .from('class_master_mappings')
          .select('class_master_id')
          .in('class_id', classIds)

        if (mappings && mappings.length > 0) {
          const classMasterIds = mappings.map(m => m.class_master_id)
          query = query.in('id', classMasterIds)
        }
      }
    } else if (profile.role === 'admin' && profile.desa_id) {
      // Admin Desa
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('desa_id', profile.desa_id)

      if (classes && classes.length > 0) {
        const classIds = classes.map(c => c.id)
        const { data: mappings } = await supabase
          .from('class_master_mappings')
          .select('class_master_id')
          .in('class_id', classIds)

        if (mappings && mappings.length > 0) {
          const classMasterIds = mappings.map(m => m.class_master_id)
          query = query.in('id', classMasterIds)
        }
      }
    } else if (profile.role === 'admin' && profile.daerah_id) {
      // Admin Daerah
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('daerah_id', profile.daerah_id)

      if (classes && classes.length > 0) {
        const classIds = classes.map(c => c.id)
        const { data: mappings } = await supabase
          .from('class_master_mappings')
          .select('class_master_id')
          .in('class_id', classIds)

        if (mappings && mappings.length > 0) {
          const classMasterIds = mappings.map(m => m.class_master_id)
          query = query.in('id', classMasterIds)
        }
      }
    }
    // Superadmin can see all (no additional filter)

    const { data: classMasters, error } = await query

    if (error) {
      throw error
    }

    return (classMasters || []).map(cm => ({
      id: cm.id,
      name: cm.name,
      category_id: cm.category_id
    }))

  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}

/**
 * Get learning material based on filters
 */
export async function getLearningMaterial(filters: MaterialFilters): Promise<LearningMaterial | null> {
  try {
    const supabase = await createClient()
    
    if (!filters.classMasterId || !filters.semester || !filters.month || !filters.week || !filters.dayOfWeek) {
      return null
    }

    const { data: material, error } = await supabase
      .from('learning_materials')
      .select('*')
      .eq('class_master_id', filters.classMasterId)
      .eq('semester', filters.semester)
      .eq('month', filters.month)
      .eq('week', filters.week)
      .eq('day_of_week', filters.dayOfWeek)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return material

  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat materi pembelajaran')
    throw error
  }
}

/**
 * Get all learning materials for a class master and semester
 */
export async function getLearningMaterials(classMasterId: string, semester: number): Promise<LearningMaterial[]> {
  try {
    const supabase = await createClient()
    
    const { data: materials, error } = await supabase
      .from('learning_materials')
      .select('*')
      .eq('class_master_id', classMasterId)
      .eq('semester', semester)
      .order('month')
      .order('week')
      .order('day_of_week')

    if (error) {
      throw error
    }

    return materials || []

  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat materi pembelajaran')
    throw error
  }
}

/**
 * Create or update learning material
 */
export async function upsertLearningMaterial(
  classMasterId: string,
  semester: number,
  month: number,
  week: number,
  dayOfWeek: number,
  content: any
): Promise<LearningMaterial> {
  try {
    const supabase = await createClient()
    
    const { data: material, error } = await supabase
      .from('learning_materials')
      .upsert({
        class_master_id: classMasterId,
        semester,
        month,
        week,
        day_of_week: dayOfWeek,
        content
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return material

  } catch (error) {
    handleApiError(error, 'menyimpan data', 'Gagal menyimpan materi pembelajaran')
    throw error
  }
}

/**
 * Delete learning material
 */
export async function deleteLearningMaterial(id: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('learning_materials')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

  } catch (error) {
    handleApiError(error, 'menghapus data', 'Gagal menghapus materi pembelajaran')
    throw error
  }
}
