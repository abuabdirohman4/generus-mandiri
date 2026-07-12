// src/lib/__tests__/activityLogger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase admin client
vi.mock('@/lib/supabase/server', () => {
  const __m: any = {
  createAdminClient: vi.fn(),
}
  __m.createAuthClient = vi.fn(() => __m.createClient?.())
  __m.createAdminAuthClient = vi.fn(() => __m.createAdminClient?.())
  return __m
})

// Mock getCurrentUserProfile
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
}))

import { logActivity } from '../activityLogger'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'

describe('logActivity', () => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null })
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
  const mockAdminClient = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)
    vi.mocked(getCurrentUserProfile).mockResolvedValue({
      id: 'user-123',
      role: 'teacher',
      daerah_id: 'daerah-1',
      desa_id: 'desa-1',
      kelompok_id: 'kelompok-1',
    } as any)
  })

  it('inserts log record with correct fields', async () => {
    await logActivity({
      userId: 'user-123',
      action: 'create_student',
      entityType: 'student',
      entityId: 'student-456',
      entityLabel: 'Ahmad Fauzi',
      pagePath: '/users/siswa',
    })

    expect(mockFrom).toHaveBeenCalledWith('activity_logs')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        action: 'create_student',
        entity_type: 'student',
        entity_id: 'student-456',
        entity_label: 'Ahmad Fauzi',
        page_path: '/users/siswa',
        user_role: 'teacher',
        org_daerah_id: 'daerah-1',
        org_desa_id: 'desa-1',
        org_kelompok_id: 'kelompok-1',
      })
    )
  })

  it('does not throw if insert fails — fire and forget', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB error') })

    await expect(
      logActivity({ userId: 'user-123', action: 'create_student' })
    ).resolves.not.toThrow()
  })
})
