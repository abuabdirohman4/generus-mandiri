import { describe, it, expect } from 'vitest'
import { filterPromotableMasters, resolveTargetClassInKelompok } from '../logic'

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
