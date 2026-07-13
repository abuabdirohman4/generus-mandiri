import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchCustomFieldValues(
  supabase: SupabaseClient,
  templateId: string
): Promise<{ student_id: string; value: string }[]> {
  const { data, error } = await supabase
    .from('student_custom_field_values')
    .select('student_id, value')
    .eq('template_id', templateId)

  if (error) throw error
  return data ?? []
}

export async function upsertCustomFieldValue(
  supabase: SupabaseClient,
  studentId: string,
  templateId: string,
  value: string
): Promise<void> {
  const { error } = await supabase
    .from('student_custom_field_values')
    .upsert(
      { student_id: studentId, template_id: templateId, value, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,template_id' }
    )

  if (error) throw error
}

export async function deleteCustomFieldValuesForTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<void> {
  const { error } = await supabase
    .from('student_custom_field_values')
    .delete()
    .eq('template_id', templateId)

  if (error) throw error
}
