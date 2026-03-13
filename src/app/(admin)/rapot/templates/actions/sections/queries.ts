/**
 * Sections Queries (Layer 1)
 *
 * Database queries for report sections and section items.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Report Sections ──────────────────────────────────────────────────────────

/**
 * Fetch sections for a template, ordered by display_order
 */
export async function fetchSectionsByTemplate(supabase: SupabaseClient, templateId: string) {
    return await supabase
        .from('report_sections')
        .select(`
      id,
      template_id,
      name,
      description,
      grading_format,
      display_order,
      is_active,
      created_at,
      updated_at
    `)
        .eq('template_id', templateId)
        .order('display_order')
}

/**
 * Fetch items for a specific section, ordered by display_order
 */
export async function fetchItemsBySection(supabase: SupabaseClient, sectionId: string) {
    return await supabase
        .from('report_section_items')
        .select(`
      id,
      section_id,
      material_level,
      material_category_id,
      material_type_id,
      material_item_id,
      custom_name,
      display_order,
      is_required,
      grading_mode,
      created_at,
      updated_at,
      material_category:material_category_id(id, name),
      material_type:material_type_id(id, name, category_id, category:material_categories(name)),
      material_item:material_item_id(id, name, material_type_id)
    `)
        .eq('section_id', sectionId)
        .order('display_order')
}

/**
 * Fetch template_id for a given section (for revalidatePath)
 */
export async function fetchSectionTemplateId(supabase: SupabaseClient, sectionId: string) {
    return await supabase
        .from('report_sections')
        .select('template_id')
        .eq('id', sectionId)
        .single()
}

/**
 * Insert a new report section
 */
export async function insertSection(
    supabase: SupabaseClient,
    data: {
        template_id: string
        name: string
        description?: string | null
        grading_format: string
        display_order: number
        is_active: boolean
    }
) {
    return await supabase
        .from('report_sections')
        .insert({
            template_id: data.template_id,
            name: data.name,
            description: data.description || null,
            grading_format: data.grading_format,
            display_order: data.display_order,
            is_active: data.is_active,
        })
        .select()
        .single()
}

/**
 * Update a report section
 */
export async function updateSectionById(
    supabase: SupabaseClient,
    sectionId: string,
    updateData: Record<string, any>
) {
    return await supabase
        .from('report_sections')
        .update(updateData)
        .eq('id', sectionId)
}

/**
 * Delete a report section by id
 */
export async function deleteSectionById(supabase: SupabaseClient, sectionId: string) {
    return await supabase
        .from('report_sections')
        .delete()
        .eq('id', sectionId)
}

// ─── Section Items ────────────────────────────────────────────────────────────

/**
 * Fetch template_id from section (via report_sections) for a section item
 */
export async function fetchSectionTemplateIdForItem(supabase: SupabaseClient, sectionId: string) {
    return await supabase
        .from('report_sections')
        .select('template_id')
        .eq('id', sectionId)
        .single()
}

/**
 * Insert a new section item
 */
export async function insertSectionItem(
    supabase: SupabaseClient,
    data: {
        section_id: string
        material_level: 'category' | 'type' | 'item'
        material_category_id?: string | null
        material_type_id?: string | null
        material_item_id?: string | null
        display_order: number
        is_required: boolean
        grading_mode?: 'expand' | 'single'
    }
) {
    return await supabase
        .from('report_section_items')
        .insert({
            section_id: data.section_id,
            material_level: data.material_level,
            material_category_id: data.material_category_id || null,
            material_type_id: data.material_type_id || null,
            material_item_id: data.material_item_id || null,
            display_order: data.display_order,
            is_required: data.is_required,
            grading_mode: data.grading_mode || 'expand',
        })
        .select()
        .single()
}

/**
 * Delete a section item by id
 */
export async function deleteSectionItemById(supabase: SupabaseClient, itemId: string) {
    return await supabase
        .from('report_section_items')
        .delete()
        .eq('id', itemId)
}
