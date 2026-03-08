import { describe, test, expect } from 'vitest'
import {
  validateMeetingData,
  buildStudentSnapshot,
  canUserAccessMeeting
} from '../logic'
import type { CreateMeetingData } from '@/types/meeting'

describe('Meeting Validation Functions', () => {
  describe('validateMeetingData', () => {
    test('should return ok: true for valid meeting data', () => {
      const validData: CreateMeetingData = {
        classIds: ['class-1'],
        date: '2026-03-01',
        title: 'Pertemuan 1',
        topic: 'Introduction',
        description: 'First meeting',
        meetingTypeCode: 'REGULAR',
        kelompokIds: [],
        studentIds: []
      }

      const result = validateMeetingData(validData)

      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('should return error when classIds is empty array', () => {
      const invalidData: CreateMeetingData = {
        classIds: [],
        date: '2026-03-01',
        title: 'Pertemuan 1',
        topic: 'Introduction',
        description: 'First meeting',
        meetingTypeCode: 'REGULAR',
        kelompokIds: [],
        studentIds: []
      }

      const result = validateMeetingData(invalidData)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Minimal satu kelas harus dipilih')
    })

    test('should return error when date is missing', () => {
      const invalidData: CreateMeetingData = {
        classIds: ['class-1'],
        date: '',
        title: 'Pertemuan 1',
        topic: 'Introduction',
        description: 'First meeting',
        meetingTypeCode: 'REGULAR',
        kelompokIds: [],
        studentIds: []
      }

      const result = validateMeetingData(invalidData)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Tanggal pertemuan harus diisi')
    })

    test('should return error when title is empty or whitespace', () => {
      const invalidData: CreateMeetingData = {
        classIds: ['class-1'],
        date: '2026-03-01',
        title: '   ',
        topic: 'Introduction',
        description: 'First meeting',
        meetingTypeCode: 'REGULAR',
        kelompokIds: [],
        studentIds: []
      }

      const result = validateMeetingData(invalidData)

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Judul pertemuan harus diisi')
    })
  })

  describe('buildStudentSnapshot', () => {
    test('should return student IDs that match the selected classIds', () => {
      const students = [
        { id: 'student-1', classes: [{ id: 'class-1' }, { id: 'class-2' }] },
        { id: 'student-2', classes: [{ id: 'class-2' }] },
        { id: 'student-3', classes: [{ id: 'class-3' }] }
      ]
      const classIds = ['class-1', 'class-2']

      const result = buildStudentSnapshot(students, classIds)

      expect(result).toEqual(['student-1', 'student-2'])
      expect(result).toHaveLength(2)
    })

    test('should return empty array when no students match selected classes', () => {
      const students = [
        { id: 'student-1', classes: [{ id: 'class-1' }] },
        { id: 'student-2', classes: [{ id: 'class-2' }] }
      ]
      const classIds = ['class-3', 'class-4']

      const result = buildStudentSnapshot(students, classIds)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    test('should handle empty students array', () => {
      const students: Array<{ id: string; classes: Array<{ id: string }> }> = []
      const classIds = ['class-1', 'class-2']

      const result = buildStudentSnapshot(students, classIds)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })
  })

  describe('canUserAccessMeeting', () => {
    test('should return true for superadmin (empty userClassIds)', () => {
      const userClassIds: string[] = []
      const meetingClassIds = ['class-1', 'class-2']

      const result = canUserAccessMeeting(userClassIds, meetingClassIds)

      expect(result).toBe(true)
    })

    test('should return true when teacher has at least one matching class', () => {
      const userClassIds = ['class-1', 'class-2']
      const meetingClassIds = ['class-2', 'class-3']

      const result = canUserAccessMeeting(userClassIds, meetingClassIds)

      expect(result).toBe(true)
    })

    test('should return false when teacher has no matching classes', () => {
      const userClassIds = ['class-1', 'class-2']
      const meetingClassIds = ['class-3', 'class-4']

      const result = canUserAccessMeeting(userClassIds, meetingClassIds)

      expect(result).toBe(false)
    })
  })
})
