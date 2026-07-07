import type { SupabaseClient } from '@supabase/supabase-js'

export interface ClassMasterRef {
  id: string
  name: string
}

export async function findOrCreateCustomClassMaster(
  supabase: SupabaseClient,
  name: string
): Promise<{ data: ClassMasterRef | null; error: any }> {
  const trimmedName = name.trim()

  const { data: existing } = await supabase
    .from('class_masters')
    .select('id, name')
    .ilike('name', trimmedName)
    .maybeSingle()

  if (existing) return { data: existing, error: null }

  const { data: created, error } = await supabase
    .from('class_masters')
    .insert({ name: trimmedName, category_group: 'custom' })
    .select('id, name')
    .single()

  if (error || !created) return { data: null, error }

  return { data: created, error: null }
}
