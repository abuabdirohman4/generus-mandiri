'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import {
  fetchTeacherKelompokAccess,
  deleteTeacherKelompokAccess,
  insertTeacherKelompokAccess,
} from './queries'
import { validateKelompokAccessInput, buildKelompokAccessMappings } from './logic'

export async function getTeacherKelompokAccess(
  teacherId: string
): Promise<{ success: boolean; data: string[]; message?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await fetchTeacherKelompokAccess(supabase, teacherId)
    if (error) throw error
    return {
      success: true,
      data: (data || []).map((r: any) => r.kelompok_id),
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      message: handleApiError(error, 'memuat data', 'Gagal memuat akses kelompok').message,
    }
  }
}

export async function updateTeacherKelompokAccess(
  teacherId: string,
  kelompokIds: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const validation = validateKelompokAccessInput(teacherId, kelompokIds)
    if (!validation.valid) return { success: false, message: validation.message }

    const supabase = await createClient()

    const { error: deleteError } = await deleteTeacherKelompokAccess(supabase, teacherId)
    if (deleteError) throw deleteError

    if (kelompokIds.length > 0) {
      const mappings = buildKelompokAccessMappings(teacherId, kelompokIds)
      const { error: insertError } = await insertTeacherKelompokAccess(supabase, mappings)
      if (insertError) throw insertError
    }

    revalidatePath('/users/guru')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_teacher_settings',
        entityType: 'teacher',
        entityId: teacherId,
        entityLabel: 'Update Kelompok Access',
        pagePath: '/users/guru',
        metadata: { kelompokIds, count: kelompokIds.length } as any,
      })
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: handleApiError(error, 'menyimpan data', 'Gagal menyimpan akses kelompok').message,
    }
  }
}
