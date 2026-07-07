import { describe, it, expect, vi } from 'vitest'
import { findOrCreateCustomClassMaster } from '../custom-queries'

function makeSupabase({ existing = null, inserted = null, insertError = null }: any = {}) {
  const selectChain: any = {
    ilike: vi.fn(() => selectChain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: existing, error: null })),
  }
  const insertChain: any = {
    select: vi.fn(() => insertChain),
    single: vi.fn(() => Promise.resolve({ data: inserted, error: insertError })),
  }
  const from = vi.fn(() => ({
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => insertChain),
  }))
  return { from }
}

describe('findOrCreateCustomClassMaster', () => {
  it('returns existing master when name already matches (case-insensitive)', async () => {
    const supabase = makeSupabase({ existing: { id: 'm1', name: 'CAI 2026' } })
    const result = await findOrCreateCustomClassMaster(supabase as any, 'cai 2026')
    expect(result.data).toEqual({ id: 'm1', name: 'CAI 2026' })
    expect(result.error).toBeNull()
  })

  it('creates a new master when no existing match', async () => {
    const supabase = makeSupabase({ existing: null, inserted: { id: 'm2', name: 'CAI 2026' } })
    const result = await findOrCreateCustomClassMaster(supabase as any, 'CAI 2026')
    expect(supabase.from).toHaveBeenCalledWith('class_masters')
    expect(result.data).toEqual({ id: 'm2', name: 'CAI 2026' })
    expect(result.error).toBeNull()
  })

  it('returns error when insert fails', async () => {
    const supabase = makeSupabase({ existing: null, inserted: null, insertError: new Error('insert failed') })
    const result = await findOrCreateCustomClassMaster(supabase as any, 'CAI 2026')
    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
  })
})
