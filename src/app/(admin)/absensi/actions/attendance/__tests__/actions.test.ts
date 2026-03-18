import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before importing the module under test
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn()
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

vi.mock('../queries', () => ({
  upsertAttendanceLogs: vi.fn(),
  fetchAttendanceByDate: vi.fn(),
  fetchAttendanceByMeeting: vi.fn(),
  fetchStudentsByIds: vi.fn()
}))

vi.mock('../logic', () => ({
  validateAttendanceData: vi.fn(),
  calculateAttendanceStats: vi.fn()
}))

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  upsertAttendanceLogs,
  fetchAttendanceByDate,
  fetchAttendanceByMeeting,
  fetchStudentsByIds
} from '../queries'
import { validateAttendanceData, calculateAttendanceStats } from '../logic'
import {
  saveAttendance,
  saveAttendanceForMeeting,
  getAttendanceByDate,
  getAttendanceByMeeting,
  getAttendanceStats,
  getStudentsFromSnapshot
} from '../actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryBuilder(resolvedValue: any = { data: null, error: null }) {
  const b: any = {}
  const terminalMock = vi.fn().mockResolvedValue(resolvedValue)
  b.select = vi.fn().mockReturnValue(b)
  b.insert = vi.fn().mockReturnValue(b)
  b.update = vi.fn().mockReturnValue(b)
  b.delete = vi.fn().mockReturnValue(b)
  b.eq = vi.fn().mockReturnValue(b)
  b.in = vi.fn().mockReturnValue(b)
  b.is = vi.fn().mockReturnValue(b)
  b.gte = vi.fn().mockReturnValue(b)
  b.lte = vi.fn().mockReturnValue(b)
  b.order = vi.fn().mockReturnValue(b)
  b.limit = vi.fn().mockReturnValue(b)
  b.single = terminalMock
  b.maybeSingle = terminalMock
  b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
  return b
}

function makeSupabase(overrides: {
  user?: any
  profileData?: any
  fromBuilder?: any
} = {}) {
  const { user = { id: 'user-1' }, profileData = { id: 'profile-1' }, fromBuilder } = overrides
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } })
    },
    from: vi.fn().mockReturnValue(
      fromBuilder || makeQueryBuilder({ data: profileData, error: null })
    )
  } as any
}

