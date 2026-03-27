// src/app/(admin)/users/siswa/actions/sebaran/__tests__/queries.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchKelasWithStudentCount, fetchKelompokByIds } from '../queries'

const makeSupabase = (responses: any[]) => {
  let callIndex = 0
  return {
    from: vi.fn(() => {
      const response = responses[callIndex++]
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(function(this: any) {
          // Return self for chaining, last eq resolves
          if (response?.resolveOn === 'eq') return Promise.resolve(response.value)
          return this
        }),
        in: vi.fn().mockImplementation(function(this: any) {
          if (response?.resolveOn === 'in') return Promise.resolve(response.value)
          return this
        }),
        is: vi.fn().mockImplementation(function(this: any) {
          return Promise.resolve(response?.value || { data: [], error: null })
        }),
      }
    }),
  }
}

describe('fetchKelasWithStudentCount', () => {
  it('returns empty array when no classes found', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }
    const result = await fetchKelasWithStudentCount(supabase as any, 'klp-1')
    expect(result).toEqual([])
  })

  it('returns empty array when kelasError occurs', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    }
    const result = await fetchKelasWithStudentCount(supabase as any, 'klp-1')
    expect(result).toEqual([])
  })
})

describe('fetchKelompokByIds', () => {
  it('returns empty array for empty kelompokIds', async () => {
    const supabase = { from: vi.fn() }
    const result = await fetchKelompokByIds(supabase as any, [])
    expect(result).toEqual([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('deduplicates kelompok ids', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(mockChain) }
    await fetchKelompokByIds(supabase as any, ['k1', 'k1', 'k2'])
    expect(mockChain.in).toHaveBeenCalledWith('id', ['k1', 'k2'])
  })
})
