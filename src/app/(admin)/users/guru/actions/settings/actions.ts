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
        can_multi_kelompok_laporan: boolean
        can_manage_check_time: boolean
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
                can_multi_kelompok_laporan: perms.can_multi_kelompok_laporan ?? false,
                can_manage_check_time: perms.can_manage_check_time ?? false,
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
                can_multi_kelompok_laporan: false,
                can_manage_check_time: false,
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
        can_multi_kelompok_laporan?: boolean
        can_manage_check_time?: boolean
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

import {
    buildPermissionPatch,
    splitPermissionPatch,
    type BulkPermissionSelections,
} from './logic'
import { bulkUpdateTeacherPermissionsQuery } from './queries'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Bulk update 4 permission flags across multiple teachers.
 * Each flag tri-state: 'grant' | 'revoke' | 'none' (none = leave unchanged).
 * Uses fetch-then-merge per teacher — no JSONB overwrite.
 */
export async function bulkUpdateTeacherPermissions(
    teacherIds: string[],
    selections: BulkPermissionSelections
): Promise<{
    success: boolean
    data?: { updated: number; failed: { id: string; error: string }[] }
    message: string
}> {
    try {
        const profile = await getCurrentUserProfile()
        if (!profile || !['superadmin', 'admin'].includes(profile.role)) {
            return { success: false, message: 'Tidak ada akses' }
        }
        if (!teacherIds.length) return { success: false, message: 'Tidak ada guru dipilih' }

        const patch = buildPermissionPatch(selections)
        if (Object.keys(patch).length === 0) {
            return { success: false, message: 'Tidak ada perubahan dipilih' }
        }

        const { basePatch, materialPatch, meetingFormPatch } = splitPermissionPatch(patch)
        const hasMeetingForm = Object.keys(meetingFormPatch).length > 0
        const supabase = await createAdminClient()
        const result = await bulkUpdateTeacherPermissionsQuery(supabase, teacherIds, basePatch as any, materialPatch as any, hasMeetingForm ? meetingFormPatch as any : null)

        revalidatePath('/users/guru')

        void logActivity({
            userId: profile.id,
            action: 'bulk_update_teacher_permissions',
            entityType: 'teacher',
            entityId: '',
            entityLabel: `Bulk update ${result.updated} guru`,
            pagePath: '/users/guru',
            metadata: { selections, count: teacherIds.length, updated: result.updated, failed: result.failed.length } as any,
        })

        const allFailed = result.failed.length === teacherIds.length
        return {
            success: !allFailed,
            data: result,
            message: allFailed
                ? 'Gagal memperbarui semua guru'
                : result.failed.length > 0
                    ? `${result.updated} guru diperbarui, ${result.failed.length} gagal`
                    : `${result.updated} guru berhasil diperbarui`,
        }
    } catch (error) {
        return {
            success: false,
            message: handleApiError(error, 'menyimpan data', 'Gagal bulk update hak akses').message ?? 'Gagal bulk update hak akses',
        }
    }
}

import { assignActivityTypeToTeacher, removeActivityTypeFromTeacher } from '@/app/(admin)/kegiatan/actions'

/**
 * Bulk assign/remove activity types across multiple teachers.
 * selections: Record<activityTypeId, 'add' | 'remove' | 'none'>
 */
export async function bulkUpdateTeacherActivityTypes(
    teacherIds: string[],
    selections: Record<string, 'add' | 'remove' | 'none'>
): Promise<{ success: boolean; data?: { updated: number; failed: { id: string; error: string }[] }; message: string }> {
    try {
        const profile = await getCurrentUserProfile()
        if (!profile || !['superadmin', 'admin'].includes(profile.role)) {
            return { success: false, message: 'Tidak ada akses' }
        }
        if (!teacherIds.length) return { success: false, message: 'Tidak ada guru dipilih' }

        const toAdd = Object.entries(selections).filter(([, v]) => v === 'add').map(([k]) => k)
        const toRemove = Object.entries(selections).filter(([, v]) => v === 'remove').map(([k]) => k)
        if (!toAdd.length && !toRemove.length) return { success: false, message: 'Tidak ada perubahan dipilih' }

        const failed: { id: string; error: string }[] = []
        let updated = 0

        for (const teacherId of teacherIds) {
            try {
                for (const typeId of toAdd) await assignActivityTypeToTeacher(teacherId, typeId)
                for (const typeId of toRemove) await removeActivityTypeFromTeacher(teacherId, typeId)
                updated++
            } catch (err: any) {
                failed.push({ id: teacherId, error: err?.message ?? 'Unknown error' })
            }
        }

        revalidatePath('/users/guru')

        void logActivity({
            userId: profile.id,
            action: 'bulk_update_teacher_activity_types',
            entityType: 'teacher',
            entityId: '',
            entityLabel: `Bulk update activity types ${updated} guru`,
            pagePath: '/users/guru',
            metadata: { add: toAdd, remove: toRemove, count: teacherIds.length, updated, failed: failed.length } as any,
        })

        const allFailed = failed.length === teacherIds.length
        return {
            success: !allFailed,
            data: { updated, failed },
            message: allFailed
                ? 'Gagal memperbarui semua guru'
                : failed.length > 0
                    ? `${updated} guru diperbarui, ${failed.length} gagal`
                    : `${updated} guru berhasil diperbarui`,
        }
    } catch (error) {
        return {
            success: false,
            message: handleApiError(error, 'menyimpan data', 'Gagal bulk update tipe kegiatan').message ?? 'Gagal',
        }
    }
}
