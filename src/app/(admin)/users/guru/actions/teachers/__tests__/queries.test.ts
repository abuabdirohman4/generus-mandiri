import { describe, it, expect, vi } from 'vitest'
import {
    fetchTeachers,
    insertTeacherProfile,
    updateTeacherProfile,
    updateTeacherKelompok,
    fetchClassesByIds,
    fetchClassesByIdsFlat,
    fetchKelompokByIds,
} from '../queries'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(returnValue)
    // The chain itself must be thenable so `await query` works
    chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
        Promise.resolve(returnValue).then(resolve, reject)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── fetchTeachers ────────────────────────────────────────────────────────────

describe('fetchTeachers', () => {
    it('queries profiles with role=teacher and order by username', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchTeachers(supa)
        expect(supa.from).toHaveBeenCalledWith('profiles')
        expect(supa._chain.eq).toHaveBeenCalledWith('role', 'teacher')
        expect(supa._chain.order).toHaveBeenCalledWith('username')
    })

    it('applies kelompok_id filter when provided', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchTeachers(supa, { kelompok_id: 'k1' })
        expect(supa._chain.eq).toHaveBeenCalledWith('kelompok_id', 'k1')
    })

    it('applies desa_id filter when kelompok_id not set', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchTeachers(supa, { desa_id: 'd1' })
        expect(supa._chain.eq).toHaveBeenCalledWith('desa_id', 'd1')
    })

    it('applies daerah_id filter when only daerah_id set', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchTeachers(supa, { daerah_id: 'dr1' })
        expect(supa._chain.eq).toHaveBeenCalledWith('daerah_id', 'dr1')
    })

    it('applies no extra filter when filter is undefined (superadmin)', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchTeachers(supa, undefined)
        // Only role='teacher' filter applied
        expect(supa._chain.eq).toHaveBeenCalledTimes(1)
        expect(supa._chain.eq).toHaveBeenCalledWith('role', 'teacher')
    })
})

// ─── insertTeacherProfile ─────────────────────────────────────────────────────

describe('insertTeacherProfile', () => {
    it('inserts into profiles with correct role and data', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.insert = vi.fn().mockResolvedValue({ error: null })

        await insertTeacherProfile(supa, 'user-1', {
            username: 'guru1',
            full_name: 'Guru Satu',
            email: 'g@g.com',
            daerah_id: 'dr1',
        })

        expect(supa.from).toHaveBeenCalledWith('profiles')
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'user-1',
                    username: 'guru1',
                    role: 'teacher',
                    daerah_id: 'dr1',
                }),
            ])
        )
    })

    it('sets default permissions when none provided', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.insert = vi.fn().mockResolvedValue({ error: null })

        await insertTeacherProfile(supa, 'u1', {
            username: 'g',
            full_name: 'G',
            email: 'g@g.com',
            daerah_id: 'd1',
        })

        const insertCall = supa._chain.insert.mock.calls[0][0][0]
        expect(insertCall.permissions).toEqual({
            can_archive_students: false,
            can_transfer_students: false,
            can_soft_delete_students: false,
            can_hard_delete_students: false,
        })
    })

    it('sets desa_id to null when not provided', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.insert = vi.fn().mockResolvedValue({ error: null })

        await insertTeacherProfile(supa, 'u1', {
            username: 'g',
            full_name: 'G',
            email: 'g@g.com',
            daerah_id: 'd1',
        })

        const insertCall = supa._chain.insert.mock.calls[0][0][0]
        expect(insertCall.desa_id).toBeNull()
    })
})

// ─── updateTeacherProfile ─────────────────────────────────────────────────────

describe('updateTeacherProfile', () => {
    it('updates profiles with correct data and id filter', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await updateTeacherProfile(supa, 'user-1', {
            username: 'updated',
            full_name: 'Updated Name',
            email: 'u@u.com',
            daerah_id: 'dr1',
        })

        expect(supa.from).toHaveBeenCalledWith('profiles')
        expect(supa._chain.update).toHaveBeenCalledWith(
            expect.objectContaining({ username: 'updated', full_name: 'Updated Name' })
        )
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'user-1')
    })
})

// ─── updateTeacherKelompok ────────────────────────────────────────────────────

describe('updateTeacherKelompok', () => {
    it('updates kelompok_id for teacher', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await updateTeacherKelompok(supa, 't1', 'k1')

        expect(supa.from).toHaveBeenCalledWith('profiles')
        expect(supa._chain.update).toHaveBeenCalledWith(
            expect.objectContaining({ kelompok_id: 'k1' })
        )
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 't1')
    })
})

// ─── fetchClassesByIds ────────────────────────────────────────────────────────

describe('fetchClassesByIds', () => {
    it('queries classes by id list with kelompok join', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchClassesByIds(supa, ['c1', 'c2'])
        expect(supa.from).toHaveBeenCalledWith('classes')
        expect(supa._chain.in).toHaveBeenCalledWith('id', ['c1', 'c2'])
    })
})

// ─── fetchClassesByIdsFlat ────────────────────────────────────────────────────

describe('fetchClassesByIdsFlat', () => {
    it('queries classes by id list without nested join (for RLS bypass)', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchClassesByIdsFlat(supa, ['c1'])
        expect(supa.from).toHaveBeenCalledWith('classes')
        expect(supa._chain.in).toHaveBeenCalledWith('id', ['c1'])
    })
})

// ─── fetchKelompokByIds ───────────────────────────────────────────────────────

describe('fetchKelompokByIds', () => {
    it('queries kelompok by id list', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchKelompokByIds(supa, ['k1', 'k2'])
        expect(supa.from).toHaveBeenCalledWith('kelompok')
        expect(supa._chain.in).toHaveBeenCalledWith('id', ['k1', 'k2'])
    })
})
