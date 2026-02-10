import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAttendanceLogsInBatches } from '../batchFetching'
import { createMockSupabaseClient } from '@/test/mocks/supabase'

describe('batchFetching', () => {
    describe('fetchAttendanceLogsInBatches', () => {
        let mockSupabase: ReturnType<typeof createMockSupabaseClient>

        beforeEach(() => {
            mockSupabase = createMockSupabaseClient()
        })

        it('should return empty array when no meeting IDs provided', async () => {
            const result = await fetchAttendanceLogsInBatches(mockSupabase, [])

            expect(result.data).toEqual([])
            expect(result.error).toBeNull()
            expect(mockSupabase.from).not.toHaveBeenCalled()
        })

        it('should fetch attendance logs for single batch', async () => {
            const meetingIds = ['meeting-1', 'meeting-2']
            const mockAttendance = [
                { meeting_id: 'meeting-1', student_id: 'student-1', status: 'present' },
                { meeting_id: 'meeting-2', student_id: 'student-2', status: 'absent' },
            ]

            // Setup mock to return data
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({ data: mockAttendance, error: null }),
                }),
            })

            const result = await fetchAttendanceLogsInBatches(mockSupabase, meetingIds)

            expect(result.data).toEqual(mockAttendance)
            expect(result.error).toBeNull()
            expect(mockSupabase.from).toHaveBeenCalledWith('attendance_logs')
        })

        it('should split large arrays into batches of 10', async () => {
            // Create 25 meeting IDs (should create 3 batches: 10, 10, 5)
            const meetingIds = Array.from({ length: 25 }, (_, i) => `meeting-${i}`)
            const mockAttendance = meetingIds.map((id) => ({
                meeting_id: id,
                student_id: 'student-1',
                status: 'present',
            }))

            let callCount = 0
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockImplementation(() => {
                        const start = callCount * 10
                        const end = Math.min(start + 10, mockAttendance.length)
                        callCount++
                        return Promise.resolve({
                            data: mockAttendance.slice(start, end),
                            error: null,
                        })
                    }),
                }),
            })

            const result = await fetchAttendanceLogsInBatches(mockSupabase, meetingIds)

            expect(result.data).toHaveLength(25)
            expect(result.error).toBeNull()
            // Should be called 3 times (3 batches)
            expect(mockSupabase.from).toHaveBeenCalledTimes(3)
        })

        it('should handle errors from batch fetch', async () => {
            const meetingIds = ['meeting-1', 'meeting-2']
            const mockError = { message: 'Database error', code: '500' }

            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({ data: null, error: mockError }),
                }),
            })

            const result = await fetchAttendanceLogsInBatches(mockSupabase, meetingIds)

            expect(result.data).toBeNull()
            expect(result.error).toEqual(mockError)
        })

        it('should combine data from multiple batches correctly', async () => {
            const meetingIds = Array.from({ length: 15 }, (_, i) => `meeting-${i}`)

            let callCount = 0
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockImplementation((field: string, ids: string[]) => {
                        const batchData = ids.map((id: string) => ({
                            meeting_id: id,
                            student_id: `student-${callCount}`,
                            status: 'present',
                        }))
                        callCount++
                        return Promise.resolve({ data: batchData, error: null })
                    }),
                }),
            })

            const result = await fetchAttendanceLogsInBatches(mockSupabase, meetingIds)

            expect(result.data).toHaveLength(15)
            expect(result.error).toBeNull()
            // Verify all meeting IDs are present
            const returnedMeetingIds = result.data!.map((log) => log.meeting_id)
            expect(returnedMeetingIds).toEqual(meetingIds)
        })

        it('should handle exception during fetch', async () => {
            const meetingIds = ['meeting-1']
            const error = new Error('Network error')

            mockSupabase.from.mockImplementation(() => {
                throw error
            })

            const result = await fetchAttendanceLogsInBatches(mockSupabase, meetingIds)

            expect(result.data).toBeNull()
            expect(result.error).toEqual(error)
        })
    })
})
