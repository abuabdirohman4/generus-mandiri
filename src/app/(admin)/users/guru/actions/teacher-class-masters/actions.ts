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
import { buildClassMasterMappings, mapTeacherClassMastersToResult, type ClassMasterAssignmentInput } from './logic'

export async function getTeacherClassMasters(teacherId: string): Promise<{ success: boolean; data: any[]; message?: string }> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await fetchTeacherClassMasters(supabase, teacherId)
    if (error) throw error
    return { success: true, data: mapTeacherClassMastersToResult(data || []) }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat tingkatan kelas guru')
    return { success: false, message: errorInfo.message, data: [] }
  }
}

export async function updateTeacherClassMasters(teacherId: string, assignments: ClassMasterAssignmentInput[]) {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile || !canAccessFeature(profile, 'users')) {
      throw new Error('Anda tidak memiliki akses untuk mengubah tingkatan kelas guru')
    }

    const adminClient = await createAdminClient()
    const { error: deleteError } = await deleteTeacherClassMasterAssignments(adminClient, teacherId)
    if (deleteError) throw deleteError

    if (assignments.length > 0) {
      const mappings = buildClassMasterMappings(teacherId, assignments)
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
        metadata: { assignments }
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal mengupdate tingkatan kelas guru')
    return { success: false, message: errorInfo.message }
  }
}
