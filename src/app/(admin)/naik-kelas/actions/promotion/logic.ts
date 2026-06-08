/**
 * Layer 2 — pure business logic untuk eksekusi naik kelas.
 * Tidak ada DB call, tidak ada side effect.
 */

import type { UserProfile } from '@/types/user'
import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import type { PromotionPayload } from '@/types/promotion'

/**
 * Bentuk data enrollment dari payload wizard.
 * - Buang row tanpa to_class_id (tak ada kelas tujuan / di-exclude di UI).
 * - semester WAJIB (student_enrollments.semester NOT NULL, no default).
 */
export function preparePromotionData(payload: PromotionPayload) {
    const valid = payload.rows.filter(r => r.to_class_id)
    const enrollments = valid.map(r => ({
        student_id: r.student_id,
        class_id: r.to_class_id,
        academic_year_id: payload.academic_year_id,
        semester: payload.semester,
        status: 'active' as const,
    }))
    return { valid, enrollments }
}

/**
 * Cek izin naik kelas per aksi.
 * - 'toggle' → hanya Superadmin & Admin Daerah
 * - 'promote' → semua role (scope difilter di layer query via getDataFilter)
 */
export function validatePromotionPermission(
    profile: UserProfile | null,
    action: 'toggle' | 'promote'
): boolean {
    if (!profile) return false
    if (action === 'toggle') {
        return isSuperAdmin(profile) || isAdminDaerah(profile)
    }
    // 'promote'
    return true
}
