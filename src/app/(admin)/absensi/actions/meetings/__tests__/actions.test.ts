import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchMeetingById: vi.fn(),
  fetchMeetingsByClass: vi.fn(),
  insertMeeting: vi.fn(),
  updateMeetingRecord: vi.fn(),
  softDeleteMeeting: vi.fn(),
}))
vi.mock('../logic', () => ({
  validateMeetingData: vi.fn(),
  buildStudentSnapshot: vi.fn(),
  canUserAccessMeeting: vi.fn(),
}))
vi.mock('../helpers.server', () => ({
  canEditOrDeleteMeeting: vi.fn(),
}))
vi.mock('@/lib/utils/classHelpers', () => ({
  isCaberawitClass: vi.fn().mockReturnValue(false),
  isTeacherClass: vi.fn().mockReturnValue(false),
}))
vi.mock('@/lib/utils/batchFetching', () => ({
  fetchAttendanceLogsInBatches: vi.fn(),
}))

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchMeetingById,
  fetchMeetingsByClass,
  insertMeeting,
  updateMeetingRecord,
  softDeleteMeeting,
} from '../queries'
import { validateMeetingData } from '../logic'
import { canEditOrDeleteMeeting } from '../helpers.server'
import {
  createMeeting,
  getMeetingsByClass,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  getMeetingsWithStats,
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
  b.lt = vi.fn().mockReturnValue(b)
  b.order = vi.fn().mockReturnValue(b)
  b.limit = vi.fn().mockReturnValue(b)
  b.single = terminalMock
  b.maybeSingle = terminalMock
  b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
  return b
}

function makeSupabase(overrides: { user?: any; profileData?: any; fromBuilder?: any } = {}) {
  const { user = { id: 'user-1' }, profileData = { id: 'profile-1', role: 'superadmin' }, fromBuilder } = overrides
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(fromBuilder || makeQueryBuilder({ data: profileData, error: null })),
  } as any
}

