// Pure logic (no 'use server') — testable, importable by server action + tests.

export interface EnrollmentHistoryRow {
    academic_year_name: string
    semester: number
    class_name: string
    status: string
    is_active_year: boolean
}

/**
 * Pure transform: bentuk baris riwayat kelas dari hasil query enrollment.
 * Sort: start_year DESC (terbaru dulu), lalu semester ASC.
 * Tandai baris yang tahun ajarannya sedang aktif.
 * Toleran join null (kelas/tahun terhapus) → '-'.
 */
export function transformEnrollmentHistory(
    rows: any[],
    activeYearName: string
): EnrollmentHistoryRow[] {
    return (rows || [])
        .map(r => {
            const year = Array.isArray(r.academic_years) ? r.academic_years[0] : r.academic_years
            const cls = Array.isArray(r.classes) ? r.classes[0] : r.classes
            return {
                academic_year_name: year?.name ?? '-',
                _start_year: year?.start_year ?? 0,
                semester: r.semester,
                class_name: cls?.name ?? '-',
                status: r.status ?? 'active',
                is_active_year: (year?.name ?? '') === activeYearName,
            }
        })
        .sort((a, b) => {
            if (a._start_year !== b._start_year) return b._start_year - a._start_year
            return a.semester - b.semester
        })
        .map(({ _start_year, ...rest }) => rest)
}
