import { describe, it, expect, vi } from 'vitest'
import {
    fetchAvailableClassMasters,
    fetchAllClassMastersWithCategory,
    fetchClassMastersWithMaterialItems,
    fetchItemsByType,
    fetchAllItems,
    fetchItemById,
    fetchDayItemsForItem,
    insertItem,
    updateItemById,
    deleteItemById,
    fetchItemClassMappings,
    deleteItemClassMappings,
    upsertDayAssignment,
    deleteDayAssignmentById,
} from '../queries'

// ─── Supabase mock helper ─────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.upsert = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.range = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue(returnValue)
    chain.limit = vi.fn().mockResolvedValue(returnValue)
    chain.single = vi.fn().mockResolvedValue(returnValue)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── fetchAvailableClassMasters ───────────────────────────────────────────────

describe('fetchAvailableClassMasters', () => {
    it('queries class_masters ordered by name', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchAvailableClassMasters(supa)
        expect(supa.from).toHaveBeenCalledWith('class_masters')
        expect(supa._chain.order).toHaveBeenCalledWith('name')
    })
})

// ─── fetchAllClassMastersWithCategory ─────────────────────────────────────────

describe('fetchAllClassMastersWithCategory', () => {
    it('queries class_masters ordered by sort_order ascending', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchAllClassMastersWithCategory(supa)
        expect(supa.from).toHaveBeenCalledWith('class_masters')
        expect(supa._chain.order).toHaveBeenCalledWith('sort_order', { ascending: true })
    })
})

// ─── fetchClassMastersWithMaterialItems ───────────────────────────────────────

describe('fetchClassMastersWithMaterialItems', () => {
    it('queries class_masters and orders by name', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchClassMastersWithMaterialItems(supa)
        expect(supa.from).toHaveBeenCalledWith('class_masters')
        expect(supa._chain.order).toHaveBeenCalledWith('name')
    })
})

// ─── fetchItemsByType ─────────────────────────────────────────────────────────

describe('fetchItemsByType', () => {
    it('filters material_items by material_type_id', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchItemsByType(supa, 'type-1')
        expect(supa.from).toHaveBeenCalledWith('material_items')
        expect(supa._chain.eq).toHaveBeenCalledWith('material_type_id', 'type-1')
        expect(supa._chain.order).toHaveBeenCalledWith('name')
    })
})

// ─── fetchAllItems ────────────────────────────────────────────────────────────

describe('fetchAllItems', () => {
    it('queries all material_items ordered by name', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchAllItems(supa)
        expect(supa.from).toHaveBeenCalledWith('material_items')
        expect(supa._chain.order).toHaveBeenCalledWith('name')
    })
})

// ─── fetchItemById ────────────────────────────────────────────────────────────

describe('fetchItemById', () => {
    it('fetches a single material item by id', async () => {
        const item = { id: 'i1', name: 'Item 1' }
        const supa = makeSupa({ data: item, error: null })

        const result = await fetchItemById(supa, 'i1')

        expect(supa.from).toHaveBeenCalledWith('material_items')
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'i1')
        expect(supa._chain.single).toHaveBeenCalled()
        expect(result.data).toEqual(item)
    })
})

// ─── fetchDayItemsForItem ─────────────────────────────────────────────────────

describe('fetchDayItemsForItem', () => {
    it('queries day_material_items with limit 1', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchDayItemsForItem(supa, 'i1')
        expect(supa.from).toHaveBeenCalledWith('day_material_items')
        expect(supa._chain.eq).toHaveBeenCalledWith('material_item_id', 'i1')
        expect(supa._chain.limit).toHaveBeenCalledWith(1)
    })
})

// ─── insertItem ───────────────────────────────────────────────────────────────

describe('insertItem', () => {
    it('inserts into material_items with correct data', async () => {
        const item = { id: 'i1', name: 'New Item' }
        const supa = makeSupa({ data: item, error: null })

        const result = await insertItem(supa, { material_type_id: 't1', name: 'New Item' })

        expect(supa.from).toHaveBeenCalledWith('material_items')
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ material_type_id: 't1', name: 'New Item' })
        )
        expect(result.data).toEqual(item)
    })

    it('sets description and content to null when not provided', async () => {
        const supa = makeSupa()
        await insertItem(supa, { material_type_id: 't1', name: 'Test' })
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ description: null, content: null })
        )
    })
})

