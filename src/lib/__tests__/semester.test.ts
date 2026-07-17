import { describe, it, expect } from 'vitest'
import { getCurrentSemester } from '../semester'

describe('getCurrentSemester', () => {
    it('July → semester 1', () => {
        expect(getCurrentSemester(new Date(2026, 6, 1))).toBe(1)
    })
    it('December → semester 1', () => {
        expect(getCurrentSemester(new Date(2026, 11, 1))).toBe(1)
    })
    it('January → semester 2', () => {
        expect(getCurrentSemester(new Date(2027, 0, 1))).toBe(2)
    })
    it('June → semester 2', () => {
        expect(getCurrentSemester(new Date(2026, 5, 1))).toBe(2)
    })
})
