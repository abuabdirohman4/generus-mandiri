export type AttendanceStatus = 'H' | 'I' | 'S' | 'A'

export interface AttendanceEntry {
  status: AttendanceStatus
  reason?: string
}

export type AttendanceMap = Record<string, AttendanceEntry>

/** Shape of the row payload Supabase sends for `attendance_logs` postgres_changes events. */
export interface AttendanceLogRow {
  student_id?: string
  status?: AttendanceStatus
  reason?: string | null
}

export interface AttendanceChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: AttendanceLogRow
  old: AttendanceLogRow
}

/**
 * Pure reducer that merges a Supabase `postgres_changes` event for `attendance_logs`
 * into the current live attendance map. Never mutates the input map.
 *
 * - INSERT/UPDATE: upsert the row's student_id with its status/reason.
 * - DELETE: remove the student_id (uses `old` payload, since `new` is empty on delete).
 * - Events without a resolvable student_id are ignored (returns the same map reference).
 */
export function applyAttendanceEvent(
  map: AttendanceMap,
  payload: AttendanceChangePayload
): AttendanceMap {
  if (payload.eventType === 'DELETE') {
    const studentId = payload.old?.student_id
    if (!studentId || !(studentId in map)) return map

    const next = { ...map }
    delete next[studentId]
    return next
  }

  const row = payload.new
  const studentId = row?.student_id
  if (!studentId || !row?.status) return map

  return {
    ...map,
    [studentId]: {
      status: row.status,
      reason: row.reason ?? undefined,
    },
  }
}


/**
 * Compares two attendance maps and returns the student ids that just became
 * "present" (status 'H') — i.e. were not 'H' in `prev` but are 'H' in `next`.
 *
 * Used to briefly highlight students who were just marked hadir in the live
 * Presentasi view as realtime events arrive.
 */
export function getNewlyPresentIds(prev: AttendanceMap, next: AttendanceMap): string[] {
  const result: string[] = []
  for (const studentId in next) {
    if (next[studentId]?.status === 'H' && prev[studentId]?.status !== 'H') {
      result.push(studentId)
    }
  }
  return result
}
