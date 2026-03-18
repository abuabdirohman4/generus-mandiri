import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock calls BEFORE all imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchTeachers: vi.fn(),
  insertTeacherProfile: vi.fn(),
  updateTeacherProfile: vi.fn(),
  updateTeacherKelompok: vi.fn(),
  fetchClassesByIds: vi.fn(),
  fetchClassesByIdsFlat: vi.fn(),
  fetchKelompokByIds: vi.fn(),
}))
vi.mock('../logic', () => ({
  validateCreateTeacherData: vi.fn(),
  validateUpdateTeacherData: vi.fn(),
  extractClassIds: vi.fn(),
  buildClassesMap: vi.fn(),
  buildClassesMapWithKelompok: vi.fn(),
  buildKelompokMap: vi.fn(),
  transformTeacher: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  getDataFilter: vi.fn(),
}))
vi.mock('@/lib/errorUtils', () => ({
  handleApiError: vi.fn((error: unknown, _context: string, customMessage?: string) => {
    const err = error as any
    const message = customMessage ?? (err instanceof Error ? err.message : String(err))
    const thrown = new Error(message)
    ;(thrown as any).context = _context
    return thrown
  }),
}))

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchTeachers,
  insertTeacherProfile,
  updateTeacherProfile,
  updateTeacherKelompok,
  fetchClassesByIds,
  fetchClassesByIdsFlat,
  fetchKelompokByIds,
} from '../queries'
import {
  validateCreateTeacherData,
  validateUpdateTeacherData,
  extractClassIds,
  buildClassesMap,
  buildClassesMapWithKelompok,
  buildKelompokMap,
  transformTeacher,
} from '../logic'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import {
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
  getAllTeachers,
  assignTeacherToKelompok,
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
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn().mockReturnValue(fromBuilder || makeQueryBuilder({ data: profileData, error: null })),
  } as any
}

function makeAdminSupabase(overrides: { fromBuilder?: any } = {}) {
  return {
    from: vi.fn().mockReturnValue(overrides.fromBuilder || makeQueryBuilder({ data: null, error: null })),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  } as any
}

