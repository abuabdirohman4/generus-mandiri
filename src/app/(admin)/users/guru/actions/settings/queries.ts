/**
 * Settings Queries (Layer 1)
 *
 * Database queries for teacher settings and permissions.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MeetingFormSettings } from '../types'

/**
 * Fetch meeting form settings for a user
 */
export async function fetchMeetingFormSettings(supabase: SupabaseClient, userId: string) {
    return await supabase
        .from('profiles')
        .select('meeting_form_settings')
        .eq('id', userId)
        .single()
}

/**
 * Fetch material permission flag for a user (via permissions JSONB)
 */
export async function fetchTeacherMaterialPermissions(supabase: SupabaseClient, userId: string) {
    return await supabase
        .from('profiles')
        .select('permissions')
        .eq('id', userId)
        .single()
}

/**
 * Update meeting form settings for a user
 */
export async function updateMeetingFormSettingsQuery(
    supabase: SupabaseClient,
    userId: string,
    settings: MeetingFormSettings
) {
    return await supabase
        .from('profiles')
        .update({
            meeting_form_settings: settings,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
}

/**
 * Update permissions for a teacher (fetch-then-merge to avoid overwriting other JSONB fields)
 */
export async function updateTeacherPermissionsQuery(
    supabase: SupabaseClient,
    userId: string,
    permissions: {
        can_archive_students?: boolean
        can_transfer_students?: boolean
        can_soft_delete_students?: boolean
        can_hard_delete_students?: boolean
        can_multi_kelompok_laporan?: boolean
        can_manage_check_time?: boolean
    }
) {
    // Fetch existing permissions first, then merge (avoid overwriting other fields like can_manage_materials)
    const { data: profile } = await supabase
        .from('profiles')
        .select('permissions')
        .eq('id', userId)
        .single()

    const existing = (profile?.permissions as Record<string, unknown>) || {}
    const merged = { ...existing, ...permissions }

    return await supabase
        .from('profiles')
        .update({
            permissions: merged,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
}

/**
 * Update material access permissions for a teacher (via permissions JSONB merge)
 */
export async function updateTeacherMaterialPermissionsQuery(
    supabase: SupabaseClient,
    userId: string,
    data: { 
        can_manage_materials: boolean
        can_access_materials: boolean
        can_access_monitoring: boolean
    }
) {
    // Fetch existing permissions first, then merge
    const { data: profile } = await supabase
        .from('profiles')
        .select('permissions')
        .eq('id', userId)
        .single()

    const existing = (profile?.permissions as Record<string, unknown>) || {}
    const merged = { 
        ...existing, 
        can_manage_materials: data.can_manage_materials,
        can_access_materials: data.can_access_materials,
        can_access_monitoring: data.can_access_monitoring,
    }

    return await supabase
        .from('profiles')
        .update({
            permissions: merged,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
}
