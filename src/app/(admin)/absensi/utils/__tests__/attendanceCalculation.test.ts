import { describe, test, expect } from 'vitest'
import {
  calculateAttendanceStats,
  validateAttendanceData
} from '../attendanceCalculation'
import type { AttendanceLog, AttendanceData } from '@/types/attendance'

describe('Attendance Calculation Functions', () => {
  describe('calculateAttendanceStats', () => {
    test('should calculate correct stats for mixed attendance', () => {
      const logs: AttendanceLog[] = [
        { id: '1', student_id: 's1', date: '2026-03-01', status: 'H', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '2', student_id: 's2', date: '2026-03-01', status: 'H', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '3', student_id: 's3', date: '2026-03-01', status: 'A', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '4', student_id: 's4', date: '2026-03-01', status: 'S', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '5', student_id: 's5', date: '2026-03-01', status: 'I', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' }
      ]

      const result = calculateAttendanceStats(logs)

      expect(result).toEqual({
        total_students: 5,
        present: 2,
        sick: 1,
        permission: 1,
        absent: 1,
        percentage: 40
      })
    })

    test('should return 100% when all students are present', () => {
      const logs: AttendanceLog[] = [
        { id: '1', student_id: 's1', date: '2026-03-01', status: 'H', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '2', student_id: 's2', date: '2026-03-01', status: 'H', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '3', student_id: 's3', date: '2026-03-01', status: 'H', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' }
      ]

      const result = calculateAttendanceStats(logs)

      expect(result).toEqual({
        total_students: 3,
        present: 3,
        sick: 0,
        permission: 0,
        absent: 0,
        percentage: 100
      })
    })

    test('should return 0% when no students are present', () => {
      const logs: AttendanceLog[] = [
        { id: '1', student_id: 's1', date: '2026-03-01', status: 'A', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '2', student_id: 's2', date: '2026-03-01', status: 'S', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
        { id: '3', student_id: 's3', date: '2026-03-01', status: 'I', recorded_by: 'u1', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' }
      ]

      const result = calculateAttendanceStats(logs)

      expect(result).toEqual({
        total_students: 3,
        present: 0,
        sick: 1,
        permission: 1,
        absent: 1,
        percentage: 0
      })
    })

    test('should handle empty logs array', () => {
      const logs: AttendanceLog[] = []

      const result = calculateAttendanceStats(logs)

      expect(result).toEqual({
        total_students: 0,
        present: 0,
        sick: 0,
        permission: 0,
        absent: 0,
        percentage: 0
      })
    })
  })

  describe('validateAttendanceData', () => {
    test('should return valid: true for correct attendance data', () => {
      const data: AttendanceData[] = [
        {
          student_id: 'student-1',
          date: '2026-03-01',
          status: 'H'
        },
        {
          student_id: 'student-2',
          date: '2026-03-01',
          status: 'A',
          reason: 'Sakit'
        }
      ]

      const result = validateAttendanceData(data)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('should return error when data is empty array', () => {
      const data: AttendanceData[] = []

      const result = validateAttendanceData(data)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('No attendance data provided')
    })

    test('should return error when student_id is missing', () => {
      const data: AttendanceData[] = [
        {
          student_id: '',
          date: '2026-03-01',
          status: 'H'
        }
      ]

      const result = validateAttendanceData(data)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing student_id in attendance data')
    })

    test('should return error when date is missing', () => {
      const data: AttendanceData[] = [
        {
          student_id: 'student-1',
          date: '',
          status: 'H'
        }
      ]

      const result = validateAttendanceData(data)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing date in attendance data')
    })

    test('should return error when status is invalid', () => {
      const data: AttendanceData[] = [
        {
          student_id: 'student-1',
          date: '2026-03-01',
          status: 'X' as any // Invalid status
        }
      ]

      const result = validateAttendanceData(data)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid status in attendance data')
    })

    test('should validate all valid status values (H, I, S, A)', () => {
      const data: AttendanceData[] = [
        { student_id: 's1', date: '2026-03-01', status: 'H' },
        { student_id: 's2', date: '2026-03-01', status: 'I' },
        { student_id: 's3', date: '2026-03-01', status: 'S' },
        { student_id: 's4', date: '2026-03-01', status: 'A' }
      ]

      const result = validateAttendanceData(data)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})
