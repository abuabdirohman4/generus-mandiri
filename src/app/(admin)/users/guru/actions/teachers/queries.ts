/**
 * Teachers Queries (Layer 1)
 *
 * Database queries for teacher (guru) operations.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TeacherData } from '../types'

/**
 * Fetch all teachers with role='teacher', filtered by profile scope
 */
export async function fetchTeachers(supabase: SupabaseClient, filter?: {
    kelompok_id?: string
    desa_id?: string
    daerah_id?: string
}) {
    let query = supabase
        .from('profiles')
        .select(`
      *,
      daerah:daerah_id(name),
      desa:desa_id(name),
      kelompok:kelompok_id(name),
      teacher_classes(
        class_id
      ),
      teacher_class_masters(
        class_master_id,
        class_masters(name)
      )
    `)
        .eq('role', 'teacher')
        .order('username')

    if (filter?.kelompok_id) {
        query = query.eq('kelompok_id', filter.kelompok_id)
    } else if (filter?.desa_id) {
        query = query.eq('desa_id', filter.desa_id)
    } else if (filter?.daerah_id) {
        query = query.eq('daerah_id', filter.daerah_id)
    }

    return await query
}

/**
 * Insert a new teacher profile
 */
export async function insertTeacherProfile(
    supabase: SupabaseClient,
    userId: string,
    data: TeacherData
) {
    return await supabase
        .from('profiles')
        .insert([{
            id: userId,
            username: data.username,
            full_name: data.full_name,
            email: data.email,
            role: 'teacher',
            daerah_id: data.daerah_id,
            desa_id: data.desa_id || null,
            kelompok_id: data.kelompok_id,
            permissions: data.permissions || {
                can_archive_students: false,
                can_transfer_students: false,
                can_soft_delete_students: false,
                can_hard_delete_students: false,
            },
        }])
}

/**
 * Update a teacher profile
 */
export async function updateTeacherProfile(supabase: SupabaseClient, id: string, data: TeacherData) {
    return await supabase
        .from('profiles')
        .update({
            username: data.username,
            full_name: data.full_name,
            email: data.email,
            daerah_id: data.daerah_id,
            desa_id: data.desa_id || null,
            kelompok_id: data.kelompok_id,
            permissions: data.permissions || {
                can_archive_students: false,
                can_transfer_students: false,
                can_soft_delete_students: false,
                can_hard_delete_students: false,
            },
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
}

/**
 * Assign a teacher to a kelompok (update profile)
 */
export async function updateTeacherKelompok(supabase: SupabaseClient, teacherId: string, kelompokId: string) {
    return await supabase
        .from('profiles')
        .update({
            kelompok_id: kelompokId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', teacherId)
}

/**
 * Fetch classes for all given class IDs (non-Admin Kelompok path)
 * Fetches ALL classes and filters in-memory to avoid HTTP Headers Overflow
 * when classIds is large (600+ IDs → URL > 16KB → UND_ERR_HEADERS_OVERFLOW)
 */
export async function fetchClassesByIds(supabase: SupabaseClient, classIds: string[]) {
    if (classIds.length === 0) return { data: [], error: null }

    const { data, error } = await supabase
        .from('classes')
        .select(`
      id,
      name,
      kelompok_id,
      kelompok:kelompok_id(id, name)
    `)

    if (error || !data) return { data, error }

    const classIdSet = new Set(classIds)
    return { data: data.filter((c: any) => classIdSet.has(c.id)), error: null }
}

/**
 * Fetch classes by IDs without nested select (for admin kelompok RLS bypass)
 */
export async function fetchClassesByIdsFlat(supabase: SupabaseClient, classIds: string[]) {
    return await supabase
        .from('classes')
        .select('id, name, kelompok_id')
        .in('id', classIds)
}

/**
 * Fetch kelompok by IDs
 */
export async function fetchKelompokByIds(supabase: SupabaseClient, kelompokIds: string[]) {
    return await supabase
        .from('kelompok')
        .select('id, name')
        .in('id', kelompokIds)
}

export interface TeacherDeleteImpact {
    classes_count: number
    meetings_count: number
    material_progress_count: number
    student_reports_count: number
}

export async function fetchTeacherDeleteImpact(
    supabase: any,
    teacherId: string
): Promise<TeacherDeleteImpact> {
    const [classesRes, meetingsRes, progressRes, reportsRes] = await Promise.all([
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
        supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
        supabase.from('student_material_progress').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
        supabase.from('student_reports').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
    ])

    return {
        classes_count: classesRes.count ?? 0,
        meetings_count: meetingsRes.count ?? 0,
        material_progress_count: progressRes.count ?? 0,
        student_reports_count: reportsRes.count ?? 0,
    }
}
