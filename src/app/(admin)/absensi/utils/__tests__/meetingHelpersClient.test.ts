import { describe, it, expect } from 'vitest'
import { canUserEditMeetingAttendance } from '../meetingHelpersClient'

describe('canUserEditMeetingAttendance', () => {
    it('should allow superadmin and admin', () => {
        expect(canUserEditMeetingAttendance('superadmin', false, 'class1', [])).toBe(true)
        expect(canUserEditMeetingAttendance('admin', false, 'class1', [])).toBe(true)
    })

    it('should allow hierarchical teachers', () => {
        expect(canUserEditMeetingAttendance('teacher', false, 'class1', [], true)).toBe(true)
    })

    it('should allow meeting creators', () => {
        expect(canUserEditMeetingAttendance('teacher', true, 'class1', [], false)).toBe(true)
    })

    it('should allow regular teachers for their own classes', () => {
        expect(canUserEditMeetingAttendance('teacher', false, 'class1', ['class1', 'class2'], false)).toBe(true)
    })

    it('should deny regular teachers for classes they do not teach', () => {
        expect(canUserEditMeetingAttendance('teacher', false, 'class3', ['class1', 'class2'], false)).toBe(false)
    })

    it('should deny students', () => {
        expect(canUserEditMeetingAttendance('student', false, 'class1', [], false)).toBe(false)
    })
})
