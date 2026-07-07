// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchStudentsInBatches } from '@/lib/utils/batchFetching'

// ============================================================================
// LAYER 1: DATABASE QUERIES (Exported)
// ============================================================================

/**
 * Upserts attendance logs in the database
 */
export async function upsertAttendanceLogs(
  supabase: SupabaseClient,
  records: Array<{
    student_id: string
    date: string
    meeting_id?: string | null
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string | null
    check_in_time?: string | null
    recorded_by: string
  }>
): Promise<{ data: any; error: any }> {
  const conflictKey = records[0]?.meeting_id
    ? 'student_id,meeting_id'
    : 'student_id,date'

  return await supabase
    .from('attendance_logs')
    .upsert(records, { onConflict: conflictKey })
}

/**
 * Fetches attendance logs for a specific date
 */
export async function fetchAttendanceByDate(
  supabase: SupabaseClient,
  date: string
): Promise<{ data: any[] | null; error: any }> {
  return await supabase
    .from('attendance_logs')
    .select(`
      id,
      student_id,
      date,
      status,
      reason,
      check_in_time,
      students (
        id,
        name,
        gender,
        class_id,
        classes (
          id,
          name
        )
      )
    `)
    .eq('date', date)
    .order('students(name)')
}

/**
 * Fetches attendance logs for a specific meeting
 */
export async function fetchAttendanceByMeeting(
  supabase: SupabaseClient,
  meetingId: string
): Promise<{ data: any[] | null; error: any }> {
  return await supabase
    .from('attendance_logs')
    .select(`
      id,
      student_id,
      status,
      reason,
      check_in_time,
      students (
        id,
        name,
        gender,
        class_id,
        kelompok_id,
        kelompok:kelompok_id (id, name, desa:desa_id (id, name)),
        classes (
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
        )
      )
    `)
    .eq('meeting_id', meetingId)
    .order('students(name)')
}

/**
 * Fetches meeting fields needed to validate a QR scan (roster + date)
 */
export async function fetchMeetingForScan(
  supabase: SupabaseClient,
  meetingId: string
): Promise<{ data: { teacher_id: string; class_ids: string[]; date: string; student_snapshot: string[]; start_time: string | null; check_time_enabled: boolean } | null; error: any }> {
  return await supabase
    .from('meetings')
    .select('teacher_id, class_ids, date, student_snapshot, start_time, check_time_enabled')
    .eq('id', meetingId)
    .single()
}

/**
 * Fetches a single attendance log row for a student+meeting pair
 * (used to detect duplicate QR scans)
 */
export async function fetchAttendanceLogByStudentAndMeeting(
  supabase: SupabaseClient,
  studentId: string,
  meetingId: string
): Promise<{ data: { id: string; status: string; check_in_time: string | null } | null; error: any }> {
  return await supabase
    .from('attendance_logs')
    .select('id, status, check_in_time')
    .eq('student_id', studentId)
    .eq('meeting_id', meetingId)
    .maybeSingle()
}

/**
 * Fetches students by their IDs with class information
 */
export async function fetchStudentsByIds(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<{ data: any[] | null; error: any }> {
  const selectQuery = `
    id,
    name,
    gender,
    class_id,
    kelompok_id,
    kelompok:kelompok_id (id, name, desa:desa_id (id, name)),
    classes (
      id,
      name
    ),
    student_classes (
      class_id,
      classes:class_id (
        id,
        name
      )
    )
  `
  const { data, error } = await fetchStudentsInBatches(supabase, studentIds, selectQuery)
  if (data) {
    data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
  }
  return { data, error }
}
