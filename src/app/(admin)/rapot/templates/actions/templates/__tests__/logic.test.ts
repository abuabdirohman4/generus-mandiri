import { describe, it, expect } from 'vitest'
import {
    mapJunctionToClassMasters,
    filterUniversalTemplates,
    pickTemplateId,
    buildTemplateUpdatePayload,
    buildTemplateClassEntries,
    extractClassMasterIdFromEnrollment,
} from '../logic'

// ─── mapJunctionToClassMasters ────────────────────────────────────────────────

describe('mapJunctionToClassMasters', () => {
    it('flattens class_masters from junction (object format)', () => {
        const junction = [
            { class_masters: { id: 'c1', name: 'Kelas A', categories: { code: 'CABERAWIT' } } },
        ]
        const result = mapJunctionToClassMasters(junction)
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('c1')
        expect(result[0].categories.code).toBe('CABERAWIT')
    })

    it('flattens class_masters from junction (array format)', () => {
        const junction = [
            { class_masters: [{ id: 'c1', name: 'K', categories: [{ code: 'PAUD' }] }] },
        ]
        const result = mapJunctionToClassMasters(junction)
        expect(result[0].id).toBe('c1')
        expect(result[0].categories.code).toBe('PAUD')
    })

    it('filters out null class_masters', () => {
        const junction = [
            { class_masters: null },
            { class_masters: { id: 'c1', name: 'K', categories: null } },
        ]
        const result = mapJunctionToClassMasters(junction)
        expect(result).toHaveLength(1)
    })

    it('returns empty array for empty input', () => {
        expect(mapJunctionToClassMasters([])).toHaveLength(0)
    })
})

// ─── filterUniversalTemplates ─────────────────────────────────────────────────

describe('filterUniversalTemplates', () => {
    it('keeps templates with no class associations', () => {
        const templates = [
            { id: 'tpl-1', report_template_classes: [] },
            { id: 'tpl-2', report_template_classes: [{ class_master_id: 'c1' }] },
            { id: 'tpl-3', report_template_classes: null },
        ]
        const result = filterUniversalTemplates(templates)
        expect(result.map((t: any) => t.id)).toEqual(['tpl-1', 'tpl-3'])
    })

    it('returns empty array for empty input', () => {
        expect(filterUniversalTemplates([])).toHaveLength(0)
    })
})

// ─── pickTemplateId ───────────────────────────────────────────────────────────

describe('pickTemplateId', () => {
    it('returns specific template id when available', () => {
        expect(pickTemplateId([{ id: 'specific' }], [{ id: 'universal' }])).toBe('specific')
    })

    it('falls back to universal template when no specific', () => {
        expect(pickTemplateId([], [{ id: 'universal' }])).toBe('universal')
        expect(pickTemplateId(null, [{ id: 'universal' }])).toBe('universal')
    })

    it('returns null when no templates available', () => {
        expect(pickTemplateId(null, [])).toBeNull()
        expect(pickTemplateId([], [])).toBeNull()
    })
})

// ─── buildTemplateUpdatePayload ───────────────────────────────────────────────

describe('buildTemplateUpdatePayload', () => {
    it('includes updated_at timestamp', () => {
        const payload = buildTemplateUpdatePayload({})
        expect(payload.updated_at).toBeTruthy()
        expect(new Date(payload.updated_at).getTime()).toBeGreaterThan(0)
    })

    it('includes only provided fields', () => {
        const payload = buildTemplateUpdatePayload({ name: 'New Name', is_active: false })
        expect(payload.name).toBe('New Name')
        expect(payload.is_active).toBe(false)
        expect(payload).not.toHaveProperty('description')
    })

    it('sets description to null when empty string', () => {
        const payload = buildTemplateUpdatePayload({ description: '' })
        expect(payload.description).toBeNull()
    })

    it('sets class_master_id to null when empty string', () => {
        const payload = buildTemplateUpdatePayload({ class_master_id: '' })
        expect(payload.class_master_id).toBeNull()
    })
})

// ─── buildTemplateClassEntries ────────────────────────────────────────────────

describe('buildTemplateClassEntries', () => {
    it('creates junction entries for each class master id', () => {
        const result = buildTemplateClassEntries('tpl-1', ['c1', 'c2', 'c3'])
        expect(result).toHaveLength(3)
        result.forEach(entry => expect(entry.template_id).toBe('tpl-1'))
        expect(result.map(e => e.class_master_id)).toEqual(['c1', 'c2', 'c3'])
    })

    it('returns empty array for empty class ids', () => {
        expect(buildTemplateClassEntries('tpl-1', [])).toHaveLength(0)
    })
})

// ─── extractClassMasterIdFromEnrollment ───────────────────────────────────────

describe('extractClassMasterIdFromEnrollment', () => {
    it('extracts class master id from nested enrollment (object format)', () => {
        const enrollment = {
            classes: {
                id: 'class-1',
                class_master_mappings: {
                    class_master: { id: 'cm-1', name: 'Kelas A' },
                },
            },
        }
        expect(extractClassMasterIdFromEnrollment(enrollment)).toBe('cm-1')
    })

    it('extracts class master id from nested enrollment (array format)', () => {
        const enrollment = {
            classes: [
                {
                    id: 'class-1',
                    class_master_mappings: [
                        { class_master: [{ id: 'cm-1', name: 'Kelas A' }] },
                    ],
                },
            ],
        }
        expect(extractClassMasterIdFromEnrollment(enrollment)).toBe('cm-1')
    })

    it('returns null when enrollment is null', () => {
        expect(extractClassMasterIdFromEnrollment(null)).toBeNull()
    })

    it('returns null when class master is missing', () => {
        const enrollment = { classes: { class_master_mappings: null } }
        expect(extractClassMasterIdFromEnrollment(enrollment)).toBeNull()
    })
})
