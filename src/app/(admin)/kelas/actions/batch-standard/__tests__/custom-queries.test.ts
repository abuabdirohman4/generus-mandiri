import { describe, it, expect, vi } from 'vitest'
import { getLainnyaClassMaster } from '../custom-queries'

function makeSupabase({ existing = null }: any = {}) {
  const selectChain: any = {
    ilike: vi.fn(() => selectChain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: existing, error: null })),
  }
  const from = vi.fn(() => ({
    select: vi.fn(() => selectChain),
  }))
  return { from }
}

describe('getLainnyaClassMaster', () => {
  it('returns the existing "Lainnya" master', async () => {
    const supabase = makeSupabase({ existing: { id: 'm-lainnya', name: 'Lainnya' } })
    const result = await getLainnyaClassMaster(supabase as any)
    expect(supabase.from).toHaveBeenCalledWith('class_masters')
    expect(result.data).toEqual({ id: 'm-lainnya', name: 'Lainnya' })
    expect(result.error).toBeNull()
  })

  it('returns an error when "Lainnya" master does not exist', async () => {
    const supabase = makeSupabase({ existing: null })
    const result = await getLainnyaClassMaster(supabase as any)
    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('never inserts a new class_masters row', async () => {
    const supabase = makeSupabase({ existing: { id: 'm-lainnya', name: 'Lainnya' } })
    await getLainnyaClassMaster(supabase as any)
    const fromResult = supabase.from.mock.results[0].value
    expect(fromResult.insert).toBeUndefined()
  })
})
