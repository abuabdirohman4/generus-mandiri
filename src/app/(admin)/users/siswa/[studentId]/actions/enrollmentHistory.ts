'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { transformEnrollmentHistory, type EnrollmentHistoryRow } from './enrollmentHistoryLogic'

export type { EnrollmentHistoryRow }

/**
 * Riwayat kelas siswa per tahun ajaran (dari student_enrollments).
 * Select sempit — hanya kolom yang dirender (hemat egress).
 */
export async function getStudentEnrollmentHistory(
    studentId: string
): Promise<EnrollmentHistoryRow[]> {
    if (!studentId) return []
    const supabase = await createAdminClient()

    const [{ data: rows }, { data: activeYear }] = await Promise.all([
        supabase
            .from('student_enrollments')
            .select('semester, status, academic_years:academic_year_id(name, start_year), classes:class_id(name)')
            .eq('student_id', studentId),
        supabase
            .from('academic_years')
            .select('name')
            .eq('is_active', true)
            .maybeSingle(),
    ])

    return transformEnrollmentHistory(rows || [], activeYear?.name ?? '')
}
