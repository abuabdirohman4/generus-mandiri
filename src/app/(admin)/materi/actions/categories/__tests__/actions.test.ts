import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchAllCategories: vi.fn(),
  fetchTypesForCategory: vi.fn(),
  insertCategory: vi.fn(),
  updateCategoryById: vi.fn(),
  deleteCategoryById: vi.fn(),
}))
vi.mock('../logic', () => ({
  validateCategoryData: vi.fn(),
  categoryHasDependencies: vi.fn(),
  mapCategoryErrorMessage: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchAllCategories,
  fetchTypesForCategory,
  insertCategory,
  updateCategoryById,
  deleteCategoryById,
} from '../queries'
import {
  categoryHasDependencies,
  mapCategoryErrorMessage,
} from '../logic'
import {
  getMaterialCategories,
  createMaterialCategory,
  updateMaterialCategory,
  deleteMaterialCategory,
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
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Material Category Actions (Layer 3)', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialCategories
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialCategories', () => {
    it('returns all categories on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllCategories).mockResolvedValue({ data: [sampleCategory], error: null } as any)

      const result = await getMaterialCategories()

      expect(result).toEqual([sampleCategory])
      expect(fetchAllCategories).toHaveBeenCalledWith(supabase)
    })

    it('returns empty array when no categories exist', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllCategories).mockResolvedValue({ data: null, error: null } as any)

      const result = await getMaterialCategories()

      expect(result).toEqual([])
    })

    it('throws when fetchAllCategories returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllCategories).mockResolvedValue({ data: null, error: { message: 'DB error' } } as any)

      await expect(getMaterialCategories()).rejects.toThrow('Gagal memuat kategori materi')
    })

    it('returns multiple categories in order', async () => {
      const categories = [
        { ...sampleCategory, id: 'cat-1', display_order: 1 },
        { ...sampleCategory, id: 'cat-2', display_order: 2 },
      ]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllCategories).mockResolvedValue({ data: categories, error: null } as any)

      const result = await getMaterialCategories()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('cat-1')
      expect(result[1].id).toBe('cat-2')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createMaterialCategory
  // ─────────────────────────────────────────────────────────────────────────

  describe('createMaterialCategory', () => {
    const validData = { name: 'Quran', description: 'Desc', display_order: 1 }

    it('returns newly created category on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertCategory).mockResolvedValue({ data: sampleCategory, error: null } as any)

      const result = await createMaterialCategory(validData)

      expect(result).toEqual(sampleCategory)
      expect(insertCategory).toHaveBeenCalledWith(supabase, validData)
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws mapped error message when insertCategory fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertCategory).mockResolvedValue({ data: null, error: { code: '23505', message: 'unique violation' } } as any)
      vi.mocked(mapCategoryErrorMessage).mockReturnValue('Nama kategori sudah digunakan')

      await expect(createMaterialCategory(validData)).rejects.toThrow('Nama kategori sudah digunakan')
      expect(mapCategoryErrorMessage).toHaveBeenCalledWith('23505', 'create')
    })

    it('throws generic create error for unknown error codes', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertCategory).mockResolvedValue({ data: null, error: { code: '99999', message: 'unknown error' } } as any)
      vi.mocked(mapCategoryErrorMessage).mockReturnValue('Gagal membuat kategori materi')

      await expect(createMaterialCategory(validData)).rejects.toThrow('Gagal membuat kategori materi')
    })

    it('does not call revalidatePath when insert fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertCategory).mockResolvedValue({ data: null, error: { code: '23505', message: 'dup' } } as any)
      vi.mocked(mapCategoryErrorMessage).mockReturnValue('Nama kategori sudah digunakan')

      await expect(createMaterialCategory(validData)).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('creates category without optional description', async () => {
      const dataWithoutDesc = { name: 'Fikih', display_order: 2 }
      const createdCategory = { ...sampleCategory, name: 'Fikih', description: null }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertCategory).mockResolvedValue({ data: createdCategory, error: null } as any)

      const result = await createMaterialCategory(dataWithoutDesc)

      expect(result.name).toBe('Fikih')
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateMaterialCategory
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateMaterialCategory', () => {
    const updateData = { name: 'Quran Updated', description: 'Updated desc', display_order: 2 }

    it('returns updated category on happy path', async () => {
      const updatedCategory = { ...sampleCategory, ...updateData }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateCategoryById).mockResolvedValue({ data: updatedCategory, error: null } as any)

      const result = await updateMaterialCategory('cat-1', updateData)

      expect(result).toEqual(updatedCategory)
      expect(updateCategoryById).toHaveBeenCalledWith(supabase, 'cat-1', updateData)
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws mapped error message on unique constraint violation', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateCategoryById).mockResolvedValue({ data: null, error: { code: '23505', message: 'unique violation' } } as any)
      vi.mocked(mapCategoryErrorMessage).mockReturnValue('Nama kategori sudah digunakan')

      await expect(updateMaterialCategory('cat-1', updateData)).rejects.toThrow('Nama kategori sudah digunakan')
      expect(mapCategoryErrorMessage).toHaveBeenCalledWith('23505', 'update')
    })

    it('throws generic update error for unknown codes', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateCategoryById).mockResolvedValue({ data: null, error: { code: '500', message: 'server error' } } as any)
      vi.mocked(mapCategoryErrorMessage).mockReturnValue('Gagal memperbarui kategori materi')

      await expect(updateMaterialCategory('cat-1', updateData)).rejects.toThrow('Gagal memperbarui kategori materi')
    })

    it('does not call revalidatePath when update fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateCategoryById).mockResolvedValue({ data: null, error: { code: '500', message: 'error' } } as any)
      vi.mocked(mapCategoryErrorMessage).mockReturnValue('Gagal memperbarui kategori materi')

      await expect(updateMaterialCategory('cat-1', updateData)).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // deleteMaterialCategory
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteMaterialCategory', () => {
    it('returns success when category has no dependencies', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTypesForCategory).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(categoryHasDependencies).mockReturnValue(false)
      vi.mocked(deleteCategoryById).mockResolvedValue({ error: null } as any)

      const result = await deleteMaterialCategory('cat-1')

      expect(result).toEqual({ success: true })
      expect(fetchTypesForCategory).toHaveBeenCalledWith(supabase, 'cat-1')
      expect(deleteCategoryById).toHaveBeenCalledWith(supabase, 'cat-1')
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws when category has dependent types', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTypesForCategory).mockResolvedValue({ data: [{ id: 'type-1' }], error: null } as any)
      vi.mocked(categoryHasDependencies).mockReturnValue(true)

      await expect(deleteMaterialCategory('cat-1')).rejects.toThrow(
        'Tidak dapat menghapus kategori. Masih ada jenis materi yang menggunakan kategori ini.'
      )
      expect(deleteCategoryById).not.toHaveBeenCalled()
    })

    it('throws when dependency check fails with DB error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTypesForCategory).mockResolvedValue({ data: null, error: { message: 'DB error' } } as any)

      await expect(deleteMaterialCategory('cat-1')).rejects.toThrow('Gagal memeriksa dependensi')
      expect(deleteCategoryById).not.toHaveBeenCalled()
    })

    it('throws when deleteCategoryById returns an error', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTypesForCategory).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(categoryHasDependencies).mockReturnValue(false)
      vi.mocked(deleteCategoryById).mockResolvedValue({ error: { message: 'Delete failed' } } as any)

      await expect(deleteMaterialCategory('cat-1')).rejects.toThrow('Gagal menghapus kategori materi')
    })

    it('does not call revalidatePath when delete fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTypesForCategory).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(categoryHasDependencies).mockReturnValue(false)
      vi.mocked(deleteCategoryById).mockResolvedValue({ error: { message: 'Delete failed' } } as any)

      await expect(deleteMaterialCategory('cat-1')).rejects.toThrow()
      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('passes types count to categoryHasDependencies correctly', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTypesForCategory).mockResolvedValue({ data: [{ id: 't1' }, { id: 't2' }], error: null } as any)
      vi.mocked(categoryHasDependencies).mockReturnValue(true)

      await expect(deleteMaterialCategory('cat-1')).rejects.toThrow()
      // categoryHasDependencies is called with types.length (2)
      expect(categoryHasDependencies).toHaveBeenCalledWith(2)
    })

    it('handles null types data as empty (0 dependencies)', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchTypesForCategory).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(categoryHasDependencies).mockReturnValue(false)
      vi.mocked(deleteCategoryById).mockResolvedValue({ error: null } as any)

      const result = await deleteMaterialCategory('cat-1')

      expect(result).toEqual({ success: true })
      // null || 0 === 0 → categoryHasDependencies(0)
      expect(categoryHasDependencies).toHaveBeenCalledWith(0)
    })
  })
})
