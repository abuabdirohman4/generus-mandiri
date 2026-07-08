import type { SupabaseClient } from '@supabase/supabase-js'

export interface ClassMasterRef {
  id: string
  name: string
}

const LAINNYA_MASTER_NAME = 'Lainnya'

export async function getLainnyaClassMaster(
  supabase: SupabaseClient
): Promise<{ data: ClassMasterRef | null; error: any }> {
  const { data: existing } = await supabase
    .from('class_masters')
    .select('id, name')
    .ilike('name', LAINNYA_MASTER_NAME)
    .maybeSingle()

  if (existing) return { data: existing, error: null }

  return { data: null, error: new Error('Master kelas "Lainnya" tidak ditemukan') }
}
