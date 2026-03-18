/**
 * Monitoring Queries (Layer 1)
 *
 * Database queries for class monitoring (getClassMonitoring).
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const CLASS_ORG_SELECT = `
  id,
  name,
  kelompok:kelompok_id(
    id,
    name,
    desa:desa_id(
      id,
      name,
      daerah:daerah_id(
        id,
        name
      )
    )
  )
`

/**
 * Fetch classes with org hierarchy, optionally filtered by classIds (chunked)
 */
export async function fetchClassesWithOrg(
    supabase: SupabaseClient,
    classIds?: string[]
): Promise<any[]> {
    if (classIds !== undefined && classIds.length === 0) return []

    if (classIds && classIds.length > 0) {
        const CHUNK_SIZE = 100
        const classes: any[] = []

        for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
            const chunk = classIds.slice(i, i + CHUNK_SIZE)
            const { data: chunkClasses, error } = await supabase
                .from('classes')
                .select(CLASS_ORG_SELECT)
                .in('id', chunk)

            if (error) {
                console.error('[getClassMonitoring] Classes chunk error:', error)
                throw error
            }
            if (chunkClasses) classes.push(...chunkClasses)
        }
        return classes
    }

    // No filter - fetch all (RLS applies)
    const { data, error } = await supabase
        .from('classes')
        .select(CLASS_ORG_SELECT)

    if (error) {
        console.error('[getClassMonitoring] Classes query error:', error)
        throw error
    }
    return data || []
}

/**
 * Fetch meetings within date range for monitoring (uses admin client to bypass RLS timeout)
 */
export async function fetchMeetingsForMonitoring(
    adminClient: SupabaseClient,
    startDate: string,
    endDate: string
) {
    return await adminClient
        .from('meetings')
        .select('id, class_id, class_ids, date')
        .gte('date', startDate)
        .lte('date', endDate)
}

/**
 * Fetch student enrollments for given class IDs (chunked), optionally filtered by studentIds.
 * Queries by class_id only (1-dimension chunking), then filters studentIds in JS via Set.has().
 * Avoids double-nested loop: was ceil(classIds/100) × ceil(studentIds/200) queries,
 * now only ceil(classIds/100) queries.
 */
export async function fetchEnrollments(
    supabase: SupabaseClient,
    classIds: string[],
    studentIds?: string[]
): Promise<any[]> {
    if (classIds.length === 0) return []

    const CHUNK_SIZE = 100
    const allEnrollments: any[] = []

    for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
        const chunk = classIds.slice(i, i + CHUNK_SIZE)
        const { data, error } = await supabase
            .from('student_classes')
            .select('student_id, class_id')
            .in('class_id', chunk)

        if (error) {
            console.error('[getClassMonitoring] Enrollment chunk error:', error)
            throw error
        }
        if (data) allEnrollments.push(...data)
    }

    if (studentIds && studentIds.length > 0) {
        const studentIdSet = new Set(studentIds)
        return allEnrollments.filter(e => studentIdSet.has(e.student_id))
    }

    return allEnrollments
}

/**
 * Fetch enrollments for a combined set of class IDs (single query)
 */
export async function fetchCombinedEnrollments(supabase: SupabaseClient, classIds: string[]) {
    return await supabase
        .from('student_classes')
        .select('student_id')
        .in('class_id', classIds)
}
