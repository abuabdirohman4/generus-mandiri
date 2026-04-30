// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

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
      students (
        id,
        name,
        gender,
        class_id,
        kelompok_id,
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
 * Fetches students by their IDs with class information
 */
export async function fetchStudentsByIds(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<{ data: any[] | null; error: any }> {
  return await supabase
    .from('students')
    .select(`
      id,
      name,
      gender,
      class_id,
      kelompok_id,
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
    `)
    .in('id', studentIds)
    .order('name')
}
