import { describe, it, expect, vi } from 'vitest'
import {
    validateArchiveInput,
    validateTransferInput,
    checkStudentsFromSameOrg,
    findStudentsWithPendingTransfer,
} from '../logic'

// ─── validateArchiveInput ─────────────────────────────────────────────────────

describe('validateArchiveInput', () => {
    it('rejects missing studentId', () => {
        const result = validateArchiveInput({ status: 'graduated' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('Student ID')
    })

    it('rejects missing status', () => {
        const result = validateArchiveInput({ studentId: 's1' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('Status')
    })

    it('rejects invalid status value', () => {
        const result = validateArchiveInput({ studentId: 's1', status: 'deleted' })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('Status')
    })

    it('accepts graduated status', () => {
        const result = validateArchiveInput({ studentId: 's1', status: 'graduated' })
        expect(result.ok).toBe(true)
        expect(result.error).toBeUndefined()
    })

    it('accepts inactive status', () => {
        const result = validateArchiveInput({ studentId: 's1', status: 'inactive' })
        expect(result.ok).toBe(true)
        expect(result.error).toBeUndefined()
    })
})

// ─── validateTransferInput ────────────────────────────────────────────────────

describe('validateTransferInput', () => {
    it('rejects empty studentIds array', () => {
        const result = validateTransferInput({
            studentIds: [],
            toDaerahId: 'da1',
            toDesaId: 'd1',
            toKelompokId: 'k1',
        })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('minimal satu siswa')
    })

    it('rejects missing toDaerahId', () => {
        const result = validateTransferInput({
            studentIds: ['s1'],
            toDesaId: 'd1',
            toKelompokId: 'k1',
        })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('tidak lengkap')
    })

    it('rejects missing toDesaId', () => {
        const result = validateTransferInput({
            studentIds: ['s1'],
            toDaerahId: 'da1',
            toKelompokId: 'k1',
        })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('tidak lengkap')
    })

    it('rejects missing toKelompokId', () => {
        const result = validateTransferInput({
            studentIds: ['s1'],
            toDaerahId: 'da1',
            toDesaId: 'd1',
        })
        expect(result.ok).toBe(false)
        expect(result.error).toContain('tidak lengkap')
    })

    it('accepts valid transfer input', () => {
        const result = validateTransferInput({
            studentIds: ['s1', 's2'],
            toDaerahId: 'da1',
            toDesaId: 'd1',
            toKelompokId: 'k1',
        })
        expect(result.ok).toBe(true)
        expect(result.error).toBeUndefined()
    })
})

// ─── checkStudentsFromSameOrg ─────────────────────────────────────────────────

describe('checkStudentsFromSameOrg', () => {
    it('returns true for empty array', () => {
        expect(checkStudentsFromSameOrg([])).toBe(true)
    })

    it('returns true for single student', () => {
        expect(checkStudentsFromSameOrg([{ daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' }])).toBe(true)
    })

    it('returns true when all students in same org', () => {
        const students = [
            { daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' },
            { daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' },
        ]
        expect(checkStudentsFromSameOrg(students)).toBe(true)
    })

    it('returns false when students in different kelompok', () => {
        const students = [
            { daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' },
            { daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k2' },
        ]
        expect(checkStudentsFromSameOrg(students)).toBe(false)
    })

    it('returns false when students in different daerah', () => {
        const students = [
            { daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' },
            { daerah_id: 'da2', desa_id: 'd1', kelompok_id: 'k1' },
        ]
        expect(checkStudentsFromSameOrg(students)).toBe(false)
    })
})

// ─── findStudentsWithPendingTransfer ──────────────────────────────────────────

describe('findStudentsWithPendingTransfer', () => {
    it('returns empty when no pending requests exist', () => {
        const students = [{ id: 's1', name: 'Budi' }, { id: 's2', name: 'Siti' }]
        const result = findStudentsWithPendingTransfer(students, [])
        expect(result).toEqual([])
    })

    it('returns names of students with pending transfers', () => {
        const students = [{ id: 's1', name: 'Budi' }, { id: 's2', name: 'Siti' }]
        const pendingRequests = [{ student_ids: ['s1'] }]
        const result = findStudentsWithPendingTransfer(students, pendingRequests)
        expect(result).toEqual(['Budi'])
    })

    it('returns multiple names when multiple students have pending', () => {
        const students = [{ id: 's1', name: 'Budi' }, { id: 's2', name: 'Siti' }, { id: 's3', name: 'Ahmad' }]
        const pendingRequests = [{ student_ids: ['s1', 's3'] }]
        const result = findStudentsWithPendingTransfer(students, pendingRequests)
        expect(result).toEqual(['Budi', 'Ahmad'])
    })

    it('handles requests without student_ids gracefully', () => {
        const students = [{ id: 's1', name: 'Budi' }]
        const pendingRequests = [{ student_ids: undefined }]
        const result = findStudentsWithPendingTransfer(students, pendingRequests as any)
        expect(result).toEqual([])
    })
})
