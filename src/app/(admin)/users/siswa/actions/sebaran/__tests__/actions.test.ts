import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock createClient (used by getProfileWithClasses) dan createAdminClient
const mockAuthGetUser = vi.fn()
const mockProfileQuery = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('../queries', () => ({
  fetchKelasWithStudentCount: vi.fn().mockResolvedValue([]),
  fetchKelasByIds: vi.fn().mockResolvedValue([]),
  fetchKelompokWithKelas: vi.fn().mockResolvedValue([]),
  fetchDesaWithKelompok: vi.fn().mockResolvedValue([]),
  fetchDaerahWithDesa: vi.fn().mockResolvedValue([]),
  fetchKelompokByIds: vi.fn().mockResolvedValue([]),
}))

import { getSebaranSiswa } from '../actions'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const mockAdminSupabase = { from: vi.fn() }

function setupProfile(profile: any) {
  const mockClientSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: profile }),
    }),
  }
  vi.mocked(createClient).mockResolvedValue(mockClientSupabase as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createAdminClient).mockResolvedValue(mockAdminSupabase as any)
})

describe('getSebaranSiswa', () => {
  it('returns error when user not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)
    const result = await getSebaranSiswa()
    expect(result.error).toBe('Tidak terautentikasi')
  })

  it('calls fetchDaerahWithDesa for superadmin', async () => {
    setupProfile({ id: 'u1', role: 'superadmin', teacher_classes: [] })
    const { fetchDaerahWithDesa } = await import('../queries')
    const result = await getSebaranSiswa()
    expect(result.error).toBeUndefined()
    expect(fetchDaerahWithDesa).toHaveBeenCalled()
  })

  it('calls fetchDesaWithKelompok for admin daerah', async () => {
    setupProfile({ id: 'u1', role: 'admin', daerah_id: 'daerah-1', teacher_classes: [] })
    const { fetchDesaWithKelompok } = await import('../queries')
    const result = await getSebaranSiswa()
    expect(result.error).toBeUndefined()
    expect(fetchDesaWithKelompok).toHaveBeenCalledWith(mockAdminSupabase, 'daerah-1')
  })

  it('returns error on exception', async () => {
    setupProfile({ id: 'u1', role: 'superadmin', teacher_classes: [] })
    const { fetchDaerahWithDesa } = await import('../queries')
    vi.mocked(fetchDaerahWithDesa).mockRejectedValueOnce(new Error('DB down'))
    const result = await getSebaranSiswa()
    expect(result.error).toBe('Gagal memuat data sebaran siswa')
  })
})
