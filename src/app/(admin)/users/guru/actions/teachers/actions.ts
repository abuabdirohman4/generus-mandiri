'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import type { TeacherData } from '../types'
import {
    fetchTeachers,
    insertTeacherProfile,
    updateTeacherProfile,
    updateTeacherKelompok,
    fetchClassesByIds,
    fetchClassesByIdsFlat,
    fetchKelompokByIds,
} from './queries'
import {
    validateCreateTeacherData,
    validateUpdateTeacherData,
    extractClassIds,
    buildClassesMap,
    buildClassesMapWithKelompok,
    buildKelompokMap,
    transformTeacher,
} from './logic'

export type { TeacherData }

/**
 * Create a new teacher
 */
export async function createTeacher(data: TeacherData) {
    try {
        validateCreateTeacherData(data)

        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: data.email,
            password: data.password!,
            email_confirm: true,
            user_metadata: { username: data.username, full_name: data.full_name },
        })
        if (authError) throw authError
        if (!authData.user) throw new Error('Failed to create user')

        const { error: profileError } = await insertTeacherProfile(supabase, authData.user.id, data)
        if (profileError) {
            await adminClient.auth.admin.deleteUser(authData.user.id)
            throw profileError
        }

        revalidatePath('/users/guru')
        return {
            success: true,
            teacher: {
                id: authData.user.id,
                username: data.username,
                full_name: data.full_name,
                email: data.email,
                role: 'teacher',
                daerah_id: data.daerah_id,
                desa_id: data.desa_id,
                kelompok_id: data.kelompok_id,
            },
        }
    } catch (error) {
        console.error('Error creating teacher:', error)
        throw handleApiError(error, 'menyimpan data', 'Gagal membuat guru')
    }
}

/**
 * Update an existing teacher
 */
export async function updateTeacher(id: string, data: TeacherData) {
    try {
        validateUpdateTeacherData(data)

        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const { error: profileError } = await updateTeacherProfile(supabase, id, data)
        if (profileError) throw profileError

        if (data.password) {
            const { error: passwordError } = await adminClient.auth.admin.updateUserById(id, {
                password: data.password,
            })
            if (passwordError) throw passwordError
        }

        const { error: metadataError } = await adminClient.auth.admin.updateUserById(id, {
            user_metadata: { username: data.username, full_name: data.full_name },
        })
        if (metadataError) throw metadataError

        revalidatePath('/users/guru')
        return { success: true }
    } catch (error) {
        console.error('Error updating teacher:', error)
        throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate guru')
    }
}

/**
 * Delete a teacher
 */
export async function deleteTeacher(id: string) {
    try {
        const adminClient = await createAdminClient()
        const { error } = await adminClient.auth.admin.deleteUser(id)
        if (error) throw error

        revalidatePath('/users/guru')
        return { success: true }
    } catch (error) {
        console.error('Error deleting teacher:', error)
        throw handleApiError(error, 'menghapus data', 'Gagal menghapus guru')
    }
}

/**
 * Reset a teacher's password
 */
export async function resetTeacherPassword(id: string, newPassword: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.admin.updateUserById(id, { password: newPassword })
        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error resetting teacher password:', error)
        throw handleApiError(error, 'reset', 'Gagal mereset password guru')
    }
}

/**
 * Get all teachers, filtered based on current user profile
 */
export async function getAllTeachers() {
    try {
        const supabase = await createClient()
        const profile = await getCurrentUserProfile()
        const filter = profile ? getDataFilter(profile) : null
        const isAdminKelompok = profile?.role === 'admin' && !!profile?.kelompok_id

        const { data, error } = await fetchTeachers(supabase, filter || undefined)
        if (error) throw error

        let classesMap = new Map<string, any>()

        if (isAdminKelompok && data && data.length > 0) {
            const allClassIds = extractClassIds(data)

            if (allClassIds.size > 0) {
                try {
                    const adminSupabase = await createAdminClient()

                    const { data: classesData, error: classesError } = await fetchClassesByIdsFlat(
                        adminSupabase,
                        Array.from(allClassIds)
                    )

                    if (classesError) {
                        // Fallback: regular client
                        const { data: fallbackData, error: fallbackError } = await fetchClassesByIdsFlat(
                            supabase,
                            Array.from(allClassIds)
                        )
                        if (!fallbackError && fallbackData && fallbackData.length > 0) {
                            const kelompokIds = [...new Set(fallbackData.map((c: any) => c.kelompok_id).filter(Boolean))]
                            let kelompokMap = new Map<string, any>()
                            if (kelompokIds.length > 0) {
                                const { data: kelompokData, error: kelError } = await fetchKelompokByIds(supabase, kelompokIds as string[])
                                if (!kelError && kelompokData) kelompokMap = buildKelompokMap(kelompokData)
                            }
                            classesMap = buildClassesMap(fallbackData, kelompokMap)
                        }
                    } else if (classesData && classesData.length > 0) {
                        const kelompokIds = [...new Set(classesData.map((c: any) => c.kelompok_id).filter(Boolean))]
                        let kelompokMap = new Map<string, any>()
                        if (kelompokIds.length > 0) {
                            const { data: kelompokData, error: kelError } = await adminSupabase
                                .from('kelompok')
                                .select('id, name')
                                .in('id', kelompokIds)
                            if (!kelError && kelompokData) kelompokMap = buildKelompokMap(kelompokData)
                        }
                        classesMap = buildClassesMap(classesData, kelompokMap)
                    }
                } catch {
                    // Fallback to regular client
                    const { data: fallbackData, error: fallbackError } = await fetchClassesByIdsFlat(
                        supabase,
                        Array.from(allClassIds)
                    )
                    if (!fallbackError && fallbackData && fallbackData.length > 0) {
                        const kelompokIds = [...new Set(fallbackData.map((c: any) => c.kelompok_id).filter(Boolean))]
                        let kelompokMap = new Map<string, any>()
                        if (kelompokIds.length > 0) {
                            const { data: kelompokData, error: kelError } = await fetchKelompokByIds(supabase, kelompokIds as string[])
                            if (!kelError && kelompokData) kelompokMap = buildKelompokMap(kelompokData)
                        }
                        classesMap = buildClassesMap(fallbackData, kelompokMap)
                    }
                }
            }
        }

        if (!isAdminKelompok && data && data.length > 0) {
            const allClassIds = extractClassIds(data)
            if (allClassIds.size > 0) {
                const { data: fetchedClasses, error: classesError } = await fetchClassesByIds(
                    supabase,
                    Array.from(allClassIds)
                )
                if (!classesError && fetchedClasses) {
                    classesMap = buildClassesMapWithKelompok(fetchedClasses)
                }
            }
        }

        return (data || []).map(teacher => transformTeacher(teacher, classesMap))
    } catch (error) {
        console.error('Error fetching teachers:', error)
        throw handleApiError(error, 'memuat data', 'Gagal mengambil data guru')
    }
}

/**
 * Assign a teacher to a kelompok
 */
export async function assignTeacherToKelompok(teacherId: string, kelompokId: string) {
    try {
        const supabase = await createClient()
        const { error } = await updateTeacherKelompok(supabase, teacherId, kelompokId)
        if (error) throw error

        revalidatePath('/users/guru')
        return { success: true }
    } catch (error) {
        console.error('Error assigning teacher to kelompok:', error)
        throw handleApiError(error, 'mengupdate data', 'Gagal mengassign guru ke kelompok')
    }
}
