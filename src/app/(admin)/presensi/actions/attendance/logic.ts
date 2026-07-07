/**
 * Attendance calculation utilities
 * Pure functions for calculating attendance statistics
 */

import { AttendanceData, AttendanceLog, AttendanceStats } from '@/types/attendance'

/**
 * Calculates attendance statistics from logs
 * @param logs - Array of attendance logs
 * @returns Statistics including counts and percentage
 */
export function calculateAttendanceStats(logs: AttendanceLog[]): AttendanceStats {
  const total_students = logs.length
  const present = logs.filter(log => log.status === 'H').length
  const sick = logs.filter(log => log.status === 'S').length
  const permission = logs.filter(log => log.status === 'I').length
  const absent = logs.filter(log => log.status === 'A').length

  const percentage = total_students > 0
    ? Math.round((present / total_students) * 100)
    : 0

  return {
    total_students,
    present,
    sick,
    permission,
    absent,
    percentage
  }
}

/**
 * Extracts a meeting date in WIB (UTC+7) as a YYYY-MM-DD string.
 * meeting.date is timestamptz stored as UTC midnight - offset by +7h before
 * extracting the date part to avoid off-by-one-day errors on UTC servers.
 */
export function getMeetingWibDateStr(meetingDate: string): string {
  const meetingUtc = new Date(meetingDate)
  const meetingWib = new Date(meetingUtc.getTime() + 7 * 60 * 60 * 1000)
  return meetingWib.toISOString().split("T")[0]
}

/**
 * Checks whether a student belongs to a meeting expected roster.
 * @param studentSnapshot meeting.student_snapshot array (source of truth for roster)
 * @param studentId student to check
 */
export function isStudentInMeeting(
  studentSnapshot: string[] | null | undefined,
  studentId: string
): boolean {
  if (!studentSnapshot) return false
  return studentSnapshot.includes(studentId)
}

/**
 * Determines if a check-in is late relative to a meeting's start time.
 * Both times compared in the same timezone context (WIB) — meetingDate is
 * the meeting's date (YYYY-MM-DD, WIB), startTime is "HH:mm" or "HH:mm:ss".
 *
 * @param checkInTime ISO timestamp string of actual check-in
 * @param meetingDate meeting date as YYYY-MM-DD (WIB)
 * @param startTime meeting start time as HH:mm or HH:mm:ss, or null/undefined if not set
 * @returns true if checkInTime is after the threshold; false if on-time or no threshold set
 */
export function isLate(
  checkInTime: string | null | undefined,
  meetingDate: string,
  startTime: string | null | undefined
): boolean {
  if (!checkInTime || !startTime) return false

  const [h, m, s] = startTime.split(':').map(Number)
  const thresholdUtcMs = new Date(`${meetingDate}T00:00:00Z`).getTime()
    + (h * 3600 + (m || 0) * 60 + (s || 0)) * 1000
    - 7 * 60 * 60 * 1000

  const checkInMs = new Date(checkInTime).getTime()
  if (Number.isNaN(checkInMs) || Number.isNaN(thresholdUtcMs)) return false

  return checkInMs > thresholdUtcMs
}

/**
 * Validates attendance data before saving
 * @param data - Array of attendance data to validate
 * @returns Validation result with valid flag and optional error message
 */
export function validateAttendanceData(data: AttendanceData[]): {
  valid: boolean
  error?: string
} {
  if (!data || data.length === 0) {
    return { valid: false, error: 'No attendance data provided' }
  }

  for (const item of data) {
    if (!item.student_id) {
      return { valid: false, error: 'Missing student_id in attendance data' }
    }

    if (!item.date) {
      return { valid: false, error: 'Missing date in attendance data' }
    }

    if (!['H', 'I', 'S', 'A'].includes(item.status)) {
      return { valid: false, error: 'Invalid status in attendance data' }
    }
  }

  return { valid: true }
}
