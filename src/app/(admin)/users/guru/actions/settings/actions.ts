'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import type { MeetingFormSettings } from '../types'
import {
    fetchMeetingFormSettings,
    fetchTeacherMaterialPermissions,
    updateMeetingFormSettingsQuery,
    updateTeacherPermissionsQuery,
    updateTeacherMaterialPermissionsQuery,
} from './queries'
import { extractMeetingFormSettings } from './logic'

export type { MeetingFormSettings }

/**
 * Get material permission for a teacher
 */
export async function getTeacherMaterialPermissions(
    userId: string
): Promise<{ 
    success: boolean
    data: {
        can_manage_materials: boolean
        can_access_materials: boolean
        can_access_monitoring: boolean
    }
    message?: string
}> {
    try {
        const supabase = await createClient()
        const { data, error } = await fetchTeacherMaterialPermissions(supabase, userId)
        if (error) throw error
        const perms = (data?.permissions as any) || {}
        return {
            success: true,
            data: {
                can_manage_materials: perms.can_manage_materials ?? false,
                can_access_materials: perms.can_access_materials ?? false,
                can_access_monitoring: perms.can_access_monitoring ?? false,
            }
        }
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat hak akses materi')
        return {
            success: false,
            message: errorInfo.message,
            data: {
                can_manage_materials: false,
                can_access_materials: false,
                can_access_monitoring: false,
            }
        }
    }
}

/**
 * Get meeting form settings for a teacher
 */
export async function getMeetingFormSettings(
    userId: string
): Promise<{ success: boolean; data?: MeetingFormSettings; message?: string }> {
    try {
        const supabase = await createClient()
        const { data, error } = await fetchMeetingFormSettings(supabase, userId)
        if (error) throw error

        return {
            success: true,
            data: extractMeetingFormSettings(data)
        }
    } catch (error) {
        console.error('Error getting meeting form settings:', error)
        return {
            success: false,
            message: handleApiError(error, 'memuat data', 'Gagal memuat pengaturan form').message,
        }
    }
}

/**
 * Update meeting form settings for a teacher
 */
export async function updateMeetingFormSettings(
    userId: string,
    settings: MeetingFormSettings
): Promise<{ success: boolean; message?: string }> {
    try {
        const supabase = await createClient()
        const { error } = await updateMeetingFormSettingsQuery(supabase, userId, settings)
        if (error) throw error

        revalidatePath('/users/guru')
        revalidatePath('/presensi')

        const profile = await getCurrentUserProfile()
        if (profile) {
            void logActivity({
                userId: profile.id,
                action: 'update_teacher_settings',
                entityType: 'teacher',
                entityId: userId,
                entityLabel: 'Update Meeting Form Settings',
                pagePath: '/users/guru',
                metadata: settings as any
            })
        }

        return { success: true }
    } catch (error) {
        console.error('Error updating meeting form settings:', error)
        return {
            success: false,
            message: handleApiError(error, 'menyimpan data', 'Gagal menyimpan pengaturan form').message,
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
): Promise<{ success: boolean; message?: string }> {
    try {
        const supabase = await createClient()
        const { error } = await updateTeacherPermissionsQuery(supabase, userId, permissions)
        if (error) throw error

        revalidatePath('/users/guru')
        revalidatePath('/users/siswa')

        const profile = await getCurrentUserProfile()
        if (profile) {
            void logActivity({
                userId: profile.id,
                action: 'update_teacher_settings',
                entityType: 'teacher',
                entityId: userId,
                entityLabel: 'Update Permissions',
                pagePath: '/users/guru',
                metadata: permissions as any
            })
        }

        return { success: true }
    } catch (error) {
        console.error('Error updating teacher permissions:', error)
        return {
            success: false,
            message: handleApiError(error, 'menyimpan data', 'Gagal menyimpan hak akses').message,
        }
    }
}

/**
 * Update material permissions for a teacher
 */
export async function updateTeacherMaterialPermissions(
    userId: string,
    permissions: {
        can_manage_materials?: boolean
        can_access_materials?: boolean
        can_access_monitoring?: boolean
    }
): Promise<{ success: boolean; message?: string }> {
    try {
        const supabase = await createClient()
        const { error } = await updateTeacherMaterialPermissionsQuery(supabase, userId, {
            can_manage_materials: permissions.can_manage_materials ?? false,
            can_access_materials: permissions.can_access_materials ?? false,
            can_access_monitoring: permissions.can_access_monitoring ?? false,
        })
        if (error) throw error

        revalidatePath('/users/guru')
        revalidatePath('/materi')

        const profile = await getCurrentUserProfile()
        if (profile) {
            void logActivity({
                userId: profile.id,
                action: 'update_teacher_settings',
                entityType: 'teacher',
                entityId: userId,
                entityLabel: 'Update Material Permissions',
                pagePath: '/users/guru',
                metadata: permissions as any
            })
        }

        return { success: true }
    } catch (error) {
        console.error('Error updating material permissions:', error)
        return {
            success: false,
            message: handleApiError(error, 'menyimpan data', 'Gagal menyimpan hak akses materi').message,
        }
    }
}
