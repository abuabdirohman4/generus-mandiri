/**
 * Settings Logic (Layer 2)
 *
 * Pure business logic for teacher settings.
 * NO 'use server' directive. No database access. No side effects.
 */

import type { MeetingFormSettings } from '../types'

/**
 * Default meeting form settings
 */
export const DEFAULT_MEETING_FORM_SETTINGS: MeetingFormSettings = {
    showTitle: true,
    showTopic: true,
    showDescription: true,
    showDate: true,
    showMeetingType: true,
    showClassSelection: true,
    showStudentSelection: true,
    showGenderFilter: true,
}

/**
 * Extract meeting form settings from profile row data
 * Returns undefined if no settings found (PGRST116 or empty)
 */
export function extractMeetingFormSettings(data: any): MeetingFormSettings | undefined {
    return data?.meeting_form_settings as MeetingFormSettings || undefined
}

// ─── Bulk Permission Patch ────────────────────────────────────────────────────

export type TriState = 'grant' | 'revoke' | 'none'

export interface BulkPermissionSelections {
    // Manajemen Siswa
    can_archive_students?: TriState
    can_transfer_students?: TriState
    can_soft_delete_students?: TriState
    can_hard_delete_students?: TriState
    can_bulk_assign_cross_kelompok?: TriState
    // Fitur
    can_access_materials?: TriState
    can_manage_materials?: TriState
    can_access_monitoring?: TriState
    // Laporan
    can_multi_kelompok_laporan?: TriState
    // Presensi / Form Pertemuan
    can_manage_check_time?: TriState
    // Form Pertemuan — field visibility
    showClassSelection?: TriState
    showGenderFilter?: TriState
    showMeetingType?: TriState
    showTitle?: TriState
    showTopic?: TriState
    showDescription?: TriState
    showDate?: TriState
    showStudentSelection?: TriState
    showCheckTime?: TriState
}

export interface BasePatch {
    can_archive_students?: boolean
    can_transfer_students?: boolean
    can_soft_delete_students?: boolean
    can_hard_delete_students?: boolean
    can_bulk_assign_cross_kelompok?: boolean
    can_multi_kelompok_laporan?: boolean
    can_manage_check_time?: boolean
}

export interface MaterialPatch {
    can_access_materials?: boolean
    can_manage_materials?: boolean
    can_access_monitoring?: boolean
}

const BASE_KEYS: (keyof BasePatch)[] = [
    'can_archive_students',
    'can_transfer_students',
    'can_soft_delete_students',
    'can_hard_delete_students',
    'can_bulk_assign_cross_kelompok',
    'can_multi_kelompok_laporan',
    'can_manage_check_time',
]

export interface MeetingFormPatch {
    showClassSelection?: boolean
    showGenderFilter?: boolean
    showMeetingType?: boolean
    showTitle?: boolean
    showTopic?: boolean
    showDescription?: boolean
    showDate?: boolean
    showStudentSelection?: boolean
    showCheckTime?: boolean
}

const FORM_FIELD_KEYS: (keyof MeetingFormPatch)[] = [
    'showClassSelection', 'showGenderFilter', 'showMeetingType', 'showTitle',
    'showTopic', 'showDescription', 'showDate', 'showStudentSelection', 'showCheckTime',
]

/** Maps tri-state selections to concrete boolean patch. Only includes 'grant'/'revoke' fields. */
export function buildPermissionPatch(selections: BulkPermissionSelections): Record<string, boolean> {
    const patch: Record<string, boolean> = {}
    for (const [key, val] of Object.entries(selections)) {
        if (val === 'grant') patch[key] = true
        else if (val === 'revoke') patch[key] = false
    }
    return patch
}

/** Routes fields to base, material, and meetingForm update paths. */
export function splitPermissionPatch(patch: Record<string, boolean>): { basePatch: BasePatch; materialPatch: MaterialPatch; meetingFormPatch: MeetingFormPatch } {
    const basePatch: BasePatch = {}
    const materialPatch: MaterialPatch = {}
    const meetingFormPatch: MeetingFormPatch = {}
    for (const key of BASE_KEYS) {
        if (patch[key] !== undefined) (basePatch as any)[key] = patch[key]
    }
    if (patch.can_access_materials !== undefined) materialPatch.can_access_materials = patch.can_access_materials
    if (patch.can_manage_materials !== undefined) materialPatch.can_manage_materials = patch.can_manage_materials
    if (patch.can_access_monitoring !== undefined) materialPatch.can_access_monitoring = patch.can_access_monitoring
    for (const key of FORM_FIELD_KEYS) {
        if (patch[key] !== undefined) (meetingFormPatch as any)[key] = patch[key]
    }
    return { basePatch, materialPatch, meetingFormPatch }
}
