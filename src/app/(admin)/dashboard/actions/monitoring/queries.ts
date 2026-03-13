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
 * Fetch student enrollments for given class IDs (chunked), optionally filtered by studentIds
 */
export async function fetchEnrollments(
    supabase: SupabaseClient,
    classIds: string[],
    studentIds?: string[]
): Promise<any[]> {
    const ENROLLMENT_CHUNK_SIZE = 100
    const allEnrollments: any[] = []

    for (let i = 0; i < classIds.length; i += ENROLLMENT_CHUNK_SIZE) {
        const chunk = classIds.slice(i, i + ENROLLMENT_CHUNK_SIZE)

        if (studentIds && studentIds.length > 0) {
            const STUDENT_CHUNK_SIZE = 200
            for (let j = 0; j < studentIds.length; j += STUDENT_CHUNK_SIZE) {
                const studentChunk = studentIds.slice(j, j + STUDENT_CHUNK_SIZE)
                const { data, error } = await supabase
                    .from('student_classes')
                    .select('student_id, class_id')
                    .in('class_id', chunk)
                    .in('student_id', studentChunk)

                if (error) {
                    console.error('[getClassMonitoring] Enrollment chunk error:', error)
                    throw error
                }
                if (data) allEnrollments.push(...data)
            }
        } else {
            const { data, error } = await supabase
                .from('student_classes')
                .select('student_id, class_id')
                .in('class_id', chunk)

            if (error) {
                console.error('[getClassMonitoring] Enrollment query error:', error)
                throw error
            }
            if (data) allEnrollments.push(...data)
        }
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
