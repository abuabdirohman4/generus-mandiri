/**
 * Overview Queries (Layer 1)
 *
 * Database queries for dashboard overview stats (getDashboard).
 * NO 'use server' directive. Accept SupabaseClient as param.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Count students, optionally filtered by a set of student IDs (chunked for large arrays)
 */
export async function countStudents(
    supabase: SupabaseClient,
    studentIds?: string[],
    classIds?: string[],
    status?: string
): Promise<number> {
    if (studentIds !== undefined && studentIds.length === 0) return 0

    let query = supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)

    if (status && status !== 'all') {
        query = query.eq('status', status)
    }

    if (studentIds && studentIds.length > 0) {
        const CHUNK_SIZE = 200 // Safe limit to avoid 16KB HTTP header overflow
        let totalCount = 0

        for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
            const chunk = studentIds.slice(i, i + CHUNK_SIZE)
            const { count, error } = await query
                .in('id', chunk)

            if (error) {
                console.error('[Student count chunk error]', error)
                throw error
            }
            totalCount += count || 0
        }
        return totalCount
    }

    if (classIds && classIds.length > 0) {
        // Count students in specific classes (junction table check)
        // Note: junction table doesn't have status/deleted_at, so we join or get IDs first
        const { data, error } = await supabase
            .from('student_classes')
            .select('student_id')
            .in('class_id', classIds)

        if (error) {
            console.error('[Student count by class error]', error)
            throw error
        }
        
        const studentIdsFromClasses = (data || []).map(sc => sc.student_id)
        if (studentIdsFromClasses.length === 0) return 0

        // Use the query builder to apply status/deleted_at filters to these IDs
        const CHUNK_SIZE = 200
        let totalCount = 0
        for (let i = 0; i < studentIdsFromClasses.length; i += CHUNK_SIZE) {
            const chunk = studentIdsFromClasses.slice(i, i + CHUNK_SIZE)
            const { count } = await query.in('id', chunk)
            totalCount += count || 0
        }
        return totalCount
    }

    // No ID filter - use the base query (which already has deleted_at and status filters)
    const { count } = await query
    return count || 0
}

/**
 * Count classes, optionally filtered by a set of class IDs (chunked for large arrays)
 */
export async function countClasses(
    supabase: SupabaseClient,
    classIds?: string[]
): Promise<number> {
    if (classIds !== undefined && classIds.length === 0) return 0

    let query = supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)

    if (classIds && classIds.length > 0) {
        const CHUNK_SIZE = 100
        let totalCount = 0

        for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
            const chunk = classIds.slice(i, i + CHUNK_SIZE)
            const { count } = await query
                .in('id', chunk)
            totalCount += count || 0
        }
        return totalCount
    }

    const { count } = await query
    return count || 0
}

/**
 * Fetch all meetings with class and teacher info, optionally filtered by class IDs.
 * Uses chunking (100 per request) to avoid HTTP header overflow for large class arrays.
 */
export async function fetchMeetingsForOverview(
    supabase: SupabaseClient,
    classIds?: string[]
) {
    const SELECT = `
      id,
      title,
      date,
      class_id,
      meeting_type_code,
      activity_type_id,
      activity_level_id,
      activity_type:activity_types(id, code, name),
      activity_level:activity_levels(id, code, name),
      classes:class_id(id, name, kelompok_id),
      profiles:teacher_id(full_name)
    `

    if (!classIds || classIds.length === 0) {
        return await supabase
            .from('meetings')
            .select(SELECT)
            .order('date', { ascending: false })
    }

    // Chunk to avoid HTTP header overflow (16KB limit)
    const CHUNK_SIZE = 100
    const allData: any[] = []

    for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
        const chunk = classIds.slice(i, i + CHUNK_SIZE)
        const { data, error } = await supabase
            .from('meetings')
            .select(SELECT)
            .in('class_id', chunk)
            .order('date', { ascending: false })

        if (error) return { data: null, error }
        if (data) allData.push(...data)
    }

    return { data: allData, error: null }
}

/**
 * Fetch attendance logs from monthAgoStr, optionally filtered by student IDs (chunked)
 */
export async function fetchAttendanceLogsForOverview(
    supabase: SupabaseClient,
    monthAgoStr: string,
    studentIds?: string[]
): Promise<any[]> {
    if (studentIds !== undefined && studentIds.length === 0) return []

    if (studentIds && studentIds.length > 0) {
        const CHUNK_SIZE = 500
        const attendanceData: any[] = []

        for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
            const chunk = studentIds.slice(i, i + CHUNK_SIZE)
            const { data, error } = await supabase
                .from('attendance_logs')
                .select('date, status, student_id, meeting_id')
                .gte('date', monthAgoStr)
                .in('student_id', chunk)

            if (error) {
                console.error('[getDashboard] Attendance batch error:', error)
            }
            if (data) attendanceData.push(...data)
        }
        return attendanceData
    }

    // No filter - fetch all
    const { data } = await supabase
        .from('attendance_logs')
        .select('date, status, student_id, meeting_id')
        .gte('date', monthAgoStr)
    return data || []
}
