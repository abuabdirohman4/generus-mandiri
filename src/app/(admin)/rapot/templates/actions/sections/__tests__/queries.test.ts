import { describe, it, expect, vi } from 'vitest'
import {
    fetchSectionsByTemplate,
    fetchItemsBySection,
    fetchSectionTemplateId,
    insertSection,
    updateSectionById,
    deleteSectionById,
    insertSectionItem,
    deleteSectionItemById,
} from '../queries'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockResolvedValue(returnValue)
    chain.single = vi.fn().mockResolvedValue(returnValue)
    chain.then = (resolve: (v: any) => any) => Promise.resolve(returnValue).then(resolve)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── fetchSectionsByTemplate ──────────────────────────────────────────────────

describe('fetchSectionsByTemplate', () => {
    it('queries report_sections with template_id filter and display_order sort', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchSectionsByTemplate(supa, 'tpl-1')
        expect(supa.from).toHaveBeenCalledWith('report_sections')
        expect(supa._chain.eq).toHaveBeenCalledWith('template_id', 'tpl-1')
        expect(supa._chain.order).toHaveBeenCalledWith('display_order')
    })
})

// ─── fetchItemsBySection ──────────────────────────────────────────────────────

describe('fetchItemsBySection', () => {
    it('queries report_section_items with section_id filter', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchItemsBySection(supa, 'sec-1')
        expect(supa.from).toHaveBeenCalledWith('report_section_items')
        expect(supa._chain.eq).toHaveBeenCalledWith('section_id', 'sec-1')
        expect(supa._chain.order).toHaveBeenCalledWith('display_order')
    })
})

// ─── fetchSectionTemplateId ───────────────────────────────────────────────────

describe('fetchSectionTemplateId', () => {
    it('fetches template_id for a section', async () => {
        const supa = makeSupa({ data: { template_id: 'tpl-1' }, error: null })
        const result = await fetchSectionTemplateId(supa, 'sec-1')
        expect(supa.from).toHaveBeenCalledWith('report_sections')
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'sec-1')
        expect(supa._chain.single).toHaveBeenCalled()
        expect(result.data?.template_id).toBe('tpl-1')
    })
})

// ─── insertSection ────────────────────────────────────────────────────────────

describe('insertSection', () => {
    it('inserts into report_sections with correct data', async () => {
        const sec = { id: 's1', name: 'Bacaan', template_id: 'tpl-1' }
        const supa = makeSupa({ data: sec, error: null })

        const result = await insertSection(supa, {
            template_id: 'tpl-1',
            name: 'Bacaan',
            grading_format: 'score',
            display_order: 1,
            is_active: true,
        })

        expect(supa.from).toHaveBeenCalledWith('report_sections')
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ template_id: 'tpl-1', name: 'Bacaan' })
        )
        expect(result.data).toEqual(sec)
    })

    it('sets description to null when not provided', async () => {
        const supa = makeSupa()
        await insertSection(supa, {
            template_id: 'tpl-1',
            name: 'Sec',
            grading_format: 'grade',
            display_order: 1,
            is_active: true,
        })
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ description: null })
        )
    })
})

// ─── updateSectionById ────────────────────────────────────────────────────────

describe('updateSectionById', () => {
    it('updates section with provided payload and correct id filter', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })
        await updateSectionById(supa, 'sec-1', { name: 'Updated', is_active: false })
        expect(supa.from).toHaveBeenCalledWith('report_sections')
        expect(supa._chain.update).toHaveBeenCalledWith({ name: 'Updated', is_active: false })
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'sec-1')
    })
})

// ─── deleteSectionById ────────────────────────────────────────────────────────

describe('deleteSectionById', () => {
    it('deletes section by id', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })
        await deleteSectionById(supa, 'sec-1')
        expect(supa.from).toHaveBeenCalledWith('report_sections')
        expect(supa._chain.delete).toHaveBeenCalled()
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'sec-1')
    })
})

// ─── insertSectionItem ────────────────────────────────────────────────────────

describe('insertSectionItem', () => {
    it('inserts item with all required fields', async () => {
        const item = { id: 'si-1', section_id: 'sec-1' }
        const supa = makeSupa({ data: item, error: null })

        const result = await insertSectionItem(supa, {
            section_id: 'sec-1',
            material_level: 'type',
            material_type_id: 't1',
            display_order: 1,
            is_required: true,
        })

        expect(supa.from).toHaveBeenCalledWith('report_section_items')
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                section_id: 'sec-1',
                material_level: 'type',
                grading_mode: 'expand', // default
            })
        )
        expect(result.data).toEqual(item)
    })

    it('uses grading_mode from data when provided', async () => {
        const supa = makeSupa()
        await insertSectionItem(supa, {
            section_id: 's1',
            material_level: 'category',
            display_order: 1,
            is_required: false,
            grading_mode: 'single',
        })
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ grading_mode: 'single' })
        )
    })
})

// ─── deleteSectionItemById ────────────────────────────────────────────────────

describe('deleteSectionItemById', () => {
    it('deletes section item by id', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })
        await deleteSectionItemById(supa, 'si-1')
        expect(supa.from).toHaveBeenCalledWith('report_section_items')
        expect(supa._chain.delete).toHaveBeenCalled()
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'si-1')
    })
})
