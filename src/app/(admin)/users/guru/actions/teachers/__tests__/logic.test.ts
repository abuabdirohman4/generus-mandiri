import { describe, it, expect } from 'vitest'
import {
    validateCreateTeacherData,
    validateUpdateTeacherData,
    extractClassIds,
    buildClassesMap,
    buildClassesMapWithKelompok,
    buildKelompokMap,
    transformTeacher,
} from '../logic'

// ─── validateCreateTeacherData ────────────────────────────────────────────────

describe('validateCreateTeacherData', () => {
    const valid = {
        username: 'gurubudi',
        full_name: 'Budi Santoso',
        email: 'budi@test.com',
        password: 'secret123',
        daerah_id: 'daerah-1',
    }

    it('does not throw for valid data', () => {
        expect(() => validateCreateTeacherData(valid)).not.toThrow()
    })

    it('throws when username is empty', () => {
        expect(() => validateCreateTeacherData({ ...valid, username: '' })).toThrow('Username harus diisi')
    })

    it('throws when full_name is empty', () => {
        expect(() => validateCreateTeacherData({ ...valid, full_name: '  ' })).toThrow('Nama lengkap harus diisi')
    })

    it('throws when email is empty', () => {
        expect(() => validateCreateTeacherData({ ...valid, email: '' })).toThrow('Email harus diisi')
    })

    it('throws when password is missing', () => {
        const { password, ...noPass } = valid
        expect(() => validateCreateTeacherData(noPass as any)).toThrow('Password harus diisi')
    })

    it('throws when daerah_id is missing', () => {
        expect(() => validateCreateTeacherData({ ...valid, daerah_id: '' })).toThrow('Daerah harus dipilih')
    })

    it('throws when kelompok_id set but desa_id missing', () => {
        expect(() => validateCreateTeacherData({ ...valid, kelompok_id: 'k1', desa_id: null }))
            .toThrow('Desa harus dipilih untuk guru dengan kelompok')
    })
})

// ─── validateUpdateTeacherData ────────────────────────────────────────────────

describe('validateUpdateTeacherData', () => {
    it('does not throw for valid update data (no password required)', () => {
        expect(() => validateUpdateTeacherData({
            username: 'guru',
            full_name: 'Guru Baru',
            email: 'g@g.com',
            daerah_id: 'd1',
        })).not.toThrow()
    })

    it('throws when username is empty', () => {
        expect(() => validateUpdateTeacherData({
            username: '',
            full_name: 'N',
            email: 'e@e.com',
            daerah_id: 'd1',
        })).toThrow('Username harus diisi')
    })
})

// ─── extractClassIds ──────────────────────────────────────────────────────────

describe('extractClassIds', () => {
    it('extracts unique class IDs from array of teachers', () => {
        const teachers = [
            { teacher_classes: [{ class_id: 'c1' }, { class_id: 'c2' }] },
            { teacher_classes: [{ class_id: 'c2' }, { class_id: 'c3' }] },
        ]
        const result = extractClassIds(teachers)
        expect(result.size).toBe(3)
        expect(result.has('c1')).toBe(true)
        expect(result.has('c3')).toBe(true)
    })

    it('handles teachers with no classes', () => {
        const teachers = [{ teacher_classes: [] }, { teacher_classes: null }]
        expect(extractClassIds(teachers).size).toBe(0)
    })

    it('handles array-format class_id', () => {
        const teachers = [{ teacher_classes: [{ class_id: ['c1'] }] }]
        const result = extractClassIds(teachers)
        expect(result.has('c1')).toBe(true)
    })
})

// ─── buildKelompokMap ─────────────────────────────────────────────────────────

describe('buildKelompokMap', () => {
    it('maps kelompok by id', () => {
        const data = [{ id: 'k1', name: 'Kelompok A' }, { id: 'k2', name: 'Kelompok B' }]
        const map = buildKelompokMap(data)
        expect(map.get('k1')?.name).toBe('Kelompok A')
        expect(map.get('k2')?.name).toBe('Kelompok B')
        expect(map.size).toBe(2)
    })
})