// ─── updateItemById ───────────────────────────────────────────────────────────

describe('updateItemById', () => {
    it('updates material item with updated_at and returns updated item', async () => {
        const item = { id: 'i1', name: 'Updated' }
        const chain = makeChain({ data: null, error: null })
        // First from() call: update
        // Second from() call: select to fetch updated
        const supa = {
            from: vi.fn().mockReturnValue(chain),
            _chain: chain,
        } as any
        chain.single = vi.fn().mockResolvedValue({ data: item, error: null })

        const result = await updateItemById(supa, 'i1', {
            material_type_id: 't1',
            name: 'Updated',
        })

        expect(supa.from).toHaveBeenCalledWith('material_items')
        expect(chain.update).toHaveBeenCalledWith(
            expect.objectContaining({ updated_at: expect.any(String) })
        )
        expect(result.data).toEqual(item)
    })

    it('returns early with error when update fails', async () => {
        const updateError = { message: 'Update failed', code: 'DB_ERR' }
        const chain = makeChain()
        chain.eq = vi.fn().mockResolvedValue({ data: null, error: updateError })
        const supa = { from: vi.fn().mockReturnValue(chain), _chain: chain } as any

        const result = await updateItemById(supa, 'i1', { material_type_id: 't1', name: 'Fail' })
        expect(result.error).toEqual(updateError)
    })
})

// ─── deleteItemById ───────────────────────────────────────────────────────────

describe('deleteItemById', () => {
    it('deletes correct item by id', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await deleteItemById(supa, 'i1')

        expect(supa.from).toHaveBeenCalledWith('material_items')
        expect(supa._chain.delete).toHaveBeenCalled()
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'i1')
    })
})

// ─── fetchItemClassMappings ───────────────────────────────────────────────────

describe('fetchItemClassMappings', () => {
    it('queries material_item_classes for a specific item', async () => {
        const supa = makeSupa({ data: [], error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ data: [], error: null })
        await fetchItemClassMappings(supa, 'i1')
        expect(supa.from).toHaveBeenCalledWith('material_item_classes')
        expect(supa._chain.eq).toHaveBeenCalledWith('material_item_id', 'i1')
    })
})

// ─── deleteItemClassMappings ──────────────────────────────────────────────────

describe('deleteItemClassMappings', () => {
    it('deletes all mappings for a specific item', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await deleteItemClassMappings(supa, 'i1')

        expect(supa.from).toHaveBeenCalledWith('material_item_classes')
        expect(supa._chain.delete).toHaveBeenCalled()
        expect(supa._chain.eq).toHaveBeenCalledWith('material_item_id', 'i1')
    })
})

// ─── upsertDayAssignment ──────────────────────────────────────────────────────

describe('upsertDayAssignment', () => {
    it('upserts into day_material_assignments with correct fields', async () => {
        const assignment = { id: 'a1' }
        const supa = makeSupa({ data: assignment, error: null })

        const result = await upsertDayAssignment(supa, {
            class_master_id: 'c1',
            semester: 1,
            month: 3,
            week: 2,
            day_of_week: 1,
            material_type_id: 't1',
        })

        expect(supa.from).toHaveBeenCalledWith('day_material_assignments')
        expect(supa._chain.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                class_master_id: 'c1',
                semester: 1,
                month: 3,
                week: 2,
                day_of_week: 1,
                material_type_id: 't1',
                updated_at: expect.any(String),
            }),
            expect.objectContaining({ onConflict: expect.any(String) })
        )
        expect(result.data).toEqual(assignment)
    })
})

// ─── deleteDayAssignmentById ──────────────────────────────────────────────────

describe('deleteDayAssignmentById', () => {
    it('deletes correct assignment by id', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await deleteDayAssignmentById(supa, 'a1')

        expect(supa.from).toHaveBeenCalledWith('day_material_assignments')
        expect(supa._chain.delete).toHaveBeenCalled()
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'a1')
    })
})
