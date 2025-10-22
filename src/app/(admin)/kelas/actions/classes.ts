'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'

export interface ClassWithMaster {
  id: string
  name: string
  kelompok_id: string
  class_master_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  kelompok?: {
    id: string
    name: string
  }
  class_master?: {
    id: string
    name: string
    description?: string
  }
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
        kelompok:kelompok_id (id, name),
        class_master:class_master_id (id, name, description)
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
    
    // Transform to ensure single objects instead of arrays
    return (data || []).map(item => ({
      ...item,
      kelompok: Array.isArray(item.kelompok) ? item.kelompok[0] : item.kelompok,
      class_master: Array.isArray(item.class_master) ? item.class_master[0] : item.class_master
    }))
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}

// Create class from master template
export async function createClassFromMaster(
  kelompokId: string,
  masterId: string,
  customName?: string
) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk membuat kelas')
    }

    // Get master data
    const { data: master, error: masterError } = await supabase
      .from('class_masters')
      .select('name')
      .eq('id', masterId)
      .single()

    if (masterError) throw masterError

    const className = customName || master.name

    const { data: result, error } = await supabase
      .from('classes')
      .insert({
        name: className,
        kelompok_id: kelompokId,
        class_master_id: masterId,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/kelas')
    return { success: true, class: result }
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
        kelompok_id: kelompokId,
        class_master_id: null,
        is_active: true
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
export async function updateClass(classId: string, data: { name: string }) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk mengupdate kelas')
    }

    const { name } = data
    
    if (!name) {
      throw new Error('Nama kelas harus diisi')
    }

    const { data: result, error } = await supabase
      .from('classes')
      .update({ name })
      .eq('id', classId)
      .select()
      .single()

    if (error) throw error

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
