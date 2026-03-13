import { describe, it, expect, vi } from 'vitest'
import {
    fetchClassesWithOrg,
    fetchMeetingsForMonitoring,
    fetchEnrollments,
    fetchCombinedEnrollments,
} from '../queries'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: [], error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.lte = vi.fn().mockReturnValue(chain)
    chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
        Promise.resolve(returnValue).then(resolve, reject)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── fetchClassesWithOrg ──────────────────────────────────────────────────────

describe('fetchClassesWithOrg', () => {
    it('fetches all classes without filter when classIds is undefined', async () => {
        const supa = makeSupa({ data: [], error: null })
        const result = await fetchClassesWithOrg(supa, undefined)
        expect(supa.from).toHaveBeenCalledWith('classes')
        expect(supa._chain.in).not.toHaveBeenCalled()
        expect(result).toEqual([])
    })

    it('returns empty array immediately when classIds is empty', async () => {
        const supa = makeSupa()
        const result = await fetchClassesWithOrg(supa, [])
        expect(result).toHaveLength(0)
        expect(supa.from).not.toHaveBeenCalled()
    })

    it('fetches classes filtered by classIds using chunked queries', async () => {
        const supa = makeSupa({ data: [{ id: 'c1' }], error: null })
        const result = await fetchClassesWithOrg(supa, ['c1', 'c2'])
        expect(supa.from).toHaveBeenCalledWith('classes')
        expect(supa._chain.in).toHaveBeenCalledWith('id', ['c1', 'c2'])
        expect(result).toHaveLength(1)
    })
})

// ─── fetchMeetingsForMonitoring ───────────────────────────────────────────────

describe('fetchMeetingsForMonitoring', () => {
    it('queries meetings by date range using admin client', async () => {
        const adminClient = makeSupa({ data: [], error: null })
        await fetchMeetingsForMonitoring(adminClient, '2026-03-01', '2026-03-31')
        expect(adminClient.from).toHaveBeenCalledWith('meetings')
        expect(adminClient._chain.gte).toHaveBeenCalledWith('date', '2026-03-01')
        expect(adminClient._chain.lte).toHaveBeenCalledWith('date', '2026-03-31')
    })
})

// ─── fetchEnrollments ─────────────────────────────────────────────────────────

describe('fetchEnrollments', () => {
    it('returns empty array when classIds is empty', async () => {
        const supa = makeSupa()
        const result = await fetchEnrollments(supa, [])
        expect(result).toHaveLength(0)
        expect(supa.from).not.toHaveBeenCalled()
    })

    it('fetches enrollments for given class IDs', async () => {
        const supa = makeSupa({ data: [{ student_id: 's1', class_id: 'c1' }], error: null })
        const result = await fetchEnrollments(supa, ['c1'])
        expect(supa.from).toHaveBeenCalledWith('student_classes')
        expect(supa._chain.in).toHaveBeenCalledWith('class_id', ['c1'])
        expect(result).toHaveLength(1)
    })

    it('applies studentIds filter when provided', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchEnrollments(supa, ['c1'], ['s1', 's2'])
        expect(supa._chain.in).toHaveBeenCalledWith('class_id', ['c1'])
        expect(supa._chain.in).toHaveBeenCalledWith('student_id', ['s1', 's2'])
    })
})

// ─── fetchCombinedEnrollments ─────────────────────────────────────────────────

describe('fetchCombinedEnrollments', () => {
    it('queries student_classes for combined class group', async () => {
        const supa = makeSupa({ data: [{ student_id: 's1' }], error: null })
        const result = await fetchCombinedEnrollments(supa, ['c1', 'c2'])
        expect(supa.from).toHaveBeenCalledWith('student_classes')
        expect(supa._chain.in).toHaveBeenCalledWith('class_id', ['c1', 'c2'])
        expect(result.data).toHaveLength(1)
    })
})
