'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activityLogger'
import { dismissPromotionCtaNotifications } from '@/app/(admin)/notifikasi/actions/notifications/actions'
import type { PromotionPayload, PromotionResult } from '@/types/promotion'
import { preparePromotionData, validatePromotionPermission } from './logic'
import {
    upsertEnrollment,
    updateStudentClassId,
    deleteStudentClass,
    upsertStudentClass,
    insertPromotionLog,
} from './queries'

/**
 * Eksekusi naik kelas batch. Partial success — tidak ada full rollback.
 * Enroll ke academic_year yang DIPILIH di wizard (payload.academic_year_id).
 * Tidak mengubah tahun ajaran aktif sistem.
 */
export async function executeGradePromotion(
    payload: PromotionPayload
): Promise<{ success: boolean; data: PromotionResult | null; message: string }> {
    const profile = await getCurrentUserProfile()
    if (!validatePromotionPermission(profile, 'promote')) {
        return { success: false, data: null, message: 'Anda tidak memiliki izin menjalankan naik kelas' }
    }

    const academicYearId = payload.academic_year_id
    if (!academicYearId) {
        return { success: false, data: null, message: 'Tahun ajaran tujuan belum dipilih.' }
    }

    const supabase = await createAdminClient()

    // validasi tahun ajaran ada
    const { data: year } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('id', academicYearId)
        .maybeSingle()
    if (!year) {
        return { success: false, data: null, message: 'Tahun ajaran tidak ditemukan.' }
    }

    const { valid } = preparePromotionData(payload)
    const result: PromotionResult = { success: [], failed: [] }

    for (const row of valid) {
        try {
            const enrollment = {
                student_id: row.student_id,
                class_id: row.to_class_id,
                academic_year_id: academicYearId,
                semester: payload.semester,
                status: 'active' as const,
            }
            const { error: enrErr } = await upsertEnrollment(supabase, enrollment)
            if (enrErr) throw new Error(enrErr.message)

            const { error: stuErr } = await updateStudentClassId(supabase, row.student_id, row.to_class_id)
            if (stuErr) throw new Error(stuErr.message)

            const { error: delErr } = await deleteStudentClass(supabase, row.student_id, row.from_class_id)
            if (delErr) throw new Error(delErr.message)

            const { error: scErr } = await upsertStudentClass(supabase, row.student_id, row.to_class_id)
            if (scErr) throw new Error(scErr.message)

            const { error: logErr } = await insertPromotionLog(supabase, {
                academic_year_id: academicYearId,
                from_class_id: row.from_class_id,
                to_class_id: row.to_class_id,
                student_id: row.student_id,
                promoted_by: profile!.id,
            })
            if (logErr) throw new Error(logErr.message)

            result.success.push(row.student_id)
        } catch (e: any) {
            result.failed.push({ studentId: row.student_id, error: e?.message ?? 'Unknown error' })
        }
    }

    if (profile) {
        void logActivity({
            userId: profile.id,
            action: 'grade_promotion',
            entityType: 'grade_promotion',
            entityLabel: `${result.success.length} siswa naik kelas`,
            pagePath: '/naik-kelas',
            metadata: { academic_year_id: academicYearId, success: result.success.length, failed: result.failed.length },
        })
    }

    if (result.success.length > 0) {
        await dismissPromotionCtaNotifications()
    }

    revalidatePath('/naik-kelas')
    return {
        success: true,
        data: result,
        message: `${result.success.length} siswa berhasil naik, ${result.failed.length} gagal`,
    }
}
