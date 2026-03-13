import { describe, it, expect } from 'vitest'
import {
    validateTypeData,
    typeHasDependencies,
    mapTypeErrorMessage,
} from '../logic'

describe('validateTypeData', () => {
    it('returns ok=true for valid data', () => {
        const result = validateTypeData({ category_id: 'c1', name: 'Tajwid', display_order: 1 })
        expect(result).toEqual({ ok: true })
    })

    it('rejects empty category_id', () => {
        const result = validateTypeData({ category_id: '', name: 'Tajwid', display_order: 1 })
        expect(result.ok).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it('rejects empty name', () => {
        const result = validateTypeData({ category_id: 'c1', name: '', display_order: 1 })
        expect(result.ok).toBe(false)
    })

    it('rejects whitespace-only name', () => {
        const result = validateTypeData({ category_id: 'c1', name: '   ', display_order: 1 })
        expect(result.ok).toBe(false)
    })

    it('rejects negative display_order', () => {
        const result = validateTypeData({ category_id: 'c1', name: 'Test', display_order: -5 })
        expect(result.ok).toBe(false)
    })

    it('accepts display_order = 0', () => {
        expect(validateTypeData({ category_id: 'c1', name: 'T', display_order: 0 })).toEqual({ ok: true })
    })
})

describe('typeHasDependencies', () => {
    it('returns hasDeps=true with item reason when items exist', () => {
        const result = typeHasDependencies(3, 0)
        expect(result.hasDeps).toBe(true)
        expect(result.reason).toContain('item materi')
    })

    it('returns hasDeps=true with assignment reason when assignments exist', () => {
        const result = typeHasDependencies(0, 2)
        expect(result.hasDeps).toBe(true)
        expect(result.reason).toContain('assignment')
    })

    it('items take priority over assignments in reason', () => {
        const result = typeHasDependencies(1, 1)
        expect(result.hasDeps).toBe(true)
        expect(result.reason).toContain('item materi')
    })

    it('returns hasDeps=false when no deps', () => {
        const result = typeHasDependencies(0, 0)
        expect(result).toEqual({ hasDeps: false })
    })
})

describe('mapTypeErrorMessage', () => {
    it('returns duplicate name message for code 23505', () => {
        expect(mapTypeErrorMessage('23505', 'create')).toContain('sudah digunakan')
        expect(mapTypeErrorMessage('23505', 'update')).toContain('sudah digunakan')
    })

    it('returns create-specific message for unknown code', () => {
        expect(mapTypeErrorMessage('OTHER', 'create')).toContain('Gagal membuat')
    })

    it('returns update-specific message for unknown code', () => {
        expect(mapTypeErrorMessage('OTHER', 'update')).toContain('Gagal memperbarui')
    })
})
