'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { getTeacherAllowedClassIds } from '@/lib/accessControlServer'
import {
    fetchClassMasterMappings,
    fetchAllClassesBasic,
    fetchClassesByIds,
    fetchClassesHierarchical,
} from './queries'
import { sortClassesByMasterOrder, attachClassMasterMappings } from './logic'
import type { Class } from '@/types/class'

export type { Class }

/**
 * Mendapatkan daftar kelas berdasarkan role user
 */
export async function getAllClasses(): Promise<Class[]> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data: profile } = await supabase
            .from('profiles')
            .select(`
        role,
        kelompok_id,
        desa_id,
        daerah_id,
        teacher_classes!left(class_id, classes(id, name))
      `)
            .eq('id', user.id)
            .single()

        if (!profile) throw new Error('User profile not found')

        if (profile.role === 'admin' || profile.role === 'superadmin') {
            const { data: classes, error } = await fetchAllClassesBasic(supabase)
            if (error) throw error

            const classIds = (classes || []).map(c => c.id)
            const classMappings = await fetchClassMasterMappings(supabase, classIds)
            const transformed = attachClassMasterMappings(classes || [], classMappings)
            return sortClassesByMasterOrder(transformed)

        } else if (profile.role === 'teacher') {
            if (profile.teacher_classes && profile.teacher_classes.length > 0) {
                // Regular teacher: filter by assigned classes
                const teacherClassIds = profile.teacher_classes
                    .map((tc: any) => tc.classes?.id || tc.class_id)
                    .filter(Boolean)

                const { data: classes, error } = await fetchClassesByIds(supabase, teacherClassIds)
                if (error) throw error

                const classIds = (classes || []).map(c => c.id)
                const classMappings = await fetchClassMasterMappings(supabase, classIds)
                const transformed = attachClassMasterMappings(classes || [], classMappings)
                return sortClassesByMasterOrder(transformed)

            } else if (profile.kelompok_id || profile.desa_id || profile.daerah_id) {
                // Teacher with hierarchical access (Guru Desa/Daerah)
                // Use adminClient to bypass RLS — hierarchical teachers don't have kelompok_id
                // so RLS on kelompok/desa tables would block regular client queries
                const adminClient = await createAdminClient()
                const { data: classes, error } = await fetchClassesHierarchical(adminClient, {
                    kelompok_id: profile.kelompok_id,
                    desa_id: profile.desa_id,
                    daerah_id: profile.daerah_id,
                })
                if (error) throw error

                // Filter by class master restriction if applicable
                const allowedClassIds = await getTeacherAllowedClassIds(user.id, profile)
                let finalClasses = classes || []
                if (allowedClassIds) {
                    finalClasses = finalClasses.filter(c => allowedClassIds.has(c.id))
                }

                const classIds = finalClasses.map(c => c.id)
                const classMappings = await fetchClassMasterMappings(supabase, classIds)
                const transformed = attachClassMasterMappings(finalClasses, classMappings)
                return sortClassesByMasterOrder(transformed)

            } else {
                return []
            }
        } else {
            const { data: classes, error } = await fetchAllClassesBasic(supabase)
            if (error) throw error

            const classIds = (classes || []).map(c => c.id)
            const classMappings = await fetchClassMasterMappings(supabase, classIds)
            const transformed = attachClassMasterMappings(classes || [], classMappings)
            return sortClassesByMasterOrder(transformed)
        }
    } catch (error) {
        handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
        throw error
    }
}
