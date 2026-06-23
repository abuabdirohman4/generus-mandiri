import type { SupabaseClient } from '@supabase/supabase-js'

export interface InsertResult<T> {
  data: T | null
  error: { message: string } | null
}

/**
 * Thin query helpers that insert an org row and return the created id.
 * These are onboarding-only wrappers — they do NOT replace createDaerah/createDesa/createKelompok
 * (which handle revalidatePath, logging, etc.).
 * The onboarding wizard needs the id to cascade to the next step.
 */
export async function insertDaerahReturningId(
  supabase: SupabaseClient,
  data: { name: string }
): Promise<InsertResult<{ id: string }>> {
  const { data: row, error } = await supabase
    .from('daerah')
    .insert([{ name: data.name.trim() }])
    .select('id')
    .single()
  return { data: row ?? null, error: error ?? null }
}

export async function insertDesaReturningId(
  supabase: SupabaseClient,
  data: { name: string; daerah_id: string }
): Promise<InsertResult<{ id: string }>> {
  const { data: row, error } = await supabase
    .from('desa')
    .insert([{ name: data.name.trim(), daerah_id: data.daerah_id }])
    .select('id')
    .single()
  return { data: row ?? null, error: error ?? null }
}

export async function insertKelompokReturningId(
  supabase: SupabaseClient,
  data: { name: string; desa_id: string }
): Promise<InsertResult<{ id: string }>> {
  const { data: row, error } = await supabase
    .from('kelompok')
    .insert([{ name: data.name.trim(), desa_id: data.desa_id }])
    .select('id')
    .single()
  return { data: row ?? null, error: error ?? null }
}
