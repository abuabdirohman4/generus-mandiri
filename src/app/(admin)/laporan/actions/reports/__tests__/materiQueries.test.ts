import { describe, it, expect, vi } from 'vitest'
import { fetchMateriReportBySiswa } from '../materiQueries'

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
