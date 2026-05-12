import { describe, it, expect, vi } from 'vitest'
import { fetchMateriReportBySiswa, getMateriCumulativeProgress, fetchMateriReport, getMateriMonthlyChart } from '../materiQueries'

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
            upToMonth: 8,
            viewMode: 'per_siswa'
        })

        expect(result).toHaveLength(6)

        // Month 7:
        // Targets: ['m1'] (akumulasi), Total Unik Semester: 2 (m1, m2)
        // s1: tuntas m1 (1/2 = 50%), s2: tuntas 0 (0/2 = 0%)
        // Average pct: (50 + 0) / 2 = 25%
        // Avg tuntas: round(25/100 * 2) = 0.5 -> 1
        expect(result[0]).toMatchObject({
            month: 7,
            target_count: 2,
            tuntas_count: 1,
            percentage: 25,
            tercapai: "1/2"
        })
    })
})

describe('fetchMateriReport card vs chart consistency', () => {
    it('cumulative avg_completion_rate harus konsisten dengan getMateriCumulativeProgress', async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                const chain = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    single: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockReturnThis(),
                } as any

                chain.eq = vi.fn(() => chain)
                chain.select = vi.fn(() => chain)

                chain.then = (cb: any) => {
                    if (table === 'student_enrollments') {
                        cb({ data: [{ student_id: 's1', students: { status: 'active' } }], error: null })
                    } else if (table === 'classes') {
                        cb({ data: { name: 'Kelas 1' }, error: null })
                    } else if (table === 'class_master_mappings') {
                        cb({ data: [{ class_master_id: 'cm-1' }], error: null })
                    } else if (table === 'material_monthly_targets') {
                        cb({ data: [{ month: 1, material_item_id: 'm1' }], error: null })
                    } else if (table === 'material_items') {
                        cb({ data: [{ id: 'm1', name: 'M1', material_types: { name: 'T1', material_categories: { id: 'c1', name: 'C1' } } }], error: null })
                    } else if (table === 'student_material_progress') {
                        cb({ data: [{ student_id: 's1', material_item_id: 'm1', nilai: 80, done: false }], error: null })
                    } else {
                        cb({ data: [], error: null })
                    }
                }
                return chain
            })
        }

        const chartResult = await getMateriCumulativeProgress(mockSupabase as any, {
            classId: 'cls-1',
            academicYearId: 'yr-1',
            semester: 2,
            upToMonth: 1,
            viewMode: 'per_siswa'
        })
        const chartValue = chartResult.find(p => p.month === 1)?.percentage

        const reportResult = await fetchMateriReport(mockSupabase as any, {
            classId: 'cls-1',
            academicYearId: 'yr-1',
            semester: 2,
            month: 1,
            reportMode: 'cumulative'
        })
        const cardValue = reportResult.summary.avg_completion_rate

        expect(cardValue).toBe(chartValue)
    })

    it('monthly avg_completion_rate harus konsisten dengan getMateriMonthlyChart', async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                const chain = {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    single: vi.fn().mockReturnThis(),
                    maybeSingle: vi.fn().mockReturnThis(),
                } as any

                chain.eq = vi.fn(() => chain)
                chain.select = vi.fn(() => chain)

                chain.then = (cb: any) => {
                    if (table === 'student_enrollments') {
                        cb({ data: [{ student_id: 's1', students: { status: 'active' } }], error: null })
                    } else if (table === 'classes') {
                        cb({ data: { name: 'Kelas 1' }, error: null })
                    } else if (table === 'class_master_mappings') {
                        cb({ data: [{ class_master_id: 'cm-1' }], error: null })
                    } else if (table === 'material_monthly_targets') {
                        cb({ data: [{ month: 1, material_item_id: 'm1' }], error: null })
                    } else if (table === 'material_items') {
                        cb({ data: [{ id: 'm1', name: 'M1', material_types: { name: 'T1', material_categories: { id: 'c1', name: 'C1' } } }], error: null })
                    } else if (table === 'student_material_progress') {
                        cb({ data: [{ student_id: 's1', material_item_id: 'm1', nilai: 80 }], error: null })
                    } else {
                        cb({ data: [], error: null })
                    }
                }
                return chain
            })
        }

        const chartResult = await getMateriMonthlyChart(mockSupabase as any, {
            classId: 'cls-1',
            academicYearId: 'yr-1',
            semester: 2
        })
        const chartValue = chartResult.find(p => p.month === 1)?.percentage

        const reportResult = await fetchMateriReport(mockSupabase as any, {
            classId: 'cls-1',
            academicYearId: 'yr-1',
            semester: 2,
            month: 1,
            reportMode: 'monthly'
        })
        const cardValue = reportResult.summary.avg_completion_rate

        expect(cardValue).toBe(chartValue)
    })
})
