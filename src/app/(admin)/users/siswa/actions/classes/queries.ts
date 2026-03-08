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

    // Step 1: get mappings
    const { data: mappings } = await supabase
        .from('class_master_mappings')
        .select('class_id, class_master_id')
        .in('class_id', classIds)

    if (!mappings || mappings.length === 0) return classMappings

    // Step 2: get class masters with sort_order
    const masterIds = mappings.map((m: any) => m.class_master_id)
    const { data: masters } = await supabase
        .from('class_masters')
        .select('id, sort_order')
        .in('id', masterIds)

    if (!masters) return classMappings

    // Step 3: group by class_id
    mappings.forEach((mapping: any) => {
        const master = masters.find((m: any) => m.id === mapping.class_master_id)
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
        .select('id, name, kelompok_id, kelompok:kelompok(id, name)')
}

export async function fetchClassesByIds(supabase: SupabaseClient, classIds: string[]) {
    return await supabase
        .from('classes')
        .select('id, name, kelompok_id, kelompok:kelompok(id, name)')
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
    let query = supabase
        .from('classes')
        .select(`
      id,
      name,
      kelompok_id,
      kelompok:kelompok_id(
        id,
        name,
        desa_id,
        desa:desa_id(
          id,
          name,
          daerah_id
        )
      )
    `)

    if (filter.kelompok_id) {
        query = query.eq('kelompok_id', filter.kelompok_id)
    } else if (filter.desa_id) {
        query = query.eq('kelompok.desa_id', filter.desa_id)
    } else if (filter.daerah_id) {
        query = query.eq('kelompok.desa.daerah_id', filter.daerah_id)
    }

    return await query
}