// ─── buildClassesMap ──────────────────────────────────────────────────────────

describe('buildClassesMap', () => {
    it('builds classesMap with kelompok from separate kelompokMap', () => {
        const classesData = [{ id: 'c1', name: 'Kelas Alif', kelompok_id: 'k1' }]
        const kelompokMap = new Map([['k1', { id: 'k1', name: 'Kelompok A' }]])
        const map = buildClassesMap(classesData, kelompokMap)
        expect(map.get('c1')?.name).toBe('Kelas Alif')
        expect(map.get('c1')?.kelompok?.name).toBe('Kelompok A')
    })

    it('sets kelompok to null when not in map', () => {
        const classesData = [{ id: 'c1', name: 'Kelas X', kelompok_id: 'k99' }]
        const map = buildClassesMap(classesData, new Map())
        expect(map.get('c1')?.kelompok).toBeNull()
    })
})

// ─── buildClassesMapWithKelompok ──────────────────────────────────────────────

describe('buildClassesMapWithKelompok', () => {
    it('handles kelompok in object format', () => {
        const classesData = [{ id: 'c1', name: 'Kelas Alif', kelompok_id: 'k1', kelompok: { id: 'k1', name: 'K A' } }]
        const map = buildClassesMapWithKelompok(classesData)
        expect(map.get('c1')?.kelompok?.name).toBe('K A')
    })

    it('handles kelompok in array format (PostgREST)', () => {
        const classesData = [{ id: 'c1', name: 'Kelas Alif', kelompok_id: 'k1', kelompok: [{ id: 'k1', name: 'K A' }] }]
        const map = buildClassesMapWithKelompok(classesData)
        expect(map.get('c1')?.kelompok?.name).toBe('K A')
    })
})

// ─── transformTeacher ─────────────────────────────────────────────────────────

describe('transformTeacher', () => {
    it('adds class_names, daerah_name, desa_name, kelompok_name', () => {
        const classesMap = new Map([['c1', { name: 'Kelas Alif', kelompok_id: 'k1', kelompok: { id: 'k1', name: 'Kel A' } }]])
        const teacher = {
            id: 'g1',
            teacher_classes: [{ class_id: 'c1' }],
            daerah: { name: 'Daerah Jawa' },
            desa: null,
            kelompok: null,
        }
        const result = transformTeacher(teacher, classesMap)
        expect(result.class_names).toBe('Kelas Alif') // single kelompok, no kelompok suffix
        expect(result.daerah_name).toBe('Daerah Jawa')
        expect(result.desa_name).toBe('')
        expect(result.kelompok_name).toBe('')
    })

    it('shows kelompok name when classes from different kelompok', () => {
        const classesMap = new Map([
            ['c1', { name: 'Kelas A', kelompok_id: 'k1', kelompok: { id: 'k1', name: 'Kel 1' } }],
            ['c2', { name: 'Kelas B', kelompok_id: 'k2', kelompok: { id: 'k2', name: 'Kel 2' } }],
        ])
        const teacher = {
            teacher_classes: [{ class_id: 'c1' }, { class_id: 'c2' }],
            daerah: null, desa: null, kelompok: null,
        }
        const result = transformTeacher(teacher, classesMap)
        expect(result.class_names).toContain('Kel 1')
        expect(result.class_names).toContain('Kel 2')
    })

    it('shows `-` when no classes', () => {
        const teacher = { teacher_classes: [], daerah: null, desa: null, kelompok: null }
        const result = transformTeacher(teacher, new Map())
        expect(result.class_names).toBe('-')
    })

    it('handles array format for daerah/desa/kelompok', () => {
        const teacher = {
            teacher_classes: [],
            daerah: [{ name: 'Daerah A' }],
            desa: [{ name: 'Desa B' }],
            kelompok: [{ name: 'Kel C' }],
        }
        const result = transformTeacher(teacher, new Map())
        expect(result.daerah_name).toBe('Daerah A')
        expect(result.desa_name).toBe('Desa B')
        expect(result.kelompok_name).toBe('Kel C')
    })
})
