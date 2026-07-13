import { describe, it, expect } from 'vitest'
import { transformEnrollmentHistory } from '../enrollmentHistoryLogic'

describe('transformEnrollmentHistory', () => {
    const rows = [
        {
            semester: 1,
            status: 'active',
            academic_years: { name: '2025/2026', start_year: 2025 },
            classes: { name: 'Kelas 1' },
        },
        {
            semester: 1,
            status: 'active',
            academic_years: { name: '2026/2027', start_year: 2026 },
            classes: { name: 'Kelas 2' },
        },
        {
            semester: 2,
            status: 'active',
            academic_years: { name: '2025/2026', start_year: 2025 },
            classes: { name: 'Kelas 1' },
        },
    ]

    it('sorts by start_year desc, then semester asc', () => {
        const result = transformEnrollmentHistory(rows, '2026/2027')
        expect(result.map(r => `${r.academic_year_name} S${r.semester}`)).toEqual([
            '2026/2027 S1',
            '2025/2026 S1',
            '2025/2026 S2',
        ])
    })

    it('maps class name from joined classes', () => {
        const result = transformEnrollmentHistory(rows, '2026/2027')
        expect(result[0].class_name).toBe('Kelas 2')
    })

    it('flags the active academic year row', () => {
        const result = transformEnrollmentHistory(rows, '2026/2027')
        expect(result.find(r => r.academic_year_name === '2026/2027')?.is_active_year).toBe(true)
        expect(result.find(r => r.academic_year_name === '2025/2026')?.is_active_year).toBe(false)
    })

    it('handles missing joins gracefully (null class/year)', () => {
        const partial = [{ semester: 1, status: 'active', academic_years: null, classes: null }]
        const result = transformEnrollmentHistory(partial, '2026/2027')
        expect(result[0].class_name).toBe('-')
        expect(result[0].academic_year_name).toBe('-')
    })

    it('returns empty for empty input', () => {
        expect(transformEnrollmentHistory([], '2026/2027')).toEqual([])
    })
})
