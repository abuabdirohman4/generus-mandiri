'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ReportTemplate } from '../../types'
import {
    fetchAllTemplates,
    fetchTemplateClasses,
    insertTemplate,
    insertTemplateClasses,
    updateTemplateById,
    deleteTemplateById,
} from './queries'
import {
    mapJunctionToClassMasters,
    buildTemplateUpdatePayload,
    buildTemplateClassEntries,
} from './logic'

/**
 * Get all report templates (with associated class masters)
 */
export async function getAllTemplates(): Promise<{
    success: boolean
    data?: ReportTemplate[]
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data: templates, error } = await fetchAllTemplates(supabase)
        if (error) throw error

        // For each template, load junction class masters
        const templatesWithClasses = await Promise.all(
            (templates || []).map(async template => {
                const { data: junctionData } = await fetchTemplateClasses(supabase, template.id)
                return {
                    ...template,
                    class_masters: mapJunctionToClassMasters(junctionData || []),
                }
            })
        )

        return { success: true, data: templatesWithClasses }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Create new report template
 */
export async function createTemplate(data: {
    name: string
    description?: string
    semester: 1 | 2
    class_master_ids: string[]
    academic_year_id?: string
    is_active: boolean
}): Promise<{ success: boolean; data?: ReportTemplate; error?: string }> {
    try {
        const adminClient = await createAdminClient()

        const { data: template, error } = await insertTemplate(adminClient, data)
        if (error) throw error

        if (data.class_master_ids && data.class_master_ids.length > 0) {
            const entries = buildTemplateClassEntries(template.id, data.class_master_ids)
            const { error: junctionError } = await insertTemplateClasses(adminClient, entries)
            if (junctionError) throw junctionError
        }

        revalidatePath('/rapot/templates')
        return { success: true, data: template }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Update a report template
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
        const updateData = buildTemplateUpdatePayload(data)

        const { error } = await updateTemplateById(adminClient, templateId, updateData)
        if (error) throw error

        revalidatePath('/rapot/templates')
        revalidatePath(`/rapot/templates/${templateId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Delete a report template
 */
export async function deleteTemplate(
    templateId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const adminClient = await createAdminClient()
        const { error } = await deleteTemplateById(adminClient, templateId)
        if (error) throw error

        revalidatePath('/rapot/templates')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
