/**
 * Layer 1 — DB queries untuk eksekusi naik kelas.
 * NO 'use server'. Terima supabase client sebagai parameter.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface EnrollmentInsert {
    student_id: string
    class_id: string
    academic_year_id: string
    semester: number
    status: 'active'
}

/** Upsert enrollment (UNIQUE student_id,academic_year_id,semester). Pola sama dgn bulkEnrollStudents. */
export async function upsertEnrollment(supabase: SupabaseClient, e: EnrollmentInsert) {
    return await supabase
        .from('student_enrollments')
        .upsert(e, { onConflict: 'student_id,academic_year_id,semester', ignoreDuplicates: false })
}

/** Update kelas aktif siswa. */
export async function updateStudentClassId(supabase: SupabaseClient, studentId: string, classId: string) {
    return await supabase.from('students').update({ class_id: classId }).eq('id', studentId)
}

/** Hapus relasi siswa-kelas lama sebelum naik kelas. */
export async function deleteStudentClass(supabase: SupabaseClient, studentId: string, classId: string) {
    return await supabase
        .from('student_classes')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', classId)
}

/** Upsert relasi siswa-kelas (student_classes). */
export async function upsertStudentClass(supabase: SupabaseClient, studentId: string, classId: string) {
    return await supabase
        .from('student_classes')
        .upsert({ student_id: studentId, class_id: classId }, { onConflict: 'student_id,class_id', ignoreDuplicates: true })
}

/** Catat audit trail (immutable). */
export async function insertPromotionLog(
    supabase: SupabaseClient,
    log: {
        academic_year_id: string
        from_class_id: string
        to_class_id: string
        student_id: string
        promoted_by: string
    }
) {
    return await supabase.from('grade_promotion_logs').insert(log)
}
