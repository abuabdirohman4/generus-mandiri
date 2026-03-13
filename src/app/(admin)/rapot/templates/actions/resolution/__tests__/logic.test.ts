import { describe, it, expect } from 'vitest'
import {
    normalizeMaterialTypes,
    normalizeMaterialItems,
    normalizeClassMasters,
    buildResolvedItemEntry,
    buildTypeGradingSingle,
    buildCategoryGradingSingle,
    expandItemsWithSemesterFilter,
    extractMaterialItemFromAvailability,
} from '../logic'

// ─── normalizeMaterialTypes ───────────────────────────────────────────────────

describe('normalizeMaterialTypes', () => {
    it('takes first element from material_categories array', () => {
        const types = [{ id: 't1', material_categories: [{ id: 'c1', name: 'Quran' }] }]
        const result = normalizeMaterialTypes(types)
        expect(result[0].category?.name).toBe('Quran')
    })

    it('handles object format (not array)', () => {
        const types = [{ id: 't1', material_categories: { id: 'c1', name: 'Quran' } }]
        const result = normalizeMaterialTypes(types)
        expect(result[0].category?.name).toBe('Quran')
    })

    it('sets category to null when material_categories is empty array', () => {
        const types = [{ id: 't1', material_categories: [] }]
        const result = normalizeMaterialTypes(types)
        expect(result[0].category).toBeNull()
    })

    it('handles empty input', () => {
        expect(normalizeMaterialTypes([])).toHaveLength(0)
    })
})

// ─── normalizeMaterialItems ───────────────────────────────────────────────────

describe('normalizeMaterialItems', () => {
    it('takes first element from material_types array', () => {
        const items = [{ id: 'i1', material_types: [{ id: 't1', name: 'Tajwid' }] }]
        const result = normalizeMaterialItems(items)
        expect(result[0].type?.name).toBe('Tajwid')
    })

    it('handles object format', () => {
        const items = [{ id: 'i1', material_types: { id: 't1', name: 'Tajwid' } }]
        const result = normalizeMaterialItems(items)
        expect(result[0].type?.name).toBe('Tajwid')
    })

    it('sets type to null for missing material_types', () => {
        const items = [{ id: 'i1', material_types: null }]
        const result = normalizeMaterialItems(items)
        expect(result[0].type).toBeNull()
    })
})

// ─── normalizeClassMasters ────────────────────────────────────────────────────

describe('normalizeClassMasters', () => {
    it('takes first element from categories array', () => {
        const cms = [{ id: 'c1', categories: [{ code: 'CABERAWIT' }] }]
        const result = normalizeClassMasters(cms)
        expect(result[0].categories?.code).toBe('CABERAWIT')
    })

    it('handles object format for categories', () => {
        const cms = [{ id: 'c1', categories: { code: 'PAUD' } }]
        const result = normalizeClassMasters(cms)
        expect(result[0].categories?.code).toBe('PAUD')
    })

    it('sets categories to null for empty array', () => {
        const cms = [{ id: 'c1', categories: [] }]
        const result = normalizeClassMasters(cms)
        expect(result[0].categories).toBeNull()
    })
})

// ─── buildResolvedItemEntry ───────────────────────────────────────────────────

describe('buildResolvedItemEntry', () => {
    it('uses item name when customName is null', () => {
        const entry = buildResolvedItemEntry('si-1', { id: 'i1', name: 'Al-Fatihah' }, null, true)
        expect(entry.material_name).toBe('Al-Fatihah')
        expect(entry.material_item_id).toBe('i1')
        expect(entry.section_item_id).toBe('si-1')
        expect(entry.is_required).toBe(true)
    })

    it('uses customName when provided', () => {
        const entry = buildResolvedItemEntry('si-1', { id: 'i1', name: 'Al-Fatihah' }, 'Custom Name', false)
        expect(entry.material_name).toBe('Custom Name')
    })
})

// ─── buildTypeGradingSingle ───────────────────────────────────────────────────

describe('buildTypeGradingSingle', () => {
    it('builds single-grading entry for type level (object format)', () => {
        const sectionItem: any = {
            id: 'si-1',
            material_type: { name: 'Tajwid', category: { name: 'Al-Quran' } },
            custom_name: null,
            is_required: true,
        }
        const entry = buildTypeGradingSingle(sectionItem)
        expect(entry.material_item_id).toBeNull()
        expect(entry.material_name).toBe('Tajwid')
        expect(entry.type_name).toBe('Tajwid')
        expect(entry.category_name).toBe('Al-Quran')
    })

    it('uses custom_name when provided', () => {
        const sectionItem: any = {
            id: 'si-1',
            material_type: { name: 'Tajwid', category: null },
            custom_name: 'My Custom',
            is_required: false,
        }
        const entry = buildTypeGradingSingle(sectionItem)
        expect(entry.material_name).toBe('My Custom')
    })
})

// ─── buildCategoryGradingSingle ───────────────────────────────────────────────

describe('buildCategoryGradingSingle', () => {
    it('builds single-grading entry for category level', () => {
        const sectionItem: any = {
            id: 'si-1',
            material_category: { name: 'Al-Quran' },
            custom_name: null,
            is_required: true,
        }
        const entry = buildCategoryGradingSingle(sectionItem)
        expect(entry.material_item_id).toBeNull()
        expect(entry.material_name).toBe('Al-Quran')
        expect(entry.category_name).toBe('Al-Quran')
    })
})

// ─── expandItemsWithSemesterFilter ───────────────────────────────────────────

describe('expandItemsWithSemesterFilter', () => {
    const makeItem = (id: string, semester: number | null) => ({
        id,
        name: `Item ${id}`,
        material_types: { name: 'Tajwid', category: { name: 'Quran' } },
        material_item_classes: [{ semester }],
    })

    it('includes items matching semester exactly', () => {
        const items = [makeItem('i1', 1), makeItem('i2', 2)]
        const result = expandItemsWithSemesterFilter('si-1', true, items, 1)
        expect(result).toHaveLength(1)
        expect(result[0].material_item_id).toBe('i1')
    })

    it('includes items with null semester (available both)', () => {
        const items = [makeItem('i1', null)]
        const result = expandItemsWithSemesterFilter('si-1', true, items, 1)
        expect(result).toHaveLength(1)
    })

    it('returns empty array when no matching items', () => {
        const items = [makeItem('i1', 2)]
        const result = expandItemsWithSemesterFilter('si-1', true, items, 1)
        expect(result).toHaveLength(0)
    })

    it('returns empty array for empty input', () => {
        expect(expandItemsWithSemesterFilter('si-1', true, [], 1)).toHaveLength(0)
    })
})

// ─── extractMaterialItemFromAvailability ──────────────────────────────────────

describe('extractMaterialItemFromAvailability', () => {
    it('extracts item from array format', () => {
        const data = { material_items: [{ id: 'i1', name: 'Al-Fatihah' }] }
        const item = extractMaterialItemFromAvailability(data)
        expect(item?.id).toBe('i1')
    })

    it('extracts item from object format', () => {
        const data = { material_items: { id: 'i1', name: 'Al-Fatihah' } }
        const item = extractMaterialItemFromAvailability(data)
        expect(item?.id).toBe('i1')
    })

    it('returns null for null input', () => {
        expect(extractMaterialItemFromAvailability(null)).toBeNull()
    })

    it('returns null when material_items is null', () => {
        expect(extractMaterialItemFromAvailability({ material_items: null })).toBeNull()
    })
})
