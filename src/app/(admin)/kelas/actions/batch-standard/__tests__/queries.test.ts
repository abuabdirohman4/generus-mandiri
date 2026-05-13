import { describe, it, expect, vi } from 'vitest'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from '../queries'

function makeSupabase(overrides: any = {}) {
  const chain: any = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    ...overrides
  }
  // Ensure the chain always returns itself for fluent methods
  chain.select = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  
  return { from: vi.fn(() => chain) }
}

describe('fetchExistingClassesForKelompoks', () => {
  it('calls from("classes") with .select and .in(kelompok_id)', async () => {
    const supabase = makeSupabase()
    await fetchExistingClassesForKelompoks(supabase as any, ['k1', 'k2'])
    expect(supabase.from).toHaveBeenCalledWith('classes')
  })
})

describe('insertClassWithMasterMapping', () => {
  it('calls from("classes").insert with name and kelompok_id', async () => {
    const supabase = makeSupabase({
      single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
    })
    await insertClassWithMasterMapping(supabase as any, 'k1', 'Kelas Paud', 'm1')
    expect(supabase.from).toHaveBeenCalledWith('classes')
  })

  it('returns error if classes insert fails', async () => {
    const supabase = makeSupabase({
      single: vi.fn(() => Promise.resolve({ data: null, error: new Error('insert failed') })),
    })
    const result = await insertClassWithMasterMapping(supabase as any, 'k1', 'Kelas Paud', 'm1')
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })
})
