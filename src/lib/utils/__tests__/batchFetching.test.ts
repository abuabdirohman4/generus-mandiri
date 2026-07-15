import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAttendanceLogsInBatches, fetchInBatchesWithFilter } from '../batchFetching'
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
                        const start = callCount * 3
                        const end = Math.min(start + 3, mockAttendance.length)
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
            // Should be called 9 times (25 items / 3 = 8 full batches + 1 partial)
            expect(mockSupabase.from).toHaveBeenCalledTimes(9)
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


describe('fetchInBatchesWithFilter', () => {
    it('returns empty array when chunkIds is empty', async () => {
        const mockSupabase = { from: vi.fn() }
        const result = await fetchInBatchesWithFilter(mockSupabase, 'student_material_progress', 'student_id', [], 'student_id, nilai')
        expect(result.data).toEqual([])
        expect(result.error).toBeNull()
        expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('chunks large array and unions results (chunk-union == non-chunk)', async () => {
        // 250 student IDs → should split into 3 chunks (100, 100, 50)
        const studentIds = Array.from({ length: 250 }, (_, i) => `s-${i}`)
        const allRows = studentIds.map(id => ({ student_id: id, material_item_id: 'm1', nilai: 80, done: false }))

        const mockMaterialIds = ['m1', 'm2']
        let callCount = 0
        const mockClient = {
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockImplementation((_col: string, ids: string[]) => ({
                        in: vi.fn().mockResolvedValue({
                            data: allRows.filter(r => ids.includes(r.student_id)),
                            error: null,
                        }),
                    })),
                }),
            }),
        }

        const result = await fetchInBatchesWithFilter(
            mockClient,
            'student_material_progress',
            'student_id',
            studentIds,
            'student_id, material_item_id, nilai, done',
            (q) => q.in('material_item_id', mockMaterialIds),
        )

        expect(result.error).toBeNull()
        expect(result.data).toHaveLength(250)
        // All student IDs present
        const returnedIds = result.data!.map((r: any) => r.student_id).sort()
        expect(returnedIds).toEqual([...studentIds].sort())
        // Called 3 times (chunks of 100, 100, 50)
        expect(mockClient.from).toHaveBeenCalledTimes(3)
    })

    it('propagates error from any chunk', async () => {
        const studentIds = Array.from({ length: 5 }, (_, i) => `s-${i}`)
        const mockError = { message: 'DB error', code: '500' }

        const mockClient = {
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                        in: vi.fn().mockResolvedValue({ data: null, error: mockError }),
                    }),
                }),
            }),
        }

        const result = await fetchInBatchesWithFilter(
            mockClient,
            'student_material_progress',
            'student_id',
            studentIds,
            'student_id, nilai',
            (q) => q.in('material_item_id', ['m1']),
        )

        expect(result.data).toBeNull()
        expect(result.error).toEqual(mockError)
    })

    it('single chunk (<= chunkSize) produces same result as direct query', async () => {
        const studentIds = ['s1', 's2', 's3']
        const expectedRows = studentIds.map(id => ({ student_id: id, nilai: 90, done: true }))

        const mockClient = {
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                        in: vi.fn().mockResolvedValue({ data: expectedRows, error: null }),
                    }),
                }),
            }),
        }

        const result = await fetchInBatchesWithFilter(
            mockClient,
            'student_material_progress',
            'student_id',
            studentIds,
            'student_id, nilai, done',
            (q) => q.in('material_item_id', ['m1', 'm2']),
        )

        expect(result.data).toEqual(expectedRows)
        expect(result.error).toBeNull()
        expect(mockClient.from).toHaveBeenCalledTimes(1)
    })
})
