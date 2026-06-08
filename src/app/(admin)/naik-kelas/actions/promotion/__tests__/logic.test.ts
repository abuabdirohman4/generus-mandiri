import { describe, it, expect } from 'vitest'
import { preparePromotionData, validatePromotionPermission } from '../logic'
import type { PromotionPayload } from '@/types/promotion'

describe('preparePromotionData', () => {
    const base: PromotionPayload = {
        academic_year_id: 'ay-2026',
        semester: 1,
        rows: [
            { student_id: 's1', from_class_id: 'c1', to_class_id: 'c2' },
            { student_id: 's2', from_class_id: 'c1', to_class_id: 'c2' },
            { student_id: 's3', from_class_id: 'c1', to_class_id: '' }, // no target → dropped
        ],
    }

    it('drops rows without a target class', () => {
        const { valid } = preparePromotionData(base)
        expect(valid.map(r => r.student_id)).toEqual(['s1', 's2'])
    })

    it('builds enrollment objects with year + semester + status active', () => {
        const { enrollments } = preparePromotionData(base)
        expect(enrollments).toHaveLength(2)
        expect(enrollments[0]).toEqual({
            student_id: 's1',
            class_id: 'c2',
            academic_year_id: 'ay-2026',
            semester: 1,
            status: 'active',
        })
    })

    it('returns empty when all rows lack target', () => {
        const { valid, enrollments } = preparePromotionData({
            ...base,
            rows: [{ student_id: 's1', from_class_id: 'c1', to_class_id: '' }],
        })
        expect(valid).toEqual([])
        expect(enrollments).toEqual([])
    })
})

describe('validatePromotionPermission', () => {
    const superadmin = { id: 'u1', role: 'superadmin' } as any
    const adminDaerah = { id: 'u2', role: 'admin', daerah_id: 'd1' } as any
    const adminDesa = { id: 'u3', role: 'admin', desa_id: 'v1' } as any
    const adminKelompok = { id: 'u4', role: 'admin', kelompok_id: 'k1' } as any
    const guru = { id: 'u5', role: 'teacher', kelompok_id: 'k1' } as any

    describe("action 'toggle'", () => {
        it('allows superadmin and admin daerah only', () => {
            expect(validatePromotionPermission(superadmin, 'toggle')).toBe(true)
            expect(validatePromotionPermission(adminDaerah, 'toggle')).toBe(true)
        })
        it('denies admin desa, admin kelompok, guru', () => {
            expect(validatePromotionPermission(adminDesa, 'toggle')).toBe(false)
            expect(validatePromotionPermission(adminKelompok, 'toggle')).toBe(false)
            expect(validatePromotionPermission(guru, 'toggle')).toBe(false)
        })
    })

    describe("action 'promote'", () => {
        it('allows all roles (scope filtered elsewhere)', () => {
            expect(validatePromotionPermission(superadmin, 'promote')).toBe(true)
            expect(validatePromotionPermission(adminDaerah, 'promote')).toBe(true)
            expect(validatePromotionPermission(adminDesa, 'promote')).toBe(true)
            expect(validatePromotionPermission(adminKelompok, 'promote')).toBe(true)
            expect(validatePromotionPermission(guru, 'promote')).toBe(true)
        })
    })

    it('denies when profile is null', () => {
        expect(validatePromotionPermission(null, 'toggle')).toBe(false)
        expect(validatePromotionPermission(null, 'promote')).toBe(false)
    })
})
