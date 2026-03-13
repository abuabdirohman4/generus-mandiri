import { describe, it, expect } from 'vitest'
import {
    filterCaberawitClasses,
    stripClassMasterJoinArtifact,
    deduplicateMaterialItemsFromJunction,
    mapClassMappingsToItems,
    extractClassMastersFromItems,
    sortAssignmentItems,
    buildDayItemsPayload,
    buildBulkMappingsPayload,
    itemHasDependencies,
    mapItemErrorMessage,
} from '../logic'

// ─── filterCaberawitClasses ───────────────────────────────────────────────────

describe('filterCaberawitClasses', () => {
    it('keeps CABERAWIT classes', () => {
        const data = [
            { id: 'c1', name: 'Kelas A', category: { code: 'CABERAWIT' } },
            { id: 'c2', name: 'Kelas B', category: { code: 'SMP' } },
        ]
        const result = filterCaberawitClasses(data)
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('c1')
    })

    it('keeps PAUD classes', () => {
        const data = [{ id: 'c1', name: 'TK', category: { code: 'PAUD' } }]
        expect(filterCaberawitClasses(data)).toHaveLength(1)
    })

    it('case-insensitive match (lowercase code)', () => {
        const data = [{ id: 'c1', name: 'TK', category: { code: 'caberawit' } }]
        expect(filterCaberawitClasses(data)).toHaveLength(1)
    })

    it('handles array category format from Supabase', () => {
        const data = [{ id: 'c1', name: 'K', category: [{ code: 'CABERAWIT' }] }]
        expect(filterCaberawitClasses(data)).toHaveLength(1)
    })

    it('filters out classes with no category', () => {
        const data = [{ id: 'c1', name: 'K', category: null }]
        expect(filterCaberawitClasses(data)).toHaveLength(0)
    })

    it('returns empty array for empty input', () => {
        expect(filterCaberawitClasses([])).toHaveLength(0)
    })
})

// ─── stripClassMasterJoinArtifact ─────────────────────────────────────────────

describe('stripClassMasterJoinArtifact', () => {
    it('removes material_item_classes key', () => {
        const data = [{ id: 'c1', name: 'Kelas', material_item_classes: [{ id: 'x' }] }]
        const result = stripClassMasterJoinArtifact(data)
        expect(result[0]).not.toHaveProperty('material_item_classes')
        expect(result[0].id).toBe('c1')
    })

    it('handles multiple items', () => {
        const data = [
            { id: 'c1', name: 'K1', material_item_classes: [] },
            { id: 'c2', name: 'K2', material_item_classes: [] },
        ]
        const result = stripClassMasterJoinArtifact(data)
        expect(result).toHaveLength(2)
        result.forEach(r => expect(r).not.toHaveProperty('material_item_classes'))
    })
})

// ─── deduplicateMaterialItemsFromJunction ─────────────────────────────────────

describe('deduplicateMaterialItemsFromJunction', () => {
    it('deduplicates item appearing in multiple class rows', () => {
        const data = [
            { material_item: { id: 'i1', name: 'Item 1' }, class_master: { id: 'c1' } },
            { material_item: { id: 'i1', name: 'Item 1' }, class_master: { id: 'c2' } },
        ]
        const result = deduplicateMaterialItemsFromJunction(data)
        expect(result).toHaveLength(1)
    })

    it('merges classes for duplicated items', () => {
        const data = [
            { material_item: { id: 'i1', name: 'I' }, class_master: { id: 'c1' } },
            { material_item: { id: 'i1', name: 'I' }, class_master: { id: 'c2' } },
        ]
        const result = deduplicateMaterialItemsFromJunction(data)
        expect((result[0] as any).classes).toHaveLength(2)
    })

    it('filters out null/undefined items', () => {
        const data = [
            { material_item: null, class_master: { id: 'c1' } },
            { material_item: { id: 'i1', name: 'I' }, class_master: { id: 'c1' } },
        ]
        const result = deduplicateMaterialItemsFromJunction(data)
        expect(result).toHaveLength(1)
    })

    it('returns empty for empty input', () => {
        expect(deduplicateMaterialItemsFromJunction([])).toHaveLength(0)
    })
})

// ─── mapClassMappingsToItems ──────────────────────────────────────────────────

describe('mapClassMappingsToItems', () => {
    it('joins mappings to correct items', () => {
        const items = [{ id: 'i1', name: 'Item 1' }, { id: 'i2', name: 'Item 2' }]
        const mappings = [
            { material_item_id: 'i1', semester: 1, class_master: { id: 'c1' } },
            { material_item_id: 'i2', semester: 2, class_master: { id: 'c2' } },
        ]
        const result = mapClassMappingsToItems(items, mappings)
        expect((result[0] as any).classes).toHaveLength(1)
        expect((result[1] as any).classes).toHaveLength(1)
    })

    it('returns empty classes when no mappings match', () => {
        const result = mapClassMappingsToItems([{ id: 'i1' }], [])
        expect((result[0] as any).classes).toHaveLength(0)
    })

    it('includes semester in class info', () => {
        const items = [{ id: 'i1' }]
        const mappings = [{ material_item_id: 'i1', semester: 2, class_master: { id: 'c1' } }]
        const result = mapClassMappingsToItems(items, mappings)
        expect((result[0] as any).classes[0].semester).toBe(2)
    })
})

