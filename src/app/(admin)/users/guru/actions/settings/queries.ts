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
 * Update permissions for a teacher
 */
export async function updateTeacherPermissionsQuery(
    supabase: SupabaseClient,
    userId: string,
    permissions: {
        can_archive_students?: boolean
        can_transfer_students?: boolean
        can_soft_delete_students?: boolean
        can_hard_delete_students?: boolean
    }
) {
    return await supabase
        .from('profiles')
        .update({
            permissions,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
}
