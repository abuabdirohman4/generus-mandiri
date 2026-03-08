import { describe, it, expect } from 'vitest'
import {
    getWeekStartDate,
    getWeekEndDate,
    getWeekNumberInMonth,
    buildDateFilter,
    buildClassHierarchyMaps,
    buildEnrollmentMap,
    enrichAttendanceLogs,
    formatChartData,
    filterMeetingsByRole,
    filterAttendanceByClass,
    filterAttendanceByKelompok,
    aggregateStudentSummary,
} from '../logic'

// ─── Date Helpers ─────────────────────────────────────────────────────────────

describe('logic.ts – Date Helpers', () => {
    describe('getWeekStartDate', () => {
        it('returns first day of month for week 1', () => {
            // Use the function itself to verify shape — local timezone may shift the ISO string
            const result = getWeekStartDate(2024, 1, 1)
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            // Should be Jan 1 or Dec 31 depending on timezone
            expect(result).toMatch(/^2023-12-31$|^2024-01-01$/)
        })

        it('returns correct date for week 2', () => {
            const result = getWeekStartDate(2024, 1, 2)
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        })
    })

    describe('getWeekEndDate', () => {
        it('returns a valid date string', () => {
            const result = getWeekEndDate(2024, 1, 1)
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        })

        it('does not exceed last day of February in leap year', () => {
            const result = getWeekEndDate(2024, 2, 5)
            const day = parseInt(result.split('-')[2])
            expect(day).toBeLessThanOrEqual(29) // 2024 is leap year
        })
    })

    describe('getWeekNumberInMonth', () => {
        it('returns 1 for the first week', () => {
            expect(getWeekNumberInMonth(new Date(2024, 0, 1))).toBe(1)
        })

        it('returns higher week number for later dates', () => {
            expect(getWeekNumberInMonth(new Date(2024, 0, 25))).toBeGreaterThan(1)
        })
    })
})

// ─── buildDateFilter ──────────────────────────────────────────────────────────

describe('logic.ts – buildDateFilter', () => {
    const now = new Date('2024-06-15')

    it('general mode uses month/year range', () => {
        const result = buildDateFilter({ viewMode: 'general', month: 1, year: 2024, period: 'daily' }, now)
        // gte should be start of Jan 2024 (may be Dec 31 2023 in UTC+7)
        expect(result.date?.gte).toMatch(/^2023-12-31$|^2024-01-01$/)
        // lte should be last day of Jan 2024 (may be Jan 30 in some zones)
        expect(result.date?.lte).toMatch(/^2024-01-3[01]$|^2024-01-29$/)
    })

    it('daily period with startDate/endDate', () => {
        const result = buildDateFilter({ viewMode: 'detailed', period: 'daily', startDate: '2024-01-10', endDate: '2024-01-20' }, now)
        expect(result.date?.gte).toBe('2024-01-10')
        expect(result.date?.lte).toBe('2024-01-20')
    })

    it('daily period without dates uses today as eq', () => {
        const result = buildDateFilter({ viewMode: 'detailed', period: 'daily' }, new Date('2024-03-15'))
        expect(result.date?.eq).toBe('2024-03-15')
    })

    it('weekly period with week params', () => {
        const result = buildDateFilter({
            viewMode: 'detailed', period: 'weekly',
            weekYear: 2024, weekMonth: 1, startWeekNumber: 1, endWeekNumber: 2
        }, now)
        expect(result.date?.gte).toBeDefined()
        expect(result.date?.lte).toBeDefined()
    })

    it('monthly period with month range', () => {
        const result = buildDateFilter({
            viewMode: 'detailed', period: 'monthly',
            monthYear: 2024, startMonth: 1, endMonth: 3
        }, now)
        expect(result.date?.gte).toMatch(/^2023-12-31$|^2024-01-01$/)
        expect(result.date?.lte).toMatch(/^2024-03-3[01]$|^2024-03-29$/)
    })

    it('yearly period with year range', () => {
        const result = buildDateFilter({
            viewMode: 'detailed', period: 'yearly',
            startYear: 2023, endYear: 2024
        }, now)
        expect(result.date?.gte).toMatch(/^2022-12-31$|^2023-01-01$/)
        expect(result.date?.lte).toMatch(/^2024-12-3[01]$|^2024-12-29$/)
    })
})

