'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile, canManageMaterials } from '@/lib/accessControlServer'
import type { MaterialItem, DayMaterialAssignment, ClassMaster } from '../../types'
import {
    fetchAvailableClassMasters,
    fetchAllClassMastersWithCategory,
    fetchClassMastersWithMaterialItems,
    fetchItemsByType,
    fetchAllItems,
    fetchItemById,
    fetchAllItemsWithTypes,
    fetchItemsForClass,
    fetchItemsForClassAndType,
    fetchClassMappingsBatch,
    fetchDayItemsForItem,
    insertItem,
    updateItemById,
    deleteItemById,
    fetchItemClassMappings,
    deleteItemClassMappings,
    deleteItemClassMappingsBulk,
    insertItemClassMappings,
    upsertItemClassMappings,
    upsertDayAssignment,
    deleteDayAssignmentItems,
    insertDayAssignmentItems,
    fetchDayAssignments,
    deleteDayAssignmentById,
} from './queries'
import {
    filterCaberawitClasses,
    stripClassMasterJoinArtifact,
    deduplicateMaterialItemsFromJunction,
    mapClassMappingsToItems,
    extractClassMastersFromItems,
    sortAssignmentItems,
    buildDayItemsPayload,
    buildBulkMappingsPayload,
    itemHasDependencies,
    mapItemErrorMessage,
} from './logic'

// ─── Class Masters ────────────────────────────────────────────────────────────

/**
 * Get available class masters for assignment selection
 */
export async function getAvailableClassMasters() {
    const supabase = await createClient()
    const { data, error } = await fetchAvailableClassMasters(supabase)

    if (error) {
        console.error('Error getting class masters:', error)
        throw new Error('Gagal memuat daftar kelas')
    }

    return data || []
}

/**
 * Get all classes (filtered to CABERAWIT/PAUD category only)
 */
export async function getAllClasses(): Promise<ClassMaster[]> {
    const supabase = await createClient()
    const { data, error } = await fetchAllClassMastersWithCategory(supabase)

    if (error) {
        console.error('Error fetching classes:', error)
        return []
    }

    return filterCaberawitClasses(data || [])
}

/**
 * Get all classes that have at least one material item (for sidebar)
 */
export async function getClassesWithMaterialItems(): Promise<ClassMaster[]> {
    const supabase = await createClient()
    const { data, error } = await fetchClassMastersWithMaterialItems(supabase)

    if (error) {
        console.error('Error getting classes with material items:', error)
        throw new Error('Gagal memuat kelas dengan item materi')
    }

    return stripClassMasterJoinArtifact(data || [])
}

// ─── Material Items ───────────────────────────────────────────────────────────

/**
 * Get material items for a specific material type
 */
export async function getMaterialItems(materialTypeId: string): Promise<MaterialItem[]> {
    const supabase = await createClient()
    const { data, error } = await fetchItemsByType(supabase, materialTypeId)

    if (error) {
        console.error('Error getting material items:', error)
        throw new Error('Gagal memuat item materi')
    }

    return data || []
}

/**
 * Get all material items (master data view)
 */
export async function getAllMaterialItems(): Promise<MaterialItem[]> {
    const supabase = await createClient()
    const { data, error } = await fetchAllItems(supabase)

    if (error) {
        console.error('Error getting all material items:', error)
        throw new Error('Gagal memuat semua item materi')
    }

    return data || []
}

/**
 * Get a single material item by id (with class mappings)
 */
export async function getMaterialItem(id: string): Promise<MaterialItem | null> {
    const supabase = await createClient()

    // 1. Fetch item with type
    const { data: itemData, error: itemError } = await fetchItemById(supabase, id)
    if (itemError) {
        console.error('Error getting material item:', itemError)
        return null
    }

    // 2. Fetch class mappings
    const { data: mappingsData, error: mappingsError } = await fetchItemClassMappings(supabase, id)
    if (mappingsError) {
        console.error('Error getting class mappings:', mappingsError)
        // Continue without mappings if error
    }

    // 3. Map classes + semester
    const classes = (mappingsData || [])
        .map((m: any) => ({ ...m.class_master, semester: m.semester }))
        .filter((cm: any) => cm)

    return { ...itemData, classes }
}

/**
 * Get material items for a specific class
 */
