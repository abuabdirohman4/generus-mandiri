'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from './queries'
import { getLainnyaClassMaster } from './custom-queries'
import type { BatchStandardResult, KelompokResult } from './actions'

export async function createBatchCustomClass(
  kelompokIds: string[],
  className: string
): Promise<BatchStandardResult> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk membuat kelas')
    }

    if (!kelompokIds?.length) throw new Error('Pilih minimal satu kelompok')

    const trimmedName = className?.trim()
    if (!trimmedName) throw new Error('Nama kelas harus diisi')

    const supabase = await createAdminClient()

    const { data: master, error: masterError } = await getLainnyaClassMaster(supabase)
    if (masterError || !master) throw masterError || new Error('Master kelas "Lainnya" tidak ditemukan')

    const { data: existingClasses, error: fetchError } = await fetchExistingClassesForKelompoks(
      supabase,
      kelompokIds
    )
    if (fetchError) throw fetchError

    // Dedupe by exact name only — class_master_id is shared ("Lainnya") across
    // ALL custom classes, so it cannot be used to detect duplicates here.
    const kelompokIdsWithSameName = new Set(
      (existingClasses || [])
        .filter((cls: any) => cls?.name?.toLowerCase().trim() === trimmedName.toLowerCase())
        .map((cls: any) => cls.kelompok_id as string)
    )

    let totalCreated = 0
    let totalSkipped = 0
    const byKelompok: KelompokResult[] = []

    for (const kelompokId of kelompokIds) {
      const kelompokResult: KelompokResult = {
        kelompokId,
        created: [],
        skipped: [],
        errors: [],
      }

      if (kelompokIdsWithSameName.has(kelompokId)) {
        kelompokResult.skipped.push(trimmedName)
        totalSkipped++
        byKelompok.push(kelompokResult)
        continue
      }

      const { data, error } = await insertClassWithMasterMapping(
        supabase, kelompokId, trimmedName, master.id
      )
      if (error) {
        kelompokResult.errors.push(error.message || 'Unknown error')
      } else if (data) {
        kelompokResult.created.push(trimmedName)
        totalCreated++
      }

      byKelompok.push(kelompokResult)
    }

    revalidatePath('/kelas')

    if (totalCreated > 0) {
      void logActivity({
        userId: profile.id,
        action: 'batch_create_custom_class',
        entityType: 'class',
        entityId: kelompokIds[0],
        entityLabel: `${trimmedName} (${totalCreated} kelompok)`,
        pagePath: '/kelas',
        metadata: { kelompokIds, className: trimmedName, totalCreated, totalSkipped }
      })
    }

    return { success: totalCreated > 0, totalCreated, totalSkipped, byKelompok }
  } catch (error) {
    const errorInfo = handleApiError(error, 'membuat kelas', 'Gagal membuat kelas custom')
    return { success: false, totalCreated: 0, totalSkipped: 0, byKelompok: [], message: errorInfo.message }
  }
}
