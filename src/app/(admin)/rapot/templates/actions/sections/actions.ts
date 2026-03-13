'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ReportSection, ReportSectionItem, TemplateWithSections } from '../../types'
import {
    fetchSectionsByTemplate,
    fetchItemsBySection,
    fetchSectionTemplateId,
    fetchSectionTemplateIdForItem,
    insertSection,
    updateSectionById,
    deleteSectionById,
    insertSectionItem,
    deleteSectionItemById,
} from './queries'
import {
    fetchTemplateClasses,
    fetchTemplateById,
    fetchSpecificTemplates,
    fetchAllActiveTemplates,
    fetchFallbackSpecificTemplates,
    fetchFallbackUniversalTemplates,
} from '../templates/queries'
import {
    mapJunctionToClassMasters,
    filterUniversalTemplates,
    pickTemplateId,
    extractClassMasterIdFromEnrollment,
} from '../templates/logic'
import { normalizeSectionItems, buildSectionUpdatePayload } from './logic'
import { fetchStudentEnrollment } from '../resolution/queries'

/**
 * Get template by ID with all sections and items
 */
export async function getTemplateById(templateId: string): Promise<{
    success: boolean
    data?: TemplateWithSections
    error?: string
}> {
    try {
        const supabase = await createClient()

        const { data: template, error: templateError } = await fetchTemplateById(supabase, templateId)
        if (templateError) throw templateError

        const { data: junctionData } = await fetchTemplateClasses(supabase, templateId)
        const classMasters = mapJunctionToClassMasters(junctionData || [])

        const { data: sections, error: sectionsError } = await fetchSectionsByTemplate(supabase, templateId)
        if (sectionsError) throw sectionsError

        const sectionsWithItems: ReportSection[] = await Promise.all(
            (sections || []).map(async section => {
                const { data: items } = await fetchItemsBySection(supabase, section.id)
                return { ...section, items: normalizeSectionItems(items || []) }
            })
        )

        return {
            success: true,
            data: { ...template, class_masters: classMasters, sections: sectionsWithItems },
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Get the applicable template for a student
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

        const { data: enrollment } = await fetchStudentEnrollment(supabase, studentId)
        if (!enrollment) throw new Error('Student not enrolled in any class')

        const classMasterId = extractClassMasterIdFromEnrollment(enrollment)
        if (!classMasterId) throw new Error('Class master not found for student class')

        const { data: specificTemplates } = await fetchSpecificTemplates(
            supabase, semester, academicYearId, classMasterId
        )

        const { data: allTemplates } = await fetchAllActiveTemplates(supabase, semester, academicYearId)
        const universalTemplates = filterUniversalTemplates(allTemplates || [])

        let templateId = pickTemplateId(specificTemplates || null, universalTemplates)

        if (!templateId) {
            const { data: fallbackSpecific } = await fetchFallbackSpecificTemplates(supabase, semester, classMasterId)
            if (fallbackSpecific && fallbackSpecific.length > 0) {
                templateId = fallbackSpecific[0].id
            } else {
                const { data: fallbackUniversal } = await fetchFallbackUniversalTemplates(supabase, semester)
                const universalFallback = filterUniversalTemplates(fallbackUniversal || [])
                if (universalFallback.length > 0) templateId = universalFallback[0].id
            }
        }

        if (!templateId) {
            throw new Error(`No active template found for semester ${semester}`)
        }

        return await getTemplateById(templateId)
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Create section for a template
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
        const { data: section, error } = await insertSection(adminClient, data)
        if (error) throw error

        revalidatePath(`/rapot/templates/${data.template_id}`)
        return { success: true, data: section }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Update a section
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
        const updateData = buildSectionUpdatePayload(data)

        const { error } = await updateSectionById(adminClient, sectionId, updateData)
        if (error) throw error

        const { data: section } = await fetchSectionTemplateId(adminClient, sectionId)
        if (section) {
            revalidatePath(`/rapot/templates/${section.template_id}`)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Delete a section
 */
export async function deleteSection(
    sectionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const adminClient = await createAdminClient()

        const { data: section } = await fetchSectionTemplateId(adminClient, sectionId)
        const { error } = await deleteSectionById(adminClient, sectionId)
        if (error) throw error

        if (section) {
            revalidatePath(`/rapot/templates/${section.template_id}`)
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Create a section item
 */
export async function createSectionItem(data: {
    section_id: string
    material_level: 'category' | 'type' | 'item'
    material_category_id?: string
    material_type_id?: string
    material_item_id?: string
    display_order: number
    is_required: boolean
    grading_mode?: 'expand' | 'single'
}): Promise<{ success: boolean; data?: ReportSectionItem; error?: string }> {
    try {
        const adminClient = await createAdminClient()
        const { data: item, error } = await insertSectionItem(adminClient, data)
        if (error) throw error

        const { data: section } = await fetchSectionTemplateIdForItem(adminClient, data.section_id)
        if (section) {
            revalidatePath(`/rapot/templates/${section.template_id}`)
        }

        return { success: true, data: item }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Delete a section item
 */
export async function deleteSectionItem(
    itemId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const adminClient = await createAdminClient()
        const { error } = await deleteSectionItemById(adminClient, itemId)
        if (error) throw error

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
