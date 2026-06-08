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
