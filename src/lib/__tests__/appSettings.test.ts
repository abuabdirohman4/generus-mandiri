import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPassingScore } from '../appSettings'

// Mock Supabase admin client
vi.mock('@/lib/supabase/server', () => {
  const __m: any = {
  createAdminClient: vi.fn()
}
  __m.createAuthClient = vi.fn(() => __m.createClient?.())
  __m.createAdminAuthClient = vi.fn(() => __m.createAdminClient?.())
  return __m
})

import { createAdminClient } from '@/lib/supabase/server'

describe('getPassingScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default score when no category specified', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { value: { default: 70, by_category: {} } },
              error: null
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore()
    expect(score).toBe(70)
  })

  it('returns category-specific score when category_id provided', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { value: { default: 70, by_category: { 'cat-1': 80 } } },
              error: null
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore('cat-1')
    expect(score).toBe(80)
  })

  it('falls back to default when category not in by_category', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { value: { default: 70, by_category: { 'cat-1': 80 } } },
              error: null
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore('cat-unknown')
    expect(score).toBe(70)
  })

  it('returns 70 as hardcoded fallback when app_settings missing', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore()
    expect(score).toBe(70)
  })
})