// ─── extractClassMastersFromItems ─────────────────────────────────────────────

describe('extractClassMastersFromItems', () => {
    it('extracts class_master from material_item_classes', () => {
        const data = [{
            id: 'i1',
            name: 'Item',
            material_item_classes: [
                { class_master: { id: 'c1', name: 'K1' } },
                { class_master: null }, // null should be filtered
            ]
        }]
        const result = extractClassMastersFromItems(data)
        expect((result[0] as any).classes).toHaveLength(1)
    })

    it('sets classes to empty when material_item_classes is undefined', () => {
        const data = [{ id: 'i1', name: 'Item' }]
        const result = extractClassMastersFromItems(data)
        expect((result[0] as any).classes).toHaveLength(0)
    })
})

// ─── sortAssignmentItems ──────────────────────────────────────────────────────

describe('sortAssignmentItems', () => {
    it('sorts items by display_order ascending', () => {
        const data = [{
            id: 'a1',
            items: [{ id: 'x3', display_order: 3 }, { id: 'x1', display_order: 1 }, { id: 'x2', display_order: 2 }]
        }]
        const result = sortAssignmentItems(data)
        expect(result[0].items.map((i: any) => i.display_order)).toEqual([1, 2, 3])
    })

    it('returns empty items if assignment has no items', () => {
        const data = [{ id: 'a1', items: undefined }]
        const result = sortAssignmentItems(data)
        expect(result[0].items).toEqual([])
    })
})

// ─── buildDayItemsPayload ─────────────────────────────────────────────────────

describe('buildDayItemsPayload', () => {
    it('builds correct payload with all fields', () => {
        const result = buildDayItemsPayload('a1', [
            { material_item_id: 'i1', display_order: 1, custom_content: 'Custom' },
        ])
        expect(result[0]).toEqual({
            assignment_id: 'a1',
            material_item_id: 'i1',
            display_order: 1,
            custom_content: 'Custom',
        })
    })

    it('sets custom_content to null when not provided', () => {
        const result = buildDayItemsPayload('a1', [{ material_item_id: 'i1', display_order: 1 }])
        expect(result[0].custom_content).toBeNull()
    })

    it('handles multiple items', () => {
        const result = buildDayItemsPayload('a1', [
            { material_item_id: 'i1', display_order: 1 },
            { material_item_id: 'i2', display_order: 2 },
        ])
        expect(result).toHaveLength(2)
    })
})

// ─── buildBulkMappingsPayload ─────────────────────────────────────────────────

describe('buildBulkMappingsPayload', () => {
    it('cross-joins itemIds with mappings correctly', () => {
        const result = buildBulkMappingsPayload(
            ['i1', 'i2'],
            [{ class_master_id: 'c1', semester: 1 }]
        )
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({ material_item_id: 'i1', class_master_id: 'c1', semester: 1 })
        expect(result[1]).toEqual({ material_item_id: 'i2', class_master_id: 'c1', semester: 1 })
    })

    it('handles multiple mappings per item', () => {
        const result = buildBulkMappingsPayload(
            ['i1'],
            [
                { class_master_id: 'c1', semester: 1 },
                { class_master_id: 'c2', semester: 2 },
            ]
        )
        expect(result).toHaveLength(2)
    })

    it('returns empty array for empty inputs', () => {
        expect(buildBulkMappingsPayload([], [])).toHaveLength(0)
        expect(buildBulkMappingsPayload(['i1'], [])).toHaveLength(0)
    })
})

// ─── itemHasDependencies ──────────────────────────────────────────────────────

describe('itemHasDependencies', () => {
    it('returns true when dayItems count > 0', () => {
        expect(itemHasDependencies(1)).toBe(true)
        expect(itemHasDependencies(10)).toBe(true)
    })

    it('returns false when 0', () => {
        expect(itemHasDependencies(0)).toBe(false)
    })
})

// ─── mapItemErrorMessage ──────────────────────────────────────────────────────

describe('mapItemErrorMessage', () => {
    it('returns duplicate name message for 23505', () => {
        expect(mapItemErrorMessage('23505', 'create')).toContain('sudah digunakan')
        expect(mapItemErrorMessage('23505', 'update')).toContain('sudah digunakan')
    })

    it('returns create-specific message for unknown codes', () => {
        expect(mapItemErrorMessage('OTHER', 'create')).toContain('Gagal membuat')
    })

    it('returns update-specific message for unknown codes', () => {
        expect(mapItemErrorMessage('OTHER', 'update')).toContain('Gagal memperbarui')
    })
})
