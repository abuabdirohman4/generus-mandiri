'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, canManageMaterials } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import type { MonthlyTarget, MonthlyTargetInput } from '../../types'
import {
  fetchMonthlyTargets,
  insertMonthlyTarget,
  deleteMonthlyTargetById,
  bulkUpsertMonthlyTargets,
  deleteMonthlyTargetsByMonth,
  fetchMonthlyTargetItemIds,
  fetchMonthlyTargetsByItemId,
  deleteMonthlyTargetsByItem,
  deleteMonthlyTargetsByItemIds,
  fetchMonthlyTargetsByItemIds
} from './queries'

export async function getMonthlyTargets(params: {
  class_master_id: string
  semester: number
  month?: number
}): Promise<MonthlyTarget[]> {
  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargets(supabase, params)

  if (error) {
    console.error('Error getting monthly targets:', error)
    throw new Error('Gagal memuat target bulanan')
  }

  return data || []
}

export async function createMonthlyTarget(input: MonthlyTargetInput): Promise<{ success: boolean; data?: MonthlyTarget; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized: Curriculum management access required')

    const supabase = await createClient()
    const { data, error } = await insertMonthlyTarget(supabase, {
      ...input,
      created_by: profile.id
    })

    if (error) {
      if (error.code === '23505') throw new Error('Materi ini sudah ada sebagai target bulan tersebut')
      throw error
    }

    revalidatePath('/materi')

    void logActivity({
      userId: profile.id,
      action: 'create_monthly_target',
      entityType: 'monthly_target',
      entityId: data.id,
      pagePath: '/materi',
      metadata: input as any
    })

    return { success: true, data }
  } catch (error) {
    const errorInfo = handleApiError(error, 'menyimpan data', 'Gagal membuat target bulanan')
    return { success: false, message: errorInfo.message }
  }
}

export async function deleteMonthlyTarget(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await deleteMonthlyTargetById(supabase, id)
    if (error) throw error

    revalidatePath('/materi')

    void logActivity({
      userId: profile.id,
      action: 'delete_monthly_target',
      entityType: 'monthly_target',
      entityId: id,
      pagePath: '/materi'
    })

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'menghapus data', 'Gagal menghapus target bulanan')
    return { success: false, message: errorInfo.message }
  }
}

export async function bulkSetMonthlyTargets(
  params: { class_master_id: string; semester: number; month: number },
  materialItemIds: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Delete semua target bulan ini dulu (replace strategy)
    await deleteMonthlyTargetsByMonth(supabase, params)

    // Insert yang baru
    if (materialItemIds.length > 0) {
      const records = materialItemIds.map((itemId, index) => ({
        class_master_id: params.class_master_id,
        semester: params.semester as 1 | 2,
        month: params.month as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
        week: null,
        day_of_week: null,
        material_item_id: itemId,
        display_order: index,
        created_by: profile.id
      }))

      const { error } = await bulkUpsertMonthlyTargets(supabase, records as any)
      if (error) throw error
    }

    revalidatePath('/materi')

    void logActivity({
      userId: profile.id,
      action: 'update_monthly_target',
      entityType: 'monthly_target',
      entityLabel: 'Bulk Set Targets',
      pagePath: '/materi',
      metadata: { ...params, count: materialItemIds.length }
    })

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal menyimpan target bulanan')
    return { success: false, message: errorInfo.message }
  }
}

export async function getMonthlyTargetItemIds(params: {
  semester: number
  month: number
  class_master_id?: string
}): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargetItemIds(supabase, {
    semester: params.semester,
    month: params.month,
    class_master_id: params.class_master_id
  })

  if (error) {
    console.error('Error fetching monthly target item ids:', error)
    return []
  }

  return Array.from(new Set(data.map(d => d.material_item_id)))
}

export async function getMonthlyTargetsByItem(itemId: string): Promise<Array<{ class_master_id: string; semester: number; month: number }>> {
  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargetsByItemId(supabase, {
    material_item_id: itemId,
  })

  if (error) {
    console.error('Error fetching monthly targets by item:', error)
    return []
  }

  return data || []
}

export async function syncItemMonthlyTargets(
  itemId: string,
  mappings: Array<{ class_master_id: string; semester: number; month: number | null }>
): Promise<{ success: boolean; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Delete all existing monthly targets for THIS item in THIS academic year
    const { error: deleteError } = await deleteMonthlyTargetsByItem(supabase, {
      material_item_id: itemId,
      })

    if (deleteError) throw deleteError

    // 2. Insert new targets if any
    if (mappings.length > 0) {
      const records = mappings.map((m, index) => ({
        class_master_id: m.class_master_id,
        semester: m.semester as 1 | 2,
        month: m.month as (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) | null,
        material_item_id: itemId,
        display_order: index,
        created_by: profile.id
      }))

      const { error: insertError } = await bulkUpsertMonthlyTargets(supabase, records as any)
      if (insertError) throw insertError
    }

    revalidatePath('/materi')

    void logActivity({
      userId: profile.id,
      action: 'update_monthly_target',
      entityType: 'monthly_target',
      entityId: itemId,
      entityLabel: 'Sync Item Targets',
      pagePath: '/materi',
      metadata: { mappings }
    })

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal memperbarui target bulanan')
    return { success: false, message: errorInfo.message }
  }
}

export async function syncItemMonthlyTargetsBulk(
  itemIds: string[],
  mappings: Array<{ class_master_id: string; semester: number; month: number }>,
  mode: 'replace' | 'add'
): Promise<{ success: boolean; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Delete existing if replace mode
    if (mode === 'replace') {
      const { error: deleteError } = await deleteMonthlyTargetsByItemIds(supabase, {
        material_item_ids: itemIds,
          })

      if (deleteError) throw deleteError
    }

    // 2. Insert new targets if any
    if (mappings.length > 0 && itemIds.length > 0) {
      const records: any[] = []
      
      itemIds.forEach(itemId => {
        mappings.forEach((m, index) => {
          records.push({
            class_master_id: m.class_master_id,
                semester: m.semester as 1 | 2,
            month: m.month as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
            material_item_id: itemId,
            display_order: index,
            created_by: profile.id
          })
        })
      })

      const { error: insertError } = await bulkUpsertMonthlyTargets(supabase, records)
      if (insertError) throw insertError
    }

    revalidatePath('/materi')

    void logActivity({
      userId: profile.id,
      action: 'update_monthly_target',
      entityType: 'monthly_target',
      entityLabel: 'Bulk Sync Items',
      pagePath: '/materi',
      metadata: { itemIds, mappings, mode }
    })

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal memperbarui target bulanan secara massal')
    return { success: false, message: errorInfo.message }
  }
}

export async function getMonthlyTargetsByItems(
  itemIds: string[]
): Promise<Record<string, Array<{ class_master_id: string; semester: number; month: number }>>> {
  if (itemIds.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargetsByItemIds(supabase, {
    material_item_ids: itemIds,
  })

  if (error) {
    console.error('Error fetching monthly targets by items:', error)
    return {}
  }

  const result: Record<string, Array<{ class_master_id: string; semester: number; month: number }>> = {}
  data.forEach(d => {
    if (!result[d.material_item_id]) {
      result[d.material_item_id] = []
    }
    result[d.material_item_id].push({
      class_master_id: d.class_master_id,
      semester: d.semester,
      month: d.month
    })
  })

  return result
}
