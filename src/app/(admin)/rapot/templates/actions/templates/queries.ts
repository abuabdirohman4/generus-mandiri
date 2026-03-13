/**
 * Templates Queries (Layer 1)
 *
 * Database queries for report template operations.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch all report templates ordered by semester then name
 */
export async function fetchAllTemplates(supabase: SupabaseClient) {
  return await supabase
    .from('report_templates')
    .select(`
      id,
      name,
      description,
      semester,
      academic_year_id,
      is_active,
      created_at,
      updated_at
    `)
    .order('semester', { ascending: true })
    .order('name')
}

/**
 * Fetch class masters linked to a template (junction table)
 */
export async function fetchTemplateClasses(supabase: SupabaseClient, templateId: string) {
  return await supabase
    .from('report_template_classes')
    .select(`
      class_masters:class_master_id(
        id,
        name,
        category_id,
        categories:category_id(id, code, name)
      )
    `)
    .eq('template_id', templateId)
}

/**
 * Fetch single template by id
 */
export async function fetchTemplateById(supabase: SupabaseClient, templateId: string) {
  return await supabase
    .from('report_templates')
    .select(`
      id,
      name,
      description,
      semester,
      academic_year_id,
      is_active,
      created_at,
      updated_at
    `)
    .eq('id', templateId)
    .single()
}

/**
 * Insert a new report template
 */
export async function insertTemplate(
  supabase: SupabaseClient,
  data: {
    name: string
    description?: string | null
    semester: 1 | 2
    academic_year_id?: string | null
    is_active: boolean
  }
) {
  return await supabase
    .from('report_templates')
    .insert({
      name: data.name,
      description: data.description || null,
      semester: data.semester,
      academic_year_id: data.academic_year_id || null,
      is_active: data.is_active,
    })
    .select()
    .single()
}

/**
 * Insert class master associations for a template (junction table)
 */
export async function insertTemplateClasses(
  supabase: SupabaseClient,
  entries: Array<{ template_id: string; class_master_id: string }>
) {
  return await supabase
    .from('report_template_classes')
    .insert(entries)
}

/**
 * Update a report template
 */
export async function updateTemplateById(
  supabase: SupabaseClient,
  templateId: string,
  updateData: Record<string, any>
) {
  return await supabase
    .from('report_templates')
    .update(updateData)
    .eq('id', templateId)
}

/**
 * Delete a report template by id
 */
export async function deleteTemplateById(supabase: SupabaseClient, templateId: string) {
  return await supabase
    .from('report_templates')
    .delete()
    .eq('id', templateId)
}

/**
 * Fetch active templates for a semester/academicYear linked to a specific class (inner join)
 */
export async function fetchSpecificTemplates(
  supabase: SupabaseClient,
  semester: number,
  academicYearId: string,
  classMasterId: string
) {
  return await supabase
    .from('report_templates')
    .select(`
      id,
      is_active,
      semester,
      academic_year_id,
      report_template_classes!inner(class_master_id)
    `)
    .eq('semester', semester)
    .eq('academic_year_id', academicYearId)
    .eq('is_active', true)
    .eq('report_template_classes.class_master_id', classMasterId)
}

/**
 * Fetch all active templates for a semester/academicYear (universal candidates)
 */
export async function fetchAllActiveTemplates(
  supabase: SupabaseClient,
  semester: number,
  academicYearId: string
) {
  return await supabase
    .from('report_templates')
    .select(`
      id,
      is_active,
      semester,
      academic_year_id,
      report_template_classes(class_master_id)
    `)
    .eq('semester', semester)
    .eq('academic_year_id', academicYearId)
    .eq('is_active', true)
}

/**
 * Fetch specific templates with no academic_year_id constraint (fallback)
 */
export async function fetchFallbackSpecificTemplates(
  supabase: SupabaseClient,
  semester: number,
  classMasterId: string
) {
  return await supabase
    .from('report_templates')
    .select(`
      id,
      report_template_classes!inner(class_master_id)
    `)
    .eq('semester', semester)
    .is('academic_year_id', null)
    .eq('is_active', true)
    .eq('report_template_classes.class_master_id', classMasterId)
}

/**
 * Fetch universal templates with no academic_year_id constraint (fallback)
 */
export async function fetchFallbackUniversalTemplates(
  supabase: SupabaseClient,
  semester: number
) {
  return await supabase
    .from('report_templates')
    .select(`
      id,
      report_template_classes(class_master_id)
    `)
    .eq('semester', semester)
    .is('academic_year_id', null)
    .eq('is_active', true)
}
