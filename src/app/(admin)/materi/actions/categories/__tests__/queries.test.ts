import { describe, it, expect, vi } from 'vitest'
import {
    fetchAllCategories,
    fetchTypesForCategory,
    insertCategory,
    updateCategoryById,
    deleteCategoryById,
} from '../queries'

// ─── Supabase mock helpers ────────────────────────────────────────────────────

function makeMockSupabase(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    const resolved = vi.fn().mockResolvedValue(returnValue)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.upsert = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue(returnValue)
    chain.limit = vi.fn().mockResolvedValue(returnValue)
    chain.single = resolved

    return {
        from: vi.fn().mockReturnValue(chain),
        _chain: chain,
    } as any
}

// ─── fetchAllCategories ───────────────────────────────────────────────────────

describe('fetchAllCategories', () => {
    it('queries material_categories ordered by display_order', async () => {
        const supabase = makeMockSupabase({ data: [], error: null })
        await fetchAllCategories(supabase)

        expect(supabase.from).toHaveBeenCalledWith('material_categories')
        expect(supabase._chain.select).toHaveBeenCalledWith('*')
        expect(supabase._chain.order).toHaveBeenCalledWith('display_order')
    })

    it('returns data on success', async () => {
        const cats = [{ id: 'c1', name: 'Al-Quran', display_order: 1 }]
        const supabase = makeMockSupabase({ data: cats, error: null })
        supabase._chain.order = vi.fn().mockResolvedValue({ data: cats, error: null })

        const result = await fetchAllCategories(supabase)
        expect(result.data).toEqual(cats)
    })
})

// ─── fetchTypesForCategory ────────────────────────────────────────────────────

describe('fetchTypesForCategory', () => {
    it('queries material_types with correct category_id', async () => {
        const supabase = makeMockSupabase()
        await fetchTypesForCategory(supabase, 'cat-1')

        expect(supabase.from).toHaveBeenCalledWith('material_types')
        expect(supabase._chain.eq).toHaveBeenCalledWith('category_id', 'cat-1')
        expect(supabase._chain.limit).toHaveBeenCalledWith(1)
    })

    it('returns empty array when no types exist', async () => {
        const supabase = makeMockSupabase({ data: [], error: null })
        supabase._chain.limit = vi.fn().mockResolvedValue({ data: [], error: null })
        const result = await fetchTypesForCategory(supabase, 'cat-empty')
        expect(result.data).toHaveLength(0)
    })
})

// ─── insertCategory ───────────────────────────────────────────────────────────

describe('insertCategory', () => {
    it('inserts into material_categories with correct data', async () => {
        const cat = { id: 'c1', name: 'Test', display_order: 1 }
        const supabase = makeMockSupabase({ data: cat, error: null })
        supabase._chain.single = vi.fn().mockResolvedValue({ data: cat, error: null })

        const result = await insertCategory(supabase, { name: 'Test', display_order: 1 })

        expect(supabase.from).toHaveBeenCalledWith('material_categories')
        expect(supabase._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Test', display_order: 1 })
        )
        expect(result.data).toEqual(cat)
    })

    it('sets description to null when not provided', async () => {
        const supabase = makeMockSupabase()
        await insertCategory(supabase, { name: 'Test', display_order: 1 })
        expect(supabase._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ description: null })
        )
    })
})

// ─── updateCategoryById ───────────────────────────────────────────────────────

describe('updateCategoryById', () => {
    it('updates correct category with updated_at timestamp', async () => {
        const updated = { id: 'c1', name: 'Updated', display_order: 2 }
        const supabase = makeMockSupabase({ data: updated, error: null })
        supabase._chain.single = vi.fn().mockResolvedValue({ data: updated, error: null })

        const result = await updateCategoryById(supabase, 'c1', { name: 'Updated', display_order: 2 })

        expect(supabase.from).toHaveBeenCalledWith('material_categories')
        expect(supabase._chain.update).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Updated', updated_at: expect.any(String) })
        )
        expect(supabase._chain.eq).toHaveBeenCalledWith('id', 'c1')
        expect(result.data).toEqual(updated)
    })
})

// ─── deleteCategoryById ───────────────────────────────────────────────────────

describe('deleteCategoryById', () => {
    it('deletes correct category by id', async () => {
        const supabase = makeMockSupabase({ error: null })
        supabase._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await deleteCategoryById(supabase, 'c1')

        expect(supabase.from).toHaveBeenCalledWith('material_categories')
        expect(supabase._chain.delete).toHaveBeenCalled()
        expect(supabase._chain.eq).toHaveBeenCalledWith('id', 'c1')
    })
})
