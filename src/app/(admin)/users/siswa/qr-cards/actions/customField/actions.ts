'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { canManageIdCardTemplate } from '@/lib/accessControl'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { fetchCustomFieldValues, upsertCustomFieldValue } from './queries'

async function checkAccess() {
  const profile = await getCurrentUserProfile()
  if (!canManageIdCardTemplate(profile)) {
    throw new Error('Unauthorized')
  }
  return await createAdminClient()
}

export async function getCustomFieldValuesAction(templateId: string) {
  try {
    const supabase = await checkAccess()
    const rows = await fetchCustomFieldValues(supabase, templateId)
    const map: Record<string, string> = {}
    for (const row of rows) {
      map[row.student_id] = row.value
    }
    return { success: true, data: map, message: '' }
  } catch (err: any) {
    return { success: false, message: err.message, data: {} as Record<string, string> }
  }
}

export async function upsertCustomFieldValueAction(
  studentId: string,
  templateId: string,
  value: string
) {
  try {
    const supabase = await checkAccess()
    await upsertCustomFieldValue(supabase, studentId, templateId, value)
    return { success: true, data: null, message: '' }
  } catch (err: any) {
    return { success: false, message: err.message, data: null }
  }
}
