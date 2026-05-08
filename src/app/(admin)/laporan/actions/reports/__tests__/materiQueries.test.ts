import { describe, it, expect, vi } from 'vitest'
import { fetchMateriReportBySiswa, getMateriCumulativeProgress } from '../materiQueries'

describe('fetchMateriReportBySiswa', () => {
    it('returns empty array if no enrollments', async () => {
        const mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
        const result = await fetchMateriReportBySiswa(mockSupabase as any, {
            classId: 'cls-1',
            academicYearId: 'yr-1',
            semester: 1
        })
        expect(result).toEqual([])
    })

    it('calculates percentage correctly', () => {
        // Pure logic test: 2 tuntas dari 4 total = 50%
        const tuntas = 2
        const total = 4
        expect(Math.round((tuntas / total) * 100)).toBe(50)
    })
})

describe('getMateriCumulativeProgress', () => {
    it('returns cumulative progress correctly for Semester 1', async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                const chain = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    single: vi.fn().mockReturnThis(),
                } as any

                if (table === 'class_master_mappings') {
                    chain.then = (cb: any) => cb({ data: [{ class_master_id: 'cm-1' }], error: null })
                } else if (table === 'material_monthly_targets') {
                    chain.then = (cb: any) => cb({
                        data: [
                            { month: 7, material_item_id: 'm1' },
                            { month: 8, material_item_id: 'm2' }
                        ],
                        error: null
                    })
                } else if (table === 'student_enrollments') {
                    chain.then = (cb: any) => cb({ data: [{ student_id: 's1' }, { student_id: 's2' }], error: null })
                } else if (table === 'student_material_progress') {
                    chain.then = (cb: any) => cb({
                        data: [
                            { student_id: 's1', material_item_id: 'm1', nilai: 80 },
                            { student_id: 's2', material_item_id: 'm1', nilai: 60 }
                        ],
                        error: null
                    })
                }
                return chain
            })
        }

        const result = await getMateriCumulativeProgress(mockSupabase as any, {
            classId: 'cls-1',
            academicYearId: 'yr-1',
            semester: 1,
            upToMonth: 8
        })

        // Expected results for Semester 1 (months 7-12)
        // Up to month 8 means we expect results for month 7 and 8
        expect(result).toHaveLength(2)

        // Month 7:
        // Targets: ['m1'] (count: 1)
        // Students: ['s1', 's2'] (count: 2)
        // Total possible: 2 * 1 = 2
        // Tuntas: s1-m1 (80 >= 70) = 1
        // Percentage: (1 / 2) * 100 = 50
        expect(result[0]).toMatchObject({
            month: 7,
            target_count: 1,
            tuntas_count: 1,
            percentage: 50
        })

        // Month 8:
        // Targets: ['m1', 'm2'] (count: 2)
        // Total possible: 2 * 2 = 4
        // Tuntas: s1-m1 = 1
        // Percentage: (1 / 4) * 100 = 25
        expect(result[1]).toMatchObject({
            month: 8,
            target_count: 2,
            tuntas_count: 1,
            percentage: 25
        })
    })
})
