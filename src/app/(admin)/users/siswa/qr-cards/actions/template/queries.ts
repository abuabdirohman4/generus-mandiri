import type { SupabaseClient } from '@supabase/supabase-js'
import type { IdCardTemplate, TemplatePositions } from '@/types/idCardTemplate'

export async function fetchIdCardTemplates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('id_card_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as IdCardTemplate[]
}

export async function insertIdCardTemplate(
  supabase: SupabaseClient,
  templateData: Omit<IdCardTemplate, 'id' | 'created_at' | 'created_by'>
) {
  const { data, error } = await supabase
    .from('id_card_templates')
    .insert(templateData)
    .select()
    .single()

  if (error) throw error
  return data as IdCardTemplate
}

export async function updateIdCardTemplatePositions(
  supabase: SupabaseClient,
  id: string,
  positions: TemplatePositions,
  name?: string
) {
  const { data, error } = await supabase
    .from('id_card_templates')
    .update(name !== undefined ? { ...positions, name } : positions)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as IdCardTemplate
}

export async function deleteIdCardTemplate(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from('id_card_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function uploadTemplateImage(supabase: SupabaseClient, file: File, fileName: string) {
  const { data, error } = await supabase.storage
    .from('id-card-templates')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return data.path
}

export async function deleteTemplateImage(supabase: SupabaseClient, path: string) {
  const { error } = await supabase.storage
    .from('id-card-templates')
    .remove([path])
  if (error) throw error
}

export async function getTemplateImageSignedUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from('id-card-templates')
    .createSignedUrl(path, 60 * 60) // 1 hour

  if (error) throw error
  return data.signedUrl
}

export async function getIdCardTemplateQuery(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('id_card_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as IdCardTemplate
}
