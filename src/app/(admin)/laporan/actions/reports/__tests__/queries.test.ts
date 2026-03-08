import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    fetchUserProfile,
    fetchMeetingsForDateRange,
    fetchClassHierarchyMaps,
    fetchAttendanceLogs,
    fetchStudentDetails,
    fetchKelompokNames,
    fetchMeetingsWithFullDetails,
    fetchStudentClassesForEnrollment
} from '../queries'

// ─── Mock setup ───────────────────────────────────────────────────────────────

function makeMockChain(resolveValue: any) {
    const chain: any = {}
    const terminal = vi.fn().mockResolvedValue(resolveValue)

        ;['select', 'eq', 'in', 'gte', 'lte', 'order'].forEach(method => {
            chain[method] = vi.fn().mockReturnValue(chain)
        })
    chain.single = vi.fn().mockResolvedValue(resolveValue)
    chain.order = terminal

    return chain
}

describe('queries.ts – Layer 1', () => {

    // ─── fetchUserProfile ──────────────────────────────────────────────────────

    describe('fetchUserProfile', () => {
        it('queries profiles table with correct userId', async () => {
            const chain = makeMockChain({ data: { id: 'u1', role: 'admin' }, error: null })
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchUserProfile(supabase, 'u1')

            expect(supabase.from).toHaveBeenCalledWith('profiles')
            expect(chain.eq).toHaveBeenCalledWith('id', 'u1')
            expect(chain.single).toHaveBeenCalled()
        })
    })

    // ─── fetchMeetingsForDateRange ─────────────────────────────────────────────

    describe('fetchMeetingsForDateRange', () => {
        it('applies gte/lte date filters', async () => {
            const chain = makeMockChain({ data: [], error: null })
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchMeetingsForDateRange(supabase, { date: { gte: '2024-01-01', lte: '2024-01-31' } })

            expect(supabase.from).toHaveBeenCalledWith('meetings')
            expect(chain.gte).toHaveBeenCalledWith('date', '2024-01-01')
            expect(chain.lte).toHaveBeenCalledWith('date', '2024-01-31')
            expect(chain.order).toHaveBeenCalledWith('date')
        })

        it('applies meeting type filter when provided', async () => {
            const chain = makeMockChain({ data: [], error: null })
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchMeetingsForDateRange(supabase, { date: {} }, 'hadir,remaja')

            expect(chain.in).toHaveBeenCalledWith('meeting_type_code', ['hadir', 'remaja'])
        })

        it('skips meeting type filter when not provided', async () => {
            const chain = makeMockChain({ data: [], error: null })
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchMeetingsForDateRange(supabase, { date: {} })

            expect(chain.in).not.toHaveBeenCalled()
        })
    })

    // ─── fetchClassHierarchyMaps ───────────────────────────────────────────────

    describe('fetchClassHierarchyMaps', () => {
        it('returns empty immediately for empty classIds', async () => {
            const supabase = { from: vi.fn() } as any

            const result = await fetchClassHierarchyMaps(supabase, [])

            expect(result).toEqual({ data: [], error: null })
            expect(supabase.from).not.toHaveBeenCalled()
        })

        it('queries classes table with given IDs', async () => {
            const chain = makeMockChain({ data: [], error: null })
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchClassHierarchyMaps(supabase, ['class-1', 'class-2'])

            expect(supabase.from).toHaveBeenCalledWith('classes')
            expect(chain.in).toHaveBeenCalledWith('id', ['class-1', 'class-2'])
        })
    })

    // ─── fetchAttendanceLogs ───────────────────────────────────────────────────

    describe('fetchAttendanceLogs', () => {
        it('returns empty immediately for empty meetingIds', async () => {
            const supabase = { from: vi.fn() } as any

            const result = await fetchAttendanceLogs(supabase, [])

            expect(result).toEqual({ data: [], error: null })
            expect(supabase.from).not.toHaveBeenCalled()
        })
    })

    // ─── fetchStudentDetails ───────────────────────────────────────────────────

    describe('fetchStudentDetails', () => {
        it('returns empty immediately for empty studentIds', async () => {
            const supabase = { from: vi.fn() } as any

            const result = await fetchStudentDetails(supabase, [])

            expect(result).toEqual({ data: [], error: null })
            expect(supabase.from).not.toHaveBeenCalled()
        })

        it('queries students table with nested relations', async () => {
            const chain = makeMockChain({ data: [], error: null })
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchStudentDetails(supabase, ['s1'])

            expect(supabase.from).toHaveBeenCalledWith('students')
            expect(chain.in).toHaveBeenCalledWith('id', ['s1'])
        })
    })

    // ─── fetchKelompokNames ────────────────────────────────────────────────────

    describe('fetchKelompokNames', () => {
        it('queries all kelompok with id and name', async () => {
            const chain: any = {
                select: vi.fn().mockResolvedValue({ data: [], error: null })
            }
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchKelompokNames(supabase)

            expect(supabase.from).toHaveBeenCalledWith('kelompok')
            expect(chain.select).toHaveBeenCalledWith('id, name')
        })
    })

    // ─── fetchStudentClassesForEnrollment ──────────────────────────────────────

    describe('fetchStudentClassesForEnrollment', () => {
        it('returns empty immediately for empty classIds', async () => {
            const supabase = { from: vi.fn() } as any

            const result = await fetchStudentClassesForEnrollment(supabase, [])

            expect(result).toEqual({ data: [], error: null })
            expect(supabase.from).not.toHaveBeenCalled()
        })

        it('queries student_classes table with class IDs', async () => {
            const chain = makeMockChain({ data: [], error: null })
            const supabase = { from: vi.fn().mockReturnValue(chain) } as any

            await fetchStudentClassesForEnrollment(supabase, ['c1', 'c2'])

            expect(supabase.from).toHaveBeenCalledWith('student_classes')
            expect(chain.in).toHaveBeenCalledWith('class_id', ['c1', 'c2'])
        })
    })

})
