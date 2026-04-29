'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile, canManageMaterials } from '@/lib/accessControlServer'
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
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'

export async function getMonthlyTargets(params: {
  class_master_id: string
  academic_year_id: string
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

export async function createMonthlyTarget(input: MonthlyTargetInput): Promise<MonthlyTarget> {
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
    console.error('Error creating monthly target:', error)
    throw new Error('Gagal membuat target bulanan')
  }

  revalidatePath('/materi')
  return data
}

export async function deleteMonthlyTarget(id: string): Promise<{ success: boolean }> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  if (!canManageMaterials(profile)) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await deleteMonthlyTargetById(supabase, id)

  if (error) {
    console.error('Error deleting monthly target:', error)
    throw new Error('Gagal menghapus target bulanan')
  }

  revalidatePath('/materi')
  return { success: true }
}

export async function bulkSetMonthlyTargets(
  params: { class_master_id: string; academic_year_id: string; semester: number; month: number },
  materialItemIds: string[]
): Promise<{ success: boolean }> {
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
      academic_year_id: params.academic_year_id,
      semester: params.semester as 1 | 2,
      month: params.month as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      week: null,
      day_of_week: null,
      material_item_id: itemId,
      display_order: index,
      created_by: profile.id
    }))

    const { error } = await bulkUpsertMonthlyTargets(supabase, records as any)
    if (error) {
      console.error('Error bulk setting monthly targets:', error)
      throw new Error('Gagal menyimpan target bulanan')
    }
  }

  revalidatePath('/materi')
  return { success: true }
}

export async function getMonthlyTargetItemIds(params: {
  semester: number
  month: number
  class_master_id?: string
}): Promise<string[]> {
  const activeYear = await getActiveAcademicYear()
  if (!activeYear) return []

  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargetItemIds(supabase, {
    academic_year_id: activeYear.id,
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
  const activeYear = await getActiveAcademicYear()
  if (!activeYear) return []

  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargetsByItemId(supabase, {
    material_item_id: itemId,
    academic_year_id: activeYear.id
  })

  if (error) {
    console.error('Error fetching monthly targets by item:', error)
    return []
  }

  return data || []
}

export async function syncItemMonthlyTargets(
  itemId: string,
  mappings: Array<{ class_master_id: string; semester: number; month: number }>
): Promise<{ success: boolean }> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  if (!canManageMaterials(profile)) throw new Error('Unauthorized')

  const activeYear = await getActiveAcademicYear()
  if (!activeYear) throw new Error('Tahun ajaran aktif tidak ditemukan')

  const supabase = await createClient()

  // 1. Delete all existing monthly targets for THIS item in THIS academic year
  const { error: deleteError } = await deleteMonthlyTargetsByItem(supabase, {
    material_item_id: itemId,
    academic_year_id: activeYear.id
  })

  if (deleteError) {
    console.error('Error deleting item monthly targets:', deleteError)
    throw new Error('Gagal memperbarui target bulanan')
  }

  // 2. Insert new targets if any
  if (mappings.length > 0) {
    const records = mappings.map((m, index) => ({
      class_master_id: m.class_master_id,
      academic_year_id: activeYear.id,
      semester: m.semester as 1 | 2,
      month: m.month as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      material_item_id: itemId,
      display_order: index,
      created_by: profile.id
    }))

    const { error: insertError } = await bulkUpsertMonthlyTargets(supabase, records as any)
    if (insertError) {
      console.error('Error inserting item monthly targets:', insertError)
      throw new Error('Gagal menyimpan target bulanan')
    }
  }

  revalidatePath('/materi')
  return { success: true }
}

export async function syncItemMonthlyTargetsBulk(
  itemIds: string[],
  mappings: Array<{ class_master_id: string; semester: number; month: number }>,
  mode: 'replace' | 'add'
): Promise<{ success: boolean }> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  if (!canManageMaterials(profile)) throw new Error('Unauthorized')

  const activeYear = await getActiveAcademicYear()
  if (!activeYear) throw new Error('Tahun ajaran aktif tidak ditemukan')

  const supabase = await createClient()

  // 1. Delete existing if replace mode
  if (mode === 'replace') {
    const { error: deleteError } = await deleteMonthlyTargetsByItemIds(supabase, {
      material_item_ids: itemIds,
      academic_year_id: activeYear.id
    })

    if (deleteError) {
      console.error('Error deleting bulk item monthly targets:', deleteError)
      throw new Error('Gagal memperbarui target bulanan')
    }
  }

  // 2. Insert new targets if any
  if (mappings.length > 0 && itemIds.length > 0) {
    const records: any[] = []
    
    itemIds.forEach(itemId => {
      mappings.forEach((m, index) => {
        records.push({
          class_master_id: m.class_master_id,
          academic_year_id: activeYear.id,
          semester: m.semester as 1 | 2,
          month: m.month as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
          material_item_id: itemId,
          display_order: index,
          created_by: profile.id
        })
      })
    })

    const { error: insertError } = await bulkUpsertMonthlyTargets(supabase, records)
    if (insertError) {
      console.error('Error inserting bulk item monthly targets:', insertError)
      throw new Error('Gagal menyimpan target bulanan')
    }
  }

  revalidatePath('/materi')
  return { success: true }
}

export async function getMonthlyTargetsByItems(
  itemIds: string[]
): Promise<Record<string, number[]>> {
  if (itemIds.length === 0) return {}

  const activeYear = await getActiveAcademicYear()
  if (!activeYear) return {}

  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargetsByItemIds(supabase, {
    material_item_ids: itemIds,
    academic_year_id: activeYear.id
  })

  if (error) {
    console.error('Error fetching monthly targets by items:', error)
    return {}
  }

  const result: Record<string, number[]> = {}
  data.forEach(d => {
    if (!result[d.material_item_id]) {
      result[d.material_item_id] = []
    }
    if (!result[d.material_item_id].includes(d.month)) {
      result[d.material_item_id].push(d.month)
    }
  })

  // Sort each array
  Object.keys(result).forEach(itemId => {
    result[itemId].sort((a, b) => a - b)
  })

  return result
}
