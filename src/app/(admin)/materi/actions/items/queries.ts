/**
 * Items Queries (Layer 1)
 *
 * Database queries for material item operations
 * (items, class mappings, day assignments, class masters).
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Class Masters ────────────────────────────────────────────────────────────

/**
 * Fetch available class masters for assignment selection
 */
export async function fetchAvailableClassMasters(supabase: SupabaseClient) {
    return await supabase
        .from('class_masters')
        .select('*')
        .order('name')
}

/**
 * Fetch all class masters with category for filtering
 */
export async function fetchAllClassMastersWithCategory(supabase: SupabaseClient) {
    return await supabase
        .from('class_masters')
        .select(`
      id,
      name,
      category:category_id (
        id,
        code,
        name
      )
    `)
        .order('sort_order', { ascending: true })
}

/**
 * Fetch class masters that have at least one material item (inner join)
 */
export async function fetchClassMastersWithMaterialItems(supabase: SupabaseClient) {
    return await supabase
        .from('class_masters')
        .select(`
      *,
      material_item_classes!inner(id)
    `)
        .order('name')
}

// ─── Material Items ───────────────────────────────────────────────────────────

/**
 * Fetch material items for a specific type
 */
export async function fetchItemsByType(supabase: SupabaseClient, materialTypeId: string) {
    return await supabase
        .from('material_items')
        .select(`
      *,
      material_type:material_types(*)
    `)
        .eq('material_type_id', materialTypeId)
        .order('name')
}

/**
 * Fetch all material items with nested type and category
 */
export async function fetchAllItems(supabase: SupabaseClient) {
    return await supabase
        .from('material_items')
        .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
        .order('name')
}

/**
 * Fetch a single material item with type info
 */
export async function fetchItemById(supabase: SupabaseClient, id: string) {
    return await supabase
        .from('material_items')
        .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
        .eq('id', id)
        .single()
}

/**
 * Fetch all material items with nested relations, up to 10000 rows
 */
export async function fetchAllItemsWithTypes(supabase: SupabaseClient) {
    return await supabase
        .from('material_items')
        .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
        .range(0, 9999)
        .order('name')
}

/**
 * Fetch items for a class (via material_item_classes junction)
 */
export async function fetchItemsForClass(supabase: SupabaseClient, classMasterId: string) {
    return await supabase
        .from('material_item_classes')
        .select(`
      *,
      material_item:material_items(
        *,
        material_type:material_types(
          *,
          category:material_categories(*)
        )
      ),
      class_master:class_masters(*)
    `)
        .eq('class_master_id', classMasterId)
        .order('material_item(name)')
}

/**
 * Fetch items for a class and type (inner join)
 */
