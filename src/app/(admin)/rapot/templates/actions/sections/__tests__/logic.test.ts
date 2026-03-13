import { describe, it, expect } from 'vitest'
import {
    normalizeSectionItems,
    buildSectionUpdatePayload,
    validateSectionData,
    validateSectionItemData,
} from '../logic'

// ─── normalizeSectionItems ────────────────────────────────────────────────────

describe('normalizeSectionItems', () => {
    it('normalizes PostgREST relations (keeps objects as-is)', () => {
        const items = [
            {
                id: 'i1',
                material_category: { id: 'c1', name: 'Al-Quran' },
                material_type: { id: 't1', name: 'Tajwid' },
                material_item: null,
            },
        ]
        const result = normalizeSectionItems(items)
        expect(result[0].material_category?.name).toBe('Al-Quran')
        expect(result[0].material_item).toBeNull()
    })

    it('sets null for undefined relations', () => {
        const items = [{ id: 'i1', material_category: undefined, material_type: undefined, material_item: undefined }]
        const result = normalizeSectionItems(items)
        expect(result[0].material_category).toBeNull()
        expect(result[0].material_type).toBeNull()
        expect(result[0].material_item).toBeNull()
    })

    it('returns empty array for empty input', () => {
        expect(normalizeSectionItems([])).toHaveLength(0)
    })
})

// ─── buildSectionUpdatePayload ────────────────────────────────────────────────

describe('buildSectionUpdatePayload', () => {
    it('includes updated_at timestamp', () => {
        const payload = buildSectionUpdatePayload({})
        expect(payload.updated_at).toBeTruthy()
    })

    it('includes only provided fields', () => {
        const payload = buildSectionUpdatePayload({ name: 'Updated', is_active: true })
        expect(payload.name).toBe('Updated')
        expect(payload.is_active).toBe(true)
        expect(payload).not.toHaveProperty('grading_format')
        expect(payload).not.toHaveProperty('display_order')
    })

    it('sets description to null when empty string', () => {
        const payload = buildSectionUpdatePayload({ description: '' })
        expect(payload.description).toBeNull()
    })

    it('includes grading_format and display_order when provided', () => {
        const payload = buildSectionUpdatePayload({ grading_format: 'score', display_order: 3 })
        expect(payload.grading_format).toBe('score')
        expect(payload.display_order).toBe(3)
    })
})

// ─── validateSectionData ──────────────────────────────────────────────────────

describe('validateSectionData', () => {
    const validData = { template_id: 'tpl-1', name: 'Bacaan', grading_format: 'score', display_order: 1 }

    it('returns ok=true for valid data', () => {
        expect(validateSectionData(validData)).toEqual({ ok: true })
    })

    it('rejects missing template_id', () => {
        const result = validateSectionData({ ...validData, template_id: '' })
        expect(result.ok).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it('rejects empty name', () => {
        const result = validateSectionData({ ...validData, name: '' })
        expect(result.ok).toBe(false)
    })

    it('rejects whitespace-only name', () => {
        const result = validateSectionData({ ...validData, name: '  ' })
        expect(result.ok).toBe(false)
    })

    it('rejects missing grading_format', () => {
        const result = validateSectionData({ ...validData, grading_format: '' })
        expect(result.ok).toBe(false)
    })

    it('rejects negative display_order', () => {
        const result = validateSectionData({ ...validData, display_order: -1 })
        expect(result.ok).toBe(false)
    })
})

// ─── validateSectionItemData ──────────────────────────────────────────────────

describe('validateSectionItemData', () => {
    const validData = { section_id: 'sec-1', material_level: 'type', display_order: 0 }

    it('returns ok=true for valid data', () => {
        expect(validateSectionItemData(validData)).toEqual({ ok: true })
    })

    it('rejects missing section_id', () => {
        const result = validateSectionItemData({ ...validData, section_id: '' })
        expect(result.ok).toBe(false)
    })

    it('rejects missing material_level', () => {
        const result = validateSectionItemData({ ...validData, material_level: '' })
        expect(result.ok).toBe(false)
    })

    it('rejects invalid material_level', () => {
        const result = validateSectionItemData({ ...validData, material_level: 'invalid' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('tidak valid')
    })

    it('accepts all valid material_level values', () => {
        expect(validateSectionItemData({ ...validData, material_level: 'category' }).ok).toBe(true)
        expect(validateSectionItemData({ ...validData, material_level: 'type' }).ok).toBe(true)
        expect(validateSectionItemData({ ...validData, material_level: 'item' }).ok).toBe(true)
    })

    it('rejects negative display_order', () => {
        const result = validateSectionItemData({ ...validData, display_order: -1 })
        expect(result.ok).toBe(false)
    })
})
