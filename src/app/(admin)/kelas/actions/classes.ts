'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'

export interface ClassWithMaster {
  id: string
  name: string
  kelompok_id: string
  created_at: string
  updated_at: string
  kelompok?: {
    id: string
    name: string
    desa_id?: string
    desa?: {
      id: string
      name: string
      daerah_id?: string
      daerah?: {
        id: string
        name: string
      }
    }
  }
  class_master_mappings?: Array<{
    class_master: {
      id: string
      name: string
      description?: string
    }
  }>
}

// Get all classes by kelompok
export async function getAllClassesByKelompok(): Promise<ClassWithMaster[]> {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    let query = supabase
      .from('classes')
      .select(`
        *,
        kelompok:kelompok_id (
          id, 
          name,
          desa_id,
          desa:desa_id (
            id,
            name,
            daerah_id,
            daerah:daerah_id (id, name)
          )
        )
      `)
      .order('name')

    // Apply filters based on user role
    if (profile?.kelompok_id) {
      query = query.eq('kelompok_id', profile.kelompok_id)
    } else if (profile?.desa_id) {
      query = query.eq('kelompok.desa_id', profile.desa_id)
    } else if (profile?.daerah_id) {
      query = query.eq('kelompok.desa.daerah_id', profile.daerah_id)
    }

    const { data, error } = await query

    if (error) throw error
    
    // Get class master mappings separately
    const classIds = (data || []).map(item => item.id)
    let mappingsData: any[] = []
    
    if (classIds.length > 0) {
      // First get mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('class_master_mappings')
        .select('class_id, class_master_id')
        .in('class_id', classIds)
      
      if (mappingsError) {
        console.error('Error fetching mappings:', mappingsError)
      } else if (mappings && mappings.length > 0) {
        // Then get class masters
        const masterIds = mappings.map(m => m.class_master_id)
        
        const { data: masters, error: mastersError } = await supabase
          .from('class_masters')
          .select(`
            id,
            name,
            description,
            category:category_id (
              id,
              code,
              name
            )
          `)
          .in('id', masterIds)
        
        if (mastersError) {
          console.error('Error fetching masters:', mastersError)
        } else {
          // Combine the data
          mappingsData = mappings.map(mapping => {
            const master = masters?.find(m => m.id === mapping.class_master_id)
            return {
              class_id: mapping.class_id,
              class_master: master
            }
          }).filter(mapping => mapping.class_master) // Only include valid mappings
        }
      }
    }
    
    // Group mappings by class_id
    const mappingsByClass = mappingsData.reduce((acc, mapping) => {
      if (!acc[mapping.class_id]) {
        acc[mapping.class_id] = []
      }
      acc[mapping.class_id].push(mapping)
      return acc
    }, {} as Record<string, any[]>)
    
    // Transform to ensure single objects instead of arrays
    const transformed = (data || []).map(item => ({
      ...item,
      kelompok: Array.isArray(item.kelompok) ? item.kelompok[0] : item.kelompok,
      class_master_mappings: mappingsByClass[item.id] || []
    }))
    
    return transformed
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}

// Create class from master template
export async function createClassFromMaster(
  kelompokId: string,
  masterIds: string[],
  customName?: string
) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk membuat kelas')
    }

    // Allow empty masterIds for custom classes
    let className = customName || '';
    
    if (masterIds && masterIds.length > 0) {
      // Get master data for name generation
      const { data: masters, error: masterError } = await supabase
        .from('class_masters')
        .select('name')
        .in('id', masterIds)

      if (masterError) throw masterError
      
      if (!customName) {
        className = masters.map(m => m.name).join(' + ')
      }
    } else if (!customName) {
      throw new Error('Nama kelas harus diisi untuk kelas custom')
    }

    // Create class without class_master_id
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .insert({
        name: className,
        kelompok_id: kelompokId
      })
      .select()
      .single()

    if (classError) throw classError

    // Create mappings in junction table only if masterIds provided
    if (masterIds && masterIds.length > 0) {
      const mappings = masterIds.map(masterId => ({
        class_id: classData.id,
        class_master_id: masterId
      }))

      const { error: mappingError } = await supabase
        .from('class_master_mappings')
        .insert(mappings)

      if (mappingError) throw mappingError
    }

    revalidatePath('/kelas')
    return { success: true, class: classData }
  } catch (error) {
    handleApiError(error, 'membuat kelas', 'Gagal membuat kelas')
    throw error
  }
}

// Create custom class (without master)
export async function createCustomClass(kelompokId: string, className: string) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk membuat kelas')
    }

    if (!className) {
      throw new Error('Nama kelas harus diisi')
    }

    const { data: result, error } = await supabase
      .from('classes')
      .insert({
        name: className,
        kelompok_id: kelompokId
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/kelas')
    return { success: true, class: result }
  } catch (error) {
    handleApiError(error, 'membuat kelas', 'Gagal membuat kelas custom')
    throw error
  }
}

// Update class
export async function updateClass(
  classId: string, 
  data: { 
    name: string
    masterIds?: string[] // Array of class master IDs for multi-template support
  }
) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk mengupdate kelas')
    }

    const { name, masterIds } = data
    
    if (!name) {
      throw new Error('Nama kelas harus diisi')
    }

    // Update class basic info
    const { data: result, error } = await supabase
      .from('classes')
      .update({ name })
      .eq('id', classId)
      .select()
      .single()

    if (error) throw error

    // If masterIds provided, update mappings
    if (masterIds !== undefined) {
      // Delete existing mappings
      const { error: deleteError } = await supabase
        .from('class_master_mappings')
        .delete()
        .eq('class_id', classId)

      if (deleteError) throw deleteError

      // Insert new mappings
      if (masterIds.length > 0) {
        const mappings = masterIds.map(masterId => ({
          class_id: classId,
          class_master_id: masterId
        }))

        const { error: insertError } = await supabase
          .from('class_master_mappings')
          .insert(mappings)

        if (insertError) throw insertError
      }
    }

    revalidatePath('/kelas')
    return { success: true, class: result }
  } catch (error) {
    handleApiError(error, 'mengupdate data', 'Gagal mengupdate kelas')
    throw error
  }
}

// Delete class
export async function deleteClass(classId: string) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk menghapus kelas')
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (error) throw error

    revalidatePath('/kelas')
    return { success: true }
  } catch (error) {
    handleApiError(error, 'menghapus data', 'Gagal menghapus kelas')
    throw error
  }
}
