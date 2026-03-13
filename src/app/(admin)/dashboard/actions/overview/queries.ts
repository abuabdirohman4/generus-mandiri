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
    studentIds?: string[]
): Promise<number> {
    if (studentIds !== undefined && studentIds.length === 0) return 0

    if (studentIds && studentIds.length > 0) {
        const CHUNK_SIZE = 200 // Safe limit to avoid 16KB HTTP header overflow
        let totalCount = 0

        for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
            const chunk = studentIds.slice(i, i + CHUNK_SIZE)
            const { count, error } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .in('id', chunk)

            if (error) {
                console.error('[Student count chunk error]', error)
                throw error
            }
            totalCount += count || 0
        }
        return totalCount
    }

    // No filter - count all
    const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
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

    if (classIds && classIds.length > 0) {
        const CHUNK_SIZE = 100
        let totalCount = 0

        for (let i = 0; i < classIds.length; i += CHUNK_SIZE) {
            const chunk = classIds.slice(i, i + CHUNK_SIZE)
            const { count } = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true })
                .in('id', chunk)
            totalCount += count || 0
        }
        return totalCount
    }

    const { count } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
    return count || 0
}

/**
 * Fetch all meetings with class and teacher info, optionally filtered by class IDs
 */
export async function fetchMeetingsForOverview(
    supabase: SupabaseClient,
    classIds?: string[]
) {
    let query = supabase
        .from('meetings')
        .select(`
      id,
      title,
      date,
      class_id,
      meeting_type_code,
      classes:class_id(
        id,
        name,
        kelompok_id
      ),
      profiles:teacher_id(
        full_name
      )
    `)
        .order('date', { ascending: false })

    if (classIds && classIds.length > 0) {
        query = query.in('class_id', classIds)
    }

    return await query
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
