/**
 * Meeting validation utilities
 * Pure functions for validating meeting data
 */

import { CreateMeetingData } from '@/types/meeting'

/**
 * Validates meeting data before creation
 * @param data - Meeting data to validate
 * @returns Validation result with ok flag and optional error message
 */
export function validateMeetingData(data: CreateMeetingData): {
  ok: boolean
  error?: string
} {
  if (!data.classIds || data.classIds.length === 0) {
    return { ok: false, error: 'Minimal satu kelas harus dipilih' }
  }

  if (!data.date) {
    return { ok: false, error: 'Tanggal pertemuan harus diisi' }
  }

  if (!data.title || data.title.trim() === '') {
    return { ok: false, error: 'Judul pertemuan harus diisi' }
  }

  return { ok: true }
}

/**
 * Builds a snapshot of student IDs for a meeting based on class membership
 * @param students - Array of students with their class memberships
 * @param classIds - IDs of classes for this meeting
 * @returns Array of student IDs who are in any of the specified classes
 */
export function buildStudentSnapshot(
  students: Array<{ id: string; classes: Array<{ id: string }> }>,
  classIds: string[]
): string[] {
  return students
    .filter(student =>
      student.classes.some(cls => classIds.includes(cls.id))
    )
    .map(student => student.id)
}

/**
 * Checks if a user can access a meeting based on their class assignments
 * @param userClassIds - IDs of classes the user is assigned to (empty array for superadmin/admin)
 * @param meetingClassIds - IDs of classes for this meeting
 * @returns true if user can access the meeting
 */
export function canUserAccessMeeting(
  userClassIds: string[],
  meetingClassIds: string[]
): boolean {
  if (userClassIds.length === 0) {
    // Superadmin or admin can access all meetings
    return true
  }

  // Teacher: check if any of their classes match meeting classes
  return meetingClassIds.some(classId => userClassIds.includes(classId))
}
