import { describe, it, expect } from 'vitest'
import {
    validateCategoryData,
    categoryHasDependencies,
    mapCategoryErrorMessage,
} from '../logic'

describe('validateCategoryData', () => {
    it('returns ok=true for valid data', () => {
        expect(validateCategoryData({ name: 'Al-Quran', display_order: 1 })).toEqual({ ok: true })
    })

    it('rejects empty name', () => {
        const result = validateCategoryData({ name: '', display_order: 1 })
        expect(result.ok).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it('rejects whitespace-only name', () => {
        const result = validateCategoryData({ name: '   ', display_order: 1 })
        expect(result.ok).toBe(false)
    })

    it('rejects negative display_order', () => {
        const result = validateCategoryData({ name: 'Test', display_order: -1 })
        expect(result.ok).toBe(false)
    })

    it('accepts display_order = 0', () => {
        expect(validateCategoryData({ name: 'Test', display_order: 0 })).toEqual({ ok: true })
    })
})

describe('categoryHasDependencies', () => {
    it('returns true when types count > 0', () => {
        expect(categoryHasDependencies(1)).toBe(true)
        expect(categoryHasDependencies(10)).toBe(true)
    })

    it('returns false when types count === 0', () => {
        expect(categoryHasDependencies(0)).toBe(false)
    })
})

describe('mapCategoryErrorMessage', () => {
    it('returns duplicate name message for code 23505 (create)', () => {
        const msg = mapCategoryErrorMessage('23505', 'create')
        expect(msg).toContain('sudah digunakan')
    })

    it('returns duplicate name message for code 23505 (update)', () => {
        const msg = mapCategoryErrorMessage('23505', 'update')
        expect(msg).toContain('sudah digunakan')
    })

    it('returns create-specific error for unknown codes', () => {
        const msg = mapCategoryErrorMessage('OTHER', 'create')
        expect(msg).toContain('Gagal membuat')
    })

    it('returns update-specific error for unknown codes', () => {
        const msg = mapCategoryErrorMessage('OTHER', 'update')
        expect(msg).toContain('Gagal memperbarui')
    })
})
