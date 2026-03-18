import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
    archiveStudent,
    unarchiveStudent,
    createTransferRequest,
    approveTransferRequest,
    rejectTransferRequest,
    cancelTransferRequest,
    getPendingTransferRequests,
} from '../actions'

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
    createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// ─── Mock helpers ─────────────────────────────────────────────────────────────

export function makeQueryBuilder(resolvedValue: any = { data: null, error: null }) {
    const b: any = {}
    const terminalMock = vi.fn().mockResolvedValue(resolvedValue)
    b.select = vi.fn().mockReturnValue(b)
    b.insert = vi.fn().mockReturnValue(b)
    b.update = vi.fn().mockReturnValue(b)
    b.delete = vi.fn().mockReturnValue(b)
    b.eq = vi.fn().mockReturnValue(b)
    b.in = vi.fn().mockReturnValue(b)
    b.is = vi.fn().mockReturnValue(b)
    b.order = vi.fn().mockReturnValue(b)
    b.limit = vi.fn().mockReturnValue(b)
    b.single = terminalMock
    b.maybeSingle = terminalMock
    b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
    return b
}

export function makeSupabase(options: {
    userId?: string
    profile?: object
    extraFromResponses?: Record<string, any>
} = {}) {
    const userId = options.userId ?? 'user-1'
    const profile = options.profile ?? {
        id: userId,
        full_name: 'Superadmin',
        role: 'superadmin',
        daerah_id: 'da1',
        desa_id: 'd1',
        kelompok_id: 'k1',
        permissions: {
            can_archive_students: true,
            can_transfer_students: true,
        },
    }

    const fromMap: Record<string, any> = {
        profiles: { data: profile, error: null },
        ...(options.extraFromResponses ?? {}),
    }

    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
        },
        from: vi.fn((table: string) => makeQueryBuilder(fromMap[table] ?? { data: null, error: null })),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

// ─── archiveStudent ───────────────────────────────────────────────────────────

