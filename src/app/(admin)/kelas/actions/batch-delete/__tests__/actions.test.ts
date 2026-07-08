import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  canAccessFeature: vi.fn(),
}))
vi.mock('@/lib/activityLogger', () => ({ logActivity: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { deleteClassesBatch } from '../actions'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'

const mockProfile = { id: 'u1', role: 'admin', daerah_id: 'd1' }

function makeSupabase(deleteResults: Record<string, { error: any }>) {
  return {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn((_col: string, id: string) =>
          Promise.resolve(deleteResults[id] ?? { error: null })
        ),
      })),
    })),
  }
}

describe('deleteClassesBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUserProfile).mockResolvedValue(mockProfile as any)
    vi.mocked(canAccessFeature).mockReturnValue(true)
  })

  it('throws when no manage_classes permission', async () => {
    vi.mocked(canAccessFeature).mockReturnValue(false)
    const result = await deleteClassesBatch(['c1'])
    expect(result.success).toBe(false)
  })

  it('rejects empty classIds', async () => {
    const result = await deleteClassesBatch([])
    expect(result.success).toBe(false)
  })

  it('deletes all classes when none have blocking dependents', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ c1: { error: null }, c2: { error: null } }) as any
    )
    const result = await deleteClassesBatch(['c1', 'c2'])
    expect(result.success).toBe(true)
    expect(result.totalDeleted).toBe(2)
    expect(result.totalFailed).toBe(0)
  })

  it('reports per-item failure without aborting the rest (FK NO ACTION case)', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({
        c1: { error: null },
        c2: { error: { message: 'violates foreign key constraint' } },
      }) as any
    )
    const result = await deleteClassesBatch(['c1', 'c2'])
    expect(result.totalDeleted).toBe(1)
    expect(result.totalFailed).toBe(1)
    expect(result.failed).toEqual([{ classId: 'c2', message: 'violates foreign key constraint' }])
  })

  it('calls revalidatePath("/kelas") when at least one delete succeeds', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ c1: { error: null } }) as any)
    const { revalidatePath } = await import('next/cache')
    await deleteClassesBatch(['c1'])
    expect(revalidatePath).toHaveBeenCalledWith('/kelas')
  })

  it('does not call revalidatePath when all deletes fail', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ c1: { error: { message: 'boom' } } }) as any
    )
    const { revalidatePath } = await import('next/cache')
    await deleteClassesBatch(['c1'])
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
