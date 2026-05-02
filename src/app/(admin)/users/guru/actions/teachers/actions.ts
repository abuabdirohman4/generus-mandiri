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
    fetchTeacherDeleteImpact,
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
import { logActivity } from '@/lib/activityLogger'

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

        // Auto-assign default activity types: PENGAJIAN and ASAD
        const { data: defaultTypes } = await supabase
            .from('activity_types')
            .select('id')
            .in('code', ['PENGAJIAN', 'ASAD'])
            .eq('is_active', true)

        if (defaultTypes && defaultTypes.length > 0) {
            await supabase
                .from('teacher_activity_types')
                .insert(defaultTypes.map((t: { id: string }) => ({
                    teacher_id: authData.user.id,
                    activity_type_id: t.id,
                })))
                // Ignore conflict — safe if types already exist
                .select()
        }

        revalidatePath('/users/guru')

        void logActivity({
            userId: (await supabase.auth.getUser()).data.user?.id || '',
            action: 'create_teacher',
            entityType: 'teacher',
            entityId: authData.user.id,
            entityLabel: data.full_name,
            pagePath: '/users/guru',
        })

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

        void logActivity({
            userId: (await supabase.auth.getUser()).data.user?.id || '',
            action: 'update_teacher',
            entityType: 'teacher',
            entityId: id,
            entityLabel: data.full_name,
            pagePath: '/users/guru',
        })

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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        const adminClient = await createAdminClient()

        // 1. Nullify NO ACTION FK references (SET NULL workaround — these columns allow NULL)
        // classes.teacher_id, meetings.teacher_id, student_material_progress.teacher_id,
        // student_reports.teacher_id, attendance_logs.recorded_by perlu di-NULL dulu
        // sebelum profiles row bisa dihapus oleh auth.admin.deleteUser
        await Promise.allSettled([
            adminClient.from('classes').update({ teacher_id: null }).eq('teacher_id', id),
            adminClient.from('meetings').update({ teacher_id: null }).eq('teacher_id', id),
            adminClient.from('student_material_progress').update({ teacher_id: null }).eq('teacher_id', id),
            adminClient.from('student_reports').update({ teacher_id: null }).eq('teacher_id', id),
            adminClient.from('attendance_logs').update({ recorded_by: null }).eq('recorded_by', id),
            adminClient.from('material_monthly_targets').update({ created_by: null }).eq('created_by', id),
        ])

        // 2. Hapus junction rows yang CASCADE (teacher_classes, teacher_class_masters, teacher_activity_types)
        // sudah punya delete_rule CASCADE di DB, tapi kita hapus eksplisit untuk keamanan
        await Promise.allSettled([
            adminClient.from('teacher_classes').delete().eq('teacher_id', id),
            adminClient.from('teacher_class_masters').delete().eq('teacher_id', id),
            adminClient.from('teacher_activity_types').delete().eq('teacher_id', id)
        ])

        // 3. Hapus user dari Supabase Auth (cascade ke profiles melalui auth trigger)
        const { error } = await adminClient.auth.admin.deleteUser(id)
        if (error) throw error

        revalidatePath('/users/guru')

        void logActivity({
            userId: user?.id ?? '',
            action: 'delete_teacher',
            entityType: 'teacher',
            entityId: id,
            pagePath: '/users/guru',
        })

        return { success: true }
    } catch (error) {
        console.error('Error deleting teacher:', error)
        throw handleApiError(error, 'menghapus data', 'Gagal menghapus guru')
    }
}

/**
 * Get impact summary before deleting a teacher
 */
export async function getTeacherDeleteImpact(id: string) {
    try {
        const supabase = await createAdminClient()
        return await fetchTeacherDeleteImpact(supabase, id)
    } catch (error) {
        console.error('Error fetching teacher delete impact:', error)
        throw handleApiError(error, 'memuat data', 'Gagal memuat dampak penghapusan guru')
    }
}

/**
 * Reset a teacher's password
 */
export async function resetTeacherPassword(id: string, newPassword: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const adminClient = await createAdminClient()
        const { error } = await adminClient.auth.admin.updateUserById(id, { password: newPassword })
        if (error) throw error

        void logActivity({
            userId: user?.id ?? '',
            action: 'reset_teacher_password',
            entityType: 'teacher',
            entityId: id,
            pagePath: '/users/guru',
        })

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
        const adminSupabase = await createAdminClient()
        const profile = await getCurrentUserProfile()
        const filter = profile ? getDataFilter(profile) : null
        const isAdminKelompok = profile?.role === 'admin' && !!profile?.kelompok_id

        const { data, error } = await fetchTeachers(adminSupabase, filter || undefined)
        if (error) throw error

        let classesMap = new Map<string, any>()

        if (isAdminKelompok && data && data.length > 0) {
            const allClassIds = extractClassIds(data)

            if (allClassIds.size > 0) {
                try {
                    const { data: classesData, error: classesError } = await fetchClassesByIdsFlat(
                        adminSupabase,
                        Array.from(allClassIds)
                    )

                    if (classesError) {
                        // Fallback: use adminSupabase anyway as it's already there
                        const { data: fallbackData, error: fallbackError } = await fetchClassesByIdsFlat(
                            adminSupabase,
                            Array.from(allClassIds)
                        )
                        if (!fallbackError && fallbackData && fallbackData.length > 0) {
                            const kelompokIds = [...new Set(fallbackData.map((c: any) => c.kelompok_id).filter(Boolean))]
                            let kelompokMap = new Map<string, any>()
                            if (kelompokIds.length > 0) {
                                const { data: kelompokData, error: kelError } = await fetchKelompokByIds(adminSupabase, kelompokIds as string[])
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
                    // Final fallback
                    const { data: fallbackData, error: fallbackError } = await fetchClassesByIdsFlat(
                        adminSupabase,
                        Array.from(allClassIds)
                    )
                    if (!fallbackError && fallbackData && fallbackData.length > 0) {
                        const kelompokIds = [...new Set(fallbackData.map((c: any) => c.kelompok_id).filter(Boolean))]
                        let kelompokMap = new Map<string, any>()
                        if (kelompokIds.length > 0) {
                            const { data: kelompokData, error: kelError } = await fetchKelompokByIds(adminSupabase, kelompokIds as string[])
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
                    adminSupabase,
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

        void logActivity({
            userId: (await supabase.auth.getUser()).data.user?.id || '',
            action: 'assign_class_teacher',
            entityType: 'teacher',
            entityId: teacherId,
            metadata: { kelompok_id: kelompokId },
            pagePath: '/users/guru',
        })

        return { success: true }
    } catch (error) {
        console.error('Error assigning teacher to kelompok:', error)
        throw handleApiError(error, 'mengupdate data', 'Gagal mengassign guru ke kelompok')
    }
}
