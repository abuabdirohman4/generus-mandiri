'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import {
  fetchTeacherClassMasters,
  deleteTeacherClassMasterAssignments,
  insertTeacherClassMasterAssignments,
} from './queries'
import { buildClassMasterMappings, mapTeacherClassMastersToResult } from './logic'

export async function getTeacherClassMasters(teacherId: string) {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await fetchTeacherClassMasters(supabase, teacherId)
    if (error) throw error
    return mapTeacherClassMastersToResult(data || [])
  } catch (error) {
    throw handleApiError(error, 'memuat data', 'Gagal memuat tingkatan kelas guru')
  }
}

export async function updateTeacherClassMasters(teacherId: string, classMasterIds: string[]) {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile || !canAccessFeature(profile, 'users')) {
      throw new Error('Anda tidak memiliki akses untuk mengubah tingkatan kelas guru')
    }

    const adminClient = await createAdminClient()
    const { error: deleteError } = await deleteTeacherClassMasterAssignments(adminClient, teacherId)
    if (deleteError) throw deleteError

    if (classMasterIds.length > 0) {
      const mappings = buildClassMasterMappings(teacherId, classMasterIds)
      const { error: insertError } = await insertTeacherClassMasterAssignments(adminClient, mappings)
      if (insertError) throw insertError
    }

    revalidatePath('/users/guru')

    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_teacher_settings',
        entityType: 'teacher',
        entityId: teacherId,
        entityLabel: 'Update Class Master Assignments',
        pagePath: '/users/guru',
        metadata: { classMasterIds }
      })
    }

    return { success: true }
  } catch (error) {
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate tingkatan kelas guru')
  }
}
