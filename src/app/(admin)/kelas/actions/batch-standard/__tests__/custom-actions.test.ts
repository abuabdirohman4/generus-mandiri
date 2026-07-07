import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  canAccessFeature: vi.fn(),
}))
vi.mock('../custom-queries', () => ({
  findOrCreateCustomClassMaster: vi.fn(),
}))
vi.mock('../queries', () => ({
  fetchExistingClassesForKelompoks: vi.fn(),
  insertClassWithMasterMapping: vi.fn(),
}))
vi.mock('@/lib/activityLogger', () => ({ logActivity: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createBatchCustomClass } from '../custom-actions'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import { findOrCreateCustomClassMaster } from '../custom-queries'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from '../queries'

const mockProfile = { id: 'u1', role: 'admin', daerah_id: 'd1' }

describe('createBatchCustomClass', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserProfile).mockResolvedValue(mockProfile as any)
    vi.mocked(canAccessFeature).mockReturnValue(true)
    vi.mocked(createAdminClient).mockResolvedValue({} as any)
    vi.mocked(findOrCreateCustomClassMaster).mockResolvedValue({ data: { id: 'm1', name: 'CAI 2026' }, error: null } as any)
    vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({ data: [], error: null })
    vi.mocked(insertClassWithMasterMapping).mockResolvedValue({ data: { id: 'new-id' }, error: null })
  })

  it('throws when no manage_classes permission', async () => {
    vi.mocked(canAccessFeature).mockReturnValue(false)
    const result = await createBatchCustomClass(['k1'], 'CAI 2026')
    expect(result.success).toBe(false)
  })

  it('rejects empty kelompokIds', async () => {
    const result = await createBatchCustomClass([], 'CAI 2026')
    expect(result.success).toBe(false)
  })

  it('rejects empty class name', async () => {
    const result = await createBatchCustomClass(['k1'], '   ')
    expect(result.success).toBe(false)
  })

  it('creates one class per kelompok sharing the same master', async () => {
    const result = await createBatchCustomClass(['k1', 'k2', 'k3'], 'CAI 2026')
    expect(findOrCreateCustomClassMaster).toHaveBeenCalledTimes(1)
    expect(insertClassWithMasterMapping).toHaveBeenCalledTimes(3)
    expect(insertClassWithMasterMapping).toHaveBeenCalledWith(expect.anything(), 'k1', 'CAI 2026', 'm1')
    expect(result.totalCreated).toBe(3)
    expect(result.success).toBe(true)
  })

  it('skips kelompok that already has a class with this name', async () => {
    vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({
      data: [{ id: 'c1', name: 'CAI 2026', kelompok_id: 'k1', class_master_mappings: [] }] as any,
      error: null,
    })
    const result = await createBatchCustomClass(['k1', 'k2'], 'CAI 2026')
    expect(insertClassWithMasterMapping).toHaveBeenCalledTimes(1)
    expect(insertClassWithMasterMapping).toHaveBeenCalledWith(expect.anything(), 'k2', 'CAI 2026', 'm1')
    expect(result.totalCreated).toBe(1)
    expect(result.totalSkipped).toBe(1)
  })

  it('returns error when master find-or-create fails', async () => {
    vi.mocked(findOrCreateCustomClassMaster).mockResolvedValue({ data: null, error: new Error('boom') } as any)
    const result = await createBatchCustomClass(['k1'], 'CAI 2026')
    expect(result.success).toBe(false)
    expect(insertClassWithMasterMapping).not.toHaveBeenCalled()
  })

  it('calls revalidatePath("/kelas") on success', async () => {
    const { revalidatePath } = await import('next/cache')
    await createBatchCustomClass(['k1'], 'CAI 2026')
    expect(revalidatePath).toHaveBeenCalledWith('/kelas')
  })
})
