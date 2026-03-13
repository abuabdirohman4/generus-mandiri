import { describe, it, expect, vi } from 'vitest'
import {
    fetchAllTemplates,
    fetchTemplateClasses,
    fetchTemplateById,
    insertTemplate,
    insertTemplateClasses,
    updateTemplateById,
    deleteTemplateById,
    fetchSpecificTemplates,
    fetchAllActiveTemplates,
} from '../queries'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.insert = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.delete = vi.fn().mockReturnValue(chain)
    chain.upsert = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.is = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(returnValue)
    chain.then = (resolve: (v: any) => any) => Promise.resolve(returnValue).then(resolve)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

// ─── fetchAllTemplates ────────────────────────────────────────────────────────

describe('fetchAllTemplates', () => {
    it('queries report_templates with correct ordering', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchAllTemplates(supa)
        expect(supa.from).toHaveBeenCalledWith('report_templates')
        expect(supa._chain.order).toHaveBeenCalledWith('semester', { ascending: true })
        expect(supa._chain.order).toHaveBeenCalledWith('name')
    })
})

// ─── fetchTemplateClasses ─────────────────────────────────────────────────────

describe('fetchTemplateClasses', () => {
    it('queries report_template_classes with template_id filter', async () => {
        const supa = makeSupa({ data: [], error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ data: [], error: null })
        await fetchTemplateClasses(supa, 'tpl-1')
        expect(supa.from).toHaveBeenCalledWith('report_template_classes')
        expect(supa._chain.eq).toHaveBeenCalledWith('template_id', 'tpl-1')
    })
})

// ─── fetchTemplateById ────────────────────────────────────────────────────────

describe('fetchTemplateById', () => {
    it('fetches single template by id', async () => {
        const tpl = { id: 'tpl-1', name: 'Rapot S1' }
        const supa = makeSupa({ data: tpl, error: null })
        const result = await fetchTemplateById(supa, 'tpl-1')
        expect(supa.from).toHaveBeenCalledWith('report_templates')
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'tpl-1')
        expect(supa._chain.single).toHaveBeenCalled()
        expect(result.data).toEqual(tpl)
    })
})

// ─── insertTemplate ───────────────────────────────────────────────────────────

describe('insertTemplate', () => {
    it('inserts template with correct data', async () => {
        const tpl = { id: 'tpl-1', name: 'New Template' }
        const supa = makeSupa({ data: tpl, error: null })

        const result = await insertTemplate(supa, {
            name: 'New Template',
            semester: 1,
            is_active: true,
        })

        expect(supa.from).toHaveBeenCalledWith('report_templates')
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'New Template', semester: 1, is_active: true })
        )
        expect(result.data).toEqual(tpl)
    })

    it('sets description and academic_year_id to null when not provided', async () => {
        const supa = makeSupa()
        await insertTemplate(supa, { name: 'T', semester: 1, is_active: false })
        expect(supa._chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({ description: null, academic_year_id: null })
        )
    })
})

// ─── insertTemplateClasses ────────────────────────────────────────────────────

describe('insertTemplateClasses', () => {
    it('inserts junction entries correctly', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.insert = vi.fn().mockResolvedValue({ error: null })
        const entries = [
            { template_id: 'tpl-1', class_master_id: 'c1' },
            { template_id: 'tpl-1', class_master_id: 'c2' },
        ]
        await insertTemplateClasses(supa, entries)
        expect(supa.from).toHaveBeenCalledWith('report_template_classes')
        expect(supa._chain.insert).toHaveBeenCalledWith(entries)
    })
})

// ─── updateTemplateById ───────────────────────────────────────────────────────

describe('updateTemplateById', () => {
    it('updates template by id with correct payload', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })
        await updateTemplateById(supa, 'tpl-1', { name: 'Updated', is_active: false })
        expect(supa.from).toHaveBeenCalledWith('report_templates')
        expect(supa._chain.update).toHaveBeenCalledWith({ name: 'Updated', is_active: false })
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'tpl-1')
    })
})

// ─── deleteTemplateById ───────────────────────────────────────────────────────

describe('deleteTemplateById', () => {
    it('deletes template by id', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })
        await deleteTemplateById(supa, 'tpl-1')
        expect(supa.from).toHaveBeenCalledWith('report_templates')
        expect(supa._chain.delete).toHaveBeenCalled()
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'tpl-1')
    })
})

// ─── fetchSpecificTemplates ───────────────────────────────────────────────────

describe('fetchSpecificTemplates', () => {
    it('queries with semester, academicYear, isActive, and classMasterId filters', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchSpecificTemplates(supa, 1, 'ay-1', 'cm-1')
        expect(supa.from).toHaveBeenCalledWith('report_templates')
        expect(supa._chain.eq).toHaveBeenCalledWith('semester', 1)
        expect(supa._chain.eq).toHaveBeenCalledWith('academic_year_id', 'ay-1')
        expect(supa._chain.eq).toHaveBeenCalledWith('is_active', true)
        expect(supa._chain.eq).toHaveBeenCalledWith('report_template_classes.class_master_id', 'cm-1')
    })
})

// ─── fetchAllActiveTemplates ──────────────────────────────────────────────────

describe('fetchAllActiveTemplates', () => {
    it('queries all active templates for given semester and academic year', async () => {
        const supa = makeSupa({ data: [], error: null })
        await fetchAllActiveTemplates(supa, 2, 'ay-2')
        expect(supa.from).toHaveBeenCalledWith('report_templates')
        expect(supa._chain.eq).toHaveBeenCalledWith('semester', 2)
        expect(supa._chain.eq).toHaveBeenCalledWith('academic_year_id', 'ay-2')
        expect(supa._chain.eq).toHaveBeenCalledWith('is_active', true)
    })
})
