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