export async function fetchItemsForClassAndType(
    supabase: SupabaseClient,
    classMasterId: string,
    materialTypeId: string
) {
    return await supabase
        .from('material_items')
        .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      ),
      material_item_classes!inner(
        class_master:class_masters(*)
      )
    `)
        .eq('material_type_id', materialTypeId)
        .eq('material_item_classes.class_master_id', classMasterId)
        .order('name')
}

/**
 * Fetch a batch of class mappings for offset-based pagination
 */
export async function fetchClassMappingsBatch(
    supabase: SupabaseClient,
    offset: number,
    batchSize: number
) {
    return await supabase
        .from('material_item_classes')
        .select(`
      material_item_id,
      semester,
      class_master:class_masters(*)
    `)
        .range(offset, offset + batchSize - 1)
}

/**
 * Check if any day_material_items reference this item
 */
export async function fetchDayItemsForItem(supabase: SupabaseClient, itemId: string) {
    return await supabase
        .from('day_material_items')
        .select('id')
        .eq('material_item_id', itemId)
        .limit(1)
}

/**
 * Insert a new material item
 */
export async function insertItem(
    supabase: SupabaseClient,
    data: {
        material_type_id: string
        name: string
        description?: string | null
        content?: string | null
    }
) {
    return await supabase
        .from('material_items')
        .insert({
            material_type_id: data.material_type_id,
            name: data.name,
            description: data.description || null,
            content: data.content || null,
        })
        .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
        .single()
}

/**
 * Update a material item (two-step: update then fetch)
 */
export async function updateItemById(
    supabase: SupabaseClient,
    id: string,
    data: {
        material_type_id: string
        name: string
        description?: string | null
        content?: string | null
    }
) {
    const { error: updateError } = await supabase
        .from('material_items')
        .update({
            material_type_id: data.material_type_id,
            name: data.name,
            description: data.description || null,
            content: data.content || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (updateError) return { data: null, error: updateError }

    // Fetch updated item with relations
    return await supabase
        .from('material_items')
        .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
        .eq('id', id)
        .single()
}

/**
 * Delete a material item by id
 */
export async function deleteItemById(supabase: SupabaseClient, id: string) {
    return await supabase
        .from('material_items')
        .delete()
        .eq('id', id)
}

// ─── Class Mappings ───────────────────────────────────────────────────────────

/**
 * Fetch class mappings for a material item
 */
export async function fetchItemClassMappings(supabase: SupabaseClient, itemId: string) {
    return await supabase
        .from('material_item_classes')
        .select(`
      id,
      class_master_id,
      semester,
      class_master:class_masters(*)
    `)
        .eq('material_item_id', itemId)
}

/**
 * Delete all class mappings for an item
 */
export async function deleteItemClassMappings(supabase: SupabaseClient, itemId: string) {
    return await supabase
        .from('material_item_classes')
        .delete()
        .eq('material_item_id', itemId)
}

/**
 * Delete all class mappings for multiple items (used in bulk)
 */
export async function deleteItemClassMappingsBulk(supabase: SupabaseClient, itemIds: string[]) {
    return await supabase
        .from('material_item_classes')
        .delete()
        .in('material_item_id', itemIds)
}

/**
 * Insert class mappings for an item
 */
export async function insertItemClassMappings(
    supabase: SupabaseClient,
    mappings: Array<{ material_item_id: string; class_master_id: string; semester: number | null }>
) {
    return await supabase
        .from('material_item_classes')
        .insert(mappings)
}

/**
 * Upsert class mappings (ignore duplicates — for bulk add mode)
 */
export async function upsertItemClassMappings(
    supabase: SupabaseClient,
    mappings: Array<{ material_item_id: string; class_master_id: string; semester: number | null }>
) {
    return await supabase
        .from('material_item_classes')
        .upsert(mappings, { onConflict: 'material_item_id,class_master_id', ignoreDuplicates: true })
}

// ─── Day Assignments ──────────────────────────────────────────────────────────

/**
 * Upsert a day material assignment
 */
export async function upsertDayAssignment(
    supabase: SupabaseClient,
    data: {
        class_master_id: string
        semester: number
        month: number
        week: number
        day_of_week: number
        material_type_id: string
        notes?: string | null
    }
) {
    return await supabase
        .from('day_material_assignments')
        .upsert(
            {
                class_master_id: data.class_master_id,
                semester: data.semester,
                month: data.month,
                week: data.week,
                day_of_week: data.day_of_week,
                material_type_id: data.material_type_id,
                notes: data.notes || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'class_master_id,semester,month,week,day_of_week,material_type_id' }
        )
        .select('id')
        .single()
}

/**
 * Delete day material items for an assignment
 */
export async function deleteDayAssignmentItems(supabase: SupabaseClient, assignmentId: string) {
    return await supabase
        .from('day_material_items')
        .delete()
        .eq('assignment_id', assignmentId)
}

/**
 * Insert day material items for an assignment
 */
export async function insertDayAssignmentItems(
    supabase: SupabaseClient,
    items: Array<{
        assignment_id: string
        material_item_id: string
        display_order: number
        custom_content?: string | null
    }>
) {
    return await supabase
        .from('day_material_items')
        .insert(items)
}

/**
 * Fetch day material assignments for a specific day
 */
export async function fetchDayAssignments(
    supabase: SupabaseClient,
    params: {
        class_master_id: string
        semester: number
        month: number
        week: number
        day_of_week: number
    }
) {
    return await supabase
        .from('day_material_assignments')
        .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      ),
      items:day_material_items(
        *,
        material_item:material_items(
          *,
          material_type:material_types(*)
        )
      )
    `)
        .eq('class_master_id', params.class_master_id)
        .eq('semester', params.semester)
        .eq('month', params.month)
        .eq('week', params.week)
        .eq('day_of_week', params.day_of_week)
        .order('material_type(display_order)')
}

/**
 * Delete a day material assignment by id
 */
export async function deleteDayAssignmentById(supabase: SupabaseClient, assignmentId: string) {
    return await supabase
        .from('day_material_assignments')
        .delete()
        .eq('id', assignmentId)
}
