import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock calls BEFORE all imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  insertAdminProfile: vi.fn(),
  updateAdminProfile: vi.fn(),
  fetchAdmins: vi.fn(),
}))
vi.mock('../logic', () => ({
  determineAdminLevel: vi.fn(),
  validateAdminData: vi.fn(),
  validateAdminLevelRequirements: vi.fn(),
  validatePasswordForCreate: vi.fn(),
  transformAdminList: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  getDataFilter: vi.fn(),
}))
vi.mock('@/lib/errorUtils', () => ({
  handleApiError: vi.fn((error: unknown, _ctx: string, customMessage?: string) => {
    const msg =
      customMessage ??
      (error instanceof Error ? error.message : String(error))
    return { context: _ctx, message: msg, timestamp: Date.now(), originalError: error }
  }),
}))

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { insertAdminProfile, updateAdminProfile, fetchAdmins } from '../queries'
import {
  determineAdminLevel,
  validateAdminData,
  validateAdminLevelRequirements,
  validatePasswordForCreate,
  transformAdminList,
} from '../logic'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import { createAdmin, updateAdmin, deleteAdmin, resetAdminPassword, getAllAdmins } from '../actions'
import type { AdminData } from '../../types'

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
  b.not = vi.fn().mockReturnValue(b)
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
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  } as any
}

