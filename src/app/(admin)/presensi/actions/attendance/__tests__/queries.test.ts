import { describe, it, expect, vi } from 'vitest'
import { upsertAttendanceLogs, fetchAttendanceByDate, fetchMeetingForScan, fetchAttendanceLogByStudentAndMeeting } from '../queries'

describe('Attendance Queries', () => {
  describe('upsertAttendanceLogs', () => {
    it('should upsert attendance logs', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: [], error: null })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: mockUpsert
        })
      } as any

      const records = [
        {
          student_id: '123',
          date: '2026-03-08',
          status: 'H' as const,
          recorded_by: 'teacher-1'
        }
      ]

      await upsertAttendanceLogs(mockSupabase, records)

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_logs')
      expect(mockUpsert).toHaveBeenCalledWith(records, { onConflict: 'student_id,date' })
    })

    it('should use meeting_id conflict key when meeting_id is present', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: [], error: null })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: mockUpsert
        })
      } as any

      const records = [
        {
          student_id: '123',
          date: '2026-03-08',
          meeting_id: 'meeting-1',
          status: 'H' as const,
          recorded_by: 'teacher-1'
        }
      ]

      await upsertAttendanceLogs(mockSupabase, records)

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_logs')
      expect(mockUpsert).toHaveBeenCalledWith(records, { onConflict: 'student_id,meeting_id' })
    })
  })

  describe('fetchAttendanceByDate', () => {
    it('should query attendance_logs with date filter', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder
      })
      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect
        })
      } as any

      await fetchAttendanceByDate(mockSupabase, '2026-03-08')

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_logs')
      expect(mockSelect).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('date', '2026-03-08')
    })
  })


  describe('fetchMeetingForScan', () => {
    it('should query meetings with student_snapshot for scan validation', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { teacher_id: 't1', class_ids: ['c1'], date: '2026-03-18', student_snapshot: ['s1', 's2'] },
        error: null
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockSupabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

      const result = await fetchMeetingForScan(mockSupabase, 'meeting-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(mockSelect).toHaveBeenCalledWith('teacher_id, class_ids, date, student_snapshot, start_time, check_time_enabled')
      expect(mockEq).toHaveBeenCalledWith('id', 'meeting-1')
      expect(result.data?.student_snapshot).toEqual(['s1', 's2'])
    })
  })

  describe('fetchAttendanceLogByStudentAndMeeting', () => {
    it('should query attendance_logs filtered by student_id and meeting_id', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })
      const mockSupabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

      await fetchAttendanceLogByStudentAndMeeting(mockSupabase, 'student-1', 'meeting-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_logs')
      expect(mockEq1).toHaveBeenCalledWith('student_id', 'student-1')
      expect(mockEq2).toHaveBeenCalledWith('meeting_id', 'meeting-1')
    })
  })
})
