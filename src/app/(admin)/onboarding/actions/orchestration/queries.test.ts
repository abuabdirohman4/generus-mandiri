import { describe, it, expect, vi } from 'vitest'
import {
  insertDaerahReturningId,
  insertDesaReturningId,
  insertKelompokReturningId,
} from './queries'

// Mock supabase-like chainable
function makeSupaMock(returnData: any, returnError: any = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
  }
  return chain as any
}

describe('insertDaerahReturningId', () => {
  it('resolves with the inserted id', async () => {
    const supabase = makeSupaMock({ id: 'daerah-uuid-1' })
    const result = await insertDaerahReturningId(supabase, { name: 'Test Daerah' })
    expect(result.data?.id).toBe('daerah-uuid-1')
    expect(result.error).toBeNull()
  })

  it('propagates error from supabase', async () => {
    const supabase = makeSupaMock(null, { message: 'insert failed' })
    const result = await insertDaerahReturningId(supabase, { name: 'Test Daerah' })
    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})

describe('insertDesaReturningId', () => {
  it('resolves with the inserted id', async () => {
    const supabase = makeSupaMock({ id: 'desa-uuid-1' })
    const result = await insertDesaReturningId(supabase, { name: 'Test Desa', daerah_id: 'daerah-1' })
    expect(result.data?.id).toBe('desa-uuid-1')
    expect(result.error).toBeNull()
  })
})

describe('insertKelompokReturningId', () => {
  it('resolves with the inserted id', async () => {
    const supabase = makeSupaMock({ id: 'kelompok-uuid-1' })
    const result = await insertKelompokReturningId(supabase, { name: 'Test Kelompok', desa_id: 'desa-1' })
    expect(result.data?.id).toBe('kelompok-uuid-1')
    expect(result.error).toBeNull()
  })
})
