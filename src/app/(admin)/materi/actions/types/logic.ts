/**
 * Type Logic (Layer 2)
 *
 * Pure business logic for material types.
 * NO 'use server' directive. No database access. No side effects.
 */

/**
 * Validate type data before insert/update
 */
export function validateTypeData(data: {
    category_id: string
    name: string
    display_order: number
}): { ok: boolean; error?: string } {
    if (!data.category_id) {
        return { ok: false, error: 'Kategori wajib dipilih' }
    }
    if (!data.name || data.name.trim().length === 0) {
        return { ok: false, error: 'Nama jenis materi wajib diisi' }
    }
    if (data.display_order < 0) {
        return { ok: false, error: 'Urutan tampil tidak boleh negatif' }
    }
    return { ok: true }
}

/**
 * Check if type has dependent items or assignments
 */
export function typeHasDependencies(itemsCount: number, assignmentsCount: number): {
    hasDeps: boolean
    reason?: string
} {
    if (itemsCount > 0) {
        return {
            hasDeps: true,
            reason: 'Tidak dapat menghapus jenis materi. Masih ada item materi yang menggunakan jenis ini.'
        }
    }
    if (assignmentsCount > 0) {
        return {
            hasDeps: true,
            reason: 'Tidak dapat menghapus jenis materi. Masih ada assignment materi yang menggunakan jenis ini.'
        }
    }
    return { hasDeps: false }
}

/**
 * Map database error code to user-friendly message
 */
export function mapTypeErrorMessage(errorCode: string, operation: 'create' | 'update'): string {
    if (errorCode === '23505') {
        return 'Nama jenis materi sudah digunakan untuk kategori ini'
    }
    return operation === 'create'
        ? 'Gagal membuat jenis materi'
        : 'Gagal memperbarui jenis materi'
}