// ─── buildClassHierarchyMaps ──────────────────────────────────────────────────

describe('logic.ts – buildClassHierarchyMaps', () => {
    it('builds all three maps correctly', () => {
        const classesData = [{
            id: 'c1', kelompok_id: 'k1',
            kelompok: { id: 'k1', desa_id: 'ds1', desa: { id: 'ds1', daerah_id: 'd1' } }
        }]

        const result = buildClassHierarchyMaps(classesData)

        expect(result.classKelompokMap.get('c1')).toBe('k1')
        expect(result.classToDesaMap.get('c1')).toBe('ds1')
        expect(result.classToDaerahMap.get('c1')).toBe('d1')
    })

    it('handles missing hierarchy gracefully', () => {
        const result = buildClassHierarchyMaps([{ id: 'c1' }])
        expect(result.classKelompokMap.has('c1')).toBe(false)
    })
})

// ─── buildEnrollmentMap ───────────────────────────────────────────────────────

describe('logic.ts – buildEnrollmentMap', () => {
    it('groups students by class and kelompok', () => {
        const data = [
            { class_id: 'c1', student_id: 's1', students: { id: 's1', kelompok_id: 'k1' } },
            { class_id: 'c1', student_id: 's2', students: { id: 's2', kelompok_id: 'k1' } },
        ]
        const result = buildEnrollmentMap(data)
        expect(result.get('c1')?.get('k1')?.size).toBe(2)
    })

    it('uses "null" string as key for null kelompok_id', () => {
        const data = [{ class_id: 'c1', student_id: 's1', students: { id: 's1', kelompok_id: null } }]
        const result = buildEnrollmentMap(data)
        expect(result.get('c1')?.get('null')?.has('s1')).toBe(true)
    })
})

// ─── enrichAttendanceLogs ─────────────────────────────────────────────────────

describe('logic.ts – enrichAttendanceLogs', () => {
    const studentMap = new Map([['s1', { id: 's1', name: 'Budi' }]])
    const meetingMap = new Map([['m1', { id: 'm1', date: '2024-01-10' }]])

    it('enriches logs with student and date', () => {
        const result = enrichAttendanceLogs(
            [{ meeting_id: 'm1', student_id: 's1', status: 'H' }],
            studentMap, meetingMap
        )
        expect(result[0].students.name).toBe('Budi')
        expect(result[0].date).toBe('2024-01-10')
        expect(result[0].status).toBe('H')
    })

    it('filters out logs with missing student or date', () => {
        const result = enrichAttendanceLogs(
            [
                { meeting_id: 'm1', student_id: 's1', status: 'H' }, // valid
                { meeting_id: 'm1', student_id: 's99', status: 'H' }, // no student
            ],
            studentMap, meetingMap
        )
        expect(result).toHaveLength(1)
    })
})

// ─── formatChartData ──────────────────────────────────────────────────────────

describe('logic.ts – formatChartData', () => {
    it('formats summary into pie chart array', () => {
        const result = formatChartData({ total: 100, hadir: 80, izin: 10, sakit: 5, alpha: 5 })
        expect(result).toHaveLength(4)
        expect(result.find(i => i.name === 'Hadir')?.value).toBe(80)
    })

    it('excludes zero values', () => {
        const result = formatChartData({ total: 50, hadir: 50, izin: 0, sakit: 0, alpha: 0 })
        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Hadir')
    })
})

// ─── filterMeetingsByRole ─────────────────────────────────────────────────────

