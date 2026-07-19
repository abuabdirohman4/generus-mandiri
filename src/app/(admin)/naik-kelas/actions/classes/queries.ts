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
        .select('id, name, sort_order, promote_to_class_master_id, category_group')
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
    // PostgREST default cap 1000 baris — WAJIB paginasi. Superadmin (kelompokIds null)
    // ambil SEMUA kelas (1200+) & mappings (1200+); tanpa paginasi baris >1000 hilang
    // → kelas tujuan tak ketemu di resolve → "(tidak ada)" palsu di naik kelas.
    const PAGE = 1000

    // classes (paginasi)
    const rawClasses: any[] = []
    let offset = 0
    while (true) {
        let classQuery = supabase
            .from('classes')
            .select('id, name, kelompok_id, kelompok:kelompok_id(id, name)')
        if (kelompokIds !== null) {
            if (kelompokIds.length === 0) return { classes: [] }
            classQuery = classQuery.in('kelompok_id', kelompokIds)
        }
        const { data } = await classQuery.range(offset, offset + PAGE - 1)
        if (!data || data.length === 0) break
        rawClasses.push(...data)
        if (data.length < PAGE) break
        offset += PAGE
    }
    if (rawClasses.length === 0) return { classes: [] }

    // map class_id → class_master_id (dua-query, in-memory filter, paginasi)
    const masterByClass = new Map<string, string>()
    offset = 0
    while (true) {
        const { data } = await supabase
            .from('class_master_mappings')
            .select('class_id, class_master_id')
            .range(offset, offset + PAGE - 1)
        if (!data || data.length === 0) break
        ;(data as any[]).forEach((m: any) => masterByClass.set(m.class_id, m.class_master_id))
        if (data.length < PAGE) break
        offset += PAGE
    }

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

/**
 * Siswa (belum dihapus) yang terdaftar di salah satu classIds — via junction table
 * student_classes, BUKAN students.class_id (siswa bisa multi-kelas, mis. kelas
 * akademik + kelas Pengurus/organisasi paralel; students.class_id cuma "primary"
 * konvensi, tidak mencerminkan semua keanggotaan kelas siswa).
 * Tiap baris hasil membawa class_id dari junction match (bukan students.class_id),
 * supaya from_class_id di layer atas tetap benar walau itu bukan kelas primary siswa.
 * Kalau siswa match >1 classIds sekaligus (jarang — 2 kelas promotable bersamaan),
 * hasilkan 1 baris per pasangan (student_id, matched class_id).
 */
const STUDENT_SELECT = 'id, name, gender, kelompok_id, status, kelompok:kelompok_id(name)'
const CHUNK = 100        // hindari PostgREST URL/header overflow saat class_id banyak (600+)
const PAGE = 1000        // PostgREST default row limit

export async function fetchStudentsInClasses(supabase: SupabaseClient, classIds: string[]) {
    if (classIds.length === 0) return { data: [] as any[], error: null }

    // Step 1: resolve pasangan (student_id, class_id) via junction, per chunk.
    const pairs: { student_id: string; class_id: string }[] = []
    for (let i = 0; i < classIds.length; i += CHUNK) {
        const chunk = classIds.slice(i, i + CHUNK)
        const { data, error } = await supabase
            .from('student_classes')
            .select('student_id, class_id')
            .in('class_id', chunk)
        if (error) return { data: [] as any[], error }
        if (data) pairs.push(...(data as any[]))
    }
    if (pairs.length === 0) return { data: [] as any[], error: null }

    const studentIds = [...new Set(pairs.map(p => p.student_id))]

    // Step 2: ambil data siswa aktif untuk studentIds, per chunk + paginasi.
    const studentById = new Map<string, any>()
    for (let i = 0; i < studentIds.length; i += CHUNK) {
        const chunk = studentIds.slice(i, i + CHUNK)
        let offset = 0
        while (true) {
            const { data, error } = await supabase
                .from('students')
                .select(STUDENT_SELECT)
                .in('id', chunk)
                .eq('status', 'active')
                .is('deleted_at', null)
                .range(offset, offset + PAGE - 1)
            if (error) return { data: [] as any[], error }
            if (!data || data.length === 0) break
            data.forEach((s: any) => studentById.set(s.id, s))
            if (data.length < PAGE) break
            offset += PAGE
        }
    }

    // Step 3: gabungkan — 1 baris per pasangan (student, matched class_id), pakai class_id junction.
    const all = pairs
        .filter(p => studentById.has(p.student_id))
        .map(p => ({ ...studentById.get(p.student_id), class_id: p.class_id }))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'))

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

/** Resolve distinct kelompok_ids dari daftar class_ids (untuk guru multi-kelompok). */
export async function fetchKelompokIdsByClassIds(
    supabase: SupabaseClient,
    classIds: string[]
): Promise<string[] | null> {
    if (classIds.length === 0) return null
    const { data } = await supabase
        .from('classes')
        .select('kelompok_id')
        .in('id', classIds)
    if (!data || data.length === 0) return null
    return [...new Set((data as any[]).map((c: any) => c.kelompok_id).filter(Boolean))]
}
