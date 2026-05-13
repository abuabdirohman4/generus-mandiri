'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import { getAllClassMasters } from '../masters'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from './queries'
import { filterStandardMasters, buildBatchPlan } from './logic'

export interface KelompokResult {
  kelompokId: string
  created: string[]
  skipped: string[]
  errors: string[]
}

export interface BatchStandardResult {
  success: boolean
  totalCreated: number
  totalSkipped: number
  byKelompok: KelompokResult[]
}

export async function createBatchStandardClasses(
  kelompokIds: string[],
  masterIds: string[]
): Promise<BatchStandardResult> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk membuat kelas')
    }

    if (!kelompokIds?.length) throw new Error('Pilih minimal satu kelompok')
    if (!masterIds?.length) throw new Error('Pilih minimal satu kelas standar')

    const supabase = await createAdminClient()

    // Get all masters, filter to selected IDs only (from the standard list)
    const allMasters = await getAllClassMasters()
    const standardMasters = filterStandardMasters(allMasters)
    const selectedMasters = standardMasters.filter(m => masterIds.includes(m.id))

    if (selectedMasters.length === 0) throw new Error('Tidak ada master kelas yang valid')

    // Fetch existing classes for all kelompoks at once
    const { data: existingClasses, error: fetchError } = await fetchExistingClassesForKelompoks(
      supabase,
      kelompokIds
    )
    if (fetchError) throw fetchError

    // Group existing classes by kelompok_id
    const byKelompokId = (existingClasses || []).reduce<Record<string, any[]>>((acc, cls) => {
      if (!cls) return acc
      const kid = (cls as any).kelompok_id as string
      if (!acc[kid]) acc[kid] = []
      acc[kid]!.push(cls)
      return acc
    }, {})

    let totalCreated = 0
    let totalSkipped = 0
    const byKelompok: KelompokResult[] = []

    for (const kelompokId of kelompokIds) {
      const existing = byKelompokId[kelompokId] || []
      const plan = buildBatchPlan(selectedMasters, kelompokId, existing as any)
      const kelompokResult: KelompokResult = {
        kelompokId,
        created: [],
        skipped: plan.toSkip.map(s => s.master.name),
        errors: [],
      }

      totalSkipped += plan.toSkip.length

      for (const master of plan.toCreate) {
        const { data, error } = await insertClassWithMasterMapping(
          supabase, kelompokId, master.name, master.id
        )
        if (error) {
          kelompokResult.errors.push(`${master.name}: ${error.message || 'Unknown error'}`)
        } else if (data) {
          kelompokResult.created.push(master.name)
          totalCreated++
        }
      }

      byKelompok.push(kelompokResult)
    }

    revalidatePath('/kelas')

    if (totalCreated > 0) {
      void logActivity({
        userId: profile.id,
        action: 'batch_create_standard_classes',
        entityType: 'class',
        entityId: kelompokIds[0],
        entityLabel: `${totalCreated} kelas standar`,
        pagePath: '/kelas',
        metadata: { kelompokIds, masterIds, totalCreated, totalSkipped }
      })
    }

    return { success: totalCreated > 0, totalCreated, totalSkipped, byKelompok }
  } catch (error) {
    handleApiError(error, 'membuat kelas', 'Gagal membuat kelas standar')
    throw error
  }
}
