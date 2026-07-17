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

/**
 * Ganti SEMUA baris student_classes siswa dengan 1 baris kelas tujuan.
 * Delete semua baris != toClassId dulu (termasuk kelas lama dan stale rows),
 * lalu upsert baris tujuan — pastikan tepat 1 baris aktif.
 */
export async function replaceStudentClass(supabase: SupabaseClient, studentId: string, toClassId: string) {
    const { error: delErr } = await supabase
        .from('student_classes')
        .delete()
        .eq('student_id', studentId)
        .neq('class_id', toClassId)
    if (delErr) return { error: delErr }
    return await supabase
        .from('student_classes')
        .upsert({ student_id: studentId, class_id: toClassId }, { onConflict: 'student_id,class_id', ignoreDuplicates: true })
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

/**
 * Ambil class_id → category_group untuk daftar class.
 * Dipakai auto-carry: hanya carry kelas caberawit/muda_mudi.
 */
export async function fetchCategoryGroupByClassIds(
    supabase: SupabaseClient,
    classIds: string[]
): Promise<Map<string, string | null>> {
    if (classIds.length === 0) return new Map()
    const { data } = await supabase
        .from('class_master_mappings')
        .select('class_id, class_masters:class_master_id(category_group)')
        .in('class_id', classIds)
    const map = new Map<string, string | null>()
    for (const row of (data as any[]) || []) {
        const cg = Array.isArray(row.class_masters)
            ? row.class_masters[0]?.category_group
            : row.class_masters?.category_group
        map.set(row.class_id, cg ?? null)
    }
    return map
}

/**
 * Ambil set student_id yang SUDAH punya grade_promotion_log di tahun tujuan.
 * Dipakai defense server-side: siswa yang sudah naik JANGAN di-carry (carry akan
 * overwrite enrollment kelas baru dengan kelas lama).
 */
export async function fetchPromotedStudentIds(
    supabase: SupabaseClient,
    academicYearId: string,
    studentIds: string[]
): Promise<Set<string>> {
    const promoted = new Set<string>()
    if (studentIds.length === 0) return promoted
    const CHUNK = 100
    for (let i = 0; i < studentIds.length; i += CHUNK) {
        const chunk = studentIds.slice(i, i + CHUNK)
        const { data } = await supabase
            .from('grade_promotion_logs')
            .select('student_id')
            .eq('academic_year_id', academicYearId)
            .in('student_id', chunk)
        for (const row of (data as any[]) || []) promoted.add(row.student_id)
    }
    return promoted
}
