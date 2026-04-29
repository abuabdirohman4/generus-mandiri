import type { SupabaseClient } from '@supabase/supabase-js'
import type { MonthlyTargetInput } from '../../types'

export async function fetchMonthlyTargets(
  supabase: SupabaseClient,
  params: {
    class_master_id: string
    academic_year_id: string
    semester: number
    month?: number
  }
) {
  let query = supabase
    .from('material_monthly_targets')
    .select(`
      *,
      material_item:material_items(
        id, name, description,
        material_type:material_types(
          id, name,
          material_category:material_categories(id, name)
        )
      )
    `)
    .eq('class_master_id', params.class_master_id)
    .eq('academic_year_id', params.academic_year_id)
    .eq('semester', params.semester)
    .order('display_order', { ascending: true })

  if (params.month !== undefined) {
    query = query.eq('month', params.month)
  }

  return query
}

export async function insertMonthlyTarget(
  supabase: SupabaseClient,
  data: MonthlyTargetInput & { created_by: string }
) {
  return supabase
    .from('material_monthly_targets')
    .insert(data)
    .select()
    .single()
}

export async function deleteMonthlyTargetById(
  supabase: SupabaseClient,
  id: string
) {
  return supabase
    .from('material_monthly_targets')
    .delete()
    .eq('id', id)
}

export async function bulkUpsertMonthlyTargets(
  supabase: SupabaseClient,
  records: Array<MonthlyTargetInput & { created_by: string }>
) {
  const withMonth = records.filter(r => r.month != null)
  const withoutMonth = records.filter(r => r.month == null)

  // Rows with month: use upsert with partial index columns
  if (withMonth.length > 0) {
    const { error } = await supabase
      .from('material_monthly_targets')
      .upsert(withMonth, {
        onConflict: 'class_master_id,academic_year_id,semester,month,material_item_id',
        ignoreDuplicates: true
      })
    if (error) return { error }
  }

  // Rows without month: plain insert (caller must delete existing null-month rows first)
  if (withoutMonth.length > 0) {
    const { error } = await supabase
      .from('material_monthly_targets')
      .insert(withoutMonth)
    if (error) return { error }
  }

  return { error: null }
}

export async function deleteMonthlyTargetsByMonth(
  supabase: SupabaseClient,
  params: {
    class_master_id: string
    academic_year_id: string
    semester: number
    month: number
  }
) {
  return supabase
    .from('material_monthly_targets')
    .delete()
    .eq('class_master_id', params.class_master_id)
    .eq('academic_year_id', params.academic_year_id)
    .eq('semester', params.semester)
    .eq('month', params.month)
}

export async function fetchMonthlyTargetItemIds(
  supabase: SupabaseClient,
  params: {
    academic_year_id: string
    semester: number
    month: number
    class_master_id?: string
  }
) {
  let query = supabase
    .from('material_monthly_targets')
    .select('material_item_id')
    .eq('academic_year_id', params.academic_year_id)
    .eq('semester', params.semester)
    .eq('month', params.month)

  if (params.class_master_id) {
    query = query.eq('class_master_id', params.class_master_id)
  }

  return query
}

export async function fetchMonthlyTargetsByItemId(
  supabase: SupabaseClient,
  params: {
    material_item_id: string
    academic_year_id: string
  }
) {
  return supabase
    .from('material_monthly_targets')
    .select('class_master_id, semester, month')
    .eq('material_item_id', params.material_item_id)
    .eq('academic_year_id', params.academic_year_id)
}

export async function deleteMonthlyTargetsByItem(
  supabase: SupabaseClient,
  params: {
    material_item_id: string
    academic_year_id: string
  }
) {
  return supabase
    .from('material_monthly_targets')
    .delete()
    .eq('material_item_id', params.material_item_id)
    .eq('academic_year_id', params.academic_year_id)
}

export async function deleteMonthlyTargetsByItemIds(
  supabase: SupabaseClient,
  params: {
    material_item_ids: string[]
    academic_year_id: string
  }
) {
  return supabase
    .from('material_monthly_targets')
    .delete()
    .in('material_item_id', params.material_item_ids)
    .eq('academic_year_id', params.academic_year_id)
}

export async function fetchMonthlyTargetsByItemIds(
  supabase: SupabaseClient,
  params: {
    material_item_ids: string[]
    academic_year_id: string
  }
) {
  return supabase
    .from('material_monthly_targets')
    .select('material_item_id, class_master_id, semester, month')
    .in('material_item_id', params.material_item_ids)
    .eq('academic_year_id', params.academic_year_id)
}