function makeAdminSupabase(overrides: { fromBuilder?: any } = {}) {
  return {
    from: vi.fn().mockReturnValue(
      overrides.fromBuilder || makeQueryBuilder({ data: null, error: null })
    )
  } as any
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Attendance Actions (Layer 3)', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // saveAttendance
  // ==========================================================================

  describe('saveAttendance', () => {
    const validData = [
      { student_id: 'student-1', date: '2026-03-18', status: 'H' as const }
    ]

    it('should return error when validation fails', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({
        valid: false,
        error: 'No attendance data provided'
      })

      const result = await saveAttendance([])

      expect(result).toEqual({ success: false, error: 'No attendance data provided' })
      // createClient should never be called if validation fails
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await saveAttendance(validData)

      expect(result).toEqual({ success: false, error: 'User not authenticated' })
    })

    it('should return error when user profile is not found', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const profileBuilder = makeQueryBuilder({ data: null, error: null })
      const supabase = makeSupabase({ profileData: null, fromBuilder: profileBuilder })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await saveAttendance(validData)

      expect(result).toEqual({ success: false, error: 'User profile not found' })
    })

    it('should save attendance and call revalidatePath on success', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const profileBuilder = makeQueryBuilder({ data: { id: 'profile-1' }, error: null })
      const supabase = makeSupabase({ fromBuilder: profileBuilder })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(upsertAttendanceLogs).mockResolvedValue({ data: [], error: null })

      const result = await saveAttendance(validData)

      expect(result).toEqual({ success: true })
      expect(upsertAttendanceLogs).toHaveBeenCalledWith(
        supabase,
        expect.arrayContaining([
          expect.objectContaining({
            student_id: 'student-1',
            date: '2026-03-18',
            status: 'H',
            recorded_by: 'profile-1'
          })
        ])
      )
      expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })

    it('should return error when upsert fails', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const profileBuilder = makeQueryBuilder({ data: { id: 'profile-1' }, error: null })
      const supabase = makeSupabase({ fromBuilder: profileBuilder })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(upsertAttendanceLogs).mockResolvedValue({
        data: null,
        error: { message: 'DB error' }
      })

      const result = await saveAttendance(validData)

      expect(result).toEqual({ success: false, error: 'DB error' })
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // saveAttendanceForMeeting
  // ==========================================================================

  describe('saveAttendanceForMeeting', () => {
    const meetingId = 'meeting-1'
    const validData = [
      { student_id: 'student-1', date: '2026-03-18', status: 'H' as const }
    ]

    it('should return error when validation fails', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({
        valid: false,
        error: 'No attendance data provided'
      })

      const result = await saveAttendanceForMeeting(meetingId, [])

      expect(result).toEqual({ success: false, error: 'No attendance data provided' })
      expect(createClient).not.toHaveBeenCalled()
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await saveAttendanceForMeeting(meetingId, validData)

      expect(result).toEqual({ success: false, error: 'User not authenticated' })
    })

    it('should return error when user profile is not found', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const profileBuilder = makeQueryBuilder({ data: null, error: null })
      const supabase = makeSupabase({ profileData: null, fromBuilder: profileBuilder })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await saveAttendanceForMeeting(meetingId, validData)

      expect(result).toEqual({ success: false, error: 'User profile not found' })
    })

    it('should return error when meeting is not found', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const profileBuilder = makeQueryBuilder({
        data: { id: 'profile-1', role: 'teacher' },
        error: null
      })
      const supabase = makeSupabase({ fromBuilder: profileBuilder })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const meetingBuilder = makeQueryBuilder({ data: null, error: { message: 'Not found' } })
      const adminClient = makeAdminSupabase({ fromBuilder: meetingBuilder })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await saveAttendanceForMeeting(meetingId, validData)

      expect(result).toEqual({ success: false, error: 'Meeting not found' })
    })

    it('should save attendance for meeting and call revalidatePath on success', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const profileBuilder = makeQueryBuilder({
        data: { id: 'profile-1', role: 'teacher' },
        error: null
      })
      const supabase = makeSupabase({ fromBuilder: profileBuilder })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const meetingBuilder = makeQueryBuilder({
        data: { teacher_id: 'teacher-1', class_ids: ['class-1'], date: '2026-03-18' },
        error: null
      })
      const adminClient = makeAdminSupabase({ fromBuilder: meetingBuilder })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(upsertAttendanceLogs).mockResolvedValue({ data: [], error: null })

      const result = await saveAttendanceForMeeting(meetingId, validData)

      expect(result).toEqual({ success: true })
      expect(upsertAttendanceLogs).toHaveBeenCalledWith(
        adminClient,
        expect.arrayContaining([
          expect.objectContaining({
            student_id: 'student-1',
            meeting_id: meetingId,
            date: '2026-03-18',
            status: 'H',
            recorded_by: 'profile-1'
          })
        ])
      )
      expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })

    it('should return error when upsert fails', async () => {
      vi.mocked(validateAttendanceData).mockReturnValue({ valid: true })
      const profileBuilder = makeQueryBuilder({
        data: { id: 'profile-1', role: 'teacher' },
        error: null
      })
      const supabase = makeSupabase({ fromBuilder: profileBuilder })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const meetingBuilder = makeQueryBuilder({
        data: { teacher_id: 'teacher-1', class_ids: ['class-1'], date: '2026-03-18' },
        error: null
      })
      const adminClient = makeAdminSupabase({ fromBuilder: meetingBuilder })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(upsertAttendanceLogs).mockResolvedValue({
        data: null,
        error: { message: 'Upsert failed' }
      })

      const result = await saveAttendanceForMeeting(meetingId, validData)

      expect(result).toEqual({ success: false, error: 'Upsert failed' })
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // getAttendanceByDate
  // ==========================================================================

  describe('getAttendanceByDate', () => {
    it('should return attendance data on success', async () => {
      const mockData = [
        { id: 'log-1', student_id: 'student-1', date: '2026-03-18', status: 'H' }
      ]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAttendanceByDate).mockResolvedValue({ data: mockData, error: null })

      const result = await getAttendanceByDate('2026-03-18')

      expect(result).toEqual({ success: true, data: mockData })
      expect(fetchAttendanceByDate).toHaveBeenCalledWith(supabase, '2026-03-18')
    })

    it('should return error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAttendanceByDate).mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      })

      const result = await getAttendanceByDate('2026-03-18')

      expect(result).toEqual({ success: false, error: 'Query failed', data: null })
    })
  })

  // ==========================================================================
  // getAttendanceByMeeting
  // ==========================================================================

  describe('getAttendanceByMeeting', () => {
    it('should return attendance data for meeting on success', async () => {
      const mockData = [
        { id: 'log-1', student_id: 'student-1', status: 'H' }
      ]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchAttendanceByMeeting).mockResolvedValue({ data: mockData, error: null })

      const result = await getAttendanceByMeeting('meeting-1')

      expect(result).toEqual({ success: true, data: mockData })
      expect(fetchAttendanceByMeeting).toHaveBeenCalledWith(adminClient, 'meeting-1')
    })

    it('should return error when fetch fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchAttendanceByMeeting).mockResolvedValue({
        data: null,
        error: { message: 'Meeting query failed' }
      })

      const result = await getAttendanceByMeeting('meeting-1')

      expect(result).toEqual({ success: false, error: 'Meeting query failed', data: null })
    })
  })

  // ==========================================================================
  // getAttendanceStats
  // ==========================================================================

  describe('getAttendanceStats', () => {
    it('should return calculated stats on success', async () => {
      const mockData = [
        { id: 'log-1', student_id: 's1', date: '2026-03-18', status: 'H', recorded_by: 'u1', created_at: '', updated_at: '' }
      ]
      const mockStats = { total_students: 1, present: 1, sick: 0, permission: 0, absent: 0, percentage: 100 }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAttendanceByDate).mockResolvedValue({ data: mockData, error: null })
      vi.mocked(calculateAttendanceStats).mockReturnValue(mockStats)

      const result = await getAttendanceStats('2026-03-18')

      expect(result).toEqual({ success: true, data: mockStats })
      expect(calculateAttendanceStats).toHaveBeenCalledWith(mockData)
    })

    it('should return error when underlying getAttendanceByDate fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAttendanceByDate).mockResolvedValue({
        data: null,
        error: { message: 'Fetch failed' }
      })

      const result = await getAttendanceStats('2026-03-18')

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(calculateAttendanceStats).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // getStudentsFromSnapshot
  // ==========================================================================

  describe('getStudentsFromSnapshot', () => {
    it('should return empty array when studentIds is empty', async () => {
      const result = await getStudentsFromSnapshot([])

      expect(result).toEqual({ success: true, data: [] })
      expect(createAdminClient).not.toHaveBeenCalled()
    })

    it('should return transformed students on success', async () => {
      const mockStudents = [
        {
          id: 'student-1',
          name: 'Ahmad',
          gender: 'L',
          class_id: 'class-1',
          classes: { id: 'class-1', name: 'Kelas 1' },
          student_classes: [
            { classes: { id: 'class-1', name: 'Kelas 1' } }
          ]
        }
      ]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentsByIds).mockResolvedValue({ data: mockStudents, error: null })

      const result = await getStudentsFromSnapshot(['student-1'])

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0]).toMatchObject({
        id: 'student-1',
        name: 'Ahmad',
        gender: 'L',
        class_name: 'Kelas 1',
        class_id: 'class-1',
        classes: [{ id: 'class-1', name: 'Kelas 1' }]
      })
      expect(fetchStudentsByIds).toHaveBeenCalledWith(adminClient, ['student-1'])
    })

    it('should fall back to primary class when student_classes is empty', async () => {
      const mockStudents = [
        {
          id: 'student-2',
          name: 'Budi',
          gender: 'L',
          class_id: 'class-2',
          classes: { id: 'class-2', name: 'Kelas 2' },
          student_classes: []
        }
      ]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentsByIds).mockResolvedValue({ data: mockStudents, error: null })

      const result = await getStudentsFromSnapshot(['student-2'])

      expect(result.success).toBe(true)
      expect(result.data![0]).toMatchObject({
        class_name: 'Kelas 2',
        class_id: 'class-2',
        classes: [{ id: 'class-2', name: 'Kelas 2' }]
      })
    })

    it('should use "Unknown Class" when no class data is available', async () => {
      const mockStudents = [
        {
          id: 'student-3',
          name: 'Cici',
          gender: 'P',
          class_id: null,
          classes: null,
          student_classes: []
        }
      ]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentsByIds).mockResolvedValue({ data: mockStudents, error: null })

      const result = await getStudentsFromSnapshot(['student-3'])

      expect(result.success).toBe(true)
      expect(result.data![0].class_name).toBe('Unknown Class')
    })

    it('should return error when fetch fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentsByIds).mockResolvedValue({
        data: null,
        error: { message: 'Students fetch failed' }
      })

      const result = await getStudentsFromSnapshot(['student-1'])

      expect(result).toEqual({ success: false, error: 'Students fetch failed', data: null })
    })
  })
})
