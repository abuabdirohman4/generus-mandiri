import { describe, it, expect } from 'vitest'
import {
    getDateRangeForPeriod,
    filterMeetingsForClasses,
    buildMeetingsByClass,
    buildEnrollmentsByClass,
    extractOrgNames,
    deduplicateLogsForCombined,
} from '../logic'

// ─── getDateRangeForPeriod ────────────────────────────────────────────────────

describe('getDateRangeForPeriod', () => {
    it('returns custom range as-is', () => {
        const result = getDateRangeForPeriod('custom', { start: '2026-01-01', end: '2026-01-31' })
        expect(result).toEqual({ startDate: '2026-01-01', endDate: '2026-01-31' })
    })

    it('today: returns specificDate for start and end', () => {
        const result = getDateRangeForPeriod('today', undefined, '2026-03-05')
        expect(result.startDate).toBe('2026-03-05')
        expect(result.endDate).toBe('2026-03-05')
    })

    it('today: uses current Jakarta date when no specificDate', () => {
        const result = getDateRangeForPeriod('today')
        expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(result.startDate).toBe(result.endDate)
    })

    it('month: calculates correct range from monthString', () => {
        const result = getDateRangeForPeriod('month', undefined, undefined, undefined, '2026-02')
        expect(result.startDate).toBe('2026-02-01')
        expect(result.endDate).toBe('2026-02-28') // 2026 is not leap year
    })

    it('month: handles 31-day months', () => {
        const result = getDateRangeForPeriod('month', undefined, undefined, undefined, '2026-01')
        expect(result.startDate).toBe('2026-01-01')
        expect(result.endDate).toBe('2026-01-31')
    })

    it('default: returns 30-day range', () => {
        const result = getDateRangeForPeriod('month') // no monthString
        expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(result.startDate < result.endDate).toBe(true)
    })
})

// ─── filterMeetingsForClasses ─────────────────────────────────────────────────

describe('filterMeetingsForClasses', () => {
    const meetings = [
        { id: 'm1', class_id: 'c1', class_ids: null },
        { id: 'm2', class_id: 'c2', class_ids: null },
        { id: 'm3', class_id: 'c3', class_ids: ['c1', 'c4'] }, // multi-class
        { id: 'm4', class_id: 'c99', class_ids: null }, // not in our classes
    ]

    it('includes meetings with matching primary class_id', () => {
        const result = filterMeetingsForClasses(meetings, ['c1', 'c2'])
        expect(result.map(m => m.id)).toContain('m1')
        expect(result.map(m => m.id)).toContain('m2')
    })

    it('includes multi-class meetings via class_ids array', () => {
        const result = filterMeetingsForClasses(meetings, ['c1'])
        expect(result.map(m => m.id)).toContain('m3') // c3 meeting but c1 in class_ids
    })

    it('excludes meetings not involving our classes', () => {
        const result = filterMeetingsForClasses(meetings, ['c1'])
        expect(result.map(m => m.id)).not.toContain('m4')
    })

    it('returns empty for empty class list', () => {
        expect(filterMeetingsForClasses(meetings, [])).toHaveLength(0)
    })
})

// ─── buildMeetingsByClass ─────────────────────────────────────────────────────

describe('buildMeetingsByClass', () => {
    it('maps meeting ids per class', () => {
        const meetings = [
            { id: 'm1', class_id: 'c1', class_ids: null },
            { id: 'm2', class_id: 'c1', class_ids: null },
            { id: 'm3', class_id: 'c2', class_ids: null },
        ]
        const map = buildMeetingsByClass(meetings, ['c1', 'c2'])
        expect(map.get('c1')?.size).toBe(2)
        expect(map.get('c2')?.size).toBe(1)
    })

    it('handles multi-class meetings (adds to all involved classes)', () => {
        const meetings = [{ id: 'm1', class_id: 'c1', class_ids: ['c2'] }]
        const map = buildMeetingsByClass(meetings, ['c1', 'c2'])
        expect(map.get('c1')?.has('m1')).toBe(true)
        expect(map.get('c2')?.has('m1')).toBe(true)
    })

    it('deduplicates when class appears in both class_id and class_ids', () => {
        const meetings = [{ id: 'm1', class_id: 'c1', class_ids: ['c1'] }]
        const map = buildMeetingsByClass(meetings, ['c1'])
        expect(map.get('c1')?.size).toBe(1) // Not duplicated
    })

    it('ignores classes not in allowedClassIds', () => {
        const meetings = [{ id: 'm1', class_id: 'c99', class_ids: null }]
        const map = buildMeetingsByClass(meetings, ['c1'])
        expect(map.size).toBe(0)
    })
})

// ─── buildEnrollmentsByClass ──────────────────────────────────────────────────

describe('buildEnrollmentsByClass', () => {
    it('builds class -> student set map', () => {
        const enrollments = [
            { class_id: 'c1', student_id: 's1' },
            { class_id: 'c1', student_id: 's2' },
            { class_id: 'c2', student_id: 's3' },
        ]
        const map = buildEnrollmentsByClass(enrollments)
        expect(map.get('c1')?.size).toBe(2)
        expect(map.get('c2')?.size).toBe(1)
        expect(map.get('c1')?.has('s1')).toBe(true)
    })

    it('returns empty map for empty input', () => {
        expect(buildEnrollmentsByClass([])).toEqual(new Map())
    })
})

// ─── extractOrgNames ──────────────────────────────────────────────────────────

describe('extractOrgNames', () => {
    it('extracts org names from object format', () => {
        const cls = {
            kelompok: {
                name: 'Kelompok A',
                desa: { name: 'Desa B', daerah: { name: 'Daerah C' } }
            }
        }
        const result = extractOrgNames(cls)
        expect(result.kelompok_name).toBe('Kelompok A')
        expect(result.desa_name).toBe('Desa B')
        expect(result.daerah_name).toBe('Daerah C')
    })

    it('extracts org names from array format (PostgREST)', () => {
        const cls = {
            kelompok: [{
                name: 'Kelompok A',
                desa: [{ name: 'Desa B', daerah: [{ name: 'Daerah C' }] }]
            }]
        }
        const result = extractOrgNames(cls)
        expect(result.kelompok_name).toBe('Kelompok A')
        expect(result.desa_name).toBe('Desa B')
        expect(result.daerah_name).toBe('Daerah C')
    })

    it('returns undefined when kelompok is null', () => {
        const result = extractOrgNames({ kelompok: null })
        expect(result.kelompok_name).toBeUndefined()
        expect(result.desa_name).toBeUndefined()
        expect(result.daerah_name).toBeUndefined()
    })
})

// ─── deduplicateLogsForCombined ───────────────────────────────────────────────

describe('deduplicateLogsForCombined', () => {
    // Minimal mock setup - no actual DB calls since logic is pure
    it('returns empty array when no class IDs provided', () => {
        const result = deduplicateLogsForCombined([], new Map(), [], new Set())
        expect(result).toHaveLength(0)
    })

    it('returns empty array when no logs provided', () => {
        const result = deduplicateLogsForCombined([], new Map(), ['c1'], new Set(['s1']))
        expect(result).toHaveLength(0)
    })
})
