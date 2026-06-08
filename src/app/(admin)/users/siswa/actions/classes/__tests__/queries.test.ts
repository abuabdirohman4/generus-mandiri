import { describe, it, expect, vi } from 'vitest'
import { fetchAllClassesBasic, fetchClassMasterMappings } from '../queries'

// ─── fetchAllClassesBasic ─────────────────────────────────────────────────────

describe('fetchAllClassesBasic', () => {
    it('queries classes table with correct select', async () => {
        const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null })
        const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

        const result = await fetchAllClassesBasic(supabase)

        expect(supabase.from).toHaveBeenCalledWith('classes')
        expect(mockSelect).toHaveBeenCalled()
        expect(result.data).toEqual([])
    })

    it('returns data from supabase', async () => {
        const mockData = [{ id: 'c1', name: 'Kelas A', kelompok_id: 'k1' }]
        const mockSelect = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

        const result = await fetchAllClassesBasic(supabase)

        expect(result.data).toEqual(mockData)
        expect(result.error).toBeNull()
    })
})

// ─── fetchClassMasterMappings ─────────────────────────────────────────────────
// NOTE: Returns Map<string, any[]> directly (not { data, error } wrapper)

describe('fetchClassMasterMappings', () => {
    it('returns empty Map for empty classIds — no DB calls made', async () => {
        const supabase = { from: vi.fn() } as any

        const result = await fetchClassMasterMappings(supabase, [])

        expect(supabase.from).not.toHaveBeenCalled()
        expect(result).toBeInstanceOf(Map)
        expect(result.size).toBe(0)
    })

    it('uses two-query pattern: fetch ALL class_master_mappings first (no .in filter), then class_masters by master IDs', async () => {
        // Implementation fetches ALL mappings (no .in on class_id) to avoid Headers Overflow,
        // then filters in-memory. Only class_masters query uses .in().
        const allMappingsData = [
            { class_id: 'c1', class_master_id: 'm1' },
            { class_id: 'c99', class_master_id: 'm99' }, // other class — should be filtered out
        ]
        const mastersData = [{ id: 'm1', sort_order: 2 }]

        const mockMappingsSelect = vi.fn().mockResolvedValue({ data: allMappingsData })

        const mockMastersIn = vi.fn().mockResolvedValue({ data: mastersData })
        const mockMastersSelect = vi.fn().mockReturnValue({ in: mockMastersIn })

        const supabase = {
            from: vi.fn()
                .mockReturnValueOnce({ select: mockMappingsSelect })   // class_master_mappings (fetch ALL)
                .mockReturnValueOnce({ select: mockMastersSelect }),   // class_masters (by master IDs)
        } as any

        const result = await fetchClassMasterMappings(supabase, ['c1'])

        expect(supabase.from).toHaveBeenNthCalledWith(1, 'class_master_mappings')
        expect(supabase.from).toHaveBeenNthCalledWith(2, 'class_masters')
        expect(result).toBeInstanceOf(Map)
        // Only c1 should be in result, c99 filtered out in-memory
        expect(result.get('c1')).toEqual([{ class_master: expect.objectContaining({ id: 'm1', sort_order: 2 }) }])
        expect(result.has('c99')).toBe(false)
    })

    it('groups multiple class masters under the same class_id', async () => {
        const allMappingsData = [
            { class_id: 'c1', class_master_id: 'm1' },
            { class_id: 'c1', class_master_id: 'm2' },
        ]
        const mastersData = [
            { id: 'm1', sort_order: 1 },
            { id: 'm2', sort_order: 3 },
        ]

        const supabase = {
            from: vi.fn()
                .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ data: allMappingsData }) })
                .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: mastersData }) }) }),
        } as any

        const result = await fetchClassMasterMappings(supabase, ['c1'])
        expect(result.get('c1')).toHaveLength(2)
    })

    it('returns empty Map when no mappings found in DB (single query only)', async () => {
        // If DB returns no mappings at all, second query should not be made
        const supabase = {
            from: vi.fn()
                .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ data: [] }) }),
        } as any

        const result = await fetchClassMasterMappings(supabase, ['c1'])
        expect(result).toBeInstanceOf(Map)
        expect(result.size).toBe(0)
        // Second query (class_masters) should NOT be called since mappings is empty
        expect(supabase.from).toHaveBeenCalledTimes(1)
    })
})
