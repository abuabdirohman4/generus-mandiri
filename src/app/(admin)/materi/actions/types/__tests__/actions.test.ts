import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchAllTypes: vi.fn(),
  fetchItemsForType: vi.fn(),
  fetchAssignmentsForType: vi.fn(),
  insertType: vi.fn(),
  updateTypeById: vi.fn(),
  deleteTypeById: vi.fn(),
}))
vi.mock('../logic', () => ({
  validateTypeData: vi.fn(),
  typeHasDependencies: vi.fn(),
  mapTypeErrorMessage: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchAllTypes,
  fetchItemsForType,
  fetchAssignmentsForType,
  insertType,
  updateTypeById,
  deleteTypeById,
} from '../queries'
import {
  typeHasDependencies,
  mapTypeErrorMessage,
} from '../logic'
import {
  getMaterialTypes,
  createMaterialType,
  updateMaterialType,
  deleteMaterialType,
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

const sampleCategory = {
  id: 'cat-1',
  name: 'Quran',
  description: 'Pelajaran Quran',
  display_order: 1,
}

const sampleType = {
  id: 'type-1',
  category_id: 'cat-1',
  name: 'Hafalan',
  description: 'Hafalan Quran',
  display_order: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  category: sampleCategory,
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Material Type Actions (Layer 3)', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialTypes
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialTypes', () => {
    it('returns all types without category filter on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllTypes).mockResolvedValue({ data: [sampleType], error: null } as any)

      const result = await getMaterialTypes()

      expect(result).toEqual([sampleType])
      expect(fetchAllTypes).toHaveBeenCalledWith(supabase, undefined)
    })

    it('filters by categoryId when provided', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllTypes).mockResolvedValue({ data: [sampleType], error: null } as any)

      const result = await getMaterialTypes('cat-1')

      expect(result).toEqual([sampleType])
      expect(fetchAllTypes).toHaveBeenCalledWith(supabase, 'cat-1')
    })

    it('returns empty array when no types exist', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllTypes).mockResolvedValue({ data: null, error: null } as any)

      const result = await getMaterialTypes()

      expect(result).toEqual([])
    })

    it('throws when fetchAllTypes returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllTypes).mockResolvedValue({ data: null, error: { message: 'DB error' } } as any)

      await expect(getMaterialTypes()).rejects.toThrow('Gagal memuat jenis materi')
    })

    it('returns multiple types for a given category', async () => {
      const types = [
        { ...sampleType, id: 'type-1', display_order: 1 },
        { ...sampleType, id: 'type-2', display_order: 2 },
      ]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllTypes).mockResolvedValue({ data: types, error: null } as any)

      const result = await getMaterialTypes('cat-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('type-1')
      expect(result[1].id).toBe('type-2')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createMaterialType
  // ─────────────────────────────────────────────────────────────────────────

  describe('createMaterialType', () => {
    const validData = { category_id: 'cat-1', name: 'Hafalan', description: 'Desc', display_order: 1 }

    it('returns newly created type on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertType).mockResolvedValue({ data: sampleType, error: null } as any)

      const result = await createMaterialType(validData)

      expect(result).toEqual(sampleType)
      expect(insertType).toHaveBeenCalledWith(supabase, validData)
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws mapped error message on unique constraint violation', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertType).mockResolvedValue({ data: null, error: { code: '23505', message: 'unique violation' } } as any)
      vi.mocked(mapTypeErrorMessage).mockReturnValue('Nama jenis materi sudah digunakan untuk kategori ini')

      await expect(createMaterialType(validData)).rejects.toThrow('Nama jenis materi sudah digunakan untuk kategori ini')
      expect(mapTypeErrorMessage).toHaveBeenCalledWith('23505', 'create')
    })

    it('throws generic create error for unknown error codes', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertType).mockResolvedValue({ data: null, error: { code: '99999', message: 'unknown' } } as any)
      vi.mocked(mapTypeErrorMessage).mockReturnValue('Gagal membuat jenis materi')

      await expect(createMaterialType(validData)).rejects.toThrow('Gagal membuat jenis materi')
    })

    it('does not call revalidatePath when insert fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertType).mockResolvedValue({ data: null, error: { code: '23505', message: 'dup' } } as any)
      vi.mocked(mapTypeErrorMessage).mockReturnValue('Nama jenis materi sudah digunakan untuk kategori ini')

      await expect(createMaterialType(validData)).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('creates type without optional description', async () => {
      const dataWithoutDesc = { category_id: 'cat-1', name: 'Tajwid', display_order: 2 }
      const createdType = { ...sampleType, name: 'Tajwid', description: null }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertType).mockResolvedValue({ data: createdType, error: null } as any)

      const result = await createMaterialType(dataWithoutDesc)

      expect(result.name).toBe('Tajwid')
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateMaterialType
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateMaterialType', () => {
    const updateData = { category_id: 'cat-1', name: 'Hafalan Updated', description: 'Updated', display_order: 2 }

    it('returns updated type on happy path', async () => {
      const updatedType = { ...sampleType, ...updateData }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTypeById).mockResolvedValue({ data: updatedType, error: null } as any)

      const result = await updateMaterialType('type-1', updateData)

      expect(result).toEqual(updatedType)
      expect(updateTypeById).toHaveBeenCalledWith(supabase, 'type-1', updateData)
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws mapped error message on unique constraint violation', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTypeById).mockResolvedValue({ data: null, error: { code: '23505', message: 'unique' } } as any)
      vi.mocked(mapTypeErrorMessage).mockReturnValue('Nama jenis materi sudah digunakan untuk kategori ini')

      await expect(updateMaterialType('type-1', updateData)).rejects.toThrow('Nama jenis materi sudah digunakan untuk kategori ini')
      expect(mapTypeErrorMessage).toHaveBeenCalledWith('23505', 'update')
    })

    it('throws generic update error for unknown codes', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTypeById).mockResolvedValue({ data: null, error: { code: '500', message: 'error' } } as any)
      vi.mocked(mapTypeErrorMessage).mockReturnValue('Gagal memperbarui jenis materi')

      await expect(updateMaterialType('type-1', updateData)).rejects.toThrow('Gagal memperbarui jenis materi')
    })

    it('does not call revalidatePath when update fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateTypeById).mockResolvedValue({ data: null, error: { code: '500', message: 'error' } } as any)
      vi.mocked(mapTypeErrorMessage).mockReturnValue('Gagal memperbarui jenis materi')

      await expect(updateMaterialType('type-1', updateData)).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // deleteMaterialType
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteMaterialType', () => {
    it('returns success when type has no dependencies', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(typeHasDependencies).mockReturnValue({ hasDeps: false })
      vi.mocked(deleteTypeById).mockResolvedValue({ error: null } as any)

      const result = await deleteMaterialType('type-1')

      expect(result).toEqual({ success: true })
      expect(fetchItemsForType).toHaveBeenCalledWith(supabase, 'type-1')
      expect(fetchAssignmentsForType).toHaveBeenCalledWith(supabase, 'type-1')
      expect(deleteTypeById).toHaveBeenCalledWith(supabase, 'type-1')
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws when type has dependent material items', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: [{ id: 'item-1' }], error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(typeHasDependencies).mockReturnValue({
        hasDeps: true,
        reason: 'Tidak dapat menghapus jenis materi. Masih ada item materi yang menggunakan jenis ini.',
      })

      await expect(deleteMaterialType('type-1')).rejects.toThrow(
        'Tidak dapat menghapus jenis materi. Masih ada item materi yang menggunakan jenis ini.'
      )
      expect(deleteTypeById).not.toHaveBeenCalled()
    })

    it('throws when type has dependent assignments', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: [{ id: 'asgn-1' }], error: null } as any)
      vi.mocked(typeHasDependencies).mockReturnValue({
        hasDeps: true,
        reason: 'Tidak dapat menghapus jenis materi. Masih ada assignment materi yang menggunakan jenis ini.',
      })

      await expect(deleteMaterialType('type-1')).rejects.toThrow(
        'Tidak dapat menghapus jenis materi. Masih ada assignment materi yang menggunakan jenis ini.'
      )
      expect(deleteTypeById).not.toHaveBeenCalled()
    })

    it('throws when items dependency check fails with DB error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: null, error: { message: 'DB error' } } as any)

      await expect(deleteMaterialType('type-1')).rejects.toThrow('Gagal memeriksa dependensi')
      expect(fetchAssignmentsForType).not.toHaveBeenCalled()
      expect(deleteTypeById).not.toHaveBeenCalled()
    })

    it('throws when assignments dependency check fails with DB error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: null, error: { message: 'DB error' } } as any)

      await expect(deleteMaterialType('type-1')).rejects.toThrow('Gagal memeriksa dependensi assignment')
      expect(deleteTypeById).not.toHaveBeenCalled()
    })

    it('throws when deleteTypeById returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(typeHasDependencies).mockReturnValue({ hasDeps: false })
      vi.mocked(deleteTypeById).mockResolvedValue({ error: { message: 'Delete failed' } } as any)

      await expect(deleteMaterialType('type-1')).rejects.toThrow('Gagal menghapus jenis materi')
    })

    it('does not call revalidatePath when delete fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(typeHasDependencies).mockReturnValue({ hasDeps: false })
      vi.mocked(deleteTypeById).mockResolvedValue({ error: { message: 'Delete failed' } } as any)

      await expect(deleteMaterialType('type-1')).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('passes correct counts to typeHasDependencies', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: [{ id: 'i1' }, { id: 'i2' }], error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: [{ id: 'a1' }], error: null } as any)
      vi.mocked(typeHasDependencies).mockReturnValue({
        hasDeps: true,
        reason: 'Tidak dapat menghapus jenis materi. Masih ada item materi yang menggunakan jenis ini.',
      })

      await expect(deleteMaterialType('type-1')).rejects.toThrow()
      expect(typeHasDependencies).toHaveBeenCalledWith(2, 1)
    })

    it('handles null items and assignments data as zero counts', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForType).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(fetchAssignmentsForType).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(typeHasDependencies).mockReturnValue({ hasDeps: false })
      vi.mocked(deleteTypeById).mockResolvedValue({ error: null } as any)

      const result = await deleteMaterialType('type-1')

      expect(result).toEqual({ success: true })
      // null || 0 === 0 for both
      expect(typeHasDependencies).toHaveBeenCalledWith(0, 0)
    })
  })
})
