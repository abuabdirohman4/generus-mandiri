import { describe, it, expect, vi } from 'vitest'
import {
    fetchTeacherClasses,
    fetchClassesForValidation,
    deleteTeacherClassAssignments,
    insertTeacherClassAssignments,
    insertTeacherClassAssignment,
} from '../queries'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.then = (resolve: (v: any) => any) => Promise.resolve(returnValue).then(resolve)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── fetchTeacherClasses ──────────────────────────────────────────────────────

describe('fetchTeacherClasses', () => {
    it('queries teacher_classes with teacher_id filter', async () => {
        const supa = makeSupa({ data: [], error: null })
        const result = await fetchTeacherClasses(supa, 't1')
        expect(supa.from).toHaveBeenCalledWith('teacher_classes')
        expect(supa._chain.eq).toHaveBeenCalledWith('teacher_id', 't1')
        expect(result.data).toEqual([])
    })
})

// ─── fetchClassesForValidation ────────────────────────────────────────────────

describe('fetchClassesForValidation', () => {
    it('queries classes with org hierarchy for scope validation', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchClassesForValidation(supa, ['c1', 'c2'])
        expect(supa.from).toHaveBeenCalledWith('classes')
        expect(supa._chain.in).toHaveBeenCalledWith('id', ['c1', 'c2'])
    })
})

// ─── deleteTeacherClassAssignments ────────────────────────────────────────────

describe('deleteTeacherClassAssignments', () => {
    it('deletes all teacher_classes for a given teacher_id', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })
        await deleteTeacherClassAssignments(supa, 't1')
        expect(supa.from).toHaveBeenCalledWith('teacher_classes')
        expect(supa._chain.delete).toHaveBeenCalled()
        expect(supa._chain.eq).toHaveBeenCalledWith('teacher_id', 't1')
    })
})

// ─── insertTeacherClassAssignments ────────────────────────────────────────────

describe('insertTeacherClassAssignments', () => {
    it('inserts multiple teacher-class assignments', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.insert = vi.fn().mockResolvedValue({ error: null })

        const mappings = [
            { teacher_id: 't1', class_id: 'c1' },
            { teacher_id: 't1', class_id: 'c2' },
        ]
        await insertTeacherClassAssignments(supa, mappings)

        expect(supa.from).toHaveBeenCalledWith('teacher_classes')
        expect(supa._chain.insert).toHaveBeenCalledWith(mappings)
    })
})

// ─── insertTeacherClassAssignment ─────────────────────────────────────────────

describe('insertTeacherClassAssignment', () => {
    it('inserts a single teacher-class assignment', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.insert = vi.fn().mockResolvedValue({ error: null })

        await insertTeacherClassAssignment(supa, 't1', 'c1')

        expect(supa.from).toHaveBeenCalledWith('teacher_classes')
        expect(supa._chain.insert).toHaveBeenCalledWith([
            { teacher_id: 't1', class_id: 'c1' },
        ])
    })
})
