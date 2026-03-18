import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchTeacherClasses: vi.fn(),
  fetchClassesForValidation: vi.fn(),
  deleteTeacherClassAssignments: vi.fn(),
  insertTeacherClassAssignments: vi.fn(),
  insertTeacherClassAssignment: vi.fn(),
}))
vi.mock('../logic', () => ({
  buildClassAssignmentMappings: vi.fn(),
  mapTeacherClassesToResult: vi.fn(),
  validateClassesForDesa: vi.fn(),
  validateClassesForDaerah: vi.fn(),
  validateClassesForKelompok: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  canAccessFeature: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchTeacherClasses,
  fetchClassesForValidation,
  deleteTeacherClassAssignments,
  insertTeacherClassAssignments,
  insertTeacherClassAssignment,
} from '../queries'
import {
  buildClassAssignmentMappings,
  mapTeacherClassesToResult,
  validateClassesForDesa,
  validateClassesForDaerah,
  validateClassesForKelompok,
} from '../logic'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import {
  getTeacherClasses,
  updateTeacherClasses,
  assignTeacherToClass,
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
  const { user = { id: 'user-1' }, profileData = { id: 'profile-1', role: 'superadmin' }, fromBuilder } = overrides
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(fromBuilder || makeQueryBuilder({ data: profileData, error: null })),
  } as any
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Guru Classes Actions (Layer 3)', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getTeacherClasses
  // ─────────────────────────────────────────────────────────────────────────

  describe('getTeacherClasses', () => {
    it('returns mapped classes on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const rawData = [
        { id: 'tc-1', class_id: 'class-1', class: { id: 'class-1', name: 'Kelas A', kelompok_id: 'k1' } },
      ]
      vi.mocked(fetchTeacherClasses).mockResolvedValue({ data: rawData, error: null } as any)
      const expectedResult = [
        { id: 'tc-1', class_id: 'class-1', class_name: 'Kelas A', kelompok_id: 'k1' },
      ]
      vi.mocked(mapTeacherClassesToResult).mockReturnValue(expectedResult)

      const result = await getTeacherClasses('teacher-1')

      expect(result).toEqual(expectedResult)
      expect(fetchTeacherClasses).toHaveBeenCalledWith(supabase, 'teacher-1')
      expect(mapTeacherClassesToResult).toHaveBeenCalledWith(rawData)
    })

    it('returns empty array when teacher has no classes', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTeacherClasses).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(mapTeacherClassesToResult).mockReturnValue([])

      const result = await getTeacherClasses('teacher-1')

      expect(result).toEqual([])
    })

    it('throws when fetchTeacherClasses returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTeacherClasses).mockResolvedValue({
        data: null,
        error: new Error('DB connection failed'),
      } as any)

      await expect(getTeacherClasses('teacher-1')).rejects.toMatchObject({
        message: 'Gagal memuat kelas guru',
      })
    })

    it('passes null data to mapTeacherClassesToResult when data is null', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTeacherClasses).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(mapTeacherClassesToResult).mockReturnValue([])

      const result = await getTeacherClasses('teacher-1')

      expect(mapTeacherClassesToResult).toHaveBeenCalledWith([])
      expect(result).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateTeacherClasses
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateTeacherClasses', () => {
    it('throws when user profile is not found', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue(null)

      await expect(updateTeacherClasses('teacher-1', ['class-1'])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
    })

    it('throws when user does not have access to users feature', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'teacher',
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(false)

      await expect(updateTeacherClasses('teacher-1', ['class-1'])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
    })

    it('succeeds for superadmin with empty classIds (clear all assignments)', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'superadmin',
        desa_id: null,
        daerah_id: null,
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)
      vi.mocked(deleteTeacherClassAssignments).mockResolvedValue({ error: null } as any)

      const result = await updateTeacherClasses('teacher-1', [])

      expect(result).toEqual({ success: true })
      expect(deleteTeacherClassAssignments).toHaveBeenCalledWith(supabase, 'teacher-1')
      expect(insertTeacherClassAssignments).not.toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
    })

    it('succeeds for superadmin replacing class assignments', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'superadmin',
        desa_id: null,
        daerah_id: null,
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)
      vi.mocked(fetchClassesForValidation).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(deleteTeacherClassAssignments).mockResolvedValue({ error: null } as any)
      const mappings = [{ teacher_id: 'teacher-1', class_id: 'class-1' }]
      vi.mocked(buildClassAssignmentMappings).mockReturnValue(mappings)
      vi.mocked(insertTeacherClassAssignments).mockResolvedValue({ error: null } as any)

      const result = await updateTeacherClasses('teacher-1', ['class-1'])

      expect(result).toEqual({ success: true })
      expect(deleteTeacherClassAssignments).toHaveBeenCalledWith(supabase, 'teacher-1')
      expect(buildClassAssignmentMappings).toHaveBeenCalledWith('teacher-1', ['class-1'])
      expect(insertTeacherClassAssignments).toHaveBeenCalledWith(supabase, mappings)
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
    })

    it('throws when deleteTeacherClassAssignments fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'superadmin',
        desa_id: null,
        daerah_id: null,
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)
      vi.mocked(deleteTeacherClassAssignments).mockResolvedValue({
        error: new Error('Delete failed'),
      } as any)

      await expect(updateTeacherClasses('teacher-1', [])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('throws when insertTeacherClassAssignments fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'superadmin',
        desa_id: null,
        daerah_id: null,
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)
      vi.mocked(fetchClassesForValidation).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(deleteTeacherClassAssignments).mockResolvedValue({ error: null } as any)
      vi.mocked(buildClassAssignmentMappings).mockReturnValue([
        { teacher_id: 'teacher-1', class_id: 'class-1' },
      ])
      vi.mocked(insertTeacherClassAssignments).mockResolvedValue({
        error: new Error('Insert failed'),
      } as any)

      await expect(updateTeacherClasses('teacher-1', ['class-1'])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('validates classes for admin desa scope', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'admin',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)

      const mockClasses = [{ id: 'class-1', kelompok_id: 'k1', kelompok: { desa_id: 'desa-2' } }]
      vi.mocked(fetchClassesForValidation).mockResolvedValue({ data: mockClasses, error: null } as any)
      vi.mocked(validateClassesForDesa).mockReturnValue({
        valid: false,
        error: 'Beberapa kelas tidak berada dalam desa Anda',
      })

      await expect(updateTeacherClasses('teacher-1', ['class-1'])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
      expect(validateClassesForDesa).toHaveBeenCalledWith(mockClasses, 'desa-1')
    })

    it('validates classes for admin daerah scope', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'admin',
        daerah_id: 'daerah-1',
        desa_id: null,
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)

      const mockClasses = [{ id: 'class-1', kelompok_id: 'k1' }]
      vi.mocked(fetchClassesForValidation).mockResolvedValue({ data: mockClasses, error: null } as any)
      vi.mocked(validateClassesForDaerah).mockReturnValue({
        valid: false,
        error: 'Beberapa kelas tidak berada dalam daerah Anda',
      })

      await expect(updateTeacherClasses('teacher-1', ['class-1'])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
      expect(validateClassesForDaerah).toHaveBeenCalledWith(mockClasses, 'daerah-1')
    })

    it('validates classes for admin kelompok scope', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'admin',
        kelompok_id: 'kelompok-1',
        desa_id: null,
        daerah_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)

      const mockClasses = [{ id: 'class-1', kelompok_id: 'other-kelompok' }]
      vi.mocked(fetchClassesForValidation).mockResolvedValue({ data: mockClasses, error: null } as any)
      vi.mocked(validateClassesForKelompok).mockReturnValue({
        valid: false,
        error: 'Anda hanya dapat menambahkan atau menghapus kelas dari kelompok Anda sendiri',
      })

      await expect(updateTeacherClasses('teacher-1', ['class-1'])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
      expect(validateClassesForKelompok).toHaveBeenCalledWith(mockClasses, 'kelompok-1')
    })

    it('skips scope validation for admin when classIds is empty', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'admin',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)
      vi.mocked(deleteTeacherClassAssignments).mockResolvedValue({ error: null } as any)

      const result = await updateTeacherClasses('teacher-1', [])

      expect(result).toEqual({ success: true })
      expect(fetchClassesForValidation).not.toHaveBeenCalled()
      expect(validateClassesForDesa).not.toHaveBeenCalled()
    })

    it('throws when fetchClassesForValidation returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'admin',
        daerah_id: 'daerah-1',
        desa_id: null,
        kelompok_id: null,
      } as any)
      vi.mocked(canAccessFeature).mockReturnValue(true)
      vi.mocked(fetchClassesForValidation).mockResolvedValue({
        data: null,
        error: new Error('Validation query failed'),
      } as any)

      await expect(updateTeacherClasses('teacher-1', ['class-1'])).rejects.toMatchObject({
        message: 'Gagal mengupdate kelas guru',
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // assignTeacherToClass
  // ─────────────────────────────────────────────────────────────────────────

  describe('assignTeacherToClass', () => {
    it('returns success on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertTeacherClassAssignment).mockResolvedValue({ error: null } as any)

      const result = await assignTeacherToClass('teacher-1', 'class-1')

      expect(result).toEqual({ success: true })
      expect(insertTeacherClassAssignment).toHaveBeenCalledWith(supabase, 'teacher-1', 'class-1')
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
    })

    it('throws when insertTeacherClassAssignment returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertTeacherClassAssignment).mockResolvedValue({
        error: new Error('Insert failed'),
      } as any)

      await expect(assignTeacherToClass('teacher-1', 'class-1')).rejects.toMatchObject({
        message: 'Gagal mengassign guru ke kelas',
      })
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('revalidates path after successful assignment', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertTeacherClassAssignment).mockResolvedValue({ error: null } as any)

      await assignTeacherToClass('teacher-2', 'class-5')

      expect(revalidatePath).toHaveBeenCalledTimes(1)
      expect(revalidatePath).toHaveBeenCalledWith('/users/guru')
    })

    it('passes correct teacher and class ids to query', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertTeacherClassAssignment).mockResolvedValue({ error: null } as any)

      await assignTeacherToClass('teacher-99', 'class-42')

      expect(insertTeacherClassAssignment).toHaveBeenCalledWith(supabase, 'teacher-99', 'class-42')
    })
  })
})
