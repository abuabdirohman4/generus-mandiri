import { describe, it, expect } from 'vitest'
import {
    getJakartaDateStrings,
    countMeetingsByPeriod,
    calcAttendanceRate,
    sliceAttendanceByPeriod,
} from '../logic'

// ─── getJakartaDateStrings ────────────────────────────────────────────────────

describe('getJakartaDateStrings', () => {
    it('returns today, weekAgoStr, monthAgoStr as YYYY-MM-DD strings', () => {
        const { today, weekAgoStr, monthAgoStr } = getJakartaDateStrings()
        expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(weekAgoStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(monthAgoStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('weekAgoStr is strictly before today', () => {
        const { today, weekAgoStr } = getJakartaDateStrings()
        expect(weekAgoStr < today).toBe(true)
    })

    it('monthAgoStr is before weekAgoStr', () => {
        const { weekAgoStr, monthAgoStr } = getJakartaDateStrings()
        expect(monthAgoStr < weekAgoStr).toBe(true)
    })
})

// ─── countMeetingsByPeriod ────────────────────────────────────────────────────

describe('countMeetingsByPeriod', () => {
    const meetings = [
        { date: '2026-03-10' }, // today
        { date: '2026-03-07' }, // ~3 days ago
        { date: '2026-02-20' }, // ~18 days ago
        { date: '2026-01-01' }, // >30 days ago
    ]

    it('counts today meetings correctly', () => {
        const result = countMeetingsByPeriod(meetings, '2026-03-10', '2026-03-03', '2026-02-08')
        expect(result.meetingsToday).toBe(1)
    })

    it('counts weekly meetings (last 7 days)', () => {
        const result = countMeetingsByPeriod(meetings, '2026-03-10', '2026-03-03', '2026-02-08')
        expect(result.meetingsWeekly).toBe(2) // 10 and 07
    })

    it('counts monthly meetings (last 30 days)', () => {
        const result = countMeetingsByPeriod(meetings, '2026-03-10', '2026-03-03', '2026-02-08')
        expect(result.meetingsMonthly).toBe(3) // 10, 07, 20
    })

    it('returns 0 for all periods when meetings is empty', () => {
        const result = countMeetingsByPeriod([], '2026-03-10', '2026-03-03', '2026-02-08')
        expect(result.meetingsToday).toBe(0)
        expect(result.meetingsWeekly).toBe(0)
        expect(result.meetingsMonthly).toBe(0)
    })
})

// ─── calcAttendanceRate ───────────────────────────────────────────────────────

describe('calcAttendanceRate', () => {
    it('calculates attendance rate correctly', () => {
        const logs = [
            { status: 'H' }, { status: 'H' }, { status: 'A' }, { status: 'H' },
        ]
        expect(calcAttendanceRate(logs)).toBe(75) // 3/4
    })

    it('returns 0 for empty logs', () => {
        expect(calcAttendanceRate([])).toBe(0)
    })

    it('returns 100 when all present', () => {
        const logs = [{ status: 'H' }, { status: 'H' }]
        expect(calcAttendanceRate(logs)).toBe(100)
    })

    it('returns 0 when none present', () => {
        const logs = [{ status: 'A' }, { status: 'I' }]
        expect(calcAttendanceRate(logs)).toBe(0)
    })

    it('rounds to nearest integer', () => {
        const logs = [{ status: 'H' }, { status: 'A' }, { status: 'A' }]
        expect(calcAttendanceRate(logs)).toBe(33) // 1/3 = 33.33...
    })
})

// ─── sliceAttendanceByPeriod ──────────────────────────────────────────────────

describe('sliceAttendanceByPeriod', () => {
    const logs = [
        { date: '2026-03-10', status: 'H' }, // today
        { date: '2026-03-07', status: 'A' }, // this week
        { date: '2026-02-20', status: 'H' }, // this month (but not week)
    ]

    it('filters today logs', () => {
        const { todayLogs } = sliceAttendanceByPeriod(logs, '2026-03-10', '2026-03-03')
        expect(todayLogs).toHaveLength(1)
        expect(todayLogs[0].date).toBe('2026-03-10')
    })

    it('filters week logs', () => {
        const { weekLogs } = sliceAttendanceByPeriod(logs, '2026-03-10', '2026-03-03')
        expect(weekLogs).toHaveLength(2) // 10 and 07
    })

    it('monthLogs = all logs (already filtered at query level)', () => {
        const { monthLogs } = sliceAttendanceByPeriod(logs, '2026-03-10', '2026-03-03')
        expect(monthLogs).toHaveLength(3)
    })
})
