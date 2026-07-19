/**
 * Grade Promotion (Naik Kelas) Type Definitions — sm-jsb
 *
 * IMPORTANT: Single source of truth for promotion-related types.
 * Covers: toggle setting, wizard source options, student rows, payload, result, audit log.
 *
 * Catatan domain:
 * - Kelas tujuan ditentukan via kolom eksplisit `class_masters.promote_to_class_master_id`
 *   (NULL = stopper, kelas tidak naik). BUKAN tebakan sort_order.
 * - Admin & guru hierarki (desa/daerah) pilih per class_master; guru biasa per class aktual.
 */

// ─── Toggle (app_settings: key='grade_promotion_enabled') ───────────────────────
export interface PromotionEnabledValue {
    enabled: boolean
    end_date?: string | null
    enabled_by: string | null
    enabled_at: string | null
}

// ─── Window Status (computed server-side) ───────────────────────────────────────
export interface PromotionWindowStatus {
    isActive: boolean
    endDate: string | null
}

// ─── Wizard Step 1: Source Option ───────────────────────────────────────────────
export interface PromotionSourceOption {
    /** admin/guru-hierarki = 'class_master', guru biasa = 'class' */
    kind: 'class_master' | 'class'
    /** class_master_id (admin) ATAU class_id (guru biasa) */
    id: string
    /** "Kelas 1" (class_master) atau "Kelas 1 - Nambo" (class aktual) */
    name: string
    /** nama kelompok untuk disambiguasi; hanya diisi untuk guru biasa multi-kelompok */
    kelompok_name?: string
    /** nama class_master tujuan untuk display; null kalau stopper */
    to_name: string | null
    /** true = kelas stopper akademik (muda_mudi/caberawit) — siswa di-carry ke kelas SAMA, tidak naik */
    carry_only?: boolean
}

// ─── Wizard Step 2: Student Row ─────────────────────────────────────────────────
export interface PromotionStudentRow {
    student_id: string
    student_name: string
    gender: string | null
    kelompok_id: string
    kelompok_name: string
    from_class_id: string
    from_class_name: string
    /** hasil resolve kelas tujuan dalam kelompok yang sama; null = tak ada kelas tujuan di kelompok */
    to_class_id: string | null
    to_class_name: string | null
    excluded: boolean
    /** true = sudah punya grade_promotion_log di tahun ajaran tujuan — auto-uncheck di wizard */
    already_promoted: boolean
    /** true = kelas stopper akademik → siswa di-carry ke kelas SAMA (to_class_id = from_class_id), bukan naik */
    carry_only?: boolean
}

// ─── Execution Payload & Result ─────────────────────────────────────────────────
export interface PromotionPayload {
    academic_year_id: string
    semester: number
    /** siswa yang NAIK — ada log promosi + pindah kelas */
    rows: { student_id: string; from_class_id: string; to_class_id: string }[]
    /** siswa yang TIDAK naik tapi di-carry ke tahun baru di kelas SAMA — tanpa log */
    carry_rows?: { student_id: string; class_id: string }[]
}

export interface PromotionResult {
    success: string[]
    failed: { studentId: string; error: string }[]
}

// ─── Audit Log (grade_promotion_logs) ───────────────────────────────────────────
export interface PromotionLog {
    id: string
    academic_year_id: string
    from_class_id: string
    to_class_id: string
    student_id: string
    promoted_by: string | null
    promoted_at: string
    notes: string | null
}
