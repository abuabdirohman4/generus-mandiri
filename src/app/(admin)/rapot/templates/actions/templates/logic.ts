/**
 * Templates Logic (Layer 2)
 *
 * Pure business logic for report template operations.
 * NO 'use server' directive. No database access. No side effects.
 */

/**
 * Transform junction data to array of class masters (flattening PostgREST arrays)
 */
export function mapJunctionToClassMasters(junctionData: any[]): any[] {
    return (junctionData || [])
        .map((item: any) => {
            const cm = Array.isArray(item.class_masters) ? item.class_masters[0] : item.class_masters
            if (!cm) return null
            return {
                ...cm,
                categories: Array.isArray(cm.categories) ? cm.categories[0] || null : cm.categories || null,
            }
        })
        .filter(Boolean)
}

/**
 * Find universal templates (templates with no class associations)
 */
export function filterUniversalTemplates(templates: any[]): any[] {
    return (templates || []).filter(
        t => !t.report_template_classes || t.report_template_classes.length === 0
    )
}

/**
 * Pick the best applicable template id (specific > universal)
 */
export function pickTemplateId(
    specificTemplates: any[] | null,
    universalTemplates: any[]
): string | null {
    if (specificTemplates && specificTemplates.length > 0) {
        return specificTemplates[0].id
    }
    if (universalTemplates.length > 0) {
        return universalTemplates[0].id
    }
    return null
}

/**
 * Build update payload for template, only including provided fields
 */
export function buildTemplateUpdatePayload(data: {
    name?: string
    description?: string
    class_master_id?: string
    is_active?: boolean
}): Record<string, any> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.class_master_id !== undefined) updateData.class_master_id = data.class_master_id || null
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    return updateData
}

/**
 * Build junction table entries for template class associations
 */
export function buildTemplateClassEntries(
    templateId: string,
    classMasterIds: string[]
): Array<{ template_id: string; class_master_id: string }> {
    return classMasterIds.map(classId => ({
        template_id: templateId,
        class_master_id: classId,
    }))
}

/**
 * Extract class master id from student enrollment data (handles both array and object formats)
 */
export function extractClassMasterIdFromEnrollment(enrollment: any): string | null {
    if (!enrollment) return null

    const classesRef = enrollment.classes
    const classData = Array.isArray(classesRef) ? classesRef[0] : classesRef

    const mappingsRef = classData?.class_master_mappings
    const mapping = Array.isArray(mappingsRef) ? mappingsRef[0] : (mappingsRef as any)

    const classMasterRef = mapping?.class_master
    const classMaster = Array.isArray(classMasterRef) ? classMasterRef[0] : (classMasterRef as any)

    return classMaster?.id || null
}
