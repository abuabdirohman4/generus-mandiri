/**
 * Classes Queries (Layer 1)
 *
 * Database queries for teacher class assignment operations.
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetch class assignments for a teacher with class details
 */
export async function fetchTeacherClasses(supabase: SupabaseClient, teacherId: string) {
    return await supabase
        .from('teacher_classes')
        .select(`
      id,
      class_id,
      class:class_id (
        id,
        name,
        kelompok_id
      )
    `)
        .eq('teacher_id', teacherId)
}

/**
 * Fetch classes with full org hierarchy for access validation
 */
export async function fetchClassesForValidation(supabase: SupabaseClient, classIds: string[]) {
    return await supabase
        .from('classes')
        .select(`
      id,
      kelompok_id,
      kelompok:kelompok_id (
        id,
        desa_id,
        desa:desa_id (
          id,
          daerah_id
        )
      )
    `)
        .in('id', classIds)
}

/**
 * Delete all class assignments for a teacher
 */
export async function deleteTeacherClassAssignments(supabase: SupabaseClient, teacherId: string) {
    return await supabase
        .from('teacher_classes')
        .delete()
        .eq('teacher_id', teacherId)
}

/**
 * Insert class assignments for a teacher
 */
export async function insertTeacherClassAssignments(
    supabase: SupabaseClient,
    mappings: Array<{ teacher_id: string; class_id: string }>
) {
    return await supabase
        .from('teacher_classes')
        .insert(mappings)
}

/**
 * Insert single class assignment for a teacher
 */
export async function insertTeacherClassAssignment(
    supabase: SupabaseClient,
    teacherId: string,
    classId: string
) {
    return await supabase
        .from('teacher_classes')
        .insert([{ teacher_id: teacherId, class_id: classId }])
}
