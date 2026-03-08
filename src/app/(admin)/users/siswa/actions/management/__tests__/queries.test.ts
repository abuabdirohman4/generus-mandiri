import { describe, it, expect, vi } from 'vitest'
import {
    fetchStudentForManagement,
    updateStudentStatusArchive,
    updateStudentStatusActive,
    fetchPendingTransferRequests,
    insertTransferRequest,
    fetchTransferRequestById,
    updateStudentsOrganization,
} from '../queries'

// ─── fetchStudentForManagement ────────────────────────────────────────────────

describe('fetchStudentForManagement', () => {
    it('queries students table and returns single record', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 's1', status: 'active' }, error: null })
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

        const result = await fetchStudentForManagement(supabase, 's1')

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
        expect(result.data).toEqual({ id: 's1', status: 'active' })
    })
})

// ─── updateStudentStatusArchive ───────────────────────────────────────────────

describe('updateStudentStatusArchive', () => {
    it('updates status, archived_at, archived_by on student', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ update: mockUpdate }) } as any

        await updateStudentStatusArchive(supabase, 's1', 'user-1', 'graduated', 'Lulus ujian')

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'graduated',
                archived_at: expect.any(String),
                archived_by: 'user-1',
                archive_notes: 'Lulus ujian',
            })
        )
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })

    it('sets archive_notes to null when not provided', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ update: mockUpdate }) } as any

        await updateStudentStatusArchive(supabase, 's1', 'user-1', 'inactive')

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ archive_notes: null })
        )
    })
})

// ─── updateStudentStatusActive ────────────────────────────────────────────────

describe('updateStudentStatusActive', () => {
    it('resets all archive fields to null and status to active', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ update: mockUpdate }) } as any

        await updateStudentStatusActive(supabase, 's1')

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'active',
                archived_at: null,
                archived_by: null,
                archive_notes: null,
            })
        )
        expect(mockEq).toHaveBeenCalledWith('id', 's1')
    })
})

// ─── fetchPendingTransferRequests ─────────────────────────────────────────────

describe('fetchPendingTransferRequests', () => {
    it('queries transfer_requests with pending status', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

        await fetchPendingTransferRequests(supabase)

        expect(supabase.from).toHaveBeenCalledWith('transfer_requests')
        expect(mockEq).toHaveBeenCalledWith('status', 'pending')
    })
})

// ─── insertTransferRequest ────────────────────────────────────────────────────

describe('insertTransferRequest', () => {
    it('inserts into transfer_requests and returns single', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'req-1' }, error: null })
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
        const supabase = { from: vi.fn().mockReturnValue({ insert: mockInsert }) } as any

        const requestData = { status: 'pending', student_ids: ['s1'] }
        const result = await insertTransferRequest(supabase, requestData)

        expect(supabase.from).toHaveBeenCalledWith('transfer_requests')
        expect(mockInsert).toHaveBeenCalledWith(requestData)
        expect(result.data).toEqual({ id: 'req-1' })
    })
})

// ─── fetchTransferRequestById ─────────────────────────────────────────────────

describe('fetchTransferRequestById', () => {
    it('queries transfer_requests by id', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'r1', status: 'pending' }, error: null })
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
        const supabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) } as any

        const result = await fetchTransferRequestById(supabase, 'r1')

        expect(supabase.from).toHaveBeenCalledWith('transfer_requests')
        expect(mockEq).toHaveBeenCalledWith('id', 'r1')
        expect(result.data?.id).toBe('r1')
    })
})

// ─── updateStudentsOrganization ───────────────────────────────────────────────

describe('updateStudentsOrganization', () => {
    it('updates daerah/desa/kelompok for multiple students', async () => {
        const mockIn = vi.fn().mockResolvedValue({ data: null, error: null })
        const mockUpdate = vi.fn().mockReturnValue({ in: mockIn })
        const supabase = { from: vi.fn().mockReturnValue({ update: mockUpdate }) } as any

        const orgData = { daerah_id: 'da2', desa_id: 'd2', kelompok_id: 'k2' }
        await updateStudentsOrganization(supabase, ['s1', 's2'], orgData)

        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ daerah_id: 'da2', desa_id: 'd2', kelompok_id: 'k2' })
        )
        expect(mockIn).toHaveBeenCalledWith('id', ['s1', 's2'])
    })
})
