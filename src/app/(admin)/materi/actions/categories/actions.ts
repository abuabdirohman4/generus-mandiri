'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MaterialCategory } from '../../types'
import {
    fetchAllCategories,
    fetchTypesForCategory,
    insertCategory,
    updateCategoryById,
    deleteCategoryById,
} from './queries'
import {
    validateCategoryData,
    categoryHasDependencies,
    mapCategoryErrorMessage,
} from './logic'

/**
 * Get all material categories
 */
export async function getMaterialCategories(): Promise<MaterialCategory[]> {
    const supabase = await createClient()
    const { data, error } = await fetchAllCategories(supabase)

    if (error) {
        console.error('Error getting material categories:', error)
        throw new Error('Gagal memuat kategori materi')
    }

    return data || []
}

/**
 * Create a new material category
 */
export async function createMaterialCategory(data: {
    name: string
    description?: string
    display_order: number
}): Promise<MaterialCategory> {
    const supabase = await createClient()

    const { data: category, error } = await insertCategory(supabase, data)

    if (error) {
        console.error('Error creating material category:', error)
        throw new Error(mapCategoryErrorMessage(error.code, 'create'))
    }

    revalidatePath('/materi')
    return category
}

/**
 * Update a material category
 */
export async function updateMaterialCategory(
    id: string,
    data: {
        name: string
        description?: string
        display_order: number
    }
): Promise<MaterialCategory> {
    const supabase = await createClient()

    const { data: category, error } = await updateCategoryById(supabase, id, data)

    if (error) {
        console.error('Error updating material category:', error)
        throw new Error(mapCategoryErrorMessage(error.code, 'update'))
    }

    revalidatePath('/materi')
    return category
}

/**
 * Delete a material category (with dependency check)
 */
export async function deleteMaterialCategory(id: string): Promise<{ success: boolean }> {
    const supabase = await createClient()

    // Dependency check: any material types using this category?
    const { data: types, error: checkError } = await fetchTypesForCategory(supabase, id)

    if (checkError) {
        console.error('Error checking dependencies:', checkError)
        throw new Error('Gagal memeriksa dependensi')
    }

    if (categoryHasDependencies(types?.length || 0)) {
        throw new Error('Tidak dapat menghapus kategori. Masih ada jenis materi yang menggunakan kategori ini.')
    }

    const { error } = await deleteCategoryById(supabase, id)

    if (error) {
        console.error('Error deleting material category:', error)
        throw new Error('Gagal menghapus kategori materi')
    }

    revalidatePath('/materi')
    return { success: true }
}