function makeAdminSupabase(overrides: { fromBuilder?: any } = {}) {
  return {
    from: vi.fn().mockReturnValue(overrides.fromBuilder || makeQueryBuilder({ data: null, error: null })),
  } as any
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Meeting Actions (Layer 3)', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createMeeting
  // ─────────────────────────────────────────────────────────────────────────

  describe('createMeeting', () => {
    const validData = {
      classIds: ['class-1'],
      title: 'Test Meeting',
      date: '2026-03-18',
      topic: 'Test Topic',
      studentIds: [],
    }

    it('returns error when user is not authenticated', async () => {
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await createMeeting(validData as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('returns error when user profile is not found', async () => {
      const supabase = makeSupabase({ profileData: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await createMeeting(validData as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User profile not found')
    })

    it('returns error when validation fails', async () => {
      const supabase = makeSupabase({ profileData: { id: 'profile-1', role: 'superadmin' } })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(validateMeetingData).mockReturnValue({ ok: false, error: 'Date is required' })

      const result = await createMeeting(validData as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Date is required')
    })

    it('returns error when teacher tries to create meeting for unauthorized class', async () => {
      const supabase = makeSupabase({ profileData: { id: 'user-1', role: 'teacher' } })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(validateMeetingData).mockReturnValue({ ok: true })

      // adminClient returns empty teacher_classes (teacher doesn't teach this class)
      const adminClient = makeAdminSupabase({
        fromBuilder: makeQueryBuilder({ data: [], error: null }),
      })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await createMeeting({ ...validData, classIds: ['unauthorized-class'] } as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('You can only create meetings for your own classes')
    })

    it('returns success on admin happy path (no studentIds provided)', async () => {
      const supabase = makeSupabase({ profileData: { id: 'profile-1', role: 'superadmin' } })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(validateMeetingData).mockReturnValue({ ok: true })

      const studentClassBuilder = makeQueryBuilder({ data: [{ student_id: 's1' }], error: null })
      const studentsBuilder = makeQueryBuilder({
        data: [{ id: 's1', name: 'Ahmad', class_id: 'c1', kelompok_id: 'k1' }],
        error: null,
      })
      const adminClient = {
        from: vi.fn()
          .mockReturnValueOnce(studentClassBuilder)
          .mockReturnValueOnce(studentsBuilder),
      } as any
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertMeeting).mockResolvedValue({ data: { id: 'meeting-1' }, error: null } as any)

      const result = await createMeeting({ ...validData, studentIds: [] } as any)

      expect(result.success).toBe(true)
      expect((result as any).data).toEqual({ id: 'meeting-1' })
      expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })

    it('returns error when insertMeeting fails', async () => {
      const supabase = makeSupabase({ profileData: { id: 'profile-1', role: 'superadmin' } })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(validateMeetingData).mockReturnValue({ ok: true })

      const studentClassBuilder = makeQueryBuilder({ data: [{ student_id: 's1' }], error: null })
      const studentsBuilder = makeQueryBuilder({
        data: [{ id: 's1', name: 'Ahmad', class_id: 'c1', kelompok_id: 'k1' }],
        error: null,
      })
      const adminClient = {
        from: vi.fn()
          .mockReturnValueOnce(studentClassBuilder)
          .mockReturnValueOnce(studentsBuilder),
      } as any
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertMeeting).mockResolvedValue({ data: null, error: new Error('DB insert failed') } as any)

      const result = await createMeeting({ ...validData, studentIds: [] } as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('returns error when no students found in selected classes', async () => {
      const supabase = makeSupabase({ profileData: { id: 'profile-1', role: 'superadmin' } })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(validateMeetingData).mockReturnValue({ ok: true })

      // studentClassData is empty
      const emptyBuilder = makeQueryBuilder({ data: [], error: null })
      const adminClient = {
        from: vi.fn().mockReturnValue(emptyBuilder),
      } as any
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await createMeeting({ ...validData, studentIds: [] } as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No students found in selected classes')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMeetingsByClass
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMeetingsByClass', () => {
    it('returns error when user is not authenticated', async () => {
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await getMeetingsByClass()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('returns error when user profile is not found', async () => {
      const supabase = makeSupabase({ profileData: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await getMeetingsByClass()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User profile not found')
    })

    it('returns empty array when teacher has no assigned classes', async () => {
      const profileBuilder = makeQueryBuilder({ data: { id: 'user-1', role: 'teacher' }, error: null })
      const teacherClassesBuilder = makeQueryBuilder({ data: [], error: null })
      const supabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
        from: vi.fn()
          .mockReturnValueOnce(profileBuilder)        // profiles
          .mockReturnValueOnce(teacherClassesBuilder), // teacher_classes
      } as any
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await getMeetingsByClass()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(result.hasMore).toBe(false)
    })

    it('returns meetings for admin/superadmin happy path', async () => {
      const meetings = [
        { id: 'm1', class_id: 'class-1', class_ids: ['class-1'], date: '2026-03-18' },
        { id: 'm2', class_id: 'class-2', class_ids: ['class-2'], date: '2026-03-17' },
      ]
      const supabase = makeSupabase({ profileData: { id: 'profile-1', role: 'superadmin' } })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchMeetingsByClass).mockResolvedValue({ data: meetings, error: null } as any)

      const result = await getMeetingsByClass(undefined, 10)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(meetings)
    })

    it('returns error when fetchMeetingsByClass throws', async () => {
      const supabase = makeSupabase({ profileData: { id: 'profile-1', role: 'admin' } })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchMeetingsByClass).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      const result = await getMeetingsByClass()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMeetingById
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMeetingById', () => {
    it('returns error when meeting is not found', async () => {
      vi.mocked(fetchMeetingById).mockResolvedValue({ data: null, error: null } as any)
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await getMeetingById('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Meeting not found')
    })

    it('returns enriched meeting data on happy path', async () => {
      const meeting = {
        id: 'meeting-1',
        class_id: 'class-1',
        class_ids: ['class-1'],
        classes: { id: 'class-1', name: 'Test Class', kelompok_id: 'k1' },
      }
      vi.mocked(fetchMeetingById).mockResolvedValue({ data: meeting, error: null } as any)

      const classBuilder = makeQueryBuilder({
        data: [{ id: 'class-1', name: 'Test Class', kelompok_id: 'k1', kelompok: null }],
        error: null,
      })
      const adminClient = { from: vi.fn().mockReturnValue(classBuilder) } as any
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await getMeetingById('meeting-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect((result.data as any)?.id).toBe('meeting-1')
    })

    it('returns error when fetchMeetingById throws', async () => {
      vi.mocked(fetchMeetingById).mockResolvedValue({ data: null, error: new Error('DB error') } as any)
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await getMeetingById('meeting-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateMeeting
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateMeeting', () => {
    const updateData = { title: 'Updated Title', date: '2026-03-18' }

    it('returns error when user is not authenticated', async () => {
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await updateMeeting('meeting-1', updateData as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('returns error when user does not have permission', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(false)

      const result = await updateMeeting('meeting-1', updateData as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Anda tidak memiliki izin untuk mengubah pertemuan ini')
    })

    it('returns success on happy path (no studentIds)', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(true)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateMeetingRecord).mockResolvedValue({ error: null } as any)

      const result = await updateMeeting('meeting-1', updateData as any)

      expect(result.success).toBe(true)
      expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })

    it('returns error when updateMeetingRecord fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(true)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateMeetingRecord).mockResolvedValue({ error: new Error('Update failed') } as any)

      const result = await updateMeeting('meeting-1', updateData as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('returns error when studentIds provided but class validation fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(true)

      const emptyStudentClassBuilder = makeQueryBuilder({ data: [], error: null })
      const adminClient = { from: vi.fn().mockReturnValue(emptyStudentClassBuilder) } as any
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const dataWithStudents = {
        ...updateData,
        studentIds: ['s1', 's2'],
        classIds: ['class-1'],
      }
      const result = await updateMeeting('meeting-1', dataWithStudents as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No valid students found in selected classes')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // deleteMeeting
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteMeeting', () => {
    it('returns error when user is not authenticated', async () => {
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await deleteMeeting('meeting-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('returns error when user does not have permission', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(false)

      const result = await deleteMeeting('meeting-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Anda tidak memiliki izin untuk menghapus pertemuan ini')
    })

    it('returns success on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(true)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(softDeleteMeeting).mockResolvedValue({ error: null } as any)

      const result = await deleteMeeting('meeting-1')

      expect(result.success).toBe(true)
      expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })

    it('returns friendly error on foreign key constraint violation (code 23503)', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(true)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const fkError = { code: '23503', message: 'foreign key violation' }
      vi.mocked(softDeleteMeeting).mockResolvedValue({ error: fkError } as any)

      const result = await deleteMeeting('meeting-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('data absensi')
    })

    it('returns generic error when softDeleteMeeting throws unexpected error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(canEditOrDeleteMeeting).mockResolvedValue(true)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(softDeleteMeeting).mockResolvedValue({ error: new Error('Unexpected DB error') } as any)

      const result = await deleteMeeting('meeting-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMeetingsWithStats
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMeetingsWithStats', () => {
    it('returns error when user is not authenticated', async () => {
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await getMeetingsWithStats()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('returns error when user profile is not found', async () => {
      const supabase = makeSupabase({ profileData: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await getMeetingsWithStats()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User profile not found')
    })

    it('returns empty array when teacher has no assigned classes', async () => {
      const profileBuilder = makeQueryBuilder({
        data: { id: 'user-1', role: 'teacher', kelompok_id: 'k1', desa_id: null, daerah_id: null },
        error: null,
      })
      // getMeetingsWithStats builds the meetings query BEFORE the teacher check,
      // so from() is called: 1) profiles, 2) meetings (query build), 3) teacher_classes
      const meetingsQueryBuilder = makeQueryBuilder({ data: [], error: null })
      const teacherClassesBuilder = makeQueryBuilder({ data: [], error: null })
      const supabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
        from: vi.fn()
          .mockReturnValueOnce(profileBuilder)       // profiles
          .mockReturnValueOnce(meetingsQueryBuilder)  // meetings (query build)
          .mockReturnValueOnce(teacherClassesBuilder), // teacher_classes
      } as any
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await getMeetingsWithStats()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('returns meetings on superadmin happy path', async () => {
      const meetingsData = [{ id: 'm1', date: '2026-03-18', class_ids: ['c1'], classes: null }]
      const profileBuilder = makeQueryBuilder({
        data: { id: 'profile-1', role: 'superadmin', kelompok_id: null, desa_id: null, daerah_id: null },
        error: null,
      })
      const meetingsBuilder = makeQueryBuilder({ data: meetingsData, error: null })
      const supabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
        from: vi.fn()
          .mockReturnValueOnce(profileBuilder)   // profiles query
          .mockReturnValueOnce(meetingsBuilder),  // meetings query
      } as any
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await getMeetingsWithStats()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })
  })
})
