'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'
import type { ClassWithMaster } from '@/types/class'

export type { ClassWithMaster }

/**
 * Sort classes by minimum class_master sort_order
 * Classes with no mappings are sorted to the end
 */
function sortClassesByMasterOrder(classes: any[]): any[] {
  return classes.sort((a, b) => {
    const getSortOrder = (cls: any): number => {
      if (!cls.class_master_mappings || cls.class_master_mappings.length === 0) return 9999
      const sortOrders = cls.class_master_mappings
        .map((mapping: any) => mapping.class_master?.sort_order)
        .filter((order: any) => typeof order === 'number')
      return sortOrders.length === 0 ? 9999 : Math.min(...sortOrders)
    }
    const orderA = getSortOrder(a)
    const orderB = getSortOrder(b)
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

// Get all classes by kelompok
export async function getAllClassesByKelompok(): Promise<ClassWithMaster[]> {
  try {
    const adminClient = await createAdminClient()
    const profile = await getCurrentUserProfile()

    // Two-query pattern for desa/daerah scope — PostgREST nested join filters silently fail
    let kelompokIds: string[] | null = null

    if (profile?.kelompok_id) {
      kelompokIds = [profile.kelompok_id]
    } else if (profile?.desa_id) {
      const { data: kelompoks } = await adminClient
        .from('kelompok')
        .select('id')
        .eq('desa_id', profile.desa_id)
      kelompokIds = (kelompoks || []).map((k: any) => k.id)
    } else if (profile?.daerah_id) {
      const { data: desas } = await adminClient
        .from('desa')
        .select('id')
        .eq('daerah_id', profile.daerah_id)
      const desaIds = (desas || []).map((d: any) => d.id)
      if (desaIds.length > 0) {
        const { data: kelompoks } = await adminClient
          .from('kelompok')
          .select('id')
          .in('desa_id', desaIds)
        kelompokIds = (kelompoks || []).map((k: any) => k.id)
      } else {
        kelompokIds = []
      }
    }

    let classQuery = adminClient
      .from('classes')
      .select(`
        id, name, kelompok_id,
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

    if (kelompokIds !== null) {
      if (kelompokIds.length === 0) return []
      classQuery = classQuery.in('kelompok_id', kelompokIds)
    }

    const { data, error } = await classQuery
    if (error) throw error

    // Fetch ALL mappings (657 rows total, well under PostgREST 1000 limit),
    // then filter in-memory by the class IDs we already have.
    // This avoids the Headers Overflow from .in('class_id', [640 IDs]).
    let mappingsData: any[] = []

    if ((data || []).length > 0) {
      const { data: allMappings, error: mappingsError } = await adminClient
        .from('class_master_mappings')
        .select('class_id, class_master_id, class_masters:class_master_id(id, name, description, sort_order)')

      if (mappingsError) {
        console.error('Error fetching mappings:', mappingsError)
      } else {
        const classIdSet = new Set((data || []).map((c: any) => c.id))
        mappingsData = (allMappings || [])
          .filter((m: any) => classIdSet.has(m.class_id))
          .map((m: any) => {
            const cm = Array.isArray(m.class_masters) ? m.class_masters[0] : m.class_masters
            return { class_id: m.class_id, class_master_id: m.class_master_id, class_master: cm }
          })
          .filter((m: any) => m.class_master)
      }
    }

    const mappingsByClass = mappingsData.reduce((acc: any, mapping: any) => {
      if (!acc[mapping.class_id]) acc[mapping.class_id] = []
      acc[mapping.class_id].push(mapping)
      return acc
    }, {} as Record<string, any[]>)

    const transformed = (data || []).map((item: any) => ({
      ...item,
      kelompok: Array.isArray(item.kelompok) ? item.kelompok[0] : item.kelompok,
      class_master_mappings: mappingsByClass[item.id] || [],
    }))

    return sortClassesByMasterOrder(transformed)
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
