// src/app/(admin)/rapot/templates/actions.ts
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  ReportTemplate,
  ReportSection,
  ReportSectionItem,
  TemplateWithSections,
  MaterialCategory,
  MaterialType,
  MaterialItem,
} from './types'

// ================== TEMPLATES ==================

/**
 * Get all report templates
 */
export async function getAllTemplates(): Promise<{
  success: boolean
  data?: ReportTemplate[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: templates, error } = await supabase
      .from('report_templates')
      .select(
        `
        id,
        name,
        description,
        semester,
        academic_year_id,
        is_active,
        created_at,
        updated_at
      `
      )
      .order('semester', { ascending: true })
      .order('name')

    if (error) throw error

    // For each template, get associated class masters from junction table
    const templatesWithClasses = await Promise.all(
      (templates || []).map(async template => {
        const { data: junctionData } = await supabase
          .from('report_template_classes')
          .select(
            `
            class_masters:class_master_id(
              id,
              name,
              category_id,
              categories:category_id(id, code, name)
            )
          `
          )
          .eq('template_id', template.id)

        // Transform junction data to array of class masters
        const classMasters =
          junctionData
            ?.map((item: any) => {
              const cm = item.class_masters?.[0]
              if (!cm) return null
              return {
                ...cm,
                categories: cm.categories?.[0] || null,
              }
            })
            .filter(Boolean) || []

        return {
          ...template,
          class_masters: classMasters,
        }
      })
    )

    return { success: true, data: templatesWithClasses }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get template by ID with sections and items
 */
export async function getTemplateById(
  templateId: string
): Promise<{
  success: boolean
  data?: TemplateWithSections
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('report_templates')
      .select(
        `
        id,
        name,
        description,
        semester,
        academic_year_id,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq('id', templateId)
      .single()

    if (templateError) throw templateError

    // Get associated class masters from junction table
    const { data: junctionData } = await supabase
      .from('report_template_classes')
      .select(
        `
        class_masters:class_master_id(
          id,
          name,
          category_id,
          categories:category_id(id, code, name)
        )
      `
      )
      .eq('template_id', templateId)

    const classMasters =
      junctionData
        ?.map((item: any) => {
          const cm = item.class_masters?.[0]
          if (!cm) return null
          return {
            ...cm,
            categories: cm.categories?.[0] || null,
          }
        })
        .filter(Boolean) || []

    // Get sections with items
    const { data: sections, error: sectionsError } = await supabase
      .from('report_sections')
      .select(
        `
        id,
        template_id,
        name,
        description,
        grading_format,
        display_order,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq('template_id', templateId)
      .order('display_order')

    if (sectionsError) throw sectionsError

    // Get items for each section
    const sectionsWithItems: ReportSection[] = await Promise.all(
      (sections || []).map(async section => {
        const { data: items } = await supabase
          .from('report_section_items')
          .select(
            `
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
          `
          )
          .eq('section_id', section.id)
          .order('display_order')

        // Transform: PostgREST returns single objects for foreign keys, not arrays
        const transformedItems = (items || []).map((item: any) => ({
          ...item,
          material_category: item.material_category || null,
          material_type: item.material_type || null,
          material_item: item.material_item || null,
        }))

        return { ...section, items: transformedItems }
      })
    )

    return {
      success: true,
      data: {
        ...template,
        class_masters: classMasters,
        sections: sectionsWithItems,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Create new template
 */
export async function createTemplate(data: {
  name: string
  description?: string
  semester: 1 | 2
  class_master_ids: string[] // NEW - array of class master IDs (empty = universal)
  academic_year_id?: string
  is_active: boolean
}): Promise<{ success: boolean; data?: ReportTemplate; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    // 1. Create template
    const { data: template, error } = await adminClient
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

    if (error) throw error

    // 2. If class_master_ids provided, insert into junction table
    if (data.class_master_ids && data.class_master_ids.length > 0) {
      const templateClasses = data.class_master_ids.map(classId => ({
        template_id: template.id,
        class_master_id: classId,
      }))

      const { error: junctionError } = await adminClient
        .from('report_template_classes')
        .insert(templateClasses)

      if (junctionError) throw junctionError
    }

    revalidatePath('/rapot/templates')

    return { success: true, data: template }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Update template
 */
export async function updateTemplate(
  templateId: string,
  data: {
    name?: string
    description?: string
    class_master_id?: string
    is_active?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    const updateData: any = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.class_master_id !== undefined)
      updateData.class_master_id = data.class_master_id || null
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { error } = await adminClient
      .from('report_templates')
      .update(updateData)
      .eq('id', templateId)

    if (error) throw error

    revalidatePath('/rapot/templates')
    revalidatePath(`/rapot/templates/${templateId}`)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    const { error } = await adminClient.from('report_templates').delete().eq('id', templateId)

    if (error) throw error

    revalidatePath('/rapot/templates')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ================== SECTIONS ==================

/**
 * Create section for template
 */
export async function createSection(data: {
  template_id: string
  name: string
  description?: string
  grading_format: string
  display_order: number
  is_active: boolean
}): Promise<{ success: boolean; data?: ReportSection; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    const { data: section, error } = await adminClient
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

    if (error) throw error

    revalidatePath(`/rapot/templates/${data.template_id}`)

    return { success: true, data: section }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Update section
 */
export async function updateSection(
  sectionId: string,
  data: {
    name?: string
    description?: string
    grading_format?: string
    display_order?: number
    is_active?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    const updateData: any = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.grading_format !== undefined) updateData.grading_format = data.grading_format
    if (data.display_order !== undefined) updateData.display_order = data.display_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { error } = await adminClient
      .from('report_sections')
      .update(updateData)
      .eq('id', sectionId)

    if (error) throw error

    // Get template_id to revalidate
    const { data: section } = await adminClient
      .from('report_sections')
      .select('template_id')
      .eq('id', sectionId)
      .single()

    if (section) {
      revalidatePath(`/rapot/templates/${section.template_id}`)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Delete section
 */
export async function deleteSection(sectionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    // Get template_id first
    const { data: section } = await adminClient
      .from('report_sections')
      .select('template_id')
      .eq('id', sectionId)
      .single()

    const { error } = await adminClient.from('report_sections').delete().eq('id', sectionId)

    if (error) throw error

    if (section) {
      revalidatePath(`/rapot/templates/${section.template_id}`)
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ================== SECTION ITEMS ==================

/**
 * Create section item
 */
export async function createSectionItem(data: {
  section_id: string
  material_level: 'category' | 'type' | 'item' // REQUIRED - determines which material level to use
  material_category_id?: string
  material_type_id?: string
  material_item_id?: string
  display_order: number
  is_required: boolean
  grading_mode?: 'expand' | 'single' // NEW
}): Promise<{ success: boolean; data?: ReportSectionItem; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    const { data: item, error } = await adminClient
      .from('report_section_items')
      .insert({
        section_id: data.section_id,
        material_level: data.material_level, // CRITICAL: Include material_level
        material_category_id: data.material_category_id || null,
        material_type_id: data.material_type_id || null,
        material_item_id: data.material_item_id || null,
        display_order: data.display_order,
        is_required: data.is_required,
        grading_mode: data.grading_mode || 'expand', // Default to expand
      })
      .select()
      .single()

    if (error) throw error

    // Get template_id to revalidate
    const { data: section } = await adminClient
      .from('report_sections')
      .select('template_id')
      .eq('id', data.section_id)
      .single()

    if (section) {
      revalidatePath(`/rapot/templates/${section.template_id}`)
    }

    return { success: true, data: item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Delete section item
 */
export async function deleteSectionItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    const { error } = await adminClient.from('report_section_items').delete().eq('id', itemId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ================== MATERIALS ==================

/**
 * Get all material categories
 */
export async function getMaterialCategories(): Promise<{
  success: boolean
  data?: MaterialCategory[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('material_categories')
      .select('id, name, description, display_order')
      .order('display_order')

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get material types by category
 */
export async function getMaterialTypes(
  categoryId?: string
): Promise<{
  success: boolean
  data?: MaterialType[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('material_types')
      .select(
        `
        id,
        category_id,
        name,
        description,
        display_order,
        material_categories:category_id(id, name, description, display_order)
      `
      )
      .order('display_order')

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform: take first element from arrays
    const transformed = (data || []).map((type: any) => ({
      ...type,
      category: type.material_categories?.[0] || null,
    }))

    return { success: true, data: transformed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get material items by type
 */
export async function getMaterialItems(
  typeId?: string
): Promise<{
  success: boolean
  data?: MaterialItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('material_items')
      .select(
        `
        id,
        material_type_id,
        name,
        description,
        display_order,
        material_types:material_type_id(id, name, category_id, description, display_order)
      `
      )
      .order('display_order')

    if (typeId) {
      query = query.eq('material_type_id', typeId)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform: take first element from arrays
    const transformed = (data || []).map((item: any) => ({
      ...item,
      type: item.material_types?.[0] || null,
    }))

    return { success: true, data: transformed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get all class masters for template selection
 */
export async function getClassMasters(): Promise<{
  success: boolean
  data?: Array<{
    id: string
    name: string
    category_id?: string | null
    categories?: { id: string; code: string; name: string } | null
  }>
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('class_masters')
      .select(
        `
        id,
        name,
        category_id,
        categories:category_id(id, code, name)
      `
      )
      .order('name')

    if (error) throw error

    // Transform: take first element from categories array
    const transformed = (data || []).map((cm: any) => ({
      ...cm,
      categories: cm.categories?.[0] || null,
    }))

    return { success: true, data: transformed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ================== TEMPLATE SELECTION & RESOLUTION ==================

/**
 * Get the applicable template for a student based on:
 * - Semester
 * - Student's class master
 * - Template is_active status
 *
 * Priority: Specific template > Universal template
 */
export async function getApplicableTemplate(
  studentId: string,
  academicYearId: string,
  semester: 1 | 2
): Promise<{
  success: boolean
  data?: TemplateWithSections
  error?: string
}> {
  try {
    const supabase = await createClient()

    // 1. Get student's class master
    const { data: enrollment } = await supabase
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
      // We should probably filter by academic year if student_classes are year-specific
      // But assuming current enrollment for now
      .single()

    if (!enrollment) throw new Error('Student not enrolled in any class')

    // Handle potential array or single object structure
    const classesRef = enrollment.classes
    const classData = Array.isArray(classesRef) ? classesRef[0] : classesRef

    const mappingsRef = classData?.class_master_mappings
    const mapping = Array.isArray(mappingsRef) ? mappingsRef[0] : (mappingsRef as any)

    const classMasterRef = mapping?.class_master
    const classMaster = Array.isArray(classMasterRef) ? classMasterRef[0] : (classMasterRef as any)

    const classMasterId = classMaster?.id

    if (!classMasterId) throw new Error('Class master not found for student class')

    // 2. Find specific template (has this class_master_id in junction table)
    const { data: specificTemplates } = await supabase
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

    // 3. Find universal template (no records in junction table)
    // Note: It's hard to query "doesn't have related rows" efficiently in one go without a join tweak
    // So we query all active templates for this semester/year and filter in code or separate query
    const { data: allTemplates } = await supabase
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

    // Filter for universal templates (those with NO class associations)
    const universalTemplates = allTemplates?.filter(
      t => !t.report_template_classes || t.report_template_classes.length === 0
    ) || []

    // 4. Priority: specific > universal
    let templateId: string | null = null

    if (specificTemplates && specificTemplates.length > 0) {
      templateId = specificTemplates[0].id
    } else if (universalTemplates.length > 0) {
      templateId = universalTemplates[0].id
    }

    if (!templateId) {
      // Fallback: Try finding templates without academic_year_id constraint (legacy or general templates)
      const { data: generalSpecific } = await supabase
        .from('report_templates')
        .select(`
        id,
        report_template_classes!inner(class_master_id)
      `)
        .eq('semester', semester)
        .is('academic_year_id', null)
        .eq('is_active', true)
        .eq('report_template_classes.class_master_id', classMasterId)

      if (generalSpecific && generalSpecific.length > 0) {
        templateId = generalSpecific[0].id
      } else {
        const { data: generalUniversal } = await supabase
          .from('report_templates')
          .select(`
            id,
            report_template_classes(class_master_id)
          `)
          .eq('semester', semester)
          .is('academic_year_id', null)
          .eq('is_active', true)

        const univeralGeneral = generalUniversal?.filter(
          t => !t.report_template_classes || t.report_template_classes.length === 0
        ) || []

        if (univeralGeneral.length > 0) {
          templateId = univeralGeneral[0].id
        }
      }
    }

    if (!templateId) {
      throw new Error(`No active template found for semester ${semester}`)
    }

    // 5. Load full template with sections and items
    return await getTemplateById(templateId)
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Resolve section items based on material_level and student's class/semester
 *
 * - If level='item': Return the single item (if available for class)
 * - If level='type': Expand to all items in that type (filtered by class)
 * - If level='category': Expand to all items in that category (filtered by class)
 */
export async function resolveSectionItems(
  sectionItem: ReportSectionItem,
  classMasterId: string,
  semester: 1 | 2
): Promise<{
  success: boolean
  data?: Array<{
    section_item_id: string  // Original section item ID
    material_item_id: string // Actual material item ID (for grading)
    material_name: string
    is_required: boolean
  }>
  error?: string
}> {
  try {
    const supabase = await createClient()
    const results: Array<any> = []

    if (sectionItem.material_level === 'item') {
      // For specific item, checking detailed availability in material_item_classes
      // If material_item_id is set, check it directly
      if (sectionItem.material_item_id) {
        const { data } = await supabase
          .from('material_item_classes')
          .select(`
            semester,
            material_items:material_item_id(id, name)
          `)
          .eq('material_item_id', sectionItem.material_item_id)
          .eq('class_master_id', classMasterId)
          .or(`semester.eq.${semester},semester.is.null`)
          .limit(1)
          .maybeSingle()

        if (data) {
          const matItem = Array.isArray(data.material_items) ? data.material_items[0] : (data.material_items as any);
          if (matItem) {
            results.push({
              section_item_id: sectionItem.id,
              material_item_id: matItem.id,
              material_name: sectionItem.custom_name || matItem.name,
              is_required: sectionItem.is_required,
            })
          }
        }
      }
    } else if (sectionItem.material_level === 'type') {
      // Handle Single Mode for Type
      if (sectionItem.grading_mode === 'single') {
        const typeName = Array.isArray(sectionItem.material_type) ? sectionItem.material_type[0]?.name : sectionItem.material_type?.name;
        const categoryName = Array.isArray(sectionItem.material_type)
          ? sectionItem.material_type[0]?.category?.name
          : sectionItem.material_type?.category?.name;

        results.push({
          section_item_id: sectionItem.id,
          material_item_id: null, // Single grading
          material_name: sectionItem.custom_name || typeName,
          type_name: typeName,
          category_name: categoryName,
          is_required: sectionItem.is_required,
        });
      } else {
        // Expand type to all items available for this class/semester
        if (sectionItem.material_type_id) {
          // console.log(`[Resolve] Type Level: ${sectionItem.material_type_id}, Class: ${classMasterId}, Sem: ${semester}`)
          const { data, error } = await supabase
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
            .eq('material_type_id', sectionItem.material_type_id)
            .eq('material_item_classes.class_master_id', classMasterId)
            .order('name')

          // if (error) console.error('[Resolve] DB Error:', error)
          // console.log(`[Resolve] Raw Data Count: ${data?.length || 0}`)

          data?.forEach((item: any) => {
            // Filter in memory for semester match or null
            const itemClasses = item.material_item_classes || []
            const isValid = itemClasses.some(
              (ic: any) => ic.semester === semester || ic.semester === null
            )

            if (isValid) {
              const typeName = Array.isArray(item.material_types) ? item.material_types[0]?.name : item.material_types?.name;
              const categoryName = Array.isArray(item.material_types)
                ? item.material_types[0]?.category?.name
                : item.material_types?.category?.name;

              results.push({
                section_item_id: sectionItem.id,
                material_item_id: item.id,
                material_name: item.name,
                type_name: typeName,
                category_name: categoryName,
                is_required: sectionItem.is_required,
              })
            }
          })
          // console.log(`[Resolve] Filtered Results: ${results.length}`)
        }
      }
    } else if (sectionItem.material_level === 'category') {
      // Handle Single Mode for Category
      if (sectionItem.grading_mode === 'single') {
        const catName = Array.isArray(sectionItem.material_category)
          ? sectionItem.material_category[0]?.name
          : sectionItem.material_category?.name;

        results.push({
          section_item_id: sectionItem.id,
          material_item_id: null, // Single grading
          material_name: sectionItem.custom_name || catName,
          type_name: catName, // Use category name as type name for grouping
          category_name: catName,
          is_required: sectionItem.is_required,
        });
      } else {
        // Expand category to all items
        if (sectionItem.material_category_id) {
          // console.log(`[Resolve] Category Level: ${sectionItem.material_category_id}, Class: ${classMasterId}, Sem: ${semester}`)
          const { data, error } = await supabase
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
            .eq('material_types.category_id', sectionItem.material_category_id)
            .eq('material_item_classes.class_master_id', classMasterId)
            .order('name')

          // if (error) console.error('[Resolve] DB Error:', error)
          // console.log(`[Resolve] Category Raw Data: ${data?.length || 0}`)

          data?.forEach((item: any) => {
            // Filter in memory for semester match or null
            const itemClasses = item.material_item_classes || []
            const isValid = itemClasses.some(
              (ic: any) => ic.semester === semester || ic.semester === null
            )

            if (isValid) {
              const typeName = Array.isArray(item.material_types) ? item.material_types[0]?.name : item.material_types?.name;
              const categoryName = Array.isArray(item.material_types)
                ? item.material_types[0]?.category?.name
                : item.material_types?.category?.name;

              results.push({
                section_item_id: sectionItem.id,
                material_item_id: item.id,
                material_name: item.name,
                type_name: typeName,
                category_name: categoryName,
                is_required: sectionItem.is_required,
              })
            }
          })
          // console.log(`[Resolve] Category Filtered Results: ${results.length}`)
        }
      }
    }

    return { success: true, data: results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}