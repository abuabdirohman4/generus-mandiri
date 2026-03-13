/**
 * Category Logic (Layer 2)
 *
 * Pure business logic for material categories.
 * NO 'use server' directive. No database access. No side effects.
 */

/**
 * Validate category data before insert/update
 */
export function validateCategoryData(data: {
    name: string
    display_order: number
}): { ok: boolean; error?: string } {
    if (!data.name || data.name.trim().length === 0) {
        return { ok: false, error: 'Nama kategori wajib diisi' }
    }
    if (data.display_order < 0) {
        return { ok: false, error: 'Urutan tampil tidak boleh negatif' }
    }
    return { ok: true }
}

/**
 * Check if category has dependent types (cannot delete if has deps)
 */
export function categoryHasDependencies(typesCount: number): boolean {
    return typesCount > 0
}

/**
 * Map database error code to user-friendly message
 */
export function mapCategoryErrorMessage(errorCode: string, operation: 'create' | 'update'): string {
    if (errorCode === '23505') {
        return 'Nama kategori sudah digunakan'
    }
    return operation === 'create'
        ? 'Gagal membuat kategori materi'
        : 'Gagal memperbarui kategori materi'
}
