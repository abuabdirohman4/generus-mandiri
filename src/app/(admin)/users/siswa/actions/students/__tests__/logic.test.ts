import { describe, it, expect } from 'vitest'
import {
    transformStudentsData,
    validateStudentData,
    buildStudentHierarchy,
} from '../logic'

// ─── validateStudentData ──────────────────────────────────────────────────────

describe('validateStudentData', () => {
    it('rejects missing name', () => {
        const result = validateStudentData({ gender: 'Laki-laki', classId: 'c1' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('field harus diisi')
    })

    it('rejects missing gender', () => {
        const result = validateStudentData({ name: 'Siti', classId: 'c1' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('field harus diisi')
    })

    it('rejects missing classId', () => {
        const result = validateStudentData({ name: 'Budi', gender: 'Laki-laki' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('field harus diisi')
    })

    it('rejects invalid gender value', () => {
        const result = validateStudentData({ name: 'Budi', gender: 'Male', classId: 'c1' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('Jenis kelamin tidak valid')
    })

    it('accepts Laki-laki gender', () => {
        const result = validateStudentData({ name: 'Budi', gender: 'Laki-laki', classId: 'c1' })
        expect(result.ok).toBe(true)
        expect(result.error).toBeUndefined()
    })

    it('accepts Perempuan gender', () => {
        const result = validateStudentData({ name: 'Siti', gender: 'Perempuan', classId: 'c1' })
        expect(result.ok).toBe(true)
        expect(result.error).toBeUndefined()
    })
})

// ─── transformStudentsData (async) ────────────────────────────────────────────

describe('transformStudentsData', () => {
    it('returns empty array for null input', async () => {
        const result = await transformStudentsData(null as any)
        expect(result).toEqual([])
    })

    it('returns empty array for non-array input', async () => {
        const result = await transformStudentsData('invalid' as any)
        expect(result).toEqual([])
    })

    it('filters out null/undefined entries', async () => {
        const input = [
            { id: 's1', name: 'Budi', student_classes: [] },
            null,
            undefined,
            { id: 's2', name: 'Siti', student_classes: [] },
        ]
        const result = await transformStudentsData(input as any)
        expect(result).toHaveLength(2)
        expect(result.map(s => s.id)).toEqual(['s1', 's2'])
    })

    it('extracts classes from junction table', async () => {
        const input = [{
            id: 's1',
            name: 'Budi',
            student_classes: [
                { classes: { id: 'c1', name: 'Kelas A' } },
                { classes: { id: 'c2', name: 'Kelas B' } },
            ],
            daerah: null, desa: null, kelompok: null,
        }]
        const result = await transformStudentsData(input)
        expect(result[0].classes).toHaveLength(2)
        expect(result[0].classes[0]).toEqual({ id: 'c1', name: 'Kelas A' })
        expect(result[0].class_name).toBe('Kelas A') // primary class = first
    })

    it('handles student with no classes gracefully', async () => {
        const input = [{
            id: 's1',
            name: 'Budi',
            student_classes: [],
            daerah: null, desa: null, kelompok: null,
        }]
        const result = await transformStudentsData(input)
        expect(result[0].classes).toEqual([])
        expect(result[0].class_name).toBe('')
    })

    it('extracts org names from object form', async () => {
        const input = [{
            id: 's1',
            name: 'Budi',
            student_classes: [],
            daerah: { name: 'Daerah Satu' },
            desa: { name: 'Desa Satu' },
            kelompok: { name: 'Kelompok Satu' },
        }]
        const result = await transformStudentsData(input)
        expect(result[0].daerah_name).toBe('Daerah Satu')
        expect(result[0].desa_name).toBe('Desa Satu')
        expect(result[0].kelompok_name).toBe('Kelompok Satu')
    })

    it('extracts org names from array form (Supabase returns arrays)', async () => {
        const input = [{
            id: 's1',
            name: 'Siti',
            student_classes: [],
            daerah: [{ name: 'Daerah Array' }],
            desa: [{ name: 'Desa Array' }],
            kelompok: [{ name: 'Kelompok Array' }],
        }]
        const result = await transformStudentsData(input)
        expect(result[0].daerah_name).toBe('Daerah Array')
        expect(result[0].desa_name).toBe('Desa Array')
        expect(result[0].kelompok_name).toBe('Kelompok Array')
    })

    it('defaults status to "active" when null', async () => {
        const input = [{
            id: 's1',
            name: 'Budi',
            student_classes: [],
            status: null,
        }]
        const result = await transformStudentsData(input)
        expect(result[0].status).toBe('active')
    })

    it('preserves explicit status values', async () => {
        const input = [{
            id: 's1',
            name: 'Budi',
            student_classes: [],
            status: 'graduated',
        }]
        const result = await transformStudentsData(input)
        expect(result[0].status).toBe('graduated')
    })
})

// ─── buildStudentHierarchy ────────────────────────────────────────────────────

describe('buildStudentHierarchy', () => {
    const userProfile = {
        kelompok_id: 'k2',
        desa_id: 'd2',
        daerah_id: 'da2',
        role: 'admin',
    }

    it('uses user profile when no kelompok provided', () => {
        const result = buildStudentHierarchy(userProfile)
        expect(result).toEqual({ kelompok_id: 'k2', desa_id: 'd2', daerah_id: 'da2' })
    })

    it('derives hierarchy from kelompok data when provided', () => {
        const kelompokData = {
            id: 'k1',
            desa_id: 'd1',
            desa: { id: 'd1', daerah_id: 'da1', daerah: { id: 'da1' } },
        }
        const result = buildStudentHierarchy(
            { ...userProfile, desa_id: null, kelompok_id: null },
            'k1',
            kelompokData
        )
        expect(result.kelompok_id).toBe('k1')
        expect(result.desa_id).toBe('d1')
        expect(result.daerah_id).toBe('da1')
    })

    it('throws when kelompok is not in admin desa scope', () => {
        const kelompokData = {
            id: 'k1',
            desa_id: 'd99',
            desa: { id: 'd99', daerah_id: 'da1', daerah: { id: 'da1' } },
        }
        const adminDesa = { kelompok_id: null, desa_id: 'd1', daerah_id: 'da1', role: 'admin' }
        expect(() => buildStudentHierarchy(adminDesa, 'k1', kelompokData)).toThrow(
            'Kelompok tidak berada di desa Anda'
        )
    })

    it('handles kelompok data desa as array', () => {
        const kelompokData = {
            id: 'k1',
            desa_id: 'd1',
            desa: [{ id: 'd1', daerah_id: 'da1', daerah: [{ id: 'da1' }] }],
        }
        const result = buildStudentHierarchy(
            { kelompok_id: null, desa_id: null, daerah_id: null, role: 'superadmin' },
            'k1',
            kelompokData as any
        )
        expect(result.kelompok_id).toBe('k1')
        expect(result.desa_id).toBe('d1')
        expect(result.daerah_id).toBe('da1')
    })
})
