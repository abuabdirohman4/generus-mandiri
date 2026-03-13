/**
 * Category Queries (Layer 1)
 *
 * Database queries for material category operations.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch all material categories ordered by display_order
 */
export async function fetchAllCategories(supabase: SupabaseClient) {
    return await supabase
        .from('material_categories')
        .select('*')
        .order('display_order')
}

/**
 * Check if any material types reference a category (dependency check)
 */
export async function fetchTypesForCategory(supabase: SupabaseClient, categoryId: string) {
    return await supabase
        .from('material_types')
        .select('id')
        .eq('category_id', categoryId)
        .limit(1)
}

/**
 * Insert a new material category
 */
export async function insertCategory(
    supabase: SupabaseClient,
    data: { name: string; description?: string | null; display_order: number }
) {
    return await supabase
        .from('material_categories')
        .insert({
            name: data.name,
            description: data.description || null,
            display_order: data.display_order,
        })
        .select()
        .single()
}

/**
 * Update an existing material category
 */
export async function updateCategoryById(
    supabase: SupabaseClient,
    id: string,
    data: { name: string; description?: string | null; display_order: number }
) {
    return await supabase
        .from('material_categories')
        .update({
            name: data.name,
            description: data.description || null,
            display_order: data.display_order,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
}

/**
 * Delete a material category by id
 */
export async function deleteCategoryById(supabase: SupabaseClient, id: string) {
    return await supabase
        .from('material_categories')
        .delete()
        .eq('id', id)
}
