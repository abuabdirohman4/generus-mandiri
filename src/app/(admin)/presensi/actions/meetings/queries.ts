// NO 'use server' directive - pure query builders
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateMeetingData,
  UpdateMeetingData
} from '@/types/meeting'

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: DATABASE QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchMeetingById(supabase: SupabaseClient, meetingId: string) {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      id,
      class_id,
      class_ids,
      kelompok_ids,
      teacher_id,
      title,
      date,
      topic,
      description,
      student_snapshot,
      created_at,
      updated_at,
      activity_type_id,
      activity_level_id,
      start_time,
      check_time_enabled,
      allow_delegated_attendance,
      activity_type:activity_types(id, code, name),
      activity_level:activity_levels(id, code, name),
      classes (
        id,
        name,
        kelompok_id,
        kelompok:kelompok_id (
          id,
          name,
          desa_id,
          desa:desa_id (
            id,
            name,
            daerah_id,
            daerah:daerah_id (
              id,
              name
            )
          )
        )
      )
    `)
    .eq('id', meetingId)
    .single()

  return { data, error }
}

export async function fetchMeetingsByClass(
  supabase: SupabaseClient,
  classId: string | undefined,
  limit: number,
  cursor: string | undefined
) {
  let query = supabase
    .from('meetings')
    .select(`
      id,
      class_id,
      class_ids,
      teacher_id,
      title,
      date,
      topic,
      created_at,
      activity_type_id,
      activity_level_id,
      start_time,
      check_time_enabled,
      allow_delegated_attendance,
      activity_type:activity_types(id, code, name),
      activity_level:activity_levels(id, code, name),
      kelompok_ids,
      classes (
        id,
        name
      )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  if (classId) {
    query = query.contains('class_ids', [classId])
  }

  const { data, error } = await query

  return { data, error }
}

export async function insertMeeting(
  supabase: SupabaseClient,
  data: CreateMeetingData,
  userId: string
) {
  const meetingData = {
    class_id: data.classIds[0], // Primary class for backward compatibility
    class_ids: data.classIds,
    kelompok_ids: data.kelompokIds || null,
    teacher_id: userId,
    title: data.title,
    date: data.date,
    topic: data.topic,
    description: data.description,
    student_snapshot: data.studentIds,
    activity_type_id: data.activityTypeId || null,
    activity_level_id: data.activityLevelId || null,
    start_time: data.startTime || null,
    check_time_enabled: data.checkTimeEnabled ?? false,
    allow_delegated_attendance: data.allowDelegatedAttendance ?? false,
    // Note: created_by column does not exist in meetings table
    // teacher_id already tracks who created the meeting
  }

  const { data: result, error } = await supabase
    .from('meetings')
    .insert(meetingData)
    .select()
    .single()

  return { data: result, error }
}

export async function updateMeetingRecord(
  supabase: SupabaseClient,
  meetingId: string,
  data: UpdateMeetingData
) {
  const updateData: any = {
    updated_at: new Date().toISOString()
  }

  if (data.title !== undefined) updateData.title = data.title
  if (data.date !== undefined) updateData.date = data.date
  if (data.topic !== undefined) updateData.topic = data.topic
  if (data.description !== undefined) updateData.description = data.description
  if (data.activityTypeId !== undefined) updateData.activity_type_id = data.activityTypeId
  if (data.activityLevelId !== undefined) updateData.activity_level_id = data.activityLevelId
  if (data.startTime !== undefined) updateData.start_time = data.startTime
  if (data.checkTimeEnabled !== undefined) updateData.check_time_enabled = data.checkTimeEnabled
  if (data.allowDelegatedAttendance !== undefined) updateData.allow_delegated_attendance = data.allowDelegatedAttendance

  if (data.classIds !== undefined && data.classIds.length > 0) {
    updateData.class_id = data.classIds[0]
    updateData.class_ids = data.classIds
  }

  if (data.kelompokIds !== undefined) {
    updateData.kelompok_ids = data.kelompokIds.length > 0 ? data.kelompokIds : null
  }

  if (data.studentIds !== undefined) {
    updateData.student_snapshot = data.studentIds
  }

  const { data: result, error } = await supabase
    .from('meetings')
    .update(updateData)
    .eq('id', meetingId)
    .select()
    .single()

  return { data: result, error }
}

export async function softDeleteMeeting(
  supabase: SupabaseClient,
  meetingId: string
) {
  // First check and delete attendance logs
  const { data: attendanceLogs, error: checkError } = await supabase
    .from('attendance_logs')
    .select('id')
    .eq('meeting_id', meetingId)
    .limit(1)

  if (checkError) {
    return { data: null, error: checkError }
  }

  // If attendance logs exist, delete them first
  if (attendanceLogs && attendanceLogs.length > 0) {
    const { error: deleteLogsError } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('meeting_id', meetingId)

    if (deleteLogsError) {
      return { data: null, error: deleteLogsError }
    }
  }

  // Now delete the meeting
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId)

  return { data: null, error }
}
