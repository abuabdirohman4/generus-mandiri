import { describe, it, expect } from 'vitest'
import {
    canArchiveStudent,
    canTransferStudent,
    canSoftDeleteStudent,
    canHardDeleteStudent,
    canRequestTransfer,
    canReviewTransferRequest,
    needsApproval,
    isOrganizationInUserHierarchy,
    type UserProfile,
    type TransferRequest,
} from '../permissions'

// ─── Test fixtures ───────────────────────────────────────────────────────────

const superadmin: UserProfile = {
    id: 'sa1',
    full_name: 'Superadmin',
    role: 'superadmin',
    permissions: {
        can_archive_students: true,
        can_transfer_students: true,
        can_soft_delete_students: true,
        can_hard_delete_students: true,
    },
}

const adminDaerah: UserProfile = {
    id: 'ad1',
    full_name: 'Admin Daerah',
    role: 'admin',
    daerah_id: 'da1',
    permissions: {
        can_archive_students: true,
        can_transfer_students: true,
        can_soft_delete_students: true,
        can_hard_delete_students: false,
    },
}

const adminDesa: UserProfile = {
    id: 'ade1',
    full_name: 'Admin Desa',
    role: 'admin',
    daerah_id: 'da1',
    desa_id: 'd1',
    permissions: {
        can_archive_students: true,
        can_transfer_students: false,
        can_soft_delete_students: true,
        can_hard_delete_students: false,
    },
}

const teacher: UserProfile = {
    id: 't1',
    full_name: 'Teacher',
    role: 'teacher',
    daerah_id: 'da1',
    desa_id: 'd1',
    kelompok_id: 'k1',
    permissions: {
        can_archive_students: false,
        can_transfer_students: false,
        can_soft_delete_students: false,
        can_hard_delete_students: false,
    },
}

const studentInK1 = {
    id: 's1',
    name: 'Student K1',
    gender: 'Laki-laki' as const,
    daerah_id: 'da1',
    desa_id: 'd1',
    kelompok_id: 'k1',
    status: 'active' as const,
    deleted_at: null,
}

const studentInOtherDaerah = {
    id: 's2',
    name: 'Student Other Daerah',
    gender: 'Perempuan' as const,
    daerah_id: 'da99',
    desa_id: 'd99',
    kelompok_id: 'k99',
    status: 'active' as const,
    deleted_at: null,
}

const softDeletedStudent = {
    ...studentInK1,
    id: 's3',
    deleted_at: '2026-01-01T00:00:00Z',
}

// ─── canArchiveStudent ────────────────────────────────────────────────────────

describe('canArchiveStudent', () => {
    it('returns false when user is null', () => {
        expect(canArchiveStudent(null, studentInK1 as any)).toBe(false)
    })

    it('returns false when user lacks can_archive_students permission', () => {
        expect(canArchiveStudent(teacher, studentInK1 as any)).toBe(false)
    })

    it('allows superadmin to archive any student', () => {
        expect(canArchiveStudent(superadmin, studentInK1 as any)).toBe(true)
        expect(canArchiveStudent(superadmin, studentInOtherDaerah as any)).toBe(true)
    })

    it('allows adminDaerah to archive students in their daerah', () => {
        expect(canArchiveStudent(adminDaerah, studentInK1 as any)).toBe(true)
    })

    it('denies adminDaerah archiving students outside their daerah', () => {
        expect(canArchiveStudent(adminDaerah, studentInOtherDaerah as any)).toBe(false)
    })

    it('allows adminDesa to archive students in their desa', () => {
        expect(canArchiveStudent(adminDesa, studentInK1 as any)).toBe(true)
    })
})

// ─── canTransferStudent ───────────────────────────────────────────────────────

describe('canTransferStudent', () => {
    it('returns false when user is null', () => {
        expect(canTransferStudent(null, studentInK1 as any)).toBe(false)
    })

    it('returns false when user lacks can_transfer_students permission', () => {
        expect(canTransferStudent(adminDesa, studentInK1 as any)).toBe(false)
    })

    it('allows superadmin to transfer any student', () => {
        expect(canTransferStudent(superadmin, studentInK1 as any)).toBe(true)
        expect(canTransferStudent(superadmin, studentInOtherDaerah as any)).toBe(true)
    })

    it('allows adminDaerah to transfer students in their daerah', () => {
        expect(canTransferStudent(adminDaerah, studentInK1 as any)).toBe(true)
    })
})

