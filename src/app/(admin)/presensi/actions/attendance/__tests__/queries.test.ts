import { describe, it, expect, vi } from 'vitest'
import { upsertAttendanceLogs, fetchAttendanceByDate } from '../queries'

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
})
