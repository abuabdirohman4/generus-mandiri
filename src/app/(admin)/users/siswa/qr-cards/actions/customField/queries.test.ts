import { describe, it, expect, vi } from 'vitest'
import { fetchCustomFieldValues, upsertCustomFieldValue } from './queries'

describe('fetchCustomFieldValues', () => {
  it('returns rows for template', async () => {
    const rows = [
      { student_id: 'abc', value: 'Grup A' },
      { student_id: 'def', value: 'Grup B' },
    ]
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
        })),
      })),
    } as any

    const result = await fetchCustomFieldValues(supabase, 'template-1')
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe('Grup A')
  })

  it('returns empty array when data is null', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    } as any

    const result = await fetchCustomFieldValues(supabase, 'template-1')
    expect(result).toEqual([])
  })

  it('throws on DB error', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        })),
      })),
    } as any

    await expect(fetchCustomFieldValues(supabase, 't1')).rejects.toThrow('DB error')
  })
})

describe('upsertCustomFieldValue', () => {
  it('calls upsert with correct conflict target', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn(() => ({ upsert: upsertFn })),
    } as any

    await upsertCustomFieldValue(supabase, 'student-1', 'template-1', 'Grup A')

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'student-1', template_id: 'template-1', value: 'Grup A' }),
      { onConflict: 'student_id,template_id' }
    )
  })

  it('throws on upsert error', async () => {
    const supabase = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'upsert failed' } }),
      })),
    } as any

    await expect(upsertCustomFieldValue(supabase, 's1', 't1', 'val')).rejects.toThrow('upsert failed')
  })
})
