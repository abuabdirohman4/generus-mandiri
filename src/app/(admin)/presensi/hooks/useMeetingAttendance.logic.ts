export interface AttendanceRosterStudent {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
  classes?: Array<{ id: string; name: string }>
  kelompok_id?: string
  kelompok_name?: string
  desa_id?: string
  desa_name?: string
}

export interface AttendanceLogRecord {
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string
  check_in_time?: string | null
}

export type AttendanceData = Record<string, AttendanceLogRecord>

/**
 * Builds the attendance-status map for a meeting roster.
 *
 * The roster (`students`) is always the meeting's `student_snapshot` — the
 * source of truth for who's in the meeting — never derived from
 * `attendance_logs`. A student appearing in the snapshot with no matching
 * attendance log (e.g. not yet scanned/marked) defaults to 'A' (Alfa) rather
 * than disappearing from the roster.
 */
export function buildAttendanceData(
  students: AttendanceRosterStudent[],
  attendanceLogs: Array<{ student_id: string; status: 'H' | 'I' | 'S' | 'A'; reason?: string | null; check_in_time?: string | null }>
): AttendanceData {
  const attendanceData: AttendanceData = {}

  attendanceLogs.forEach(log => {
    attendanceData[log.student_id] = {
      status: log.status,
      reason: log.reason || undefined,
      check_in_time: log.check_in_time || undefined
    }
  })

  students.forEach(student => {
    if (!attendanceData[student.id]) {
      attendanceData[student.id] = {
        status: 'A',
        reason: undefined
      }
    }
  })

  return attendanceData
}
