'use server'

import { createClient } from '@/lib/supabase/server'
import type { MaterialCategory, MaterialType, MaterialItem, ReportSectionItem } from '../../types'
import {
    fetchMaterialCategories,
    fetchMaterialTypes,
    fetchMaterialItems,
    fetchClassMasters,
    fetchItemAvailabilityForClass,
    fetchItemsByTypeForClass,
    fetchItemsByCategoryForClass,
} from './queries'
import {
    normalizeMaterialTypes,
    normalizeMaterialItems,
    normalizeClassMasters,
    buildResolvedItemEntry,
    buildTypeGradingSingle,
    buildCategoryGradingSingle,
    expandItemsWithSemesterFilter,
    extractMaterialItemFromAvailability,
} from './logic'

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
        const { data, error } = await fetchMaterialCategories(supabase)
        if (error) throw error
        return { success: true, data: data || [] }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Get material types, optionally filtered by category
 */
export async function getMaterialTypes(categoryId?: string): Promise<{
    success: boolean
    data?: MaterialType[]
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data, error } = await fetchMaterialTypes(supabase, categoryId)
        if (error) throw error
        return { success: true, data: normalizeMaterialTypes(data || []) }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Get material items, optionally filtered by type
 */
export async function getMaterialItems(typeId?: string): Promise<{
    success: boolean
    data?: MaterialItem[]
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data, error } = await fetchMaterialItems(supabase, typeId)
        if (error) throw error
        return { success: true, data: normalizeMaterialItems(data || []) }
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
        const { data, error } = await fetchClassMasters(supabase)
        if (error) throw error
        return { success: true, data: normalizeClassMasters(data || []) }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Resolve section items based on material_level and student's class/semester
 */
export async function resolveSectionItems(
    sectionItem: ReportSectionItem,
    classMasterId: string,
    semester: 1 | 2
): Promise<{
    success: boolean
    data?: Array<{
        section_item_id: string
        material_item_id: string
        material_name: string
        is_required: boolean
    }>
    error?: string
}> {
    try {
        const supabase = await createClient()
        const results: any[] = []

        if (sectionItem.material_level === 'item') {
            if (sectionItem.material_item_id) {
                const { data } = await fetchItemAvailabilityForClass(
                    supabase, sectionItem.material_item_id, classMasterId, semester
                )
                const matItem = extractMaterialItemFromAvailability(data)
                if (matItem) {
                    results.push(buildResolvedItemEntry(sectionItem.id, matItem, sectionItem.custom_name, sectionItem.is_required))
                }
            }
        } else if (sectionItem.material_level === 'type') {
            if (sectionItem.grading_mode === 'single') {
                results.push(buildTypeGradingSingle(sectionItem))
            } else if (sectionItem.material_type_id) {
                const { data } = await fetchItemsByTypeForClass(supabase, sectionItem.material_type_id, classMasterId)
                results.push(...expandItemsWithSemesterFilter(sectionItem.id, sectionItem.is_required, data || [], semester))
            }
        } else if (sectionItem.material_level === 'category') {
            if (sectionItem.grading_mode === 'single') {
                results.push(buildCategoryGradingSingle(sectionItem))
            } else if (sectionItem.material_category_id) {
                const { data } = await fetchItemsByCategoryForClass(supabase, sectionItem.material_category_id, classMasterId)
                results.push(...expandItemsWithSemesterFilter(sectionItem.id, sectionItem.is_required, data || [], semester))
            }
        }

        return { success: true, data: results }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
