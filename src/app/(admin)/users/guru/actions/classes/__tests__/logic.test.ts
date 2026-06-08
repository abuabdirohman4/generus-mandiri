import { describe, it, expect } from 'vitest'
import {
    buildClassAssignmentMappings,
    mapTeacherClassesToResult,
    validateClassesForDesa,
    validateClassesForDaerah,
    validateClassesForKelompok,
} from '../logic'

// ─── buildClassAssignmentMappings ─────────────────────────────────────────────

describe('buildClassAssignmentMappings', () => {
    it('maps class ids to teacher assignments', () => {
        const result = buildClassAssignmentMappings('t1', ['c1', 'c2', 'c3'])
        expect(result).toHaveLength(3)
        result.forEach(m => expect(m.teacher_id).toBe('t1'))
        expect(result.map(m => m.class_id)).toEqual(['c1', 'c2', 'c3'])
    })

    it('returns empty array for empty classIds', () => {
        expect(buildClassAssignmentMappings('t1', [])).toHaveLength(0)
    })
})

// ─── mapTeacherClassesToResult ────────────────────────────────────────────────

describe('mapTeacherClassesToResult', () => {
    it('maps teacher_classes rows with object format class', () => {
        const raw = [
            { id: 'tce-1', class_id: 'c1', class: { name: 'Kelas Alif', kelompok_id: 'k1' } },
        ]
        const result = mapTeacherClassesToResult(raw)
        expect(result).toHaveLength(1)
        expect(result[0].class_name).toBe('Kelas Alif')
        expect(result[0].kelompok_id).toBe('k1')
    })

    it('maps teacher_classes rows with array format class (PostgREST)', () => {
        const raw = [
            { id: 'tce-1', class_id: 'c1', class: [{ name: 'Kelas Ba', kelompok_id: 'k2' }] },
        ]
        const result = mapTeacherClassesToResult(raw)
        expect(result[0].class_name).toBe('Kelas Ba')
        expect(result[0].kelompok_id).toBe('k2')
    })

    it('returns empty array for empty input', () => {
        expect(mapTeacherClassesToResult([])).toHaveLength(0)
    })
})

// ─── validateClassesForDesa ───────────────────────────────────────────────────

describe('validateClassesForDesa', () => {
    it('returns valid=true when all classes are in the given desa', () => {
        const classes = [
            { kelompok: { desa_id: 'desa-1' } },
            { kelompok: { desa_id: 'desa-1' } },
        ]
        expect(validateClassesForDesa(classes, 'desa-1')).toEqual({ valid: true })
    })

    it('returns valid=false when a class is in a different desa', () => {
        const classes = [
            { kelompok: { desa_id: 'desa-1' } },
            { kelompok: { desa_id: 'desa-X' } },
        ]
        const result = validateClassesForDesa(classes, 'desa-1')
        expect(result.valid).toBe(false)
        expect(result.error).toBeTruthy()
    })
})

// ─── validateClassesForDaerah ─────────────────────────────────────────────────

describe('validateClassesForDaerah', () => {
    it('returns valid=true when all classes are in the given daerah', () => {
        const classes = [
            { kelompok: { desa: { daerah_id: 'daerah-1' } } },
        ]
        expect(validateClassesForDaerah(classes, 'daerah-1')).toEqual({ valid: true })
    })

    it('returns valid=false when a class is from different daerah', () => {
        const classes = [
            { kelompok: { desa: { daerah_id: 'daerah-X' } } },
        ]
        const result = validateClassesForDaerah(classes, 'daerah-1')
        expect(result.valid).toBe(false)
    })
})

// ─── validateClassesForKelompok ───────────────────────────────────────────────

describe('validateClassesForKelompok', () => {
    it('returns valid=true when all classes are in the given kelompok', () => {
        const classes = [
            { kelompok_id: 'k1' },
            { kelompok_id: 'k1' },
        ]
        expect(validateClassesForKelompok(classes, 'k1')).toEqual({ valid: true })
    })

    it('returns valid=false when a class is from a different kelompok', () => {
        const classes = [
            { kelompok_id: 'k1' },
            { kelompok_id: 'k2' },
        ]
        const result = validateClassesForKelompok(classes, 'k1')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('kelompok Anda sendiri')
    })

    it('returns valid=true for empty classes', () => {
        expect(validateClassesForKelompok([], 'k1')).toEqual({ valid: true })
    })
})