describe('archiveStudent', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await archiveStudent({ studentId: 's1', status: 'graduated' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns error when profile not found', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await archiveStudent({ studentId: 's1', status: 'graduated' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('profile not found')
    })

    it('returns validation error for invalid status', async () => {
        const mockSupabase = makeSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await archiveStudent({ studentId: 's1', status: 'deleted' as any })

        expect(result.success).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it('returns error when student not found', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { students: { data: null, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await archiveStudent({ studentId: 'nonexistent', status: 'graduated' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('archives student successfully and calls revalidatePath', async () => {
        const student = {
            id: 's1',
            name: 'Budi',
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'k1',
            status: 'active',
        }
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { students: { data: student, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await archiveStudent({ studentId: 's1', status: 'graduated', notes: 'Lulus' })

        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
        expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })
})

// ─── unarchiveStudent ─────────────────────────────────────────────────────────

describe('unarchiveStudent', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await unarchiveStudent('s1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns error when student already active', async () => {
        const student = { id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1', status: 'active' }
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({ extraFromResponses: { students: { data: student, error: null } } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await unarchiveStudent('s1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('sudah dalam status aktif')
    })

    it('returns error when student not found', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { students: { data: null, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await unarchiveStudent('nonexistent')
        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('unarchives graduated student successfully', async () => {
        const student = { id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1', status: 'graduated' }
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({ extraFromResponses: { students: { data: student, error: null } } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await unarchiveStudent('s1')
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
        expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })
})

// ─── createTransferRequest ────────────────────────────────────────────────────

const validTransferInput = {
    studentIds: ['s1'],
    toDaerahId: 'da2',
    toDesaId: 'd2',
    toKelompokId: 'k2',
}

describe('createTransferRequest', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns validation error for empty studentIds', async () => {
        const mockSupabase = makeSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await createTransferRequest({ ...validTransferInput, studentIds: [] })
        expect(result.success).toBe(false)
        expect(result.error).toContain('minimal satu siswa')
    })

    it('returns error when students not found', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: [], error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('returns error when student has pending transfer', async () => {
        const studentData = [{ id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' }]
        const pendingRequests = [{ student_ids: ['s1'], status: 'pending' }]
        const mockSupabase = makeSupabase()

        let adminTransferCallCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: studentData, error: null })
                if (table === 'transfer_requests') {
                    adminTransferCallCount++
                    if (adminTransferCallCount === 1) return makeQueryBuilder({ data: pendingRequests, error: null })
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Budi')
    })

    it('creates pending request for cross-org transfer (admin role)', async () => {
        const studentData = [{ id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' }]
        const adminProfile = {
            id: 'user-1', full_name: 'Admin', role: 'admin',
            daerah_id: 'da1', desa_id: 'd1', kelompok_id: null,
            permissions: { can_transfer_students: true },
        }
        const mockSupabase = makeSupabase({ profile: adminProfile })

        let adminTransferCallCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: studentData, error: null })
                if (table === 'transfer_requests') {
                    adminTransferCallCount++
                    if (adminTransferCallCount === 1) return makeQueryBuilder({ data: [], error: null }) // pending check
                    return makeQueryBuilder({ data: { id: 'req-1', status: 'pending' }, error: null }) // insert
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest({ ...validTransferInput, toDaerahId: 'da2' })
        expect(result.success).toBe(true)
        expect(result.autoApproved).toBe(false)
        expect(result.requestId).toBe('req-1')
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })

    it('auto-approves transfer for superadmin', async () => {
        const studentData = [{ id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' }]
        const mockSupabase = makeSupabase() // superadmin by default

        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: studentData, error: null })
                if (table === 'transfer_requests') return makeQueryBuilder({ data: { id: 'req-auto', status: 'approved', student_ids: ['s1'], from_daerah_id: 'da1', from_desa_id: 'd1', from_kelompok_id: 'k1', to_daerah_id: 'da2', to_desa_id: 'd2', to_kelompok_id: 'k2', to_class_ids: [] }, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(true)
        expect(result.autoApproved).toBe(true)
    })
})

// ─── approveTransferRequest ───────────────────────────────────────────────────

describe('approveTransferRequest', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await approveTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns error when request not found', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { transfer_requests: { data: null, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await approveTransferRequest('nonexistent')
        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('returns error when request already approved', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: {
                transfer_requests: {
                    data: { id: 'req-1', status: 'approved' },
                    error: null,
                },
            },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await approveTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('disetujui')
    })

    it('approves pending request and executes transfer', async () => {
        const pendingRequest = {
            id: 'req-1',
            status: 'pending',
            student_ids: ['s1'],
            from_daerah_id: 'da1', from_desa_id: 'd1', from_kelompok_id: 'k1',
            to_daerah_id: 'da2', to_desa_id: 'd2', to_kelompok_id: 'k2',
            to_class_ids: [],
            requested_by: 'other-user',
        }
        const approvedRequest = { ...pendingRequest, status: 'approved', reviewed_by: 'user-1' }
        const mockSupabase = makeSupabase()

        let transferCallCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'transfer_requests') {
                    transferCallCount++
                    if (transferCallCount === 1) return makeQueryBuilder({ data: pendingRequest, error: null }) // fetch for approve
                    if (transferCallCount === 2) return makeQueryBuilder({ data: null, error: null }) // update to approved
                    if (transferCallCount === 3) return makeQueryBuilder({ data: approvedRequest, error: null }) // executeTransfer fetch
                    return makeQueryBuilder({ data: null, error: null }) // mark executed
                }
                if (table === 'students') return makeQueryBuilder({ data: null, error: null }) // update org + transfer_history
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await approveTransferRequest('req-1', 'Disetujui')
        expect(result.success).toBe(true)
        expect(result.requestId).toBe('req-1')
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })
})

// ─── rejectTransferRequest ────────────────────────────────────────────────────

describe('rejectTransferRequest', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await rejectTransferRequest('req-1')
        expect(result.success).toBe(false)
    })

    it('returns error when request already rejected', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: {
                transfer_requests: { data: { id: 'req-1', status: 'rejected' }, error: null },
            },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await rejectTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('ditolak')
    })

    it('rejects pending request and calls revalidatePath', async () => {
        const pendingRequest = {
            id: 'req-1', status: 'pending', student_ids: ['s1'],
            from_daerah_id: 'da1', from_desa_id: 'd1', from_kelompok_id: 'k1',
            to_daerah_id: 'da2', to_desa_id: 'd2', to_kelompok_id: 'k2',
        }
        const mockSupabase = makeSupabase()

        let callCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'transfer_requests') {
                    callCount++
                    if (callCount === 1) return makeQueryBuilder({ data: pendingRequest, error: null })
                    return makeQueryBuilder({ data: null, error: null })
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await rejectTransferRequest('req-1', 'Tidak valid')
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })
})

// ─── cancelTransferRequest ────────────────────────────────────────────────────

describe('cancelTransferRequest', () => {
    it('returns error when request not found', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { transfer_requests: { data: null, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await cancelTransferRequest('nonexistent')
        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('returns error when request is not pending', async () => {
        const request = { id: 'req-1', status: 'approved', requested_by: 'user-1' }
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { transfer_requests: { data: request, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await cancelTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('pending')
    })

    it('returns error when not the requester', async () => {
        const request = { id: 'req-1', status: 'pending', requested_by: 'other-user' }
        const mockSupabase = makeSupabase() // user-id is 'user-1'
        const mockAdminClient = makeSupabase({
            extraFromResponses: { transfer_requests: { data: request, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await cancelTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('pembuat request')
    })

    it('cancels request when requester cancels', async () => {
        const request = { id: 'req-1', status: 'pending', requested_by: 'user-1' }
        const mockSupabase = makeSupabase()

        let callCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn() },
            from: vi.fn((table: string) => {
                if (table === 'transfer_requests') {
                    callCount++
                    if (callCount === 1) return makeQueryBuilder({ data: request, error: null })
                    return makeQueryBuilder({ data: null, error: null })
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await cancelTransferRequest('req-1')
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })
})