const validAdminData: AdminData = {
  username: 'admin.daerah',
  full_name: 'Admin Daerah Test',
  email: 'admin.daerah@test.com',
  password: 'SecurePass123',
  daerah_id: 'daerah-1',
  desa_id: null,
  kelompok_id: null,
  can_manage_materials: false,
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Admin Actions (Layer 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createAdmin
  // ─────────────────────────────────────────────────────────────────────────

  describe('createAdmin', () => {
    it('throws when validateAdminData fails', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: false, error: 'Username harus diisi' })

      await expect(createAdmin({ ...validAdminData, username: '' })).rejects.toMatchObject({
        message: 'Gagal membuat admin',
      })
      expect(validateAdminData).toHaveBeenCalled()
    })

    it('throws when validatePasswordForCreate fails', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })
      vi.mocked(validatePasswordForCreate).mockReturnValue({ ok: false, error: 'Password harus diisi' })

      await expect(createAdmin({ ...validAdminData, password: undefined })).rejects.toMatchObject({
        message: 'Gagal membuat admin',
      })
      expect(validatePasswordForCreate).toHaveBeenCalled()
    })

    it('throws when validateAdminLevelRequirements fails', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })
      vi.mocked(validatePasswordForCreate).mockReturnValue({ ok: true })
      vi.mocked(determineAdminLevel).mockReturnValue({
        level: 'desa',
        isAdminKelompok: false,
        isAdminDesa: true,
        isAdminDaerah: false,
      })
      vi.mocked(validateAdminLevelRequirements).mockReturnValue({
        ok: false,
        error: 'Desa harus dipilih untuk Admin Desa',
      })

      await expect(createAdmin(validAdminData)).rejects.toMatchObject({
        message: 'Gagal membuat admin',
      })
    })

    it('throws when adminClient.auth.admin.createUser returns an error', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })
      vi.mocked(validatePasswordForCreate).mockReturnValue({ ok: true })
      vi.mocked(determineAdminLevel).mockReturnValue({
        level: 'daerah',
        isAdminKelompok: false,
        isAdminDesa: false,
        isAdminDaerah: true,
      })
      vi.mocked(validateAdminLevelRequirements).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.createUser = vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: new Error('Email already in use') })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(createAdmin(validAdminData)).rejects.toMatchObject({
        message: 'Gagal membuat admin',
      })
    })

    it('throws and cleans up auth user when insertAdminProfile fails', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })
      vi.mocked(validatePasswordForCreate).mockReturnValue({ ok: true })
      vi.mocked(determineAdminLevel).mockReturnValue({
        level: 'daerah',
        isAdminKelompok: false,
        isAdminDesa: false,
        isAdminDaerah: true,
      })
      vi.mocked(validateAdminLevelRequirements).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.createUser = vi
        .fn()
        .mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
      adminClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(insertAdminProfile).mockResolvedValue({
        data: null,
        error: new Error('Profile insert failed'),
      } as any)

      await expect(createAdmin(validAdminData)).rejects.toMatchObject({
        message: 'Gagal membuat admin',
      })
      // Verify cleanup: auth user should be deleted on profile failure
      expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id')
    })

    it('returns success and revalidates path on happy path', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })
      vi.mocked(validatePasswordForCreate).mockReturnValue({ ok: true })
      vi.mocked(determineAdminLevel).mockReturnValue({
        level: 'daerah',
        isAdminKelompok: false,
        isAdminDesa: false,
        isAdminDaerah: true,
      })
      vi.mocked(validateAdminLevelRequirements).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.createUser = vi
        .fn()
        .mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(insertAdminProfile).mockResolvedValue({ data: null, error: null } as any)

      const result = await createAdmin(validAdminData)

      expect(result).toEqual({ success: true })
      expect(revalidatePath).toHaveBeenCalledWith('/users/admin')
    })

    it('creates admin with can_manage_materials when provided', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })
      vi.mocked(validatePasswordForCreate).mockReturnValue({ ok: true })
      vi.mocked(determineAdminLevel).mockReturnValue({
        level: 'daerah',
        isAdminKelompok: false,
        isAdminDesa: false,
        isAdminDaerah: true,
      })
      vi.mocked(validateAdminLevelRequirements).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.createUser = vi
        .fn()
        .mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(insertAdminProfile).mockResolvedValue({ data: null, error: null } as any)

      const dataWithMaterials = { ...validAdminData, can_manage_materials: true }
      await createAdmin(dataWithMaterials)

      expect(insertAdminProfile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ can_manage_materials: true })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateAdmin
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateAdmin', () => {
    it('throws when validateAdminData fails', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: false, error: 'Email harus diisi' })

      await expect(updateAdmin('admin-id', { ...validAdminData, email: '' })).rejects.toMatchObject({
        message: 'Gagal mengupdate admin',
      })
    })

    it('throws when updateAdminProfile returns an error', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(updateAdminProfile).mockResolvedValue({
        data: null,
        error: new Error('DB update failed'),
      } as any)

      await expect(updateAdmin('admin-id', validAdminData)).rejects.toMatchObject({
        message: 'Gagal mengupdate admin',
      })
    })

    it('updates password via adminClient when password is provided', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(updateAdminProfile).mockResolvedValue({ data: null, error: null } as any)

      const dataWithPassword = { ...validAdminData, password: 'NewPass456' }
      await updateAdmin('admin-id', dataWithPassword)

      // Called twice: once for password, once for metadata
      expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledTimes(2)
      expect(adminClient.auth.admin.updateUserById).toHaveBeenNthCalledWith(
        1,
        'admin-id',
        expect.objectContaining({ password: 'NewPass456' })
      )
    })

    it('throws when password update via adminClient fails', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi
        .fn()
        .mockResolvedValue({ error: new Error('Password update failed') })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(updateAdminProfile).mockResolvedValue({ data: null, error: null } as any)

      const dataWithPassword = { ...validAdminData, password: 'NewPass456' }
      await expect(updateAdmin('admin-id', dataWithPassword)).rejects.toMatchObject({
        message: 'Gagal mengupdate admin',
      })
    })

    it('skips password update when password is not provided', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(updateAdminProfile).mockResolvedValue({ data: null, error: null } as any)

      const dataWithoutPassword = { ...validAdminData, password: undefined }
      await updateAdmin('admin-id', dataWithoutPassword)

      // Only called once: for metadata (password update is skipped)
      expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledTimes(1)
      expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        'admin-id',
        expect.objectContaining({ user_metadata: expect.any(Object) })
      )
    })

    it('returns success and revalidates path on happy path', async () => {
      vi.mocked(validateAdminData).mockReturnValue({ ok: true })

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)

      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      vi.mocked(updateAdminProfile).mockResolvedValue({ data: null, error: null } as any)

      const result = await updateAdmin('admin-id', validAdminData)

      expect(result).toEqual({ success: true })
      expect(revalidatePath).toHaveBeenCalledWith('/users/admin')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // deleteAdmin
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteAdmin', () => {
    it('throws when adminClient.auth.admin.deleteUser returns an error', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.deleteUser = vi
        .fn()
        .mockResolvedValue({ error: new Error('User not found') })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(deleteAdmin('admin-id')).rejects.toMatchObject({
        message: 'Gagal menghapus admin',
      })
    })

    it('returns success and revalidates path on happy path', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await deleteAdmin('admin-id')

      expect(result).toEqual({ success: true })
      expect(revalidatePath).toHaveBeenCalledWith('/users/admin')
    })

    it('calls deleteUser with the correct admin id', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await deleteAdmin('specific-admin-uuid')

      expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith('specific-admin-uuid')
    })

    it('does not revalidate when deletion fails', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.deleteUser = vi
        .fn()
        .mockResolvedValue({ error: new Error('Deletion failed') })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(deleteAdmin('admin-id')).rejects.toBeDefined()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // resetAdminPassword
  // ─────────────────────────────────────────────────────────────────────────

  describe('resetAdminPassword', () => {
    it('throws when adminClient.auth.admin.updateUserById returns an error', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi
        .fn()
        .mockResolvedValue({ error: new Error('Invalid password format') })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await expect(resetAdminPassword('admin-id', 'NewPass123')).rejects.toMatchObject({
        message: 'Gagal mereset password admin',
      })
    })

    it('returns success on happy path', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      const result = await resetAdminPassword('admin-id', 'NewSecurePass789')

      expect(result).toEqual({ success: true })
    })

    it('calls updateUserById with correct id and new password', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await resetAdminPassword('target-admin-id', 'MyNewPass!1')

      expect(adminClient.auth.admin.updateUserById).toHaveBeenCalledWith('target-admin-id', {
        password: 'MyNewPass!1',
      })
    })

    it('does not call revalidatePath after password reset', async () => {
      const adminClient = makeAdminSupabase()
      adminClient.auth.admin.updateUserById = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)

      await resetAdminPassword('admin-id', 'Pass123')

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getAllAdmins
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAllAdmins', () => {
    it('throws when fetchAdmins returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'superadmin',
      } as any)
      vi.mocked(getDataFilter).mockReturnValue(null)
      vi.mocked(fetchAdmins).mockResolvedValue({ data: null, error: new Error('DB fetch failed') } as any)

      await expect(getAllAdmins()).rejects.toMatchObject({
        message: 'Gagal mengambil data admin',
      })
    })

    it('returns transformed admin list on happy path for superadmin', async () => {
      const rawAdmins = [
        {
          id: 'admin-1',
          username: 'admin.daerah',
          daerah: { name: 'Daerah Jakarta' },
          desa: null,
          kelompok: null,
        },
      ]
      const transformedAdmins = [
        {
          id: 'admin-1',
          username: 'admin.daerah',
          daerah_name: 'Daerah Jakarta',
          desa_name: '',
          kelompok_name: '',
        },
      ]

      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'superadmin',
      } as any)
      vi.mocked(getDataFilter).mockReturnValue(null)
      vi.mocked(fetchAdmins).mockResolvedValue({ data: rawAdmins, error: null } as any)
      vi.mocked(transformAdminList).mockReturnValue(transformedAdmins)

      const result = await getAllAdmins()

      expect(result).toEqual(transformedAdmins)
      expect(fetchAdmins).toHaveBeenCalledWith(supabase, undefined)
      expect(transformAdminList).toHaveBeenCalledWith(rawAdmins)
    })

    it('passes filter to fetchAdmins when user has a scoped profile', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'admin',
        daerah_id: 'daerah-1',
        desa_id: null,
        kelompok_id: null,
      } as any)
      const filter = { daerah_id: 'daerah-1' }
      vi.mocked(getDataFilter).mockReturnValue(filter)
      vi.mocked(fetchAdmins).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(transformAdminList).mockReturnValue([])

      await getAllAdmins()

      expect(fetchAdmins).toHaveBeenCalledWith(supabase, filter)
    })

    it('returns empty array when no admins found', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue({
        id: 'profile-1',
        role: 'superadmin',
      } as any)
      vi.mocked(getDataFilter).mockReturnValue(null)
      vi.mocked(fetchAdmins).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(transformAdminList).mockReturnValue([])

      const result = await getAllAdmins()

      expect(result).toEqual([])
      // transformAdminList should be called with empty array when data is null
      expect(transformAdminList).toHaveBeenCalledWith([])
    })

    it('calls getDataFilter with the user profile', async () => {
      const profile = { id: 'profile-1', role: 'admin', daerah_id: 'daerah-2' }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue(profile as any)
      vi.mocked(getDataFilter).mockReturnValue({ daerah_id: 'daerah-2' })
      vi.mocked(fetchAdmins).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(transformAdminList).mockReturnValue([])

      await getAllAdmins()

      expect(getDataFilter).toHaveBeenCalledWith(profile)
    })

    it('passes undefined filter to fetchAdmins when profile is null', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(getCurrentUserProfile).mockResolvedValue(null)
      vi.mocked(getDataFilter).mockReturnValue(null)
      vi.mocked(fetchAdmins).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(transformAdminList).mockReturnValue([])

      await getAllAdmins()

      // When filter is null, fetchAdmins should receive undefined
      expect(fetchAdmins).toHaveBeenCalledWith(supabase, undefined)
    })
  })
})
