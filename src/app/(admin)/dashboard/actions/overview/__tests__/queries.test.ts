import { describe, it, expect, vi } from 'vitest'
import {
    countStudents,
    countClasses,
    fetchMeetingsForOverview,
    fetchAttendanceLogsForOverview,
} from '../queries'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnCount: number | null = 0, returnData: any[] | null = []) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.from = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
        Promise.resolve({ data: returnData, error: null, count: returnCount }).then(resolve, reject)
    return chain
}

function makeSupa(returnCount: number | null = 0, returnData: any[] | null = []) {
    const chain = makeChain(returnCount, returnData)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── countStudents ────────────────────────────────────────────────────────────

describe('countStudents', () => {
    it('queries students count without filter when no studentIds', async () => {
        const supa = makeSupa(42)
        const result = await countStudents(supa, undefined)
        expect(supa.from).toHaveBeenCalledWith('students')
        expect(result).toBe(42)
    })

    it('returns 0 immediately when studentIds is empty array', async () => {
        const supa = makeSupa(999)
        const result = await countStudents(supa, [])
        expect(result).toBe(0)
        expect(supa.from).not.toHaveBeenCalled()
    })

    it('queries in chunks when studentIds provided', async () => {
        // 250 student IDs → 2 chunks (200 + 50)
        const ids = Array.from({ length: 250 }, (_, i) => `s${i}`)
        const chain: any = { ...makeChain(50, null), in: vi.fn().mockReturnValue({}) }
        chain.in = vi.fn().mockReturnValue({
            then: (resolve: (v: any) => any) =>
                Promise.resolve({ count: 50, error: null }).then(resolve),
        })
        chain.select = vi.fn().mockReturnValue(chain)
        const supa = { from: vi.fn().mockReturnValue(chain), _chain: chain }
        const result = await countStudents(supa as any, ids)
        // 2 chunks × 50 = 100 (sum of mocked 50 per chunk)
        expect(result).toBe(100)
    })
})

// ─── countClasses ─────────────────────────────────────────────────────────────

describe('countClasses', () => {
    it('queries classes count without filter when no classIds', async () => {
        const supa = makeSupa(10)
        const result = await countClasses(supa, undefined)
        expect(supa.from).toHaveBeenCalledWith('classes')
        expect(result).toBe(10)
    })

    it('returns 0 immediately when classIds is empty array', async () => {
        const supa = makeSupa(999)
        const result = await countClasses(supa, [])
        expect(result).toBe(0)
        expect(supa.from).not.toHaveBeenCalled()
    })
})

// ─── fetchMeetingsForOverview ─────────────────────────────────────────────────

describe('fetchMeetingsForOverview', () => {
    it('queries meetings without class filter when no classIds provided', async () => {
        const supa = makeSupa(null, [])
        await fetchMeetingsForOverview(supa, undefined)
        expect(supa.from).toHaveBeenCalledWith('meetings')
        expect(supa._chain.in).not.toHaveBeenCalled()
        expect(supa._chain.order).toHaveBeenCalledWith('date', { ascending: false })
    })

    it('applies class_id filter when classIds provided', async () => {
        const supa = makeSupa(null, [])
        await fetchMeetingsForOverview(supa, ['c1', 'c2'])
        expect(supa._chain.in).toHaveBeenCalledWith('class_id', ['c1', 'c2'])
    })
})

// ─── fetchAttendanceLogsForOverview ───────────────────────────────────────────

describe('fetchAttendanceLogsForOverview', () => {
    it('queries all attendance logs without filter when no studentIds', async () => {
        const supa = makeSupa(null, [{ date: '2026-03-01', status: 'H' }])
        const result = await fetchAttendanceLogsForOverview(supa, '2026-02-08', undefined)
        expect(supa.from).toHaveBeenCalledWith('attendance_logs')
        expect(supa._chain.gte).toHaveBeenCalledWith('date', '2026-02-08')
        expect(result).toHaveLength(1)
    })

    it('returns empty array immediately when studentIds is empty', async () => {
        const supa = makeSupa(null, [])
        const result = await fetchAttendanceLogsForOverview(supa, '2026-02-08', [])
        expect(result).toHaveLength(0)
        expect(supa.from).not.toHaveBeenCalled()
    })
})
