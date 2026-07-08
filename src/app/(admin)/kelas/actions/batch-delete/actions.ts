'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'

export interface DeleteClassFailure {
  classId: string
  message: string
}

export interface DeleteClassesBatchResult {
  success: boolean
  totalDeleted: number
  totalFailed: number
  failed: DeleteClassFailure[]
  message?: string
}

export async function deleteClassesBatch(classIds: string[]): Promise<DeleteClassesBatchResult> {
  const profile = await getCurrentUserProfile()
  if (!profile || !canAccessFeature(profile, 'manage_classes')) {
    return { success: false, totalDeleted: 0, totalFailed: 0, failed: [], message: 'Anda tidak memiliki akses untuk menghapus kelas' }
  }

  if (!classIds?.length) {
    return { success: false, totalDeleted: 0, totalFailed: 0, failed: [], message: 'Pilih minimal satu kelas' }
  }

  const supabase = await createClient()
  const failed: DeleteClassFailure[] = []
  let totalDeleted = 0

  for (const classId of classIds) {
    const { error } = await supabase.from('classes').delete().eq('id', classId)
    if (error) {
      failed.push({ classId, message: error.message || 'Gagal menghapus kelas' })
    } else {
      totalDeleted++
    }
  }

  if (totalDeleted > 0) {
    revalidatePath('/kelas')
    void logActivity({
      userId: profile.id,
      action: 'batch_delete_classes',
      entityType: 'class',
      entityId: classIds[0],
      entityLabel: `${totalDeleted} kelas`,
      pagePath: '/kelas',
      metadata: { classIds, totalDeleted, totalFailed: failed.length }
    })
  }

  return {
    success: totalDeleted > 0,
    totalDeleted,
    totalFailed: failed.length,
    failed,
  }
}
