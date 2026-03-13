'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import {
    fetchTeacherClasses,
    fetchClassesForValidation,
    deleteTeacherClassAssignments,
    insertTeacherClassAssignments,
    insertTeacherClassAssignment,
} from './queries'
import {
    buildClassAssignmentMappings,
    mapTeacherClassesToResult,
    validateClassesForDesa,
    validateClassesForDaerah,
    validateClassesForKelompok,
} from './logic'

/**
 * Get class assignments for a specific teacher
 */
export async function getTeacherClasses(teacherId: string) {
    try {
        const supabase = await createClient()
        const { data, error } = await fetchTeacherClasses(supabase, teacherId)
        if (error) throw error
        return mapTeacherClassesToResult(data || [])
    } catch (error) {
        throw handleApiError(error, 'memuat data', 'Gagal memuat kelas guru')
    }
}

/**
 * Update teacher class assignments (replace all)
 */
export async function updateTeacherClasses(teacherId: string, classIds: string[]) {
    try {
        const supabase = await createClient()
        const profile = await getCurrentUserProfile()

        if (!profile || !canAccessFeature(profile, 'users')) {
            throw new Error('Anda tidak memiliki akses untuk mengubah kelas guru')
        }

        if (classIds.length > 0 && (profile.role === 'admin' || profile.role === 'superadmin')) {
            const { data: classes, error: classesError } = await fetchClassesForValidation(supabase, classIds)
            if (classesError) throw classesError

            if (profile.desa_id && !profile.kelompok_id) {
                const { valid, error } = validateClassesForDesa(classes || [], profile.desa_id)
                if (!valid) throw new Error(error)
            }

            if (profile.daerah_id && !profile.desa_id) {
                const { valid, error } = validateClassesForDaerah(classes || [], profile.daerah_id)
                if (!valid) throw new Error(error)
            }

            if (profile.kelompok_id && !profile.desa_id) {
                const { valid, error } = validateClassesForKelompok(classes || [], profile.kelompok_id)
                if (!valid) throw new Error(error)
            }
        }

        const { error: deleteError } = await deleteTeacherClassAssignments(supabase, teacherId)
        if (deleteError) throw deleteError

        if (classIds.length > 0) {
            const mappings = buildClassAssignmentMappings(teacherId, classIds)
            const { error: insertError } = await insertTeacherClassAssignments(supabase, mappings)
            if (insertError) throw insertError
        }

        revalidatePath('/users/guru')
        return { success: true }
    } catch (error) {
        throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate kelas guru')
    }
}

/**
 * Assign a teacher to a single class
 */
export async function assignTeacherToClass(teacherId: string, classId: string) {
    try {
        const supabase = await createClient()
        const { error } = await insertTeacherClassAssignment(supabase, teacherId, classId)
        if (error) throw error

        revalidatePath('/users/guru')
        return { success: true }
    } catch (error) {
        console.error('Error assigning teacher to class:', error)
        throw handleApiError(error, 'mengupdate data', 'Gagal mengassign guru ke kelas')
    }
}