export async function getMaterialItemsByClass(classMasterId: string): Promise<MaterialItem[]> {
    const supabase = await createClient()
    const { data, error } = await fetchItemsForClass(supabase, classMasterId)

    if (error) {
        console.error('Error getting material items by class:', error)
        throw new Error('Gagal memuat item materi per kelas')
    }

    return deduplicateMaterialItemsFromJunction(data || [])
}

/**
 * Get material items for a specific class and material type
 */
export async function getMaterialItemsByClassAndType(
    classMasterId: string,
    materialTypeId: string
): Promise<MaterialItem[]> {
    const supabase = await createClient()
    const { data, error } = await fetchItemsForClassAndType(supabase, classMasterId, materialTypeId)

    if (error) {
        console.error('Error getting material items by class and type:', error)
        throw new Error('Gagal memuat item materi per kelas dan jenis')
    }

    return extractClassMastersFromItems(data || [])
}

/**
 * Get all material items with class mappings (batch fetching to bypass 1000-row limit)
 */
export async function getMaterialItemsWithClassMappings(): Promise<MaterialItem[]> {
    const supabase = await createClient()

    // 1. Fetch all items
    const { data: itemsData, error: itemsError } = await fetchAllItemsWithTypes(supabase)
    if (itemsError) {
        console.error('Error getting material items:', itemsError)
        throw new Error('Gagal memuat item materi')
    }

    // 2. Batch fetch class mappings
    let allMappingsData: any[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
        const { data: batchData, error: batchError } = await fetchClassMappingsBatch(supabase, offset, batchSize)
        if (batchError) {
            console.error('Error getting class mappings batch:', batchError)
            throw new Error('Gagal memuat mapping kelas')
        }

        if (batchData && batchData.length > 0) {
            allMappingsData = [...allMappingsData, ...batchData]
            offset += batchSize
            hasMore = batchData.length === batchSize
        } else {
            hasMore = false
        }
    }

    return mapClassMappingsToItems(itemsData || [], allMappingsData)
}

/**
 * Create a new material item (requires canManageMaterials permission)
 */
export async function createMaterialItem(data: {
    material_type_id: string
    name: string
    description?: string
    content?: string
}): Promise<MaterialItem> {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized: Material management access required')

    const supabase = await createClient()
    const { data: item, error } = await insertItem(supabase, data)

    if (error) {
        console.error('Error creating material item:', error)
        throw new Error(mapItemErrorMessage(error.code, 'create'))
    }

    revalidatePath('/materi')
    return item
}

/**
 * Update a material item (requires canManageMaterials permission)
 */
export async function updateMaterialItem(
    id: string,
    data: {
        material_type_id: string
        name: string
        description?: string
        content?: string
    }
): Promise<MaterialItem> {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized: Material management access required')

    const supabase = await createClient()
    const { data: item, error } = await updateItemById(supabase, id, data)

    if (error) {
        console.error('Error updating material item:', error)
        if (error.code === '23505') throw new Error('Nama item materi sudah digunakan untuk jenis materi ini')
        if (error.code === 'PGRST116') throw new Error('Item materi tidak ditemukan setelah update')
        throw new Error('Gagal memperbarui item materi')
    }

    if (!item) throw new Error('Item materi tidak ditemukan setelah update')

    revalidatePath('/materi')
    return item
}

/**
 * Delete a material item (requires canManageMaterials + dependency check)
 */
export async function deleteMaterialItem(id: string): Promise<{ success: boolean }> {
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Not authenticated')
    if (!canManageMaterials(profile)) throw new Error('Unauthorized: Material management access required')

    const supabase = await createClient()

    // Dependency check
    const { data: dayItems, error: checkError } = await fetchDayItemsForItem(supabase, id)
    if (checkError) {
        console.error('Error checking dependencies:', checkError)
        throw new Error('Gagal memeriksa dependensi')
    }

    if (itemHasDependencies(dayItems?.length || 0)) {
        throw new Error('Tidak dapat menghapus item. Item masih digunakan dalam assignment materi.')
    }

    const { error } = await deleteItemById(supabase, id)
    if (error) {
        console.error('Error deleting material item:', error)
        throw new Error('Gagal menghapus item materi')
    }

    revalidatePath('/materi')
    return { success: true }
}

// ─── Class Mappings ───────────────────────────────────────────────────────────

/**
 * Get class mappings for a material item
 */
export async function getMaterialItemClassMappings(materialItemId: string) {
    const supabase = await createClient()
    const { data, error } = await fetchItemClassMappings(supabase, materialItemId)

    if (error) {
        console.error('Error fetching class mappings:', error)
        throw new Error('Gagal memuat mapping kelas')
    }

    return data || []
}

