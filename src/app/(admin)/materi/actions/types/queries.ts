/**
 * Type Queries (Layer 1)
 *
 * Database queries for material type operations.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch all material types, optionally filtered by category
 */
export async function fetchAllTypes(supabase: SupabaseClient, categoryId?: string) {
    let query = supabase
        .from('material_types')
        .select(`
      *,
      category:material_categories(*)
    `)
        .order('display_order')

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    }

    return await query
}

/**
 * Check if any material items use this type (dependency check)
 */
export async function fetchItemsForType(supabase: SupabaseClient, typeId: string) {
    return await supabase
        .from('material_items')
        .select('id')
        .eq('material_type_id', typeId)
        .limit(1)
}

/**
 * Check if any day_material_assignments use this type
 */
export async function fetchAssignmentsForType(supabase: SupabaseClient, typeId: string) {
    return await supabase
        .from('day_material_assignments')
        .select('id')
        .eq('material_type_id', typeId)
        .limit(1)
}

/**
 * Insert a new material type
 */
export async function insertType(
    supabase: SupabaseClient,
    data: { category_id: string; name: string; description?: string | null; display_order: number }
) {
    return await supabase
        .from('material_types')
        .insert({
            category_id: data.category_id,
            name: data.name,
            description: data.description || null,
            display_order: data.display_order,
        })
        .select(`
      *,
      category:material_categories(*)
    `)
        .single()
}

/**
 * Update an existing material type
 */
export async function updateTypeById(
    supabase: SupabaseClient,
    id: string,
    data: { category_id: string; name: string; description?: string | null; display_order: number }
) {
    return await supabase
        .from('material_types')
        .update({
            category_id: data.category_id,
            name: data.name,
            description: data.description || null,
            display_order: data.display_order,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
      *,
      category:material_categories(*)
    `)
        .single()
}

/**
 * Delete a material type by id
 */
export async function deleteTypeById(supabase: SupabaseClient, id: string) {
    return await supabase
        .from('material_types')
        .delete()
        .eq('id', id)
}
