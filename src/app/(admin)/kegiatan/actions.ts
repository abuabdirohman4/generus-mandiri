'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import type {
  ActivityType,
  ActivityLevel,
  TeacherActivityType,
  CreateActivityTypeData,
  UpdateActivityTypeData,
} from '@/types/activityType'
import { logActivity } from '@/lib/activityLogger'

async function assertAdminAccess() {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    throw new Error('Tidak memiliki akses untuk operasi ini')
  }
  // superadmin: full access
  // admin daerah: daerah_id set, no desa_id (inline check — userUtils is client-only)
  const isAdminDaerah = profile.role === 'admin' && !!profile.daerah_id && !profile.desa_id
  if (profile.role !== 'superadmin' && !isAdminDaerah) {
    throw new Error('Tidak memiliki akses untuk operasi ini')
  }
  return profile
}

export async function getAllActivityTypes(): Promise<ActivityType[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_types')
      .select('*')
      .order('sort_order')

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching activity types:', error)
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data tipe kegiatan')
  }
}

export async function createActivityType(data: CreateActivityTypeData) {
  try {
    await assertAdminAccess()

    const supabase = await createClient()

    const { error } = await supabase
      .from('activity_types')
      .insert([{
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
      }])

    if (error) {
      throw error
    }

    revalidatePath('/kegiatan')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'create_activity_type',
        entityType: 'activity_type',
        entityLabel: data.name,
        pagePath: '/kegiatan',
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'menyimpan data', 'Gagal membuat tipe kegiatan')
    return { success: false, message: errorInfo.message }
  }
}

export async function updateActivityType(id: string, data: UpdateActivityTypeData) {
  try {
    await assertAdminAccess()

    const supabase = await createClient()

    const { error } = await supabase
      .from('activity_types')
      .update({
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/kegiatan')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_activity_type',
        entityType: 'activity_type',
        entityId: id,
        entityLabel: data.name || '',
        pagePath: '/kegiatan',
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal mengupdate tipe kegiatan')
    return { success: false, message: errorInfo.message }
  }
}

export async function deleteActivityType(id: string) {
  try {
    await assertAdminAccess()

    const supabase = await createClient()

    // Check if this activity type is used in any meetings
    const { count, error: countError } = await supabase
      .from('meetings')
      .select('id', { count: 'exact', head: true })
      .eq('activity_type_id', id)

    if (countError) {
      throw countError
    }

    if ((count ?? 0) > 0) {
      throw new Error('Tidak dapat menghapus tipe kegiatan yang sudah digunakan di pertemuan')
    }

    const { error } = await supabase
      .from('activity_types')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/kegiatan')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'delete_activity_type',
        entityType: 'activity_type',
        entityId: id,
        pagePath: '/kegiatan',
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'menghapus data', 'Gagal menghapus tipe kegiatan')
    return { success: false, message: errorInfo.message }
  }
}

export async function getAllActivityLevels(): Promise<ActivityLevel[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('activity_levels')
      .select('*')
      .order('sort_order')

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching activity levels:', error)
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data tingkat kegiatan')
  }
}

export async function updateActivityLevel(id: string, data: { name: string }) {
  try {
    await assertAdminAccess()

    const supabase = await createClient()

    const { error } = await supabase
      .from('activity_levels')
      .update({
        name: data.name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/kegiatan')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_activity_type',
        entityType: 'activity_type',
        entityId: id,
        entityLabel: `Update Level: ${data.name}`,
        pagePath: '/kegiatan',
        metadata: data
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal mengupdate tingkat kegiatan')
    return { success: false, message: errorInfo.message }
  }
}

/**
 * Get activity types assigned to the currently logged-in user (teacher).
 * For admins, returns all active activity types.
 */
export async function getMyActivityTypes(): Promise<ActivityType[]> {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Tidak terautentikasi')

    // Admin roles: return all active types
    if (profile.role !== 'teacher') {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    }

    // Teachers: return only their assigned types
    const { data, error } = await supabase
      .from('teacher_activity_types')
      .select('activity_type:activity_types(id, code, name, description, is_active, sort_order, created_at, updated_at)')
      .eq('teacher_id', profile.id)

    if (error) throw error
    return (data || []).map((row: any) => row.activity_type).filter(Boolean)
  } catch (error) {
    console.error('Error fetching my activity types:', error)
    throw handleApiError(error, 'memuat data', 'Gagal mengambil tipe kegiatan')
  }
}

export async function getTeacherActivityTypes(teacherId: string): Promise<TeacherActivityType[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('teacher_activity_types')
      .select(`
        *,
        activity_type:activity_types(id, code, name)
      `)
      .eq('teacher_id', teacherId)

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching teacher activity types:', error)
    throw handleApiError(error, 'memuat data', 'Gagal mengambil tipe kegiatan guru')
  }
}

export async function assignActivityTypeToTeacher(teacherId: string, activityTypeId: string) {
  try {
    await assertAdminAccess()

    const supabase = await createClient()

    const { error } = await supabase
      .from('teacher_activity_types')
      .insert([{
        teacher_id: teacherId,
        activity_type_id: activityTypeId,
      }])

    if (error) {
      throw error
    }

    revalidatePath('/kegiatan')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_teacher_settings',
        entityType: 'teacher',
        entityId: teacherId,
        entityLabel: `Assign Activity Type: ${activityTypeId}`,
        pagePath: '/kegiatan',
        metadata: { activityTypeId }
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'menyimpan data', 'Gagal menambahkan tipe kegiatan ke guru')
    return { success: false, message: errorInfo.message }
  }
}

export async function removeActivityTypeFromTeacher(teacherId: string, activityTypeId: string) {
  try {
    await assertAdminAccess()

    const supabase = await createClient()

    const { error } = await supabase
      .from('teacher_activity_types')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('activity_type_id', activityTypeId)

    if (error) {
      throw error
    }

    revalidatePath('/kegiatan')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_teacher_settings',
        entityType: 'teacher',
        entityId: teacherId,
        entityLabel: `Remove Activity Type: ${activityTypeId}`,
        pagePath: '/kegiatan',
        metadata: { activityTypeId }
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'menghapus data', 'Gagal menghapus tipe kegiatan dari guru')
    return { success: false, message: errorInfo.message }
  }
}
