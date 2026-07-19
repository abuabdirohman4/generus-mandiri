import { describe, it, expect } from 'vitest'
import { filterPromotableMasters, filterPromotableOrCarryableMasters, isCarryOnlyMaster, resolveTargetClassInKelompok, filterSourcesByWindow } from '../logic'
import type { PromotionSourceOption } from '@/types/promotion'

describe('filterPromotableMasters', () => {
    const masters = [
        { id: 'm1', name: 'Kelas 1', promote_to_class_master_id: 'm2' },
        { id: 'm2', name: 'Kelas 2', promote_to_class_master_id: 'm3' },
        { id: 'ou', name: 'Orang Tua', promote_to_class_master_id: null },
        { id: 'pg', name: 'Pengurus', promote_to_class_master_id: null },
    ]

    it('keeps only masters that have a promote target', () => {
        const result = filterPromotableMasters(masters)
        expect(result.map(m => m.id)).toEqual(['m1', 'm2'])
    })

    it('drops all stoppers (promote_to null)', () => {
        const result = filterPromotableMasters(masters)
        expect(result.find(m => m.id === 'ou')).toBeUndefined()
        expect(result.find(m => m.id === 'pg')).toBeUndefined()
    })

    it('returns empty when all are stoppers', () => {
        expect(filterPromotableMasters([{ id: 'x', name: 'X', promote_to_class_master_id: null }])).toEqual([])
    })
})

describe('resolveTargetClassInKelompok', () => {
    const classes = [
        { class_id: 'c1', class_master_id: 'm2', kelompok_id: 'kA' }, // Kelas 2 di kelompok A
        { class_id: 'c2', class_master_id: 'm2', kelompok_id: 'kB' }, // Kelas 2 di kelompok B
        { class_id: 'c3', class_master_id: 'm3', kelompok_id: 'kA' }, // Kelas 3 di kelompok A
    ]

    it('returns class_id of target master in the SAME kelompok', () => {
        expect(resolveTargetClassInKelompok('m2', 'kA', classes)).toBe('c1')
        expect(resolveTargetClassInKelompok('m2', 'kB', classes)).toBe('c2')
    })

    it('does not leak across kelompok', () => {
        // target m3 hanya ada di kelompok A — kelompok B harus null
        expect(resolveTargetClassInKelompok('m3', 'kB', classes)).toBeNull()
    })

    it('returns null when target master is null (stopper)', () => {
        expect(resolveTargetClassInKelompok(null, 'kA', classes)).toBeNull()
    })

    it('returns null when no class of that master exists in the kelompok', () => {
        expect(resolveTargetClassInKelompok('m99', 'kA', classes)).toBeNull()
    })
})

describe('filterSourcesByWindow', () => {
    const sources: PromotionSourceOption[] = [
        { kind: 'class_master', id: 'm1', name: 'Kelas 1', to_name: 'Kelas 2' },
        { kind: 'class_master', id: 'm2', name: 'Pra Nikah 1', to_name: 'Pra Nikah 2' },
        { kind: 'class', id: 'c1', name: 'SMA 1 - Nambo', to_name: 'SMA 2' },
        { kind: 'class', id: 'c2', name: 'Pra Nikah 3 - Nambo', to_name: 'Pra Nikah 4' },
    ]

    it('returns all sources when window is active, regardless of role', () => {
        const result1 = filterSourcesByWindow(sources, { isTeacherKelompok: true, isActive: true })
        expect(result1).toHaveLength(4)

        const result2 = filterSourcesByWindow(sources, { isTeacherKelompok: false, isActive: true })
        expect(result2).toHaveLength(4)
    })

    it('returns all sources when window is closed BUT user is NOT teacher kelompok (VIP bypass)', () => {
        const result = filterSourcesByWindow(sources, { isTeacherKelompok: false, isActive: false })
        expect(result).toHaveLength(4)
    })

    it('returns ONLY Pra Nikah sources when window is closed AND user is teacher kelompok', () => {
        const result = filterSourcesByWindow(sources, { isTeacherKelompok: true, isActive: false })
        expect(result).toHaveLength(2)
        expect(result.map(r => r.id)).toEqual(['m2', 'c2'])
    })
})


describe('isCarryOnlyMaster', () => {
    it('true for stopper akademik (muda_mudi, promote NULL) — e.g. Pra Nikah 4', () => {
        expect(isCarryOnlyMaster({ id: 'pn4', name: 'Pra Nikah 4', promote_to_class_master_id: null, category_group: 'muda_mudi' })).toBe(true)
    })
    it('true for stopper akademik caberawit', () => {
        expect(isCarryOnlyMaster({ id: 'c6', name: 'Kelas 6', promote_to_class_master_id: null, category_group: 'caberawit' })).toBe(true)
    })
    it('false for non-akademik stopper (orang_tua)', () => {
        expect(isCarryOnlyMaster({ id: 'ou', name: 'Orang Tua', promote_to_class_master_id: null, category_group: 'orang_tua' })).toBe(false)
    })
    it('false for null category stopper (Lainnya)', () => {
        expect(isCarryOnlyMaster({ id: 'x', name: 'Lainnya', promote_to_class_master_id: null, category_group: null })).toBe(false)
    })
    it('false for promotable master (punya tujuan)', () => {
        expect(isCarryOnlyMaster({ id: 'm1', name: 'Kelas 1', promote_to_class_master_id: 'm2', category_group: 'muda_mudi' })).toBe(false)
    })
})

describe('filterPromotableOrCarryableMasters', () => {
    const masters = [
        { id: 'm1', name: 'Kelas 1', promote_to_class_master_id: 'm2', category_group: 'muda_mudi' },
        { id: 'pn4', name: 'Pra Nikah 4', promote_to_class_master_id: null, category_group: 'muda_mudi' },
        { id: 'ou', name: 'Orang Tua', promote_to_class_master_id: null, category_group: 'orang_tua' },
        { id: 'x', name: 'Lainnya', promote_to_class_master_id: null, category_group: null },
    ]
    it('keeps promotable + carry-only stopper, drops non-akademik stopper', () => {
        const result = filterPromotableOrCarryableMasters(masters)
        expect(result.map(m => m.id).sort()).toEqual(['m1', 'pn4'])
    })
})
