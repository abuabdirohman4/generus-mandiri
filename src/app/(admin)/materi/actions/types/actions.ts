'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MaterialType } from '../../types'
import {
    fetchAllTypes,
    fetchItemsForType,
    fetchAssignmentsForType,
    insertType,
    updateTypeById,
    deleteTypeById,
} from './queries'
import {
    typeHasDependencies,
    mapTypeErrorMessage,
} from './logic'

/**
 * Get material types, optionally filtered by category
 */
export async function getMaterialTypes(categoryId?: string): Promise<MaterialType[]> {
    const supabase = await createClient()
    const { data, error } = await fetchAllTypes(supabase, categoryId)

    if (error) {
        console.error('Error getting material types:', error)
        throw new Error('Gagal memuat jenis materi')
    }

    return data || []
}

/**
 * Create a new material type
 */
export async function createMaterialType(data: {
    category_id: string
    name: string
    description?: string
    display_order: number
}): Promise<MaterialType> {
    const supabase = await createClient()

    const { data: type, error } = await insertType(supabase, data)

    if (error) {
        console.error('Error creating material type:', error)
        throw new Error(mapTypeErrorMessage(error.code, 'create'))
    }

    revalidatePath('/materi')
    return type
}

/**
 * Update a material type
 */
export async function updateMaterialType(
    id: string,
    data: {
        category_id: string
        name: string
        description?: string
        display_order: number
    }
): Promise<MaterialType> {
    const supabase = await createClient()

    const { data: type, error } = await updateTypeById(supabase, id, data)

    if (error) {
        console.error('Error updating material type:', error)
        throw new Error(mapTypeErrorMessage(error.code, 'update'))
    }

    revalidatePath('/materi')
    return type
}

/**
 * Delete a material type (with dependency checks)
 */
export async function deleteMaterialType(id: string): Promise<{ success: boolean }> {
    const supabase = await createClient()

    // Check deps: items using this type
    const { data: items, error: itemsCheckError } = await fetchItemsForType(supabase, id)
    if (itemsCheckError) {
        console.error('Error checking dependencies:', itemsCheckError)
        throw new Error('Gagal memeriksa dependensi')
    }

    // Check deps: assignments using this type
    const { data: assignments, error: assignmentCheckError } = await fetchAssignmentsForType(supabase, id)
    if (assignmentCheckError) {
        console.error('Error checking assignment dependencies:', assignmentCheckError)
        throw new Error('Gagal memeriksa dependensi assignment')
    }

    const depCheck = typeHasDependencies(items?.length || 0, assignments?.length || 0)
    if (depCheck.hasDeps) {
        throw new Error(depCheck.reason)
    }

    const { error } = await deleteTypeById(supabase, id)

    if (error) {
        console.error('Error deleting material type:', error)
        throw new Error('Gagal menghapus jenis materi')
    }

    revalidatePath('/materi')
    return { success: true }
}
