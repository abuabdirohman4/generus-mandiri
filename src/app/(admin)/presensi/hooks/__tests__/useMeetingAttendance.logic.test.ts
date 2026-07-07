import { describe, it, expect } from 'vitest'
import { buildAttendanceData, type AttendanceRosterStudent } from '../useMeetingAttendance.logic'

describe('buildAttendanceData', () => {
  const roster: AttendanceRosterStudent[] = [
    { id: 'student-1', name: 'Gebi', gender: 'P', class_name: 'SMP 1', class_id: 'class-1' },
    { id: 'student-2', name: 'Hafidh', gender: 'L', class_name: 'SMP 1', class_id: 'class-1' },
    { id: 'student-3', name: 'Rohman', gender: 'L', class_name: 'SMP 1', class_id: 'class-1' },
  ]

  it('keeps all roster students even when only one has an attendance log (QR scan case)', () => {
    const attendanceLogs = [
      { student_id: 'student-1', status: 'H' as const, check_in_time: null }
    ]

    const result = buildAttendanceData(roster, attendanceLogs)

    expect(Object.keys(result)).toHaveLength(3)
    expect(result['student-1'].status).toBe('H')
    expect(result['student-2'].status).toBe('A')
    expect(result['student-3'].status).toBe('A')
  })

  it('defaults every roster student to Alfa when there are no attendance logs at all', () => {
    const result = buildAttendanceData(roster, [])

    expect(Object.keys(result)).toHaveLength(3)
    expect(result['student-1'].status).toBe('A')
    expect(result['student-2'].status).toBe('A')
    expect(result['student-3'].status).toBe('A')
  })

  it('uses actual status from attendance logs for students who have one', () => {
    const attendanceLogs = [
      { student_id: 'student-1', status: 'H' as const, check_in_time: '2026-07-07T10:00:00Z' },
      { student_id: 'student-2', status: 'I' as const, reason: 'sakit' }
    ]

    const result = buildAttendanceData(roster, attendanceLogs)

    expect(result['student-1']).toEqual({ status: 'H', reason: undefined, check_in_time: '2026-07-07T10:00:00Z' })
    expect(result['student-2']).toEqual({ status: 'I', reason: 'sakit', check_in_time: undefined })
    expect(result['student-3'].status).toBe('A')
  })
})