const validTeacherData = {
  username: 'guru_ahmad',
  full_name: 'Ahmad Fauzi',
  email: 'ahmad@example.com',
  password: 'password123',
  daerah_id: 'daerah-1',
  desa_id: 'desa-1',
  kelompok_id: 'kelompok-1',
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Teacher Actions (Layer 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createTeacher
  // ─────────────────────────────────────────────────────────────────────────

  describe('createTeacher', () => {
    it('throws when validateCreateTeacherData throws (missing username)', async () => {
      vi.mocked(validateCreateTeacherData).mockImplementation(() => {
        throw new Error('Username harus diisi')
      })
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(createTeacher({ ...validTeacherData, username: '' })).rejects.toThrow()
    })

    it('throws when auth.admin.createUser fails', async () => {
      vi.mocked(validateCreateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.createUser = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Auth service unavailable'),
      })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(createTeacher(validTeacherData)).rejects.toThrow()
    })

    it('throws when auth user is null (no user returned)', async () => {
      vi.mocked(validateCreateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.createUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(createTeacher(validTeacherData)).rejects.toThrow()
    })

    it('deletes auth user and throws when insertTeacherProfile fails', async () => {
      vi.mocked(validateCreateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertTeacherProfile).mockResolvedValue({
        data: null,
        error: new Error('Profile insert failed'),
      } as any)

      await expect(createTeacher(validTeacherData)).rejects.toThrow()
      expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id')
    })

    it('returns success and revalidates path on happy path', async () => {
      vi.mocked(validateCreateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertTeacherProfile).mockResolvedValue({ data: null, error: null } as any)

      const result = await createTeacher(validTeacherData)

      expect(result.success).toBe(true)
      expect((result as any).teacher).toMatchObject({
        id: 'new-user-id',
        username: validTeacherData.username,
        full_name: validTeacherData.full_name,
        email: validTeacherData.email,
        role: 'teacher',
      })
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
    })

    it('does not call insertTeacherProfile if createUser auth error', async () => {
      vi.mocked(validateCreateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.createUser = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Duplicate email'),
      })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(createTeacher(validTeacherData)).rejects.toThrow()
      expect(insertTeacherProfile).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateTeacher
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateTeacher', () => {
    it('throws when validateUpdateTeacherData throws (missing email)', async () => {
      vi.mocked(validateUpdateTeacherData).mockImplementation(() => {
        throw new Error('Email harus diisi')
      })
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(updateTeacher('teacher-1', { ...validTeacherData, email: '' })).rejects.toThrow()
    })

    it('throws when updateTeacherProfile fails', async () => {
      vi.mocked(validateUpdateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateTeacherProfile).mockResolvedValue({
        data: null,
        error: new Error('Profile update failed'),
      } as any)

      await expect(updateTeacher('teacher-1', validTeacherData)).rejects.toThrow()
    })

    it('updates password when password is provided', async () => {
      vi.mocked(validateUpdateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateTeacherProfile).mockResolvedValue({ data: null, error: null } as any)

      const result = await updateTeacher('teacher-1', { ...validTeacherData, password: 'newpass123' })

      expect(result.success).toBe(true)
      // updateUserById called twice: once for password, once for metadata
      expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledTimes(2)
    })

    it('skips password update when password is not provided', async () => {
      vi.mocked(validateUpdateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateTeacherProfile).mockResolvedValue({ data: null, error: null } as any)

      const dataWithoutPassword = { ...validTeacherData }
      delete dataWithoutPassword.password

      const result = await updateTeacher('teacher-1', dataWithoutPassword)

      expect(result.success).toBe(true)
      // updateUserById called only once for metadata
      expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledTimes(1)
    })

    it('returns success and revalidates path on happy path', async () => {
      vi.mocked(validateUpdateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateTeacherProfile).mockResolvedValue({ data: null, error: null } as any)

      const dataWithoutPassword = { ...validTeacherData }
      delete dataWithoutPassword.password

      const result = await updateTeacher('teacher-1', dataWithoutPassword)

      expect(result.success).toBe(true)
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
    })

    it('throws when metadata update fails', async () => {
      vi.mocked(validateUpdateTeacherData).mockImplementation(() => {})
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi.fn().mockResolvedValue({
        error: new Error('Metadata update failed'),
      })
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateTeacherProfile).mockResolvedValue({ data: null, error: null } as any)

      const dataWithoutPassword = { ...validTeacherData }
      delete dataWithoutPassword.password

      await expect(updateTeacher('teacher-1', dataWithoutPassword)).rejects.toThrow()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // deleteTeacher
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteTeacher', () => {
    it('throws when auth.admin.deleteUser fails', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({
        error: new Error('User not found'),
      })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(deleteTeacher('teacher-1')).rejects.toThrow()
    })

    it('returns success and revalidates path on happy path', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await deleteTeacher('teacher-1')

      expect(result.success).toBe(true)
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
      expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith('teacher-1')
    })

    it('does not revalidate when deletion fails', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({
        error: new Error('Deletion forbidden'),
      })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(deleteTeacher('teacher-1')).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // resetTeacherPassword
  // ─────────────────────────────────────────────────────────────────────────

  describe('resetTeacherPassword', () => {
    it('throws when auth.admin.updateUserById fails', async () => {
      const supabase = makeSupabase()
      supabase.auth.admin.updateUserById = vi.fn().mockResolvedValue({
        error: new Error('Password reset failed'),
      })
      vi.mocked(createClient).mockResolvedValue(supabase)

      await expect(resetTeacherPassword('teacher-1', 'newpass')).rejects.toThrow()
    })

    it('returns success on happy path', async () => {
      const supabase = makeSupabase()
      supabase.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      const result = await resetTeacherPassword('teacher-1', 'newpass123')

      expect(result.success).toBe(true)
      expect(supabase.auth.admin.updateUserById).toHaveBeenCalledWith('teacher-1', {
        password: 'newpass123',
      })
    })

    it('does not call revalidatePath after password reset', async () => {
      const supabase = makeSupabase()
      supabase.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      await resetTeacherPassword('teacher-1', 'newpass123')

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getAllTeachers
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAllTeachers', () => {
    it('throws when fetchTeachers returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'p1', role: 'superadmin' } as any)
      vi.mocked(getDataFilter).mockReturnValue(null as any)
      vi.mocked(fetchTeachers).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      await expect(getAllTeachers()).rejects.toThrow()
    })

    it('returns empty array when fetchTeachers returns no data', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'p1', role: 'superadmin' } as any)
      vi.mocked(getDataFilter).mockReturnValue(null as any)
      vi.mocked(fetchTeachers).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(transformTeacher).mockImplementation((t: any) => t)

      const result = await getAllTeachers()

      expect(result).toEqual([])
    })

    it('returns transformed teachers for non-adminKelompok profile', async () => {
      const teacherData = [
        {
          id: 't1',
          username: 'guru1',
          role: 'teacher',
          teacher_classes: [{ class_id: 'c1' }],
          daerah: { name: 'Daerah A' },
          desa: { name: 'Desa B' },
          kelompok: { name: 'Kelompok C' },
        },
      ]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'p1',
        role: 'admin',
        daerah_id: 'daerah-1',
        kelompok_id: null,
      } as any)
      vi.mocked(getDataFilter).mockReturnValue({ daerah_id: 'daerah-1' } as any)
      vi.mocked(fetchTeachers).mockResolvedValue({ data: teacherData, error: null } as any)
      vi.mocked(extractClassIds).mockReturnValue(new Set(['c1']))
      vi.mocked(fetchClassesByIds).mockResolvedValue({
        data: [{ id: 'c1', name: 'Kelas Al-Quran', kelompok_id: 'k1', kelompok: { id: 'k1', name: 'Kelompok C' } }],
        error: null,
      } as any)
      vi.mocked(buildClassesMapWithKelompok).mockReturnValue(new Map([['c1', { name: 'Kelas Al-Quran' }]]))
      vi.mocked(transformTeacher).mockImplementation((t: any) => ({ ...t, class_names: 'Kelas Al-Quran' }))

      const result = await getAllTeachers()

      expect(result).toHaveLength(1)
      expect(result[0].class_names).toBe('Kelas Al-Quran')
    })

    it('returns transformed teachers for adminKelompok profile using flat queries', async () => {
      const teacherData = [
        {
          id: 't1',
          username: 'guru1',
          role: 'teacher',
          teacher_classes: [{ class_id: 'c1' }],
        },
      ]
      const supabase = makeSupabase()
      const adminClient = makeAdminSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'p1',
        role: 'admin',
        kelompok_id: 'k1',
      } as any)
      vi.mocked(getDataFilter).mockReturnValue({ kelompok_id: 'k1' } as any)
      vi.mocked(fetchTeachers).mockResolvedValue({ data: teacherData, error: null } as any)
      vi.mocked(extractClassIds).mockReturnValue(new Set(['c1']))

      const flatClassesData = [{ id: 'c1', name: 'Kelas Al-Quran', kelompok_id: 'k1' }]
      vi.mocked(fetchClassesByIdsFlat).mockResolvedValue({ data: flatClassesData, error: null } as any)

      const kelompokData = [{ id: 'k1', name: 'Kelompok C' }]
      vi.mocked(fetchKelompokByIds).mockResolvedValue({ data: kelompokData, error: null } as any)

      const kelompokMap = new Map([['k1', { id: 'k1', name: 'Kelompok C' }]])
      vi.mocked(buildKelompokMap).mockReturnValue(kelompokMap)
      vi.mocked(buildClassesMap).mockReturnValue(new Map([['c1', { name: 'Kelas Al-Quran', kelompok: { id: 'k1', name: 'Kelompok C' } }]]))
      vi.mocked(transformTeacher).mockImplementation((t: any) => ({ ...t, class_names: 'Kelas Al-Quran' }))

      // adminClient.from returns kelompok query results
      adminClient.from = vi.fn().mockReturnValue(makeQueryBuilder({ data: kelompokData, error: null }))

      const result = await getAllTeachers()

      expect(result).toHaveLength(1)
    })

    it('returns teachers with empty classesMap when no class IDs found', async () => {
      const teacherData = [{ id: 't1', username: 'guru1', role: 'teacher', teacher_classes: [] }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'p1', role: 'superadmin' } as any)
      vi.mocked(getDataFilter).mockReturnValue(null as any)
      vi.mocked(fetchTeachers).mockResolvedValue({ data: teacherData, error: null } as any)
      vi.mocked(extractClassIds).mockReturnValue(new Set<string>())
      vi.mocked(transformTeacher).mockImplementation((t: any) => ({ ...t, class_names: '-' }))

      const result = await getAllTeachers()

      expect(result).toHaveLength(1)
      expect(result[0].class_names).toBe('-')
      expect(fetchClassesByIds).not.toHaveBeenCalled()
    })

    it('handles profile being null (no filter applied)', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue(null as any)
      vi.mocked(fetchTeachers).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(transformTeacher).mockImplementation((t: any) => t)

      const result = await getAllTeachers()

      expect(result).toEqual([])
      expect(fetchTeachers).toHaveBeenCalledWith(supabase, undefined)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // assignTeacherToKelompok
  // ─────────────────────────────────────────────────────────────────────────

  describe('assignTeacherToKelompok', () => {
    it('throws when updateTeacherKelompok fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherKelompok).mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      } as any)

      await expect(assignTeacherToKelompok('teacher-1', 'kelompok-1')).rejects.toThrow()
    })

    it('returns success and revalidates path on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherKelompok).mockResolvedValue({ data: null, error: null } as any)

      const result = await assignTeacherToKelompok('teacher-1', 'kelompok-1')

      expect(result.success).toBe(true)
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
    })

    it('calls updateTeacherKelompok with correct arguments', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherKelompok).mockResolvedValue({ data: null, error: null } as any)

      await assignTeacherToKelompok('teacher-99', 'kelompok-42')

      expect(updateTeacherKelompok).toHaveBeenCalledWith(supabase, 'teacher-99', 'kelompok-42')
    })

    it('does not revalidate when update fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTeacherKelompok).mockResolvedValue({
        data: null,
        error: new Error('Constraint violation'),
      } as any)

      await expect(assignTeacherToKelompok('teacher-1', 'kelompok-1')).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })
})
