'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import type { MeetingFormSettings } from '../types'
import {
    fetchMeetingFormSettings,
    updateMeetingFormSettingsQuery,
    updateTeacherPermissionsQuery,
} from './queries'
import { extractMeetingFormSettings } from './logic'

export type { MeetingFormSettings }

/**
 * Get meeting form settings for a teacher
 */
export async function getMeetingFormSettings(
    userId: string
): Promise<{ success: boolean; data?: MeetingFormSettings; error?: string }> {
    try {
        const supabase = await createClient()
        const { data, error } = await fetchMeetingFormSettings(supabase, userId)

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: true, data: undefined }
            }
            throw error
        }

        return { success: true, data: extractMeetingFormSettings(data) }
    } catch (error) {
        console.error('Error getting meeting form settings:', error)
        return {
            success: false,
            error: handleApiError(error, 'memuat data', 'Gagal memuat pengaturan form').message,
        }
    }
}

/**
 * Update meeting form settings for a teacher
 */
export async function updateMeetingFormSettings(
    userId: string,
    settings: MeetingFormSettings
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { error } = await updateMeetingFormSettingsQuery(supabase, userId, settings)
        if (error) throw error

        revalidatePath('/users/guru')
        revalidatePath('/absensi')
        return { success: true }
    } catch (error) {
        console.error('Error updating meeting form settings:', error)
        return {
            success: false,
            error: handleApiError(error, 'menyimpan data', 'Gagal menyimpan pengaturan form').message,
        }
    }
}

/**
 * Update permission flags for a teacher
 */
export async function updateTeacherPermissions(
    userId: string,
    permissions: {
        can_archive_students?: boolean
        can_transfer_students?: boolean
        can_soft_delete_students?: boolean
        can_hard_delete_students?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { error } = await updateTeacherPermissionsQuery(supabase, userId, permissions)
        if (error) throw error

        revalidatePath('/users/guru')
        revalidatePath('/users/siswa')
        return { success: true }
    } catch (error) {
        console.error('Error updating teacher permissions:', error)
        return {
            success: false,
            error: handleApiError(error, 'menyimpan data', 'Gagal menyimpan hak akses').message,
        }
    }
}
