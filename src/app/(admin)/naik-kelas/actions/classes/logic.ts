/**
 * Layer 2 — pure business logic untuk pilihan kelas asal & resolve kelas tujuan.
 * Tidak ada DB call, tidak ada side effect. Mudah ditest.
 */

interface MasterLike {
    id: string
    name: string
    promote_to_class_master_id: string | null
}

/** Buang class_master yang tidak punya tujuan (stopper). Hanya yang promotable yang muncul di wizard. */
export function filterPromotableMasters<T extends MasterLike>(masters: T[]): T[] {
    return masters.filter(m => m.promote_to_class_master_id !== null)
}

interface ClassInKelompok {
    class_id: string
    class_master_id: string
    kelompok_id: string
}

/**
 * Cari class_id kelas tujuan dalam kelompok yang SAMA dengan kelas asal.
 * - targetMasterId null (stopper) → null
 * - tidak ada kelas dgn master tsb di kelompok → null
 * Tidak boleh bocor antar kelompok.
 */
export function resolveTargetClassInKelompok(
    targetMasterId: string | null,
    kelompokId: string,
    classesInKelompok: ClassInKelompok[]
): string | null {
    if (!targetMasterId) return null
    const hit = classesInKelompok.find(
        c => c.kelompok_id === kelompokId && c.class_master_id === targetMasterId
    )
    return hit?.class_id ?? null
}

/**
 * Filter kelas asal berdasarkan status window dan role user.
 * - Jika window aktif, semua role full akses.
 * - Jika window tutup, Guru Kelompok hanya Pra Nikah. Role lain (VIP) bypass full akses.
 */
export function filterSourcesByWindow(
    sources: any[], // using any[] to avoid circular dependency with types if needed, or import PromotionSourceOption
    options: {
        isTeacherKelompok: boolean
        isActive: boolean
    }
): any[] {
    const { isTeacherKelompok, isActive } = options

    // Jika window aktif, atau user bukan guru kelompok (VIP bypass)
    if (isActive || !isTeacherKelompok) {
        return sources
    }

    // Window tutup & user guru kelompok -> bypass Pra Nikah
    return sources.filter(source => {
        const name = source.name || ''
        return name.toLowerCase().includes('pra nikah')
    })
}
