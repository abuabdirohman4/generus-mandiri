import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchAvailableClassMasters: vi.fn(),
  fetchAllClassMastersWithCategory: vi.fn(),
  fetchClassMastersWithMaterialItems: vi.fn(),
  fetchItemsByType: vi.fn(),
  fetchAllItems: vi.fn(),
  fetchItemById: vi.fn(),
  fetchAllItemsWithTypes: vi.fn(),
  fetchItemsForClass: vi.fn(),
  fetchItemsForClassAndType: vi.fn(),
  fetchClassMappingsBatch: vi.fn(),
  fetchDayItemsForItem: vi.fn(),
  insertItem: vi.fn(),
  updateItemById: vi.fn(),
  deleteItemById: vi.fn(),
  fetchItemClassMappings: vi.fn(),
  deleteItemClassMappings: vi.fn(),
  deleteItemClassMappingsBulk: vi.fn(),
  insertItemClassMappings: vi.fn(),
  upsertItemClassMappings: vi.fn(),
  upsertDayAssignment: vi.fn(),
  deleteDayAssignmentItems: vi.fn(),
  insertDayAssignmentItems: vi.fn(),
  fetchDayAssignments: vi.fn(),
  deleteDayAssignmentById: vi.fn(),
}))
vi.mock('../logic', () => ({
  filterCaberawitClasses: vi.fn(),
  stripClassMasterJoinArtifact: vi.fn(),
  deduplicateMaterialItemsFromJunction: vi.fn(),
  mapClassMappingsToItems: vi.fn(),
  extractClassMastersFromItems: vi.fn(),
  sortAssignmentItems: vi.fn(),
  buildDayItemsPayload: vi.fn(),
  buildBulkMappingsPayload: vi.fn(),
  itemHasDependencies: vi.fn(),
  mapItemErrorMessage: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  canManageMaterials: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchAvailableClassMasters,
  fetchAllClassMastersWithCategory,
  fetchClassMastersWithMaterialItems,
  fetchItemsByType,
  fetchAllItems,
  fetchItemById,
  fetchAllItemsWithTypes,
  fetchItemsForClass,
  fetchItemsForClassAndType,
  fetchClassMappingsBatch,
  fetchDayItemsForItem,
  insertItem,
  updateItemById,
  deleteItemById,
  fetchItemClassMappings,
  deleteItemClassMappings,
  deleteItemClassMappingsBulk,
  insertItemClassMappings,
  upsertItemClassMappings,
  upsertDayAssignment,
  deleteDayAssignmentItems,
  insertDayAssignmentItems,
  fetchDayAssignments,
  deleteDayAssignmentById,
} from '../queries'
import {
  filterCaberawitClasses,
  stripClassMasterJoinArtifact,
  deduplicateMaterialItemsFromJunction,
  mapClassMappingsToItems,
  extractClassMastersFromItems,
  sortAssignmentItems,
  buildDayItemsPayload,
  buildBulkMappingsPayload,
  itemHasDependencies,
  mapItemErrorMessage,
} from '../logic'
import { getCurrentUserProfile, canManageMaterials } from '@/lib/accessControlServer'
import {
  getAvailableClassMasters,
  getAllClasses,
  getClassesWithMaterialItems,
  getMaterialItems,
  getAllMaterialItems,
  getMaterialItem,
  getMaterialItemsByClass,
  getMaterialItemsByClassAndType,
  getMaterialItemsWithClassMappings,
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  getMaterialItemClassMappings,
  updateMaterialItemClassMappings,
  bulkUpdateMaterialMapping,
  saveDayMaterialAssignment,
  getDayMaterialAssignments,
  deleteDayMaterialAssignment,
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
  b.upsert = vi.fn().mockReturnValue(b)
  b.eq = vi.fn().mockReturnValue(b)
  b.neq = vi.fn().mockReturnValue(b)
  b.in = vi.fn().mockReturnValue(b)
  b.is = vi.fn().mockReturnValue(b)
  b.order = vi.fn().mockReturnValue(b)
  b.limit = vi.fn().mockReturnValue(b)
  b.range = vi.fn().mockReturnValue(b)
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
    from: vi.fn().mockReturnValue(fromBuilder || makeQueryBuilder({ data: profileData, error: null })),
  } as any
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Materi Items Actions (Layer 3)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getAvailableClassMasters
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAvailableClassMasters', () => {
    it('returns data on happy path', async () => {
      const classMasters = [{ id: 'cm-1', name: 'Kelas 1' }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAvailableClassMasters).mockResolvedValue({ data: classMasters, error: null } as any)

      const result = await getAvailableClassMasters()

      expect(result).toEqual(classMasters)
    })

    it('returns empty array when data is null', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAvailableClassMasters).mockResolvedValue({ data: null, error: null } as any)

      const result = await getAvailableClassMasters()

      expect(result).toEqual([])
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAvailableClassMasters).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      await expect(getAvailableClassMasters()).rejects.toThrow('Gagal memuat daftar kelas')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getAllClasses
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAllClasses', () => {
    it('returns filtered classes on happy path', async () => {
      const rawClasses = [{ id: 'cm-1', name: 'Caberawit 1', category: { code: 'CABERAWIT' } }]
      const filteredClasses = [{ id: 'cm-1', name: 'Caberawit 1', sort_order: 0, category: { code: 'CABERAWIT' } }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllClassMastersWithCategory).mockResolvedValue({ data: rawClasses, error: null } as any)
      vi.mocked(filterCaberawitClasses).mockReturnValue(filteredClasses as any)

      const result = await getAllClasses()

      expect(result).toEqual(filteredClasses)
      expect(filterCaberawitClasses).toHaveBeenCalledWith(rawClasses)
    })

    it('returns empty array when fetch error occurs', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllClassMastersWithCategory).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      const result = await getAllClasses()

      expect(result).toEqual([])
    })

    it('calls filterCaberawitClasses with empty array when data is null', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllClassMastersWithCategory).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(filterCaberawitClasses).mockReturnValue([])

      const result = await getAllClasses()

      expect(filterCaberawitClasses).toHaveBeenCalledWith([])
      expect(result).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getClassesWithMaterialItems
  // ─────────────────────────────────────────────────────────────────────────

  describe('getClassesWithMaterialItems', () => {
    it('returns stripped class data on happy path', async () => {
      const rawData = [{ id: 'cm-1', name: 'Kelas 1', material_item_classes: [{ id: 'mic-1' }] }]
      const stripped = [{ id: 'cm-1', name: 'Kelas 1' }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchClassMastersWithMaterialItems).mockResolvedValue({ data: rawData, error: null } as any)
      vi.mocked(stripClassMasterJoinArtifact).mockReturnValue(stripped as any)

      const result = await getClassesWithMaterialItems()

      expect(result).toEqual(stripped)
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchClassMastersWithMaterialItems).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      await expect(getClassesWithMaterialItems()).rejects.toThrow('Gagal memuat kelas dengan item materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialItems
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialItems', () => {
    it('returns items on happy path', async () => {
      const items = [{ id: 'item-1', name: 'Item A' }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsByType).mockResolvedValue({ data: items, error: null } as any)

      const result = await getMaterialItems('type-1')

      expect(result).toEqual(items)
    })

    it('returns empty array when data is null', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsByType).mockResolvedValue({ data: null, error: null } as any)

      const result = await getMaterialItems('type-1')

      expect(result).toEqual([])
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsByType).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(getMaterialItems('type-1')).rejects.toThrow('Gagal memuat item materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getAllMaterialItems
  // ─────────────────────────────────────────────────────────────────────────

  describe('getAllMaterialItems', () => {
    it('returns all items on happy path', async () => {
      const items = [{ id: 'item-1' }, { id: 'item-2' }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllItems).mockResolvedValue({ data: items, error: null } as any)

      const result = await getAllMaterialItems()

      expect(result).toEqual(items)
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllItems).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(getAllMaterialItems()).rejects.toThrow('Gagal memuat semua item materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialItem
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialItem', () => {
    it('returns item with class mappings on happy path', async () => {
      const item = { id: 'item-1', name: 'Item A' }
      const mappings = [
        { class_master: { id: 'cm-1', name: 'Kelas 1' }, semester: 1 },
      ]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemById).mockResolvedValue({ data: item, error: null } as any)
      vi.mocked(fetchItemClassMappings).mockResolvedValue({ data: mappings, error: null } as any)

      const result = await getMaterialItem('item-1')

      expect(result).toEqual({
        ...item,
        classes: [{ id: 'cm-1', name: 'Kelas 1', semester: 1 }],
      })
    })

    it('returns null when item fetch errors', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemById).mockResolvedValue({ data: null, error: new Error('Not found') } as any)

      const result = await getMaterialItem('item-1')

      expect(result).toBeNull()
    })

    it('returns item with empty classes when mappings fetch errors', async () => {
      const item = { id: 'item-1', name: 'Item A' }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemById).mockResolvedValue({ data: item, error: null } as any)
      vi.mocked(fetchItemClassMappings).mockResolvedValue({ data: null, error: new Error('Mappings error') } as any)

      const result = await getMaterialItem('item-1')

      expect(result).toEqual({ ...item, classes: [] })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialItemsByClass
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialItemsByClass', () => {
    it('returns deduplicated items on happy path', async () => {
      const rawData = [{ material_item: { id: 'item-1' }, class_master: { id: 'cm-1' } }]
      const deduplicated = [{ id: 'item-1', classes: [{ id: 'cm-1' }] }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForClass).mockResolvedValue({ data: rawData, error: null } as any)
      vi.mocked(deduplicateMaterialItemsFromJunction).mockReturnValue(deduplicated as any)

      const result = await getMaterialItemsByClass('cm-1')

      expect(result).toEqual(deduplicated)
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForClass).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(getMaterialItemsByClass('cm-1')).rejects.toThrow('Gagal memuat item materi per kelas')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialItemsByClassAndType
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialItemsByClassAndType', () => {
    it('returns extracted class masters on happy path', async () => {
      const rawData = [{ id: 'item-1', material_item_classes: [{ class_master: { id: 'cm-1' } }] }]
      const extracted = [{ id: 'item-1', classes: [{ id: 'cm-1' }] }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForClassAndType).mockResolvedValue({ data: rawData, error: null } as any)
      vi.mocked(extractClassMastersFromItems).mockReturnValue(extracted as any)

      const result = await getMaterialItemsByClassAndType('cm-1', 'type-1')

      expect(result).toEqual(extracted)
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemsForClassAndType).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(getMaterialItemsByClassAndType('cm-1', 'type-1')).rejects.toThrow(
        'Gagal memuat item materi per kelas dan jenis'
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialItemsWithClassMappings
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialItemsWithClassMappings', () => {
    it('returns items with mapped classes on happy path (single batch)', async () => {
      const items = [{ id: 'item-1', name: 'Item A' }]
      const mappings = [{ material_item_id: 'item-1', semester: 1, class_master: { id: 'cm-1' } }]
      const mapped = [{ id: 'item-1', classes: [{ id: 'cm-1', semester: 1 }] }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllItemsWithTypes).mockResolvedValue({ data: items, error: null } as any)
      vi.mocked(fetchClassMappingsBatch)
        .mockResolvedValueOnce({ data: mappings, error: null } as any)
        .mockResolvedValueOnce({ data: [], error: null } as any)
      vi.mocked(mapClassMappingsToItems).mockReturnValue(mapped as any)

      const result = await getMaterialItemsWithClassMappings()

      expect(result).toEqual(mapped)
    })

    it('throws error when items fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllItemsWithTypes).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(getMaterialItemsWithClassMappings()).rejects.toThrow('Gagal memuat item materi')
    })

    it('throws error when batch mappings fetch fails', async () => {
      const items = [{ id: 'item-1' }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchAllItemsWithTypes).mockResolvedValue({ data: items, error: null } as any)
      vi.mocked(fetchClassMappingsBatch).mockResolvedValue({ data: null, error: { message: 'Batch error' } } as any)
      // Ensure mapClassMappingsToItems is reset so it doesn't return stale data
      vi.mocked(mapClassMappingsToItems).mockReturnValue([])

      await expect(getMaterialItemsWithClassMappings()).rejects.toThrow('Gagal memuat mapping kelas')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createMaterialItem
  // ─────────────────────────────────────────────────────────────────────────

  describe('createMaterialItem', () => {
    const validData = { material_type_id: 'type-1', name: 'New Item' }

    it('throws error when not authenticated', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue(null as any)

      await expect(createMaterialItem(validData)).rejects.toThrow('Not authenticated')
    })

    it('throws error when user lacks canManageMaterials permission', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', role: 'teacher' } as any)
      vi.mocked(canManageMaterials).mockReturnValue(false)

      await expect(createMaterialItem(validData)).rejects.toThrow('Unauthorized')
    })

    it('creates item and revalidates path on happy path', async () => {
      const createdItem = { id: 'item-new', name: 'New Item' }
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertItem).mockResolvedValue({ data: createdItem, error: null } as any)

      const result = await createMaterialItem(validData)

      expect(result).toEqual(createdItem)
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws mapped error message when insert fails with duplicate key', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(insertItem).mockResolvedValue({ data: null, error: { code: '23505' } } as any)
      vi.mocked(mapItemErrorMessage).mockReturnValue('Nama item materi sudah digunakan untuk jenis materi ini')

      await expect(createMaterialItem(validData)).rejects.toThrow(
        'Nama item materi sudah digunakan untuk jenis materi ini'
      )
      expect(mapItemErrorMessage).toHaveBeenCalledWith('23505', 'create')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateMaterialItem
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateMaterialItem', () => {
    const updateData = { material_type_id: 'type-1', name: 'Updated Item' }

    it('throws error when not authenticated', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue(null as any)

      await expect(updateMaterialItem('item-1', updateData)).rejects.toThrow('Not authenticated')
    })

    it('throws error when user lacks permission', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1' } as any)
      vi.mocked(canManageMaterials).mockReturnValue(false)

      await expect(updateMaterialItem('item-1', updateData)).rejects.toThrow('Unauthorized')
    })

    it('updates item and revalidates path on happy path', async () => {
      const updatedItem = { id: 'item-1', name: 'Updated Item' }
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateItemById).mockResolvedValue({ data: updatedItem, error: null } as any)

      const result = await updateMaterialItem('item-1', updateData)

      expect(result).toEqual(updatedItem)
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws specific error for duplicate name (23505)', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateItemById).mockResolvedValue({ data: null, error: { code: '23505' } } as any)

      await expect(updateMaterialItem('item-1', updateData)).rejects.toThrow(
        'Nama item materi sudah digunakan untuk jenis materi ini'
      )
    })

    it('throws error when updated item not found (PGRST116)', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateItemById).mockResolvedValue({ data: null, error: { code: 'PGRST116' } } as any)

      await expect(updateMaterialItem('item-1', updateData)).rejects.toThrow(
        'Item materi tidak ditemukan setelah update'
      )
    })

    it('throws generic error for other DB errors', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateItemById).mockResolvedValue({ data: null, error: { code: '99999', message: 'unknown' } } as any)

      await expect(updateMaterialItem('item-1', updateData)).rejects.toThrow('Gagal memperbarui item materi')
    })

    it('throws error when data is null after update', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(updateItemById).mockResolvedValue({ data: null, error: null } as any)

      await expect(updateMaterialItem('item-1', updateData)).rejects.toThrow(
        'Item materi tidak ditemukan setelah update'
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // deleteMaterialItem
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteMaterialItem', () => {
    it('throws error when not authenticated', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue(null as any)

      await expect(deleteMaterialItem('item-1')).rejects.toThrow('Not authenticated')
    })

    it('throws error when user lacks permission', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1' } as any)
      vi.mocked(canManageMaterials).mockReturnValue(false)

      await expect(deleteMaterialItem('item-1')).rejects.toThrow('Unauthorized')
    })

    it('throws error when dependency check fails', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchDayItemsForItem).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(deleteMaterialItem('item-1')).rejects.toThrow('Gagal memeriksa dependensi')
    })

    it('throws error when item has dependencies', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchDayItemsForItem).mockResolvedValue({ data: [{ id: 'dep-1' }], error: null } as any)
      vi.mocked(itemHasDependencies).mockReturnValue(true)

      await expect(deleteMaterialItem('item-1')).rejects.toThrow('Tidak dapat menghapus item')
    })

    it('deletes item and revalidates path on happy path', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchDayItemsForItem).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(itemHasDependencies).mockReturnValue(false)
      vi.mocked(deleteItemById).mockResolvedValue({ data: null, error: null } as any)

      const result = await deleteMaterialItem('item-1')

      expect(result).toEqual({ success: true })
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws error when delete query fails', async () => {
      vi.mocked(getCurrentUserProfile).mockResolvedValue({ id: 'profile-1', can_manage_materials: true } as any)
      vi.mocked(canManageMaterials).mockReturnValue(true)
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchDayItemsForItem).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(itemHasDependencies).mockReturnValue(false)
      vi.mocked(deleteItemById).mockResolvedValue({ data: null, error: new Error('Delete failed') } as any)

      await expect(deleteMaterialItem('item-1')).rejects.toThrow('Gagal menghapus item materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getMaterialItemClassMappings
  // ─────────────────────────────────────────────────────────────────────────

  describe('getMaterialItemClassMappings', () => {
    it('returns mappings on happy path', async () => {
      const mappings = [{ id: 'map-1', class_master_id: 'cm-1', semester: 1 }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemClassMappings).mockResolvedValue({ data: mappings, error: null } as any)

      const result = await getMaterialItemClassMappings('item-1')

      expect(result).toEqual(mappings)
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchItemClassMappings).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(getMaterialItemClassMappings('item-1')).rejects.toThrow('Gagal memuat mapping kelas')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateMaterialItemClassMappings
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateMaterialItemClassMappings', () => {
    it('deletes existing, inserts new mappings, and revalidates on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteItemClassMappings).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(insertItemClassMappings).mockResolvedValue({ data: null, error: null } as any)

      const result = await updateMaterialItemClassMappings('item-1', [
        { class_master_id: 'cm-1', semester: 1 },
      ])

      expect(result).toEqual({ success: true })
      expect(deleteItemClassMappings).toHaveBeenCalledWith(supabase, 'item-1')
      expect(insertItemClassMappings).toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws error when deleting old mappings fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteItemClassMappings).mockResolvedValue({ data: null, error: new Error('Delete error') } as any)

      await expect(
        updateMaterialItemClassMappings('item-1', [{ class_master_id: 'cm-1', semester: 1 }])
      ).rejects.toThrow('Gagal menghapus mapping lama')
    })

    it('throws error when inserting new mappings fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteItemClassMappings).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(insertItemClassMappings).mockResolvedValue({ data: null, error: new Error('Insert error') } as any)

      await expect(
        updateMaterialItemClassMappings('item-1', [{ class_master_id: 'cm-1', semester: 1 }])
      ).rejects.toThrow('Gagal menyimpan mapping baru')
    })

    it('skips insert and revalidates when mappings is empty', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteItemClassMappings).mockResolvedValue({ data: null, error: null } as any)

      const result = await updateMaterialItemClassMappings('item-1', [])

      expect(result).toEqual({ success: true })
      expect(insertItemClassMappings).not.toHaveBeenCalled()
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // bulkUpdateMaterialMapping
  // ─────────────────────────────────────────────────────────────────────────

  describe('bulkUpdateMaterialMapping', () => {
    const itemIds = ['item-1', 'item-2']
    const mappings = [{ class_master_id: 'cm-1', semester: 1 }]

    it('replaces existing mappings and upserts new ones in replace mode', async () => {
      const newMappings = [
        { material_item_id: 'item-1', class_master_id: 'cm-1', semester: 1 },
        { material_item_id: 'item-2', class_master_id: 'cm-1', semester: 1 },
      ]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteItemClassMappingsBulk).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(buildBulkMappingsPayload).mockReturnValue(newMappings)
      vi.mocked(upsertItemClassMappings).mockResolvedValue({ data: null, error: null } as any)

      const result = await bulkUpdateMaterialMapping(itemIds, mappings, 'replace')

      expect(result).toEqual({ success: true })
      expect(deleteItemClassMappingsBulk).toHaveBeenCalledWith(supabase, itemIds)
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('skips delete in add mode', async () => {
      const newMappings = [{ material_item_id: 'item-1', class_master_id: 'cm-1', semester: 1 }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(buildBulkMappingsPayload).mockReturnValue(newMappings)
      vi.mocked(upsertItemClassMappings).mockResolvedValue({ data: null, error: null } as any)

      const result = await bulkUpdateMaterialMapping(itemIds, mappings, 'add')

      expect(result).toEqual({ success: true })
      expect(deleteItemClassMappingsBulk).not.toHaveBeenCalled()
    })

    it('throws error when bulk delete fails in replace mode', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteItemClassMappingsBulk).mockResolvedValue({
        data: null,
        error: new Error('Delete failed'),
      } as any)

      await expect(bulkUpdateMaterialMapping(itemIds, mappings, 'replace')).rejects.toThrow(
        'Gagal menghapus mapping lama'
      )
    })

    it('returns success early when payload is empty', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteItemClassMappingsBulk).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(buildBulkMappingsPayload).mockReturnValue([])

      const result = await bulkUpdateMaterialMapping(itemIds, mappings, 'replace')

      expect(result).toEqual({ success: true })
      expect(upsertItemClassMappings).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // saveDayMaterialAssignment
  // ─────────────────────────────────────────────────────────────────────────

  describe('saveDayMaterialAssignment', () => {
    const assignmentData = {
      class_master_id: 'cm-1',
      semester: 1,
      month: 3,
      week: 2,
      day_of_week: 1,
      material_type_id: 'type-1',
    }

    it('saves assignment and returns success on happy path (no items)', async () => {
      const assignment = { id: 'assign-1' }
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(upsertDayAssignment).mockResolvedValue({ data: assignment, error: null } as any)
      vi.mocked(deleteDayAssignmentItems).mockResolvedValue({ data: null, error: null } as any)

      const result = await saveDayMaterialAssignment(assignmentData)

      expect(result).toEqual({ success: true, assignment_id: 'assign-1' })
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('saves assignment with items on happy path', async () => {
      const assignment = { id: 'assign-1' }
      const items = [{ material_item_id: 'item-1', display_order: 1 }]
      const itemsPayload = [{ assignment_id: 'assign-1', material_item_id: 'item-1', display_order: 1, custom_content: null }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(upsertDayAssignment).mockResolvedValue({ data: assignment, error: null } as any)
      vi.mocked(deleteDayAssignmentItems).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(buildDayItemsPayload).mockReturnValue(itemsPayload)
      vi.mocked(insertDayAssignmentItems).mockResolvedValue({ data: null, error: null } as any)

      const result = await saveDayMaterialAssignment({ ...assignmentData, items })

      expect(result).toEqual({ success: true, assignment_id: 'assign-1' })
      expect(insertDayAssignmentItems).toHaveBeenCalled()
    })

    it('throws error when upsert assignment fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(upsertDayAssignment).mockResolvedValue({ data: null, error: new Error('Upsert error') } as any)

      await expect(saveDayMaterialAssignment(assignmentData)).rejects.toThrow('Gagal menyimpan assignment materi')
    })

    it('throws error when inserting items fails', async () => {
      const assignment = { id: 'assign-1' }
      const items = [{ material_item_id: 'item-1', display_order: 1 }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(upsertDayAssignment).mockResolvedValue({ data: assignment, error: null } as any)
      vi.mocked(deleteDayAssignmentItems).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(buildDayItemsPayload).mockReturnValue([{ assignment_id: 'assign-1', material_item_id: 'item-1', display_order: 1, custom_content: null }])
      vi.mocked(insertDayAssignmentItems).mockResolvedValue({ data: null, error: new Error('Insert error') } as any)

      await expect(saveDayMaterialAssignment({ ...assignmentData, items })).rejects.toThrow(
        'Gagal menyimpan item materi'
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getDayMaterialAssignments
  // ─────────────────────────────────────────────────────────────────────────

  describe('getDayMaterialAssignments', () => {
    const params = { class_master_id: 'cm-1', semester: 1, month: 3, week: 2, day_of_week: 1 }

    it('returns sorted assignments on happy path', async () => {
      const rawAssignments = [{ id: 'a1', items: [{ display_order: 2 }, { display_order: 1 }] }]
      const sorted = [{ id: 'a1', items: [{ display_order: 1 }, { display_order: 2 }] }]
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchDayAssignments).mockResolvedValue({ data: rawAssignments, error: null } as any)
      vi.mocked(sortAssignmentItems).mockReturnValue(sorted as any)

      const result = await getDayMaterialAssignments(params)

      expect(result).toEqual(sorted)
    })

    it('throws error when fetch fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(fetchDayAssignments).mockResolvedValue({ data: null, error: new Error('DB error') } as any)

      await expect(getDayMaterialAssignments(params)).rejects.toThrow('Gagal memuat assignment materi')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // deleteDayMaterialAssignment
  // ─────────────────────────────────────────────────────────────────────────

  describe('deleteDayMaterialAssignment', () => {
    it('deletes assignment and revalidates path on happy path', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteDayAssignmentById).mockResolvedValue({ data: null, error: null } as any)

      const result = await deleteDayMaterialAssignment('assign-1')

      expect(result).toEqual({ success: true })
      expect(revalidatePath).toHaveBeenCalledWith('/materi')
    })

    it('throws error when delete fails', async () => {
      const supabase = makeSupabase()
      vi.mocked(createClient).mockResolvedValue(supabase)
      vi.mocked(deleteDayAssignmentById).mockResolvedValue({ data: null, error: new Error('Delete error') } as any)

      await expect(deleteDayMaterialAssignment('assign-1')).rejects.toThrow('Gagal menghapus assignment materi')
    })
  })
})
