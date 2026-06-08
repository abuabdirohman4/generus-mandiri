import { describe, it, expect, vi } from 'vitest'
import { fetchAllRecords } from '../dashboardHelpers'

// ─── fetchAllRecords ──────────────────────────────────────────────────────────

describe('fetchAllRecords', () => {
    it('fetches records with a single .range() call', async () => {
        const mockQuery = {
            range: vi.fn().mockResolvedValue({
                data: [{ id: '1' }, { id: '2' }],
                error: null,
            }),
        }

        const result = await fetchAllRecords(mockQuery, 1000)

        expect(result).toHaveLength(2)
        // Must only call .range() once — re-using query object across iterations
        // causes Supabase to accumulate duplicate range headers → 400 Bad Request
        expect(mockQuery.range).toHaveBeenCalledTimes(1)
        expect(mockQuery.range).toHaveBeenCalledWith(0, 999)
    })

    it('uses batchSize parameter as upper bound for range', async () => {
        const mockQuery = {
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }

        await fetchAllRecords(mockQuery, 500)

        expect(mockQuery.range).toHaveBeenCalledWith(0, 499)
    })

    it('returns empty array when no data', async () => {
        const mockQuery = {
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }

        const result = await fetchAllRecords(mockQuery, 1000)

        expect(result).toHaveLength(0)
        expect(mockQuery.range).toHaveBeenCalledTimes(1)
    })

    it('throws when query returns error', async () => {
        const mockQuery = {
            range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }

        await expect(fetchAllRecords(mockQuery, 1000)).rejects.toThrow('DB error')
    })

    it('does NOT call .range() more than once regardless of result size', async () => {
        // Regression test: previous while-loop called .range() multiple times on same
        // query object when result.length === batchSize, causing 400 Bad Request on 2nd call
        const batchSize = 3
        const mockQuery = {
            range: vi.fn().mockResolvedValue({
                // Return exactly batchSize records (old loop would trigger 2nd iteration)
                data: Array.from({ length: batchSize }, (_, i) => ({ id: `${i}` })),
                error: null,
            }),
        }

        const result = await fetchAllRecords(mockQuery, batchSize)

        expect(result).toHaveLength(batchSize)
        // CRITICAL: must only call once — not trigger 2nd iteration
        expect(mockQuery.range).toHaveBeenCalledTimes(1)
    })
})
