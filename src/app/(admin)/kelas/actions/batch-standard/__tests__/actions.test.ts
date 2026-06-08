import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  canAccessFeature: vi.fn(),
}))
vi.mock('../../masters', () => ({
  getAllClassMasters: vi.fn(),
}))
vi.mock('../queries', () => ({
  fetchExistingClassesForKelompoks: vi.fn(),
  insertClassWithMasterMapping: vi.fn(),
}))
vi.mock('@/lib/activityLogger', () => ({ logActivity: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createBatchStandardClasses } from '../actions'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import { getAllClassMasters } from '../../masters'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from '../queries'

const mockProfile = { id: 'u1', role: 'superadmin' }
const mockMasters = [
  { id: 'm1', name: 'Kelas Paud', sort_order: 1 },
  { id: 'm2', name: 'Kelas 1', sort_order: 2 },
]

describe('createBatchStandardClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserProfile).mockResolvedValue(mockProfile as any)
    vi.mocked(canAccessFeature).mockReturnValue(true)
    vi.mocked(createAdminClient).mockResolvedValue({} as any)
    vi.mocked(getAllClassMasters).mockResolvedValue(mockMasters as any)
    vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({ data: [], error: null })
    vi.mocked(insertClassWithMasterMapping).mockResolvedValue({ data: { id: 'new-id' }, error: null })
  })

  it('throws when no manage_classes permission', async () => {
    vi.mocked(canAccessFeature).mockReturnValue(false)
    const result = await createBatchStandardClasses(['k1'], ['m1'])
    expect(result.success).toBe(false)
  })

  it('creates classes for each kelompok', async () => {
    const result = await createBatchStandardClasses(['k1', 'k2'], ['m1', 'm2'])
    expect(result.totalCreated).toBe(4) // 2 masters × 2 kelompoks
    expect(result.success).toBe(true)
  })

  it('skips duplicates per kelompok independently', async () => {
    vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({
      data: [
        { id: 'c1', name: 'Kelas Paud', kelompok_id: 'k1', class_master_mappings: [{ class_master_id: 'm1' }] }
      ] as any,
      error: null
    })
    const result = await createBatchStandardClasses(['k1'], ['m1', 'm2'])
    expect(result.totalCreated).toBe(1)
    expect(result.totalSkipped).toBe(1)
  })

  it('calls revalidatePath("/kelas") on success', async () => {
    const { revalidatePath } = await import('next/cache')
    await createBatchStandardClasses(['k1'], ['m1'])
    expect(revalidatePath).toHaveBeenCalledWith('/kelas')
  })

  it('returns success=false when all are duplicates', async () => {
    vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({
      data: [
        { id: 'c1', name: 'Kelas Paud', kelompok_id: 'k1', class_master_mappings: [{ class_master_id: 'm1' }] },
        { id: 'c2', name: 'Kelas 1', kelompok_id: 'k1', class_master_mappings: [{ class_master_id: 'm2' }] },
      ] as any,
      error: null
    })
    const result = await createBatchStandardClasses(['k1'], ['m1', 'm2'])
    expect(result.success).toBe(false)
    expect(result.totalCreated).toBe(0)
  })
})
