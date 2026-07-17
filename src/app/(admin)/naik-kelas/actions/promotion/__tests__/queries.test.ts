import { describe, it, expect, vi } from 'vitest'
import { fetchCategoryGroupByClassIds } from '../queries'

const makeMockSupabase = (rows: any[]) => {
    const chainObj = {
        data: rows,
        error: null,
    }
    const chain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue(chainObj),
    }
    return {
        from: vi.fn().mockReturnValue(chain),
        _chain: chain,
    }
}

describe('fetchCategoryGroupByClassIds', () => {
    it('returns empty map when classIds is empty', async () => {
        const supabase = makeMockSupabase([])
        const result = await fetchCategoryGroupByClassIds(supabase as any, [])
        expect(result.size).toBe(0)
        expect(supabase.from).not.toHaveBeenCalled()
    })

    it('queries class_master_mappings and builds map correctly', async () => {
        const rows = [
            { class_id: 'c1', class_masters: { category_group: 'caberawit' } },
            { class_id: 'c2', class_masters: { category_group: 'muda_mudi' } },
            { class_id: 'c3', class_masters: { category_group: 'orang_tua' } },
            { class_id: 'c4', class_masters: { category_group: null } },
        ]
        const supabase = makeMockSupabase(rows)
        const result = await fetchCategoryGroupByClassIds(supabase as any, ['c1', 'c2', 'c3', 'c4'])
        expect(supabase.from).toHaveBeenCalledWith('class_master_mappings')
        expect(result.get('c1')).toBe('caberawit')
        expect(result.get('c2')).toBe('muda_mudi')
        expect(result.get('c3')).toBe('orang_tua')
        expect(result.get('c4')).toBeNull()
    })

    it('handles array-wrapped class_masters (PostgREST quirk)', async () => {
        const rows = [
            { class_id: 'c1', class_masters: [{ category_group: 'caberawit' }] },
        ]
        const supabase = makeMockSupabase(rows)
        const result = await fetchCategoryGroupByClassIds(supabase as any, ['c1'])
        expect(result.get('c1')).toBe('caberawit')
    })
})
