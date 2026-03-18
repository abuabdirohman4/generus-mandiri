import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchMeetingFormSettings: vi.fn(),
  updateMeetingFormSettingsQuery: vi.fn(),
  updateTeacherPermissionsQuery: vi.fn(),
}))
vi.mock('../logic', () => ({
  extractMeetingFormSettings: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchMeetingFormSettings,
  updateMeetingFormSettingsQuery,
  updateTeacherPermissionsQuery,
} from '../queries'
import { extractMeetingFormSettings } from '../logic'
import {
  getMeetingFormSettings,
  updateMeetingFormSettings,
  updateTeacherPermissions,
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
  b.neq = vi.fn().mockReturnValue(b)
  b.in = vi.fn().mockReturnValue(b)
  b.is = vi.fn().mockReturnValue(b)
  b.order = vi.fn().mockReturnValue(b)
  b.limit = vi.fn().mockReturnValue(b)
  b.single = terminalMock
  b.maybeSingle = terminalMock
  b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
  return b
}

function makeSupabase(overrides: { user?: any; profileData?: any; fromBuilder?: any } = {}) {
  const {
    user = { id: 'user-1' },
    profileData = { id: 'profile-1', role: 'superadmin' },
    fromBuilder,
  } = overrides
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi
      .fn()
      .mockReturnValue(fromBuilder || makeQueryBuilder({ data: profileData, error: null })),
  } as any
}

const DEFAULT_SETTINGS = {
  showTitle: true,
  showTopic: true,
  showDescription: true,
  showDate: true,
  showMeetingType: true,
  showClassSelection: true,
  showStudentSelection: true,
  showGenderFilter: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Guru Settings Actions (Layer 3)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // getMeetingFormSettings
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMeetingFormSettings', () => {
    it('returns success with extracted settings on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchMeetingFormSettings).mockResolvedValue({
        data: { meeting_form_settings: DEFAULT_SETTINGS },
        error: null,
      } as any)
      vi.mocked(extractMeetingFormSettings).mockReturnValue(DEFAULT_SETTINGS)

      const result = await getMeetingFormSettings('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(DEFAULT_SETTINGS)
      expect(fetchMeetingFormSettings).toHaveBeenCalledWith(supabase, 'user-1')
      expect(extractMeetingFormSettings).toHaveBeenCalledWith({ meeting_form_settings: DEFAULT_SETTINGS })
    })

    it('returns success with undefined data when profile row is not found (PGRST116)', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchMeetingFormSettings).mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      } as any)

      const result = await getMeetingFormSettings('unknown-user')

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      // extractMeetingFormSettings should NOT be called
      expect(extractMeetingFormSettings).not.toHaveBeenCalled()
    })

    it('returns success with undefined when settings field is null/empty', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchMeetingFormSettings).mockResolvedValue({
        data: { meeting_form_settings: null },
        error: null,
      } as any)
      vi.mocked(extractMeetingFormSettings).mockReturnValue(undefined)

      const result = await getMeetingFormSettings('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('returns error when a non-PGRST116 database error occurs', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchMeetingFormSettings).mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'Table not found' },
      } as any)

      const result = await getMeetingFormSettings('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Gagal memuat pengaturan form')
    })

    it('returns error with custom message when fetchMeetingFormSettings throws', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchMeetingFormSettings).mockRejectedValue(new Error('Network failure'))

      const result = await getMeetingFormSettings('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateMeetingFormSettings
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateMeetingFormSettings', () => {
    it('returns success and revalidates paths on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateMeetingFormSettingsQuery).mockResolvedValue({ error: null } as any)

      const result = await updateMeetingFormSettings('user-1', DEFAULT_SETTINGS)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(updateMeetingFormSettingsQuery).toHaveBeenCalledWith(
        supabase,
        'user-1',
        DEFAULT_SETTINGS
      )
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
      expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })

    it('revalidates both /users/guru and /absensi paths on success', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateMeetingFormSettingsQuery).mockResolvedValue({ error: null } as any)

      await updateMeetingFormSettings('user-1', DEFAULT_SETTINGS)

      expect(revalidatePath).toHaveBeenCalledTimes(2)
      const calls = vi.mocked(revalidatePath).mock.calls.map(([path]) => path)
      expect(calls).toContain('/users/guru')
      expect(calls).toContain('/absensi')
    })

    it('returns error when updateMeetingFormSettingsQuery returns a database error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateMeetingFormSettingsQuery).mockResolvedValue({
        error: { code: '23505', message: 'Unique constraint violation' },
      } as any)

      const result = await updateMeetingFormSettings('user-1', DEFAULT_SETTINGS)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Gagal menyimpan pengaturan form')
      // Should NOT revalidate on error
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns error when updateMeetingFormSettingsQuery throws unexpectedly', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateMeetingFormSettingsQuery).mockRejectedValue(new Error('Unexpected failure'))

      const result = await updateMeetingFormSettings('user-1', DEFAULT_SETTINGS)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('passes the correct settings object to the query function', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateMeetingFormSettingsQuery).mockResolvedValue({ error: null } as any)

      const customSettings = { ...DEFAULT_SETTINGS, showTitle: false, showGenderFilter: false }
      await updateMeetingFormSettings('teacher-42', customSettings)

      expect(updateMeetingFormSettingsQuery).toHaveBeenCalledWith(
        supabase,
        'teacher-42',
        customSettings
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateTeacherPermissions
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateTeacherPermissions', () => {
    const fullPermissions = {
      can_archive_students: true,
      can_transfer_students: true,
      can_soft_delete_students: false,
      can_hard_delete_students: false,
    }

    it('returns success and revalidates paths on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherPermissionsQuery).mockResolvedValue({ error: null } as any)

      const result = await updateTeacherPermissions('user-1', fullPermissions)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(updateTeacherPermissionsQuery).toHaveBeenCalledWith(supabase, 'user-1', fullPermissions)
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
      expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })

    it('revalidates /users/guru and /users/siswa (not /absensi) on success', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherPermissionsQuery).mockResolvedValue({ error: null } as any)

      await updateTeacherPermissions('user-1', fullPermissions)

      expect(revalidatePath).toHaveBeenCalledTimes(2)
      const calls = vi.mocked(revalidatePath).mock.calls.map(([path]) => path)
      expect(calls).toContain('/users/guru')
      expect(calls).toContain('/users/siswa')
      expect(calls).not.toContain('/absensi')
    })

    it('returns error when updateTeacherPermissionsQuery returns a database error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherPermissionsQuery).mockResolvedValue({
        error: { code: '42703', message: 'Column not found' },
      } as any)

      const result = await updateTeacherPermissions('user-1', fullPermissions)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Gagal menyimpan hak akses')
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns error when updateTeacherPermissionsQuery throws unexpectedly', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherPermissionsQuery).mockRejectedValue(new Error('Connection timeout'))

      const result = await updateTeacherPermissions('user-1', fullPermissions)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('works with partial permissions (only can_archive_students)', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherPermissionsQuery).mockResolvedValue({ error: null } as any)

      const partialPermissions = { can_archive_students: true }
      const result = await updateTeacherPermissions('user-99', partialPermissions)

      expect(result.success).toBe(true)
      expect(updateTeacherPermissionsQuery).toHaveBeenCalledWith(
        supabase,
        'user-99',
        partialPermissions
      )
    })

    it('works with empty permissions object', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherPermissionsQuery).mockResolvedValue({ error: null } as any)

      const result = await updateTeacherPermissions('user-1', {})

      expect(result.success).toBe(true)
      expect(updateTeacherPermissionsQuery).toHaveBeenCalledWith(supabase, 'user-1', {})
    })
  })
})
