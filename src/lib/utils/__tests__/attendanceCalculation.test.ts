import { describe, it, expect } from 'vitest'
import {
    findMatchingClass,
    isStudentEnrolled,
    filterAttendanceByMeetingClass,
    calculateAttendanceRate,
    calculateAttendanceStats,
    type Meeting,
    type EnrollmentMap,
    type AttendanceLog
} from '../attendanceCalculation'

describe('attendanceCalculation', () => {
    describe('findMatchingClass', () => {
        it('should match primary class_id', () => {
            const meeting: Meeting = { id: 'm1', class_id: 'c1', date: '2024-01-01' }
            const filterIds = ['c1', 'c2']
            expect(findMatchingClass(meeting, filterIds)).toBe('c1')
        })

        it('should match an ID in class_ids array', () => {
            const meeting: Meeting = { id: 'm1', class_id: 'c0', class_ids: ['c1', 'c2'], date: '2024-01-01' }
            const filterIds = ['c2', 'c3']
            expect(findMatchingClass(meeting, filterIds)).toBe('c2')
        })

        it('should return null if no match found', () => {
            const meeting: Meeting = { id: 'm1', class_id: 'c0', class_ids: ['c1'], date: '2024-01-01' }
            const filterIds = ['c2', 'c3']
            expect(findMatchingClass(meeting, filterIds)).toBeNull()
        })
    })

    describe('isStudentEnrolled', () => {
        it('should return true if student is in set', () => {
            const enrollmentMap: EnrollmentMap = {
                'c1': new Set(['s1', 's2'])
            }
            expect(isStudentEnrolled('s1', 'c1', enrollmentMap)).toBe(true)
        })

        it('should return false if student is not in set', () => {
            const enrollmentMap: EnrollmentMap = {
                'c1': new Set(['s2'])
            }
            expect(isStudentEnrolled('s1', 'c1', enrollmentMap)).toBe(false)
        })

        it('should return false if class not in map', () => {
            const enrollmentMap: EnrollmentMap = {}
            expect(isStudentEnrolled('s1', 'c1', enrollmentMap)).toBe(false)
        })
    })

    describe('filterAttendanceByMeetingClass', () => {
        const meetingMap = new Map<string, Meeting>([
            ['m1', { id: 'm1', class_id: 'c1', date: '2024-01-01' }],
            ['m2', { id: 'm2', class_id: 'c2', date: '2024-01-01' }],
            ['m_multi', { id: 'm_multi', class_id: 'c1', class_ids: ['c2'], date: '2024-01-01' }]
        ])

        const enrollmentMap: EnrollmentMap = {
            'c1': new Set(['s1']),
            'c2': new Set(['s2'])
        }

        const attendanceLogs: AttendanceLog[] = [
            { meeting_id: 'm1', student_id: 's1', status: 'H' }, // OK: s1 in c1
            { meeting_id: 'm1', student_id: 's2', status: 'H' }, // Filtered: s2 not in c1
            { meeting_id: 'm2', student_id: 's2', status: 'H' }, // OK: s2 in c2
            { meeting_id: 'm_multi', student_id: 's1', status: 'H' }, // OK: matches c1, s1 in c1
            { meeting_id: 'm_multi', student_id: 's2', status: 'H' }, // OK: matches c2, s2 in c2
            { meeting_id: 'm_unknown', student_id: 's1', status: 'H' } // Filtered: unknown meeting
        ]

        it('should filter correctly with multiple classes in filter', () => {
            const filterClassIds = ['c1', 'c2']
            const result = filterAttendanceByMeetingClass(attendanceLogs, meetingMap, filterClassIds, enrollmentMap)

            expect(result).toHaveLength(3)
            expect(result.some(l => l.student_id === 's2' && l.meeting_id === 'm1')).toBe(false)
        })

        it('should filter correctly for single class in filter', () => {
            const filterClassIds = ['c1']
            const result = filterAttendanceByMeetingClass(attendanceLogs, meetingMap, filterClassIds, enrollmentMap)

            expect(result).toHaveLength(2) // m1-s1, m_multi-s1
            expect(result.every(l => l.student_id === 's1')).toBe(true)
        })
    })

    describe('calculateAttendanceRate', () => {
        it('should return 0 for empty logs', () => {
            expect(calculateAttendanceRate([])).toBe(0)
        })

        it('should calculate correct percentage for Hadir logs', () => {
            const logs: AttendanceLog[] = [
                { meeting_id: 'm1', student_id: 's1', status: 'H' },
                { meeting_id: 'm1', student_id: 's2', status: 'A' },
                { meeting_id: 'm1', student_id: 's3', status: 'I' },
                { meeting_id: 'm1', student_id: 's4', status: 'S' }
            ]
            expect(calculateAttendanceRate(logs)).toBe(25)
        })
    })

    describe('calculateAttendanceStats', () => {
        it('should return all zeros for empty logs', () => {
            const stats = calculateAttendanceStats([])
            expect(stats).toEqual({
                total: 0,
                hadir: 0,
                izin: 0,
                sakit: 0,
                alpha: 0,
                percentage: 0
            })
        })

        it('should calculate complete stats correctly', () => {
            const logs: AttendanceLog[] = [
                { meeting_id: 'm1', student_id: 's1', status: 'H' },
                { meeting_id: 'm1', student_id: 's2', status: 'H' },
                { meeting_id: 'm1', student_id: 's3', status: 'I' },
                { meeting_id: 'm1', student_id: 's4', status: 'S' },
                { meeting_id: 'm1', student_id: 's5', status: 'A' }
            ]
            const stats = calculateAttendanceStats(logs)
            expect(stats).toEqual({
                total: 5,
                hadir: 2,
                izin: 1,
                sakit: 1,
                alpha: 1,
                percentage: 40
            })
        })
    })
})
