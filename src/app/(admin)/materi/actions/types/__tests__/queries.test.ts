import { describe, it, expect, vi } from 'vitest'
import {
    fetchAllTypes,
    fetchItemsForType,
    fetchAssignmentsForType,
    insertType,
    updateTypeById,
    deleteTypeById,
} from '../queries'

// ─── Supabase mock helper ─────────────────────────────────────────────────────
// NOTE: order() must return the chain (not resolve) because fetchAllTypes calls
// .eq() AFTER .order() when categoryId is provided.
// The chain becomes a thenable via `then` so `await chain` resolves returnValue.

function makeMockSupabase(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    // eq() and order() both return chain so they can be chained in any order
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockResolvedValue(returnValue)
    chain.single = vi.fn().mockResolvedValue(returnValue)
    // Make chain itself awaitable — resolves to returnValue
    chain.then = (resolve: (v: any) => any) => Promise.resolve(returnValue).then(resolve)

    return {
        from: vi.fn().mockReturnValue(chain),
        _chain: chain,
    } as any
}

// ─── fetchAllTypes ────────────────────────────────────────────────────────────

describe('fetchAllTypes', () => {
    it('queries material_types ordered by display_order', async () => {
        const supabase = makeMockSupabase({ data: [], error: null })
        await fetchAllTypes(supabase)

        expect(supabase.from).toHaveBeenCalledWith('material_types')
        expect(supabase._chain.order).toHaveBeenCalledWith('display_order')
    })

    it('applies category_id filter when categoryId is provided', async () => {
        const supabase = makeMockSupabase({ data: [], error: null })
        await fetchAllTypes(supabase, 'cat-1')

        expect(supabase._chain.eq).toHaveBeenCalledWith('category_id', 'cat-1')
    })

    it('does NOT apply category_id filter when categoryId is undefined', async () => {
        const supabase = makeMockSupabase()
        await fetchAllTypes(supabase)
        expect(supabase._chain.eq).not.toHaveBeenCalled()
    })
})

// ─── fetchItemsForType ────────────────────────────────────────────────────────

describe('fetchItemsForType', () => {
    it('queries material_items with correct type filter', async () => {
        const supabase = makeMockSupabase({ data: [], error: null })
        await fetchItemsForType(supabase, 'type-1')

        expect(supabase.from).toHaveBeenCalledWith('material_items')
        expect(supabase._chain.eq).toHaveBeenCalledWith('material_type_id', 'type-1')
        expect(supabase._chain.limit).toHaveBeenCalledWith(1)
    })
})

// ─── fetchAssignmentsForType ──────────────────────────────────────────────────

describe('fetchAssignmentsForType', () => {
    it('queries day_material_assignments with correct type filter', async () => {
        const supabase = makeMockSupabase({ data: [], error: null })
        await fetchAssignmentsForType(supabase, 'type-1')

        expect(supabase.from).toHaveBeenCalledWith('day_material_assignments')
        expect(supabase._chain.eq).toHaveBeenCalledWith('material_type_id', 'type-1')
        expect(supabase._chain.limit).toHaveBeenCalledWith(1)
    })
})

// ─── insertType ───────────────────────────────────────────────────────────────

describe('insertType', () => {
    it('inserts into material_types with correct data', async () => {
        const type = { id: 't1', name: 'Tajwid', category_id: 'cat-1', display_order: 1 }
        const supabase = makeMockSupabase({ data: type, error: null })

        const result = await insertType(supabase, { category_id: 'cat-1', name: 'Tajwid', display_order: 1 })

        expect(supabase.from).toHaveBeenCalledWith('material_types')
        expect(supabase._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ category_id: 'cat-1', name: 'Tajwid' })
        )
        expect(result.data).toEqual(type)
    })

    it('sets description null when not provided', async () => {
        const supabase = makeMockSupabase()
        await insertType(supabase, { category_id: 'c1', name: 'T', display_order: 1 })
        expect(supabase._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ description: null })
        )
    })
})

// ─── updateTypeById ───────────────────────────────────────────────────────────

describe('updateTypeById', () => {
    it('updates correct type with updated_at timestamp', async () => {
        const supabase = makeMockSupabase({ data: { id: 't1' }, error: null })

        await updateTypeById(supabase, 't1', { category_id: 'c1', name: 'Updated', display_order: 2 })

        expect(supabase.from).toHaveBeenCalledWith('material_types')
        expect(supabase._chain.update).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Updated', updated_at: expect.any(String) })
        )
        expect(supabase._chain.eq).toHaveBeenCalledWith('id', 't1')
    })
})

// ─── deleteTypeById ───────────────────────────────────────────────────────────

describe('deleteTypeById', () => {
    it('deletes correct type by id', async () => {
        const supabase = makeMockSupabase({ error: null })
        supabase._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await deleteTypeById(supabase, 't1')

        expect(supabase.from).toHaveBeenCalledWith('material_types')
        expect(supabase._chain.delete).toHaveBeenCalled()
        expect(supabase._chain.eq).toHaveBeenCalledWith('id', 't1')
    })
})
