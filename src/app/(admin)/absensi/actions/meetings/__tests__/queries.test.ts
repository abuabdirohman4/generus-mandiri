import { describe, it, expect, vi } from 'vitest'
import { fetchMeetingById, insertMeeting } from '../queries'

describe('Meeting Queries', () => {
  describe('fetchMeetingById', () => {
    it('should query meetings table with correct id', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect
        })
      } as any

      await fetchMeetingById(mockSupabase, 'test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  describe('insertMeeting', () => {
    it('should insert meeting and return data', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })
      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: mockInsert
        })
      } as any

      const meetingData = {
        classIds: ['class-1'],
        kelompokIds: ['kelompok-1'],
        title: 'Test Meeting',
        date: '2026-03-08',
        topic: 'Test Topic',
        description: 'Test Description',
        studentIds: ['student-1'],
        meetingTypeCode: 'regular'
      }

      const result = await insertMeeting(mockSupabase, meetingData, 'user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(mockInsert).toHaveBeenCalledWith({
        class_id: 'class-1',
        class_ids: ['class-1'],
        kelompok_ids: ['kelompok-1'],
        teacher_id: 'user-123',
        title: 'Test Meeting',
        date: '2026-03-08',
        topic: 'Test Topic',
        description: 'Test Description',
        student_snapshot: ['student-1'],
        meeting_type_code: 'regular'
        // Note: created_by field removed - teacher_id tracks meeting creator
      })
      expect(result.data).toEqual({ id: 'new-id' })
    })
  })
})
