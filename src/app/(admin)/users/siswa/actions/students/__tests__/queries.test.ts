import { describe, it, expect, vi } from 'vitest'
import {
    fetchAllStudents,
    insertStudent,
    updateStudentRecord,
    softDeleteStudent,
    hardDeleteStudent,
    fetchCurrentStudentClasses,
    checkStudentHasAttendance,
} from '../queries'

// Helper: build a complete Supabase mock chain for the students query
// Chain is: from().select().is().order() → resolves
function makeStudentsQueryMock(resolvedValue: any) {
    const mockOrder = vi.fn().mockResolvedValue(resolvedValue)
    const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ is: mockIs })
    return { mockSelect, mockIs, mockOrder, from: vi.fn().mockReturnValue({ select: mockSelect }) }
}

// ─── fetchAllStudents ─────────────────────────────────────────────────────────

describe('fetchAllStudents', () => {
    it('queries students table (no classId filter)', async () => {
        const mock = makeStudentsQueryMock({ data: [], error: null })
        const supabase = { from: mock.from } as any

        await fetchAllStudents(supabase)

        expect(mock.from).toHaveBeenCalledWith('students')
        expect(mock.mockIs).toHaveBeenCalledWith('deleted_at', null)
        expect(mock.mockOrder).toHaveBeenCalledWith('name')
    })

    it('filters by classId via student_classes junction, then queries students', async () => {
        // The actual execution order in fetchAllStudents:
        // 1. from('students').select().is().order() — built first (not yet awaited)
        // 2. from('student_classes').select().in() — awaited to get student IDs
        // 3. the students query .in(studentIds) — awaited to resolve

        const junctionResult = { data: [{ student_id: 's1' }] }
        const mockStudentsIn = vi.fn().mockResolvedValue({ data: [{ id: 's1', name: 'Budi' }], error: null })
        const mockStudentsOrder = vi.fn().mockReturnValue({ in: mockStudentsIn })
        const mockStudentsIs = vi.fn().mockReturnValue({ order: mockStudentsOrder })
        const mockStudentsSelect = vi.fn().mockReturnValue({ is: mockStudentsIs })

        const mockJunctionIn = vi.fn().mockResolvedValue(junctionResult)
        const mockJunctionSelect = vi.fn().mockReturnValue({ in: mockJunctionIn })

        const supabase = {
            from: vi.fn()
                .mockReturnValueOnce({ select: mockStudentsSelect })    // first: students query built
                .mockReturnValueOnce({ select: mockJunctionSelect }),   // second: student_classes awaited
        } as any

        await fetchAllStudents(supabase, 'class-id')

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(supabase.from).toHaveBeenCalledWith('student_classes')
        expect(mockStudentsIn).toHaveBeenCalledWith('id', ['s1'])
    })

    it('returns empty immediately when no students for given classId', async () => {
        // students query built first, student_classes queried (returns empty), early return
        const mockStudentsOrder = vi.fn().mockReturnValue({ in: vi.fn() })
        const mockStudentsIs = vi.fn().mockReturnValue({ order: mockStudentsOrder })
        const mockStudentsSelect = vi.fn().mockReturnValue({ is: mockStudentsIs })

        const mockJunctionIn = vi.fn().mockResolvedValue({ data: [] })
        const mockJunctionSelect = vi.fn().mockReturnValue({ in: mockJunctionIn })

        const supabase = {
            from: vi.fn()
                .mockReturnValueOnce({ select: mockStudentsSelect })    // students query built
                .mockReturnValueOnce({ select: mockJunctionSelect }),   // student_classes queried
        } as any

        const result = await fetchAllStudents(supabase, 'class-with-no-students')
        expect(result).toEqual({ data: [], error: null })
        expect(supabase.from).toHaveBeenCalledWith('student_classes')
        // students .in() should NOT be called since we return early
        expect(mockStudentsOrder().in).not.toHaveBeenCalledWith('id', expect.any(Array))
    })
})

// ─── insertStudent ────────────────────────────────────────────────────────────

describe('insertStudent', () => {
    it('inserts into students table and returns single', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-1' }, error: null })
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
        const supabase = { from: vi.fn().mockReturnValue({ insert: mockInsert }) } as any

        const studentData = {
            name: 'Budi',
            gender: 'Laki-laki',
            class_id: 'c1',
            kelompok_id: 'k1',
            desa_id: 'd1',
            daerah_id: 'da1',
        }

        const result = await insertStudent(supabase, studentData)

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(mockInsert).toHaveBeenCalledWith(studentData)
        expect(result.data).toEqual({ id: 'new-1' })
    })
})

// ─── updateStudentRecord ──────────────────────────────────────────────────────

describe('updateStudentRecord', () => {
    it('updates students table and filters by id', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 's1' }, error: null })
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
        const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ update: mockUpdate }) } as any

        const updateData = { name: 'Updated', gender: 'Laki-laki', class_id: 'c1', updated_at: '2026-01-01' }
        await updateStudentRecord(supabase, 's1', updateData)

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(mockUpdate).toHaveBeenCalledWith(updateData)
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })
})

// ─── softDeleteStudent ────────────────────────────────────────────────────────

describe('softDeleteStudent', () => {
    it('sets deleted_at and deleted_by on the student', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ update: mockUpdate }) } as any

        await softDeleteStudent(supabase, 's1', 'user-123')

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ deleted_at: expect.any(String), deleted_by: 'user-123' })
        )
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })
})

// ─── hardDeleteStudent ────────────────────────────────────────────────────────

describe('hardDeleteStudent', () => {
    it('permanently deletes a student record', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ delete: mockDelete }) } as any

        await hardDeleteStudent(supabase, 's1')

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })
})

// ─── fetchCurrentStudentClasses ───────────────────────────────────────────────

describe('fetchCurrentStudentClasses', () => {
    it('queries student_classes for given student id', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: [{ class_id: 'c1' }], error: null })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

        const result = await fetchCurrentStudentClasses(supabase, 's1')

        expect(supabase.from).toHaveBeenCalledWith('student_classes')
        expect(mockEq).toHaveBeenCalledWith('student_id', 's1')
        expect(result.data).toEqual([{ class_id: 'c1' }])
    })
})

// ─── checkStudentHasAttendance ────────────────────────────────────────────────

describe('checkStudentHasAttendance', () => {
    it('queries attendance_logs with limit 1 and maybeSingle', async () => {
        const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
        const mockEq = vi.fn().mockReturnValue({ limit: mockLimit })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

        await checkStudentHasAttendance(supabase, 's1')

        expect(supabase.from).toHaveBeenCalledWith('attendance_logs')
        expect(mockEq).toHaveBeenCalledWith('student_id', 's1')
        expect(mockLimit).toHaveBeenCalledWith(1)
    })
})
