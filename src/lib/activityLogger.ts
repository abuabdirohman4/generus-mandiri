// src/lib/activityLogger.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import type { LogActivityParams } from '@/types/activityLog'

/**
 * Log user activity to database
 * Uses fire-and-forget pattern to avoid blocking the main execution
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createAdminClient()
    const profile = await getCurrentUserProfile()

    await supabase.from('activity_logs').insert({
      user_id: params.userId,
      user_role: profile?.role ?? null,
      org_daerah_id: profile?.daerah_id ?? null,
      org_desa_id: profile?.desa_id ?? null,
      org_kelompok_id: profile?.kelompok_id ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      metadata: params.metadata ?? {},
      page_path: params.pagePath ?? null,
    })
  } catch (error) {
    // Fire-and-forget: jangan throw error ke caller
    // Console log for debugging in development if needed
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to log activity:', error)
    }
  }
}
