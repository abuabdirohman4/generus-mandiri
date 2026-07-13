import { describe, it, expect, vi } from 'vitest'
import { fetchMeetingById, fetchMeetingsByClass, insertMeeting } from '../queries'

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

  describe('fetchMeetingsByClass (sm-2fux egress trim)', () => {
    function makeChain() {
      const select = vi.fn()
      const chain: any = {
        select,
        order: vi.fn(),
        limit: vi.fn(),
        lt: vi.fn(),
        contains: vi.fn(),
      }
      // make chainable + terminal resolves
      chain.order.mockReturnValue(chain)
      chain.limit.mockReturnValue(chain)
      chain.lt.mockReturnValue(chain)
      chain.contains.mockResolvedValue({ data: [], error: null })
      // when no classId, the awaited value is the chain itself → give it a then
      chain.then = (res: any) => Promise.resolve({ data: [], error: null }).then(res)
      select.mockReturnValue(chain)
      return chain
    }

    it('does NOT select student_snapshot or description (fat fields lazy-fetched on edit)', async () => {
      const chain = makeChain()
      const supabase = { from: vi.fn().mockReturnValue(chain) } as any

      await fetchMeetingsByClass(supabase, 'class-1', 20, undefined)

      expect(supabase.from).toHaveBeenCalledWith('meetings')
      const selectArg = chain.select.mock.calls[0][0] as string
      expect(selectArg).not.toContain('student_snapshot')
      expect(selectArg).not.toContain('description')
    })

    it('still selects topic (rendered in the meeting card)', async () => {
      const chain = makeChain()
      const supabase = { from: vi.fn().mockReturnValue(chain) } as any

      await fetchMeetingsByClass(supabase, undefined, 20, undefined)

      const selectArg = chain.select.mock.calls[0][0] as string
      expect(selectArg).toContain('topic')
    })
  })

  describe('fetchMeetingById (lazy-fetch source for edit modal)', () => {
    it('still selects student_snapshot + description (edit modal needs them)', async () => {
      const chain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }
      const supabase = { from: vi.fn().mockReturnValue(chain) } as any

      await fetchMeetingById(supabase, 'm1')

      const selectArg = chain.select.mock.calls[0][0] as string
      expect(selectArg).toContain('student_snapshot')
      expect(selectArg).toContain('description')
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
        activity_type_id: null,
        activity_level_id: null,
        start_time: null,
        check_time_enabled: false,
        allow_delegated_attendance: false
      })
      expect(result.data).toEqual({ id: 'new-id' })
    })
  })
})
