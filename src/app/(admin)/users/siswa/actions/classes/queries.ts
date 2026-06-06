/**
 * Class Queries (Layer 1)
 *
 * Database queries for class operations.
 * NO 'use server' directive - pure query builders.
 * Uses two-query pattern for class_master.sort_order (never nested join).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch class_master sort_order for a list of class IDs using two-query pattern.
 * NEVER use PostgREST nested join for sort_order — silently fails.
 * Returns a Map of class_id → array of { class_master: { id, sort_order } }
 */
export async function fetchClassMasterMappings(
    supabase: SupabaseClient,
    classIds: string[]
): Promise<Map<string, any[]>> {
    const classMappings: Map<string, any[]> = new Map()
    if (classIds.length === 0) return classMappings

    // Fetch ALL mappings (total ~657 rows, well under PostgREST 1000 limit),
    // then filter in-memory. This avoids Headers Overflow when classIds is large (600+).
    const { data: mappings } = await supabase
        .from('class_master_mappings')
        .select('class_id, class_master_id')

    if (!mappings || mappings.length === 0) return classMappings

    const classIdSet = new Set(classIds)
    const relevantMappings = mappings.filter((m: any) => classIdSet.has(m.class_id))
    if (relevantMappings.length === 0) return classMappings

    // Step 2: get class masters with sort_order + category columns (single source of truth)
    const masterIds = [...new Set(relevantMappings.map((m: any) => m.class_master_id))]
    const { data: masters } = await supabase
        .from('class_masters')
        .select('id, sort_order, category_group')
        .in('id', masterIds)

    if (!masters) return classMappings

    const mastersMap = new Map(masters.map((m: any) => [m.id, {
        ...m,
        // group_name kept as alias for backward-compat (DataFilter reads class_master.group_name)
        group_name: m.category_group ?? null,
    }]))

    // Step 3: group by class_id
    relevantMappings.forEach((mapping: any) => {
        const master = mastersMap.get(mapping.class_master_id)
        if (!master) return
        if (!classMappings.has(mapping.class_id)) {
            classMappings.set(mapping.class_id, [])
        }
        classMappings.get(mapping.class_id)?.push({ class_master: master })
    })

    return classMappings
}

export async function fetchAllClassesBasic(supabase: SupabaseClient) {
    return await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok(id, name, desa_id)')
}

export async function fetchClassesByIds(supabase: SupabaseClient, classIds: string[]) {
    return await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok(id, name, desa_id)')
        .in('id', classIds)
}

export async function fetchClassesHierarchical(
    supabase: SupabaseClient,
    filter: {
        kelompok_id?: string | null
        desa_id?: string | null
        daerah_id?: string | null
    }
) {
    // Guru Kelompok: direct filter on kelompok_id column
    if (filter.kelompok_id) {
        return await supabase
            .from('classes')
            .select('id, name, kelompok_id, kelompok:kelompok_id(id, name, desa_id)')
            .eq('kelompok_id', filter.kelompok_id)
    }

    // Guru Desa / Guru Daerah: use two-query pattern.
    // PostgREST nested join filters (e.g. kelompok.desa_id) silently fail — NEVER use them.
    // Step 1: resolve which kelompok_ids are in scope
    let kelompokIds: string[] = []

    if (filter.desa_id) {
        const { data: kelompoks } = await supabase
            .from('kelompok')
            .select('id')
            .eq('desa_id', filter.desa_id)
        kelompokIds = (kelompoks || []).map((k: any) => k.id)
    } else if (filter.daerah_id) {
        // Step 1a: get desa IDs for this daerah
        const { data: desas } = await supabase
            .from('desa')
            .select('id')
            .eq('daerah_id', filter.daerah_id)
        const desaIds = (desas || []).map((d: any) => d.id)

        if (desaIds.length === 0) return { data: [], error: null }

        // Step 1b: get kelompok IDs for those desas
        const { data: kelompoks } = await supabase
            .from('kelompok')
            .select('id')
            .in('desa_id', desaIds)
        kelompokIds = (kelompoks || []).map((k: any) => k.id)
    }

    if (kelompokIds.length === 0) return { data: [], error: null }

    // Step 2: fetch classes in those kelompok
    return await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok_id(id, name, desa_id)')
        .in('kelompok_id', kelompokIds)
}
