import { describe, it, expect, vi } from 'vitest'
import {
    fetchMaterialCategories,
    fetchMaterialTypes,
    fetchMaterialItems,
    fetchClassMasters,
    fetchStudentEnrollment,
    fetchItemAvailabilityForClass,
} from '../queries'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.or = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(returnValue)
    chain.maybeSingle = vi.fn().mockResolvedValue(returnValue)
    chain.then = (resolve: (v: any) => any) => Promise.resolve(returnValue).then(resolve)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── fetchMaterialCategories ──────────────────────────────────────────────────

describe('fetchMaterialCategories', () => {
    it('queries material_categories ordered by display_order', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchMaterialCategories(supa)
        expect(supa.from).toHaveBeenCalledWith('material_categories')
        expect(supa._chain.order).toHaveBeenCalledWith('display_order')
    })
})

// ─── fetchMaterialTypes ───────────────────────────────────────────────────────

describe('fetchMaterialTypes', () => {
    it('queries material_types without filter when categoryId is undefined', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchMaterialTypes(supa)
        expect(supa.from).toHaveBeenCalledWith('material_types')
        expect(supa._chain.eq).not.toHaveBeenCalled()
        expect(supa._chain.order).toHaveBeenCalledWith('display_order')
    })

    it('applies category_id filter when provided', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchMaterialTypes(supa, 'cat-1')
        expect(supa._chain.eq).toHaveBeenCalledWith('category_id', 'cat-1')
    })
})

// ─── fetchMaterialItems ───────────────────────────────────────────────────────

describe('fetchMaterialItems', () => {
    it('queries material_items without filter when typeId is undefined', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchMaterialItems(supa)
        expect(supa.from).toHaveBeenCalledWith('material_items')
        expect(supa._chain.eq).not.toHaveBeenCalled()
        expect(supa._chain.order).toHaveBeenCalledWith('display_order')
    })

    it('applies material_type_id filter when typeId provided', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchMaterialItems(supa, 'type-1')
        expect(supa._chain.eq).toHaveBeenCalledWith('material_type_id', 'type-1')
    })
})

// ─── fetchClassMasters ────────────────────────────────────────────────────────

describe('fetchClassMasters', () => {
    it('queries class_masters ordered by name', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchClassMasters(supa)
        expect(supa.from).toHaveBeenCalledWith('class_masters')
        expect(supa._chain.order).toHaveBeenCalledWith('name')
    })
})

// ─── fetchStudentEnrollment ───────────────────────────────────────────────────

describe('fetchStudentEnrollment', () => {
    it('queries student_classes with student_id filter', async () => {
        const enrollment = { classes: { id: 'c1' } }
        const supa = makeSupa({ data: enrollment, error: null })
        const result = await fetchStudentEnrollment(supa, 'stu-1')
        expect(supa.from).toHaveBeenCalledWith('student_classes')
        expect(supa._chain.eq).toHaveBeenCalledWith('student_id', 'stu-1')
        expect(supa._chain.single).toHaveBeenCalled()
        expect(result.data).toEqual(enrollment)
    })
})

// ─── fetchItemAvailabilityForClass ────────────────────────────────────────────

describe('fetchItemAvailabilityForClass', () => {
    it('queries material_item_classes with all filters', async () => {
        const supa = makeSupa({ data: null, error: null })
        await fetchItemAvailabilityForClass(supa, 'item-1', 'cm-1', 1)
        expect(supa.from).toHaveBeenCalledWith('material_item_classes')
        expect(supa._chain.eq).toHaveBeenCalledWith('material_item_id', 'item-1')
        expect(supa._chain.eq).toHaveBeenCalledWith('class_master_id', 'cm-1')
        expect(supa._chain.or).toHaveBeenCalledWith('semester.eq.1,semester.is.null')
        expect(supa._chain.limit).toHaveBeenCalledWith(1)
        expect(supa._chain.maybeSingle).toHaveBeenCalled()
    })
})
