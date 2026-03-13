/**
 * Items Logic (Layer 2)
 *
 * Pure business logic for material items, class mappings, and day assignments.
 * NO 'use server' directive. No database access. No side effects.
 */

import type { MaterialItem, ClassMaster } from '../../types'

// ─── Class Master Transformations ─────────────────────────────────────────────

/**
 * Filter class masters to only CABERAWIT and PAUD categories
 */
export function filterCaberawitClasses(classes: any[]): ClassMaster[] {
    return classes
        .filter((cls: any) => {
            const category = Array.isArray(cls.category) ? cls.category[0] : cls.category
            const categoryCode = category?.code?.toUpperCase()
            return categoryCode === 'CABERAWIT' || categoryCode === 'PAUD'
        })
        .map((cls: any) => ({
            id: cls.id,
            name: cls.name,
            category: Array.isArray(cls.category) ? cls.category[0] : cls.category
        }))
}

/**
 * Strip material_item_classes join artifact from class master data
 */
export function stripClassMasterJoinArtifact(data: any[]): ClassMaster[] {
    return data.map((item: any) => {
        const { material_item_classes, ...classMaster } = item
        return classMaster
    })
}

// ─── Item Transformations ─────────────────────────────────────────────────────

/**
 * Extract and deduplicate material items from class junction table result.
 * Same item can appear multiple times if mapped to multiple classes.
 */
export function deduplicateMaterialItemsFromJunction(data: any[]): MaterialItem[] {
    const items = data
        .map((mic: any) => ({
            ...mic.material_item,
            classes: mic.class_master ? [mic.class_master] : []
        }))
        .filter((item: any) => item && item.id)

    const uniqueItems = new Map<string, MaterialItem>()
    items.forEach((item: any) => {
        if (!uniqueItems.has(item.id)) {
            uniqueItems.set(item.id, item)
        } else {
            const existing = uniqueItems.get(item.id)!
            if (existing.classes && item.classes) {
                existing.classes = [...(existing.classes || []), ...item.classes]
            }
        }
    })

    return Array.from(uniqueItems.values())
}

/**
 * Map class mappings batch data to items (joining separately fetched data)
 */
export function mapClassMappingsToItems(itemsData: any[], mappingsData: any[]): MaterialItem[] {
    return itemsData.map((item: any) => {
        const itemMappings = mappingsData.filter((m: any) => m.material_item_id === item.id) || []
        const classes = itemMappings
            .map((m: any) => ({
                ...m.class_master,
                semester: m.semester
            }))
            .filter((cm: any) => cm)

        return { ...item, classes }
    })
}

/**
 * Transform items/class junction for class+type filtered results
 */
export function extractClassMastersFromItems(data: any[]): MaterialItem[] {
    return data.map((item: any) => ({
        ...item,
        classes: item.material_item_classes?.map((mic: any) => mic.class_master).filter((cm: any) => cm) || []
    }))
}

// ─── Day Assignment Transformations ───────────────────────────────────────────

/**
 * Sort assignment items by display_order
 */
export function sortAssignmentItems(assignments: any[]): any[] {
    return assignments.map((assignment: any) => ({
        ...assignment,
        items: assignment.items?.sort((a: any, b: any) => a.display_order - b.display_order) || []
    }))
}

/**
 * Build day material items payload for insertion
 */
export function buildDayItemsPayload(
    assignmentId: string,
    items: Array<{
        material_item_id: string
        display_order: number
        custom_content?: string
    }>
) {
    return items.map(item => ({
        assignment_id: assignmentId,
        material_item_id: item.material_item_id,
        display_order: item.display_order,
        custom_content: item.custom_content || null,
    }))
}

/**
 * Build bulk class mappings payload for upsert
 */
export function buildBulkMappingsPayload(
    itemIds: string[],
    mappings: { class_master_id: string; semester: number | null }[]
) {
    return itemIds.flatMap(itemId =>
        mappings.map(m => ({
            material_item_id: itemId,
            class_master_id: m.class_master_id,
            semester: m.semester
        }))
    )
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Check if an item has dependent day_material_items (cannot delete)
 */
export function itemHasDependencies(dayItemsCount: number): boolean {
    return dayItemsCount > 0
}

/**
 * Map database error code to user-friendly message for items
 */
export function mapItemErrorMessage(errorCode: string, operation: 'create' | 'update'): string {
    if (errorCode === '23505') {
        return 'Nama item materi sudah digunakan untuk jenis materi ini'
    }
    return operation === 'create'
        ? 'Gagal membuat item materi'
        : 'Gagal memperbarui item materi'
}