// ─── canSoftDeleteStudent ─────────────────────────────────────────────────────

describe('canSoftDeleteStudent', () => {
    it('returns false when user is null', () => {
        expect(canSoftDeleteStudent(null, studentInK1 as any)).toBe(false)
    })

    it('allows superadmin to soft delete', () => {
        expect(canSoftDeleteStudent(superadmin, studentInK1 as any)).toBe(true)
    })

    it('allows adminDaerah to soft delete in their scope', () => {
        expect(canSoftDeleteStudent(adminDaerah, studentInK1 as any)).toBe(true)
    })

    it('denies soft delete outside scope', () => {
        expect(canSoftDeleteStudent(adminDaerah, studentInOtherDaerah as any)).toBe(false)
    })
})

// ─── canHardDeleteStudent ─────────────────────────────────────────────────────

describe('canHardDeleteStudent', () => {
    it('returns false when user is null', () => {
        expect(canHardDeleteStudent(null, softDeletedStudent as any)).toBe(false)
    })

    it('denies hard delete for non-superadmin', () => {
        expect(canHardDeleteStudent(adminDaerah, softDeletedStudent as any)).toBe(false)
    })

    it('denies hard delete when student not soft-deleted first', () => {
        expect(canHardDeleteStudent(superadmin, studentInK1 as any)).toBe(false)
    })

    it('allows superadmin to hard delete soft-deleted student', () => {
        expect(canHardDeleteStudent(superadmin, softDeletedStudent as any)).toBe(true)
    })
})

// ─── needsApproval ────────────────────────────────────────────────────────────

describe('needsApproval', () => {
    const baseRequest: TransferRequest = {
        id: 'r1',
        student_ids: ['s1'],
        from_daerah_id: 'da1',
        from_desa_id: 'd1',
        from_kelompok_id: 'k1',
        to_daerah_id: 'da1',
        to_desa_id: 'd1',
        to_kelompok_id: 'k2', // same desa, different kelompok
        status: 'pending',
        requested_by: 'ad1',
        requested_at: '2026-01-01',
    }

    it('superadmin transfers never need approval', () => {
        expect(needsApproval(superadmin, baseRequest)).toBe(false)
    })

    it('same-org transfer does NOT need approval', () => {
        const sameOrgRequest = { ...baseRequest, to_kelompok_id: 'k1' }
        expect(needsApproval(adminDaerah, sameOrgRequest)).toBe(false)
    })

    it('cross-daerah transfer NEEDS approval', () => {
        const crossDaerahRequest = { ...baseRequest, to_daerah_id: 'da99' }
        expect(needsApproval(adminDaerah, crossDaerahRequest)).toBe(true)
    })

    it('cross-desa transfer NEEDS approval', () => {
        const crossDesaRequest = { ...baseRequest, to_desa_id: 'd99' }
        expect(needsApproval(adminDaerah, crossDesaRequest)).toBe(true)
    })
})

// ─── isOrganizationInUserHierarchy ───────────────────────────────────────────

describe('isOrganizationInUserHierarchy', () => {
    it('superadmin has access to all orgs', () => {
        expect(isOrganizationInUserHierarchy(superadmin, {
            daerah_id: 'any',
            desa_id: 'any',
            kelompok_id: 'any',
        })).toBe(true)
    })

    it('adminDaerah can access orgs in their daerah', () => {
        expect(isOrganizationInUserHierarchy(adminDaerah, {
            daerah_id: 'da1',
            desa_id: 'any',
            kelompok_id: 'any',
        })).toBe(true)
    })

    it('adminDaerah cannot access orgs outside their daerah', () => {
        expect(isOrganizationInUserHierarchy(adminDaerah, {
            daerah_id: 'da99',
            desa_id: 'any',
            kelompok_id: 'any',
        })).toBe(false)
    })
})
