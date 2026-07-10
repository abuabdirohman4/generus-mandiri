/**
 * Report Queries (Layer 1)
 *
 * Database queries for attendance report operations.
 * NO 'use server' directive - pure query builders.
 * All functions accept supabase client as parameter for testability.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAttendanceLogsInBatches, fetchStudentsInBatches } from '@/lib/utils/batchFetching'

/**
 * Fetch user profile with teacher classes and organizational hierarchy
 */
export async function fetchUserProfile(
    supabase: SupabaseClient,
    userId: string
) {
    return await supabase
        .from('profiles')
        .select(`
      id,
      username,
      role,
      daerah_id,
      desa_id,
      kelompok_id,
      teacher_classes!teacher_classes_teacher_id_fkey(
        class_id,
        classes:class_id(id, name, kelompok_id)
      )
    `)
        .eq('id', userId)
        .single()
}

/**
 * Fetch class details with organizational hierarchy (kelompok → desa → daerah)
 */
export async function fetchClassHierarchyMaps(
    supabase: SupabaseClient,
    classIds: string[]
) {
    if (classIds.length === 0) {
        return { data: [], error: null }
    }

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
 * Fetch attendance logs for specified meetings using batch fetching.
 * Wrapper around fetchAttendanceLogsInBatches utility.
 */
export async function fetchAttendanceLogs(
    supabase: SupabaseClient,
    meetingIds: string[]
) {
    if (meetingIds.length === 0) {
        return { data: [], error: null }
    }

    return await fetchAttendanceLogsInBatches(supabase, meetingIds)
}

/**
 * Fetch student details with classes, student_classes junction, and org hierarchy
 */
export async function fetchStudentDetails(
    supabase: SupabaseClient,
    studentIds: string[]
) {
    if (studentIds.length === 0) {
        return { data: [], error: null }
    }

    return fetchStudentsInBatches(supabase, studentIds, `
      id,
      name,
      gender,
      status,
      class_id,
      kelompok_id,
      desa_id,
      daerah_id,
      classes:class_id (
        id,
        name
      ),
      student_classes (
        class_id,
        classes:class_id (
          id,
          name,
          kelompok_id,
          kelompok:kelompok_id (
            id,
            name
          )
        )
      ),
      kelompok:kelompok_id (
        id,
        name
      ),
      desa:desa_id (
        id,
        name
      ),
      daerah:daerah_id (
        id,
        name
      )
    `)
}

/**
 * Fetch all kelompok names for class name formatting
 */
export async function fetchKelompokNames(supabase: SupabaseClient) {
    return await supabase
        .from('kelompok')
        .select('id, name')
}

/**
 * Fetch student_classes junction table for enrollment validation
 */
export async function fetchStudentClassesForEnrollment(
    supabase: SupabaseClient,
    classIds: string[]
) {
    if (classIds.length === 0) {
        return { data: [], error: null }
    }

    return await supabase
        .from('student_classes')
        .select('class_id, student_id, students(id, kelompok_id)')
        .in('class_id', classIds)
}

/**
 * Fetch report meetings via RPC (sm-5jzd egress cut).
 * Replaces fetchMeetingsForDateRange + fetchMeetingsWithFullDetails.
 * Returns snapshot_count (jsonb_array_length) instead of full student_snapshot jsonb,
 * and kelompok_id joined from classes — the fat jsonb never leaves Postgres.
 */
export async function fetchReportMeetings(
    supabase: SupabaseClient,
    dateFilter: {
        date?: {
            eq?: string
            gte?: string
            lte?: string
        }
    },
    activityTypeFilter?: string,
    activityLevelFilter?: string
) {
    const activityTypes = activityTypeFilter
        ? activityTypeFilter.split(',').filter(Boolean)
        : null
    const activityLevels = activityLevelFilter
        ? activityLevelFilter.split(',').filter(Boolean)
        : null

    return await supabase.rpc('get_report_meetings', {
        p_date_gte: dateFilter.date?.gte || '1900-01-01',
        p_date_lte: dateFilter.date?.lte || '2100-12-31',
        p_activity_type_ids: activityTypes && activityTypes.length ? activityTypes : null,
        p_activity_level_ids: activityLevels && activityLevels.length ? activityLevels : null,
    })
}
