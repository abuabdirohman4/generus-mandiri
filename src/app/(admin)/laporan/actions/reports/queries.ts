/**
 * Report Queries (Layer 1)
 *
 * Database queries for attendance report operations.
 * NO 'use server' directive - pure query builders.
 * All functions accept supabase client as parameter for testability.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'

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
 * Fetch meetings within date range with optional meeting type filter
 */
export async function fetchMeetingsForDateRange(
    supabase: SupabaseClient,
    dateFilter: {
        date?: {
            eq?: string
            gte?: string
            lte?: string
        }
    },
    meetingTypeFilter?: string
) {
    const meetingTypes = meetingTypeFilter
        ? meetingTypeFilter.split(',').filter(Boolean)
        : null

    let query = supabase
        .from('meetings')
        .select('id, date, class_id, class_ids')
        .gte('date', dateFilter.date?.gte || '1900-01-01')
        .lte('date', dateFilter.date?.lte || '2100-12-31')

    if (meetingTypes && meetingTypes.length > 0) {
        query = query.in('meeting_type_code', meetingTypes)
    }

    return await query.order('date')
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

    return await supabase
        .from('students')
        .select(`
      id,
      name,
      gender,
      class_id,
      kelompok_id,
      desa_id,
      daerah_id,
      classes(
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
        .in('id', studentIds)
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
 * Fetch meetings with full details including class relations
 */
export async function fetchMeetingsWithFullDetails(
    supabase: SupabaseClient,
    dateFilter: {
        date?: {
            eq?: string
            gte?: string
            lte?: string
        }
    },
    meetingTypeFilter?: string
) {
    const meetingTypes = meetingTypeFilter
        ? meetingTypeFilter.split(',').filter(Boolean)
        : null

    let query = supabase
        .from('meetings')
        .select(`
      id,
      title,
      date,
      student_snapshot,
      class_id,
      class_ids,
      classes:class_id(
        id,
        kelompok_id
      )
    `)
        .gte('date', dateFilter.date?.gte || '1900-01-01')
        .lte('date', dateFilter.date?.lte || '2100-12-31')

    if (meetingTypes && meetingTypes.length > 0) {
        query = query.in('meeting_type_code', meetingTypes)
    }

    return await query.order('date')
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
