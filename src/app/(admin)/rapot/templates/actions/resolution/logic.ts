/**
 * Resolution Logic (Layer 2)
 *
 * Pure business logic for material data transformations and
 * section item resolution.
 * NO 'use server' directive. No database access. No side effects.
 */

import type { ReportSectionItem } from '../../types'

// ─── Material Data Transformations ───────────────────────────────────────────

/**
 * Transform material types: take first element from PostgREST array relations
 */
export function normalizeMaterialTypes(types: any[]): any[] {
    return (types || []).map((type: any) => ({
        ...type,
        category: Array.isArray(type.material_categories) ? type.material_categories[0] || null : type.material_categories || null,
    }))
}

/**
 * Transform material items: take first element from PostgREST array relations
 */
export function normalizeMaterialItems(items: any[]): any[] {
    return (items || []).map((item: any) => ({
        ...item,
        type: Array.isArray(item.material_types) ? item.material_types[0] || null : item.material_types || null,
    }))
}

/**
 * Transform class masters: flatten single-element category array
 */
export function normalizeClassMasters(classMasters: any[]): any[] {
    return (classMasters || []).map((cm: any) => ({
        ...cm,
        categories: Array.isArray(cm.categories) ? cm.categories[0] || null : cm.categories || null,
    }))
}

// ─── Section Item Resolution ──────────────────────────────────────────────────

/**
 * Build resolved item entry from a single material item for 'item' level
 */
export function buildResolvedItemEntry(
    sectionItemId: string,
    matItem: { id: string; name: string },
    customName: string | null | undefined,
    isRequired: boolean
): any {
    return {
        section_item_id: sectionItemId,
        material_item_id: matItem.id,
        material_name: customName || matItem.name,
        is_required: isRequired,
    }
}

/**
 * Build single-grading entry for 'type' level with grading_mode='single'
 */
export function buildTypeGradingSingle(sectionItem: ReportSectionItem): any {
    const typeName = Array.isArray(sectionItem.material_type)
        ? (sectionItem.material_type as any)[0]?.name
        : sectionItem.material_type?.name
    const categoryName = Array.isArray(sectionItem.material_type)
        ? (sectionItem.material_type as any)[0]?.category?.name
        : sectionItem.material_type?.category?.name

    return {
        section_item_id: sectionItem.id,
        material_item_id: null,
        material_name: sectionItem.custom_name || typeName,
        type_name: typeName,
        category_name: categoryName,
        is_required: sectionItem.is_required,
    }
}

/**
 * Build single-grading entry for 'category' level with grading_mode='single'
 */
export function buildCategoryGradingSingle(sectionItem: ReportSectionItem): any {
    const catName = Array.isArray(sectionItem.material_category)
        ? (sectionItem.material_category as any)[0]?.name
        : sectionItem.material_category?.name

    return {
        section_item_id: sectionItem.id,
        material_item_id: null,
        material_name: sectionItem.custom_name || catName,
        type_name: catName,
        category_name: catName,
        is_required: sectionItem.is_required,
    }
}

/**
 * Filter material items by semester (keep items with matching semester or null semester)
 * and map to resolved result format
 */
export function expandItemsWithSemesterFilter(
    sectionItemId: string,
    isRequired: boolean,
    items: any[],
    semester: number
): any[] {
    const results: any[] = []

    items.forEach((item: any) => {
        const itemClasses = item.material_item_classes || []
        const isValid = itemClasses.some(
            (ic: any) => ic.semester === semester || ic.semester === null
        )

        if (isValid) {
            const typeName = Array.isArray(item.material_types)
                ? item.material_types[0]?.name
                : item.material_types?.name
            const categoryName = Array.isArray(item.material_types)
                ? item.material_types[0]?.category?.name
                : item.material_types?.category?.name

            results.push({
                section_item_id: sectionItemId,
                material_item_id: item.id,
                material_name: item.name,
                type_name: typeName,
                category_name: categoryName,
                is_required: isRequired,
            })
        }
    })

    return results
}

/**
 * Extract material item from item-level availability result
 */
export function extractMaterialItemFromAvailability(data: any): { id: string; name: string } | null {
    if (!data) return null
    const matItem = Array.isArray(data.material_items)
        ? data.material_items[0]
        : (data.material_items as any)
    return matItem || null
}
