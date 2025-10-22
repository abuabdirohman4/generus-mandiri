'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'

export interface ClassMaster {
  id: string
  name: string
  description?: string | null
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface ClassMasterData {
  name: string
  description: string
  sort_order: number
  is_active: boolean
}

// Get all class masters (visible to all authenticated users)
export async function getAllClassMasters(): Promise<ClassMaster[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('class_masters')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) throw error
    return data || []
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar master kelas')
    throw error
  }
}

// Create new class master (Superadmin only)
export async function createClassMaster(data: ClassMasterData) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_class_masters')) {
      throw new Error('Anda tidak memiliki akses untuk membuat master kelas')
    }

    const { name, description, sort_order, is_active } = data
    
    if (!name) {
      throw new Error('Nama kelas harus diisi')
    }

    const { data: result, error } = await supabase
      .from('class_masters')
      .insert({ name, description, sort_order, is_active })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('Nama kelas sudah ada')
      }
      throw error
    }

    revalidatePath('/kelas')
    return { success: true, master: result }
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'Gagal membuat master kelas')
    throw error
  }
}

// Update class master (Superadmin only)
export async function updateClassMaster(masterId: string, data: ClassMasterData) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_class_masters')) {
      throw new Error('Anda tidak memiliki akses untuk mengupdate master kelas')
    }

    const { name, description, sort_order, is_active } = data
    
    if (!name) {
      throw new Error('Nama kelas harus diisi')
    }

    const { data: result, error } = await supabase
      .from('class_masters')
      .update({
        name,
        description,
        sort_order,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', masterId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/kelas')
    return { success: true, master: result }
  } catch (error) {
    handleApiError(error, 'memperbarui data', 'Gagal memperbarui master kelas')
    throw error
  }
}

// Delete class master (Superadmin only)
export async function deleteClassMaster(masterId: string) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_class_masters')) {
      throw new Error('Anda tidak memiliki akses untuk menghapus master kelas')
    }

    const { error } = await supabase
      .from('class_masters')
      .delete()
      .eq('id', masterId)

    if (error) throw error

    revalidatePath('/kelas')
    return { success: true }
  } catch (error) {
    handleApiError(error, 'menghapus data', 'Gagal menghapus master kelas')
    throw error
  }
}

// Toggle active status
export async function toggleClassMasterActive(masterId: string, isActive: boolean) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    
    if (!profile || !canAccessFeature(profile, 'manage_class_masters')) {
      throw new Error('Anda tidak memiliki akses')
    }

    const { error } = await supabase
      .from('class_masters')
      .update({ is_active: isActive })
      .eq('id', masterId)

    if (error) throw error

    revalidatePath('/kelas')
    return { success: true }
  } catch (error) {
    handleApiError(error, 'mengupdate status', 'Gagal mengupdate status')
    throw error
  }
}
