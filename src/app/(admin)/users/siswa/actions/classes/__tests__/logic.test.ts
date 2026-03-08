import { describe, it, expect } from 'vitest'
import { sortClassesByMasterOrder } from '../logic'

describe('sortClassesByMasterOrder', () => {
    it('sorts by minimum sort_order ascending', () => {
        const classes = [
            { id: 'c1', name: 'Kelas C', class_master_mappings: [{ class_master: { sort_order: 3 } }] },
            { id: 'c2', name: 'Kelas A', class_master_mappings: [{ class_master: { sort_order: 1 } }] },
            { id: 'c3', name: 'Kelas B', class_master_mappings: [{ class_master: { sort_order: 2 } }] },
        ]
        const result = sortClassesByMasterOrder(classes)
        expect(result.map(c => c.id)).toEqual(['c2', 'c3', 'c1'])
    })

    it('places classes with no mappings at the end (sort_order 9999)', () => {
        const classes = [
            { id: 'c1', name: 'No Mapping', class_master_mappings: [] },
            { id: 'c2', name: 'Has Mapping', class_master_mappings: [{ class_master: { sort_order: 1 } }] },
        ]
        const result = sortClassesByMasterOrder(classes)
        expect(result[0].id).toBe('c2')
        expect(result[1].id).toBe('c1')
    })

    it('uses class name as tie-breaker for same sort_order', () => {
        const classes = [
            { id: 'c1', name: 'Zebra', class_master_mappings: [{ class_master: { sort_order: 1 } }] },
            { id: 'c2', name: 'Apple', class_master_mappings: [{ class_master: { sort_order: 1 } }] },
        ]
        const result = sortClassesByMasterOrder(classes)
        expect(result[0].name).toBe('Apple')
        expect(result[1].name).toBe('Zebra')
    })

    it('uses minimum sort_order when class has multiple mappings', () => {
        const classes = [
            {
                id: 'c1', name: 'Multi', class_master_mappings: [
                    { class_master: { sort_order: 5 } },
                    { class_master: { sort_order: 2 } }, // min is 2
                ]
            },
            { id: 'c2', name: 'Single', class_master_mappings: [{ class_master: { sort_order: 3 } }] },
        ]
        const result = sortClassesByMasterOrder(classes)
        expect(result[0].id).toBe('c1') // min(5,2)=2 < 3
        expect(result[1].id).toBe('c2')
    })

    it('handles empty array', () => {
        expect(sortClassesByMasterOrder([])).toEqual([])
    })

    it('ignores non-number sort_order values', () => {
        const classes = [
            { id: 'c1', name: 'Bad Sort', class_master_mappings: [{ class_master: { sort_order: null } }] },
            { id: 'c2', name: 'Good Sort', class_master_mappings: [{ class_master: { sort_order: 1 } }] },
        ]
        const result = sortClassesByMasterOrder(classes)
        expect(result[0].id).toBe('c2') // valid sort wins over null (→ 9999)
    })
})
