/**
 * Layer 1 — DB queries untuk pilihan kelas asal & data siswa naik kelas.
 * NO 'use server'. Terima supabase client sebagai parameter.
 * Pakai pola dua-query untuk class_master (JANGAN nested join PostgREST — silent fail).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ScopeFilter {
    kelompok_id?: string | null
    desa_id?: string | null
    daerah_id?: string | null
}

/** Semua class_master + tujuan promote-nya (untuk wizard admin/guru-hierarki). */
export async function fetchClassMastersWithPromote(supabase: SupabaseClient) {
    return await supabase
        .from('class_masters')
        .select('id, name, sort_order, promote_to_class_master_id')
        .order('sort_order')
}

/**
 * Resolve kelompok_ids dalam scope user (pola dua-query, sama dgn fetchClassesHierarchical existing).
 * Superadmin (filter null/empty) → return null artinya "semua kelompok".
 */
export async function resolveKelompokIdsInScope(
    supabase: SupabaseClient,
    filter: ScopeFilter | null
): Promise<string[] | null> {
    if (!filter || (!filter.kelompok_id && !filter.desa_id && !filter.daerah_id)) {
        return null // superadmin: semua
    }
    if (filter.kelompok_id) return [filter.kelompok_id]

    if (filter.desa_id) {
        const { data } = await supabase.from('kelompok').select('id').eq('desa_id', filter.desa_id)
        return (data || []).map((k: any) => k.id)
    }
    // daerah
    const { data: desas } = await supabase.from('desa').select('id').eq('daerah_id', filter.daerah_id)
    const desaIds = (desas || []).map((d: any) => d.id)
    if (desaIds.length === 0) return []
    const { data: kelompoks } = await supabase.from('kelompok').select('id').in('desa_id', desaIds)
    return (kelompoks || []).map((k: any) => k.id)
}

/**
 * Ambil kelas (id, name, kelompok_id) + class_master_id untuk kelompok yang diberikan.
 * kelompokIds null → semua kelompok (superadmin).
 * Return classes + map class_id → class_master_id (via class_master_mappings, in-memory filter).
 */
export async function fetchClassesWithMasterInKelompok(
    supabase: SupabaseClient,
    kelompokIds: string[] | null
): Promise<{
    classes: { class_id: string; class_name: string; kelompok_id: string; kelompok_name: string; class_master_id: string }[]
}> {
    let classQuery = supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok_id(id, name)')
    if (kelompokIds !== null) {
        if (kelompokIds.length === 0) return { classes: [] }
        classQuery = classQuery.in('kelompok_id', kelompokIds)
    }
    const { data: rawClasses } = await classQuery
    if (!rawClasses || rawClasses.length === 0) return { classes: [] }

    // map class_id → class_master_id (dua-query, in-memory filter)
    const { data: mappings } = await supabase
        .from('class_master_mappings')
        .select('class_id, class_master_id')
    const masterByClass = new Map<string, string>()
    ;(mappings || []).forEach((m: any) => masterByClass.set(m.class_id, m.class_master_id))

    const classes = rawClasses
        .map((c: any) => ({
            class_id: c.id,
            class_name: c.name,
            kelompok_id: c.kelompok_id,
            kelompok_name: c.kelompok?.name ?? '',
            class_master_id: masterByClass.get(c.id) ?? '',
        }))
        .filter(c => c.class_master_id) // buang kelas tanpa master
    return { classes }
}

/** Siswa aktif (belum dihapus) yang class_id-nya termasuk daftar classIds. */
const STUDENT_SELECT = 'id, name, gender, class_id, kelompok_id, status, kelompok:kelompok_id(name)'
const CHUNK = 100        // hindari PostgREST URL/header overflow saat class_id banyak (600+)
const PAGE = 1000        // PostgREST default row limit

/**
 * Siswa (belum dihapus) yang class_id-nya termasuk daftar classIds.
 * Di-chunk per 100 class_id + paginasi per 1000 baris → aman untuk ratusan kelas / ribuan siswa.
 */
export async function fetchStudentsInClasses(supabase: SupabaseClient, classIds: string[]) {
    if (classIds.length === 0) return { data: [] as any[], error: null }

    const all: any[] = []
    for (let i = 0; i < classIds.length; i += CHUNK) {
        const chunk = classIds.slice(i, i + CHUNK)
        let offset = 0
        // paginate tiap chunk sampai habis
        while (true) {
            const { data, error } = await supabase
                .from('students')
                .select(STUDENT_SELECT)
                .in('class_id', chunk)
                .eq('status', 'active')
                .is('deleted_at', null)
                .order('name')
                .range(offset, offset + PAGE - 1)
            if (error) return { data: all, error }
            if (!data || data.length === 0) break
            all.push(...data)
            if (data.length < PAGE) break
            offset += PAGE
        }
    }
    return { data: all, error: null }
}

/** class_ids yang diajar guru biasa (teacher_classes). */
export async function fetchTeacherClassIds(supabase: SupabaseClient, teacherId: string) {
    const { data } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacherId)
    return (data || []).map((t: any) => t.class_id)
}
