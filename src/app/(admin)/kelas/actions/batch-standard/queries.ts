import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExistingClass } from './logic'

export async function fetchExistingClassesForKelompoks(
  supabase: SupabaseClient,
  kelompokIds: string[]
): Promise<{ data: (ExistingClass & { kelompok_id: string })[] | null; error: any }> {
  return supabase
    .from('classes')
    .select('id, name, kelompok_id, class_master_mappings(class_master_id)')
    .in('kelompok_id', kelompokIds)
}

export async function insertClassWithMasterMapping(
  supabase: SupabaseClient,
  kelompokId: string,
  name: string,
  masterId: string
): Promise<{ data: { id: string } | null; error: any }> {
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .insert({ name, kelompok_id: kelompokId })
    .select('id')
    .single()

  if (classError || !classData) return { data: null, error: classError }

  const { error: mappingError } = await supabase
    .from('class_master_mappings')
    .insert({ class_id: classData.id, class_master_id: masterId })

  if (mappingError) return { data: null, error: mappingError }

  return { data: classData, error: null }
}