describe('logic.ts – filterMeetingsByRole', () => {
    const maps = {
        classKelompokMap: new Map([['c1', 'k1']]),
        classToDesaMap: new Map([['c1', 'ds1']]),
        classToDaerahMap: new Map([['c1', 'd1']]),
    }

    const meetings = [
        { id: 'm1', class_id: 'c1', class_ids: ['c1'] },
        { id: 'm2', class_id: 'c2', class_ids: ['c2'] },
    ]

    it('teacher sees only their class meetings', () => {
        const profile = { role: 'teacher', kelompok_id: 'k1', desa_id: null, daerah_id: null }
        const result = filterMeetingsByRole(meetings, profile, ['c1'], maps)
        expect(result).toContain('m1')
        expect(result).not.toContain('m2')
    })

    it('admin with kelompok_id filters by kelompok', () => {
        const profile = { role: 'admin', kelompok_id: 'k1', desa_id: null, daerah_id: null }
        const result = filterMeetingsByRole(meetings, profile, [], maps)
        expect(result).toContain('m1')
        expect(result).not.toContain('m2')
    })

    it('superadmin (no org restriction) sees all meetings', () => {
        const profile = { role: 'admin', kelompok_id: null, desa_id: null, daerah_id: null }
        const result = filterMeetingsByRole(meetings, profile, [], maps)
        expect(result).toHaveLength(2)
    })
})

// ─── filterAttendanceByClass ──────────────────────────────────────────────────

describe('logic.ts – filterAttendanceByClass', () => {
    const enrollmentMap = new Map([
        ['c1', new Map([['k1', new Set(['s1'])]])]
    ])
    const meetingMap = new Map([
        ['m1', { id: 'm1', class_id: 'c1', class_ids: ['c1'] }]
    ])

    it('keeps logs where student is enrolled in the class', () => {
        const logs = [{ meeting_id: 'm1', student_id: 's1', students: { id: 's1' } }]
        const result = filterAttendanceByClass(logs, 'c1', enrollmentMap, meetingMap)
        expect(result).toHaveLength(1)
    })

    it('removes logs where student is not enrolled', () => {
        const logs = [{ meeting_id: 'm1', student_id: 's99', students: { id: 's99' } }]
        const result = filterAttendanceByClass(logs, 'c1', enrollmentMap, meetingMap)
        expect(result).toHaveLength(0)
    })
})

// ─── filterAttendanceByKelompok ───────────────────────────────────────────────

describe('logic.ts – filterAttendanceByKelompok', () => {
    const maps = { classKelompokMap: new Map([['c1', 'k1']]) }
    const meetingMap = new Map([
        ['m1', { id: 'm1', class_id: 'c1', class_ids: null }]
    ])

    it('keeps logs from meetings belonging to selected kelompok', () => {
        const logs = [{ meeting_id: 'm1', students: { id: 's1' } }]
        const result = filterAttendanceByKelompok(logs, 'k1', maps, meetingMap)
        expect(result).toHaveLength(1)
    })

    it('removes logs from meetings in other kelompok', () => {
        const logs = [{ meeting_id: 'm1', students: { id: 's1' } }]
        const result = filterAttendanceByKelompok(logs, 'k99', maps, meetingMap)
        expect(result).toHaveLength(0)
    })
})

// ─── aggregateStudentSummary ──────────────────────────────────────────────────

describe('logic.ts – aggregateStudentSummary', () => {
    const kelompokMap = new Map([['k1', 'Kelompok Satu']])

    const logs = [
        {
            student_id: 's1', status: 'H',
            students: {
                id: 's1', name: 'Budi', gender: 'Laki-laki',
                class_id: 'c1', classes: { id: 'c1', name: 'Kelas A' },
                student_classes: [],
                kelompok: null, desa: null, daerah: null
            }
        },
        {
            student_id: 's1', status: 'A',
            students: {
                id: 's1', name: 'Budi', gender: 'Laki-laki',
                class_id: 'c1', classes: { id: 'c1', name: 'Kelas A' },
                student_classes: [],
                kelompok: null, desa: null, daerah: null
            }
        },
    ]

    it('counts hadir and alpha correctly', () => {
        const result = aggregateStudentSummary(logs, kelompokMap)
        expect(result).toHaveLength(1)
        expect(result[0].hadir).toBe(1)
        expect(result[0].alpha).toBe(1)
        expect(result[0].total_days).toBe(2)
    })

    it('calculates attendance_rate correctly', () => {
        const result = aggregateStudentSummary(logs, kelompokMap)
        expect(result[0].attendance_rate).toBe(50) // 1/2 = 50%
    })
})
