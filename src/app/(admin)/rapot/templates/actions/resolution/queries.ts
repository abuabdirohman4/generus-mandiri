/**
 * Resolution Queries (Layer 1)
 *
 * Database queries for material data and student enrollment
 * used in template resolution and section item expansion.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Material Lookups ─────────────────────────────────────────────────────────

/**
 * Fetch all material categories
 */
export async function fetchMaterialCategories(supabase: SupabaseClient) {
    return await supabase
        .from('material_categories')
        .select('id, name, description, display_order')
        .order('display_order')
}

/**
 * Fetch material types, optionally filtered by category
 */
export async function fetchMaterialTypes(supabase: SupabaseClient, categoryId?: string) {
    let query = supabase
        .from('material_types')
        .select(`
      id,
      category_id,
      name,
      description,
      display_order,
      material_categories:category_id(id, name, description, display_order)
    `)
        .order('display_order')

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    }

    return await query
}

/**
 * Fetch material items, optionally filtered by type
 */
export async function fetchMaterialItems(supabase: SupabaseClient, typeId?: string) {
    let query = supabase
        .from('material_items')
        .select(`
      id,
      material_type_id,
      name,
      description,
      display_order,
      material_types:material_type_id(id, name, category_id, description, display_order)
    `)
        .order('display_order')

    if (typeId) {
        query = query.eq('material_type_id', typeId)
    }

    return await query
}

/**
 * Fetch all class masters for template selection
 */
export async function fetchClassMasters(supabase: SupabaseClient) {
    return await supabase
        .from('class_masters')
        .select(`
      id,
      name,
      category_id,
      categories:category_id(id, code, name)
    `)
        .order('name')
}

// ─── Student Enrollment ───────────────────────────────────────────────────────

/**
 * Fetch student enrollment with class master mapping
 */
export async function fetchStudentEnrollment(supabase: SupabaseClient, studentId: string) {
    return await supabase
        .from('student_classes')
        .select(`
      classes:class_id(
        id,
        class_master_mappings(
          class_master:class_master_id(id, name)
        )
      )
    `)
        .eq('student_id', studentId)
        .single()
}

// ─── Section Item Resolution ──────────────────────────────────────────────────

/**
 * Fetch material item availability for a specific item in a class/semester
 */
export async function fetchItemAvailabilityForClass(
    supabase: SupabaseClient,
    materialItemId: string,
    classMasterId: string,
    semester: number
) {
    return await supabase
        .from('material_item_classes')
        .select(`
      semester,
      material_items:material_item_id(id, name)
    `)
        .eq('material_item_id', materialItemId)
        .eq('class_master_id', classMasterId)
        .or(`semester.eq.${semester},semester.is.null`)
        .limit(1)
        .maybeSingle()
}

/**
 * Fetch all material items for a type, filtered by class (for expand mode)
 */
export async function fetchItemsByTypeForClass(
    supabase: SupabaseClient,
    materialTypeId: string,
    classMasterId: string
) {
    return await supabase
        .from('material_items')
        .select(`
      id, name,
      material_types!inner(
        id,
        name,
        category:material_categories(name)
      ),
      material_item_classes!inner(class_master_id, semester)
    `)
        .eq('material_type_id', materialTypeId)
        .eq('material_item_classes.class_master_id', classMasterId)
        .order('name')
}

/**
 * Fetch all material items for a category, filtered by class (for expand mode)
 */
export async function fetchItemsByCategoryForClass(
    supabase: SupabaseClient,
    materialCategoryId: string,
    classMasterId: string
) {
    return await supabase
        .from('material_items')
        .select(`
      id, name,
      material_types!inner(
        id,
        name,
        category:material_categories(name)
      ),
      material_item_classes!inner(class_master_id, semester)
    `)
        .eq('material_types.category_id', materialCategoryId)
        .eq('material_item_classes.class_master_id', classMasterId)
        .order('name')
}