/**
 * Update class mappings for a material item (replaces all existing mappings)
 */
export async function updateMaterialItemClassMappings(
    materialItemId: string,
    mappings: Array<{ class_master_id: string; semester: number | null }>
) {
    const supabase = await createClient()

    // Delete existing
    const { error: deleteError } = await deleteItemClassMappings(supabase, materialItemId)
    if (deleteError) {
        console.error('Error deleting old mappings:', deleteError)
        throw new Error('Gagal menghapus mapping lama')
    }

    // Insert new ones if any
    if (mappings.length > 0) {
        const payload = mappings.map(m => ({
            material_item_id: materialItemId,
            class_master_id: m.class_master_id,
            semester: m.semester
        }))

        const { error: insertError } = await insertItemClassMappings(supabase, payload)
        if (insertError) {
            console.error('Error inserting new mappings:', insertError)
            throw new Error('Gagal menyimpan mapping baru')
        }
    }

    revalidatePath('/materi')
    return { success: true }
}

/**
 * Bulk update class mappings for multiple items
 */
export async function bulkUpdateMaterialMapping(
    itemIds: string[],
    mappings: { class_master_id: string; semester: number | null }[],
    mode: 'replace' | 'add'
) {
    const supabase = await createClient()

    try {
        // Delete existing if replace mode
        if (mode === 'replace') {
            const { error: deleteError } = await deleteItemClassMappingsBulk(supabase, itemIds)
            if (deleteError) {
                console.error('Error deleting existing mappings:', deleteError)
                throw new Error('Gagal menghapus mapping lama')
            }
        }

        const newMappings = buildBulkMappingsPayload(itemIds, mappings)

        if (newMappings.length === 0) {
            revalidatePath('/materi')
            return { success: true }
        }

        const { error: insertError } = await upsertItemClassMappings(supabase, newMappings)
        if (insertError) {
            console.error('Error inserting bulk mappings:', insertError)
            throw new Error('Gagal menyimpan mapping baru')
        }

        revalidatePath('/materi')
        return { success: true }
    } catch (error) {
        console.error('Bulk update error:', error)
        throw error
    }
}

// ─── Day Assignments ──────────────────────────────────────────────────────────

/**
 * Save (upsert) a day material assignment with items
 */
export async function saveDayMaterialAssignment(data: {
    class_master_id: string
    semester: number
    month: number
    week: number
    day_of_week: number
    material_type_id: string
    notes?: string
    items?: Array<{
        material_item_id: string
        display_order: number
        custom_content?: string
    }>
}) {
    const supabase = await createClient()

    try {
        // Upsert assignment
        const { data: assignment, error: assignmentError } = await upsertDayAssignment(supabase, data)
        if (assignmentError) {
            console.error('Error saving assignment:', assignmentError)
            throw new Error('Gagal menyimpan assignment materi')
        }

        // Delete existing items for this assignment
        await deleteDayAssignmentItems(supabase, assignment.id)

        // Insert new items if provided
        if (data.items && data.items.length > 0) {
            const itemsPayload = buildDayItemsPayload(assignment.id, data.items)
            const { error: itemsError } = await insertDayAssignmentItems(supabase, itemsPayload)
            if (itemsError) {
                console.error('Error saving items:', itemsError)
                throw new Error('Gagal menyimpan item materi')
            }
        }

        revalidatePath('/materi')
        return { success: true, assignment_id: assignment.id }
    } catch (error) {
        console.error('Error in saveDayMaterialAssignment:', error)
        throw error
    }
}

/**
 * Get day material assignments for a specific day
 */
export async function getDayMaterialAssignments(params: {
    class_master_id: string
    semester: number
    month: number
    week: number
    day_of_week: number
}): Promise<DayMaterialAssignment[]> {
    const supabase = await createClient()
    const { data, error } = await fetchDayAssignments(supabase, params)

    if (error) {
        console.error('Error getting day material assignments:', error)
        throw new Error('Gagal memuat assignment materi')
    }

    return sortAssignmentItems(data || [])
}

/**
 * Delete a day material assignment
 */
export async function deleteDayMaterialAssignment(assignmentId: string) {
    const supabase = await createClient()
    const { error } = await deleteDayAssignmentById(supabase, assignmentId)

    if (error) {
        console.error('Error deleting assignment:', error)
        throw new Error('Gagal menghapus assignment materi')
    }

    revalidatePath('/materi')
    return { success: true }
}
