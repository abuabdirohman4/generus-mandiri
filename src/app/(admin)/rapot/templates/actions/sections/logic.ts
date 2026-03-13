/**
 * Sections Logic (Layer 2)
 *
 * Pure business logic for report sections and section items.
 * NO 'use server' directive. No database access. No side effects.
 */

/**
 * Transform section items to normalize PostgREST foreign key relations
 */
export function normalizeSectionItems(items: any[]): any[] {
    return (items || []).map((item: any) => ({
        ...item,
        material_category: item.material_category || null,
        material_type: item.material_type || null,
        material_item: item.material_item || null,
    }))
}

/**
 * Build update payload for section, only including provided fields
 */
export function buildSectionUpdatePayload(data: {
    name?: string
    description?: string
    grading_format?: string
    display_order?: number
    is_active?: boolean
}): Record<string, any> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.grading_format !== undefined) updateData.grading_format = data.grading_format
    if (data.display_order !== undefined) updateData.display_order = data.display_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    return updateData
}

/**
 * Validate that a section has the required fields for creation
 */
export function validateSectionData(data: {
    template_id: string
    name: string
    grading_format: string
    display_order: number
}): { ok: boolean; error?: string } {
    if (!data.template_id) return { ok: false, error: 'Template ID wajib diisi' }
    if (!data.name || data.name.trim().length === 0) return { ok: false, error: 'Nama seksi wajib diisi' }
    if (!data.grading_format) return { ok: false, error: 'Format penilaian wajib dipilih' }
    if (data.display_order < 0) return { ok: false, error: 'Urutan tampil tidak boleh negatif' }
    return { ok: true }
}

/**
 * Validate section item data
 */
export function validateSectionItemData(data: {
    section_id: string
    material_level: string
    display_order: number
}): { ok: boolean; error?: string } {
    if (!data.section_id) return { ok: false, error: 'Section ID wajib diisi' }
    if (!data.material_level) return { ok: false, error: 'Level material wajib dipilih' }
    if (!['category', 'type', 'item'].includes(data.material_level)) {
        return { ok: false, error: 'Level material tidak valid' }
    }
    if (data.display_order < 0) return { ok: false, error: 'Urutan tampil tidak boleh negatif' }
    return { ok: true }
}
