import { describe, it, expect } from 'vitest'
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent,
  getTransferableDaerahIds,
  getTransferableDesaIds,
  getTransferableKelompokIds,
  canRequestTransfer,
  canReviewTransferRequest,
  needsApproval,
  isOrganizationInUserHierarchy,
  type UserProfile,
  type Student,
  type TransferRequest,
} from '../studentPermissions'

describe('studentPermissions', () => {
  // Mock user profiles
  const superadmin: UserProfile = {
    id: 'superadmin-1',
    full_name: 'Super Admin',
    role: 'superadmin',
  }

  const adminDaerah: UserProfile = {
    id: 'admin-daerah-1',
    full_name: 'Admin Daerah',
    role: 'admin',
    daerah_id: 'daerah-1',
    desa_id: null,
    kelompok_id: null,
  }

  const adminDesa: UserProfile = {
    id: 'admin-desa-1',
    full_name: 'Admin Desa',
    role: 'admin',
    daerah_id: 'daerah-1',
    desa_id: 'desa-1',
    kelompok_id: null,
  }

  const adminKelompok: UserProfile = {
    id: 'admin-kelompok-1',
    full_name: 'Admin Kelompok',
    role: 'admin',
    daerah_id: 'daerah-1',
    desa_id: 'desa-1',
    kelompok_id: 'kelompok-1',
  }

  const teacherWithPermissions: UserProfile = {
    id: 'teacher-1',
    full_name: 'Teacher With Permissions',
    role: 'teacher',
    permissions: {
      can_archive_students: true,
      can_transfer_students: true,
      can_soft_delete_students: true,
    },
  }

  const teacherNoPermissions: UserProfile = {
    id: 'teacher-2',
    full_name: 'Teacher No Permissions',
    role: 'teacher',
    permissions: {
      can_archive_students: false,
      can_transfer_students: false,
      can_soft_delete_students: false,
    },
  }

  const teacherUndefinedPermissions: UserProfile = {
    id: 'teacher-3',
    full_name: 'Teacher Undefined Permissions',
    role: 'teacher',
    // permissions field is undefined
  }

  const student: UserProfile = {
    id: 'student-1',
    full_name: 'Student',
    role: 'student',
  }

  // Mock students
  const studentInDaerah1: Student = {
    id: 'student-a',
    full_name: 'Student A',
    daerah_id: 'daerah-1',
    desa_id: 'desa-1',
    kelompok_id: 'kelompok-1',
    status: 'active',
  }

  const studentInDifferentDaerah: Student = {
    id: 'student-b',
    full_name: 'Student B',
    daerah_id: 'daerah-2',
    desa_id: 'desa-2',
    kelompok_id: 'kelompok-2',
    status: 'active',
  }

  describe('canArchiveStudent', () => {
    it('should allow superadmin to archive any student', () => {
      expect(canArchiveStudent(superadmin, studentInDaerah1)).toBe(true)
      expect(canArchiveStudent(superadmin, studentInDifferentDaerah)).toBe(true)
    })

    it('should allow admin to archive students in their hierarchy', () => {
      expect(canArchiveStudent(adminDaerah, studentInDaerah1)).toBe(true)
      expect(canArchiveStudent(adminDaerah, studentInDifferentDaerah)).toBe(false)
    })

    it('should allow admin desa to archive students in their desa', () => {
      expect(canArchiveStudent(adminDesa, studentInDaerah1)).toBe(true)
    })

    it('should allow admin kelompok to archive students in their kelompok', () => {
      expect(canArchiveStudent(adminKelompok, studentInDaerah1)).toBe(true)
    })

    it('should allow teacher WITH permission to archive', () => {
      expect(canArchiveStudent(teacherWithPermissions, studentInDaerah1)).toBe(true)
    })

    it('should deny teacher WITHOUT permission', () => {
      expect(canArchiveStudent(teacherNoPermissions, studentInDaerah1)).toBe(false)
    })

    it('should deny teacher with undefined permissions', () => {
      expect(canArchiveStudent(teacherUndefinedPermissions, studentInDaerah1)).toBe(false)
    })

    it('should deny student role', () => {
      expect(canArchiveStudent(student, studentInDaerah1)).toBe(false)
    })

    it('should handle null user profile', () => {
      expect(canArchiveStudent(null, studentInDaerah1)).toBe(false)
    })
  })

  describe('canTransferStudent', () => {
    it('should allow superadmin to transfer any student', () => {
      expect(canTransferStudent(superadmin, studentInDaerah1)).toBe(true)
    })

    it('should allow admin to transfer students in their hierarchy', () => {
      expect(canTransferStudent(adminDaerah, studentInDaerah1)).toBe(true)
      expect(canTransferStudent(adminDaerah, studentInDifferentDaerah)).toBe(false)
    })

    it('should allow teacher WITH permission to transfer', () => {
      expect(canTransferStudent(teacherWithPermissions, studentInDaerah1)).toBe(true)
    })

    it('should deny teacher WITHOUT permission', () => {
      expect(canTransferStudent(teacherNoPermissions, studentInDaerah1)).toBe(false)
    })

    it('should deny student role', () => {
      expect(canTransferStudent(student, studentInDaerah1)).toBe(false)
    })
  })

  describe('canSoftDeleteStudent', () => {
    it('should allow superadmin to soft delete any student', () => {
      expect(canSoftDeleteStudent(superadmin, studentInDaerah1)).toBe(true)
    })

    it('should allow admin to soft delete students in their hierarchy', () => {
      expect(canSoftDeleteStudent(adminDaerah, studentInDaerah1)).toBe(true)
      expect(canSoftDeleteStudent(adminDaerah, studentInDifferentDaerah)).toBe(false)
    })

    it('should allow teacher WITH permission to soft delete', () => {
      expect(canSoftDeleteStudent(teacherWithPermissions, studentInDaerah1)).toBe(true)
    })

    it('should deny teacher WITHOUT permission', () => {
      expect(canSoftDeleteStudent(teacherNoPermissions, studentInDaerah1)).toBe(false)
    })

    it('should deny student role', () => {
      expect(canSoftDeleteStudent(student, studentInDaerah1)).toBe(false)
    })
  })

  describe('canHardDeleteStudent', () => {
    const deletedStudent: Student = {
      ...studentInDaerah1,
      deleted_at: '2025-01-01T00:00:00Z',
    }

    it('should allow ONLY superadmin to hard delete', () => {
      expect(canHardDeleteStudent(superadmin, deletedStudent)).toBe(true)
    })

    it('should deny admin from hard deleting', () => {
      expect(canHardDeleteStudent(adminDaerah, deletedStudent)).toBe(false)
      expect(canHardDeleteStudent(adminDesa, deletedStudent)).toBe(false)
      expect(canHardDeleteStudent(adminKelompok, deletedStudent)).toBe(false)
    })

    it('should deny teacher from hard deleting', () => {
      expect(canHardDeleteStudent(teacherWithPermissions, deletedStudent)).toBe(false)
    })

    it('should deny hard delete if student is not soft deleted first', () => {
      expect(canHardDeleteStudent(superadmin, studentInDaerah1)).toBe(false)
    })

    it('should deny student role', () => {
      expect(canHardDeleteStudent(student, deletedStudent)).toBe(false)
    })
  })

  describe('getTransferableDaerahIds', () => {
    it('should return all daerah IDs for superadmin', () => {
      const allDaerahIds = ['daerah-1', 'daerah-2', 'daerah-3']
      expect(getTransferableDaerahIds(superadmin, allDaerahIds)).toEqual(allDaerahIds)
    })

    it('should return only user daerah for admin daerah', () => {
      const allDaerahIds = ['daerah-1', 'daerah-2', 'daerah-3']
      expect(getTransferableDaerahIds(adminDaerah, allDaerahIds)).toEqual(['daerah-1'])
    })

    it('should return only user daerah for admin desa', () => {
      const allDaerahIds = ['daerah-1', 'daerah-2']
      expect(getTransferableDaerahIds(adminDesa, allDaerahIds)).toEqual(['daerah-1'])
    })

    it('should return empty array for teacher (cannot transfer across daerah)', () => {
      const allDaerahIds = ['daerah-1', 'daerah-2']
      expect(getTransferableDaerahIds(teacherWithPermissions, allDaerahIds)).toEqual([])
    })

    it('should return empty array for student', () => {
      expect(getTransferableDaerahIds(student, ['daerah-1'])).toEqual([])
    })
  })

  describe('getTransferableDesaIds', () => {
    it('should return all desa IDs in daerah for superadmin', () => {
      const allDesaIds = ['desa-1', 'desa-2', 'desa-3']
      expect(getTransferableDesaIds(superadmin, 'daerah-1', allDesaIds)).toEqual(allDesaIds)
    })

    it('should return all desa IDs in their daerah for admin daerah', () => {
      const allDesaIds = ['desa-1', 'desa-2', 'desa-3']
      expect(getTransferableDesaIds(adminDaerah, 'daerah-1', allDesaIds)).toEqual(allDesaIds)
    })

    it('should return only their desa for admin desa', () => {
      const allDesaIds = ['desa-1', 'desa-2', 'desa-3']
      expect(getTransferableDesaIds(adminDesa, 'daerah-1', allDesaIds)).toEqual(['desa-1'])
    })

    it('should return only their desa for admin kelompok', () => {
      const allDesaIds = ['desa-1', 'desa-2']
      expect(getTransferableDesaIds(adminKelompok, 'daerah-1', allDesaIds)).toEqual(['desa-1'])
    })

    it('should return empty array for teacher', () => {
      const allDesaIds = ['desa-1', 'desa-2']
      expect(getTransferableDesaIds(teacherWithPermissions, 'daerah-1', allDesaIds)).toEqual([])
    })
  })

  describe('getTransferableKelompokIds', () => {
    it('should return all kelompok IDs in desa for superadmin', () => {
      const allKelompokIds = ['kelompok-1', 'kelompok-2', 'kelompok-3']
      expect(getTransferableKelompokIds(superadmin, 'desa-1', allKelompokIds)).toEqual(allKelompokIds)
    })

    it('should return all kelompok IDs in their desa for admin desa', () => {
      const allKelompokIds = ['kelompok-1', 'kelompok-2', 'kelompok-3']
      expect(getTransferableKelompokIds(adminDesa, 'desa-1', allKelompokIds)).toEqual(allKelompokIds)
    })

    it('should return only their kelompok for admin kelompok', () => {
      const allKelompokIds = ['kelompok-1', 'kelompok-2', 'kelompok-3']
      expect(getTransferableKelompokIds(adminKelompok, 'desa-1', allKelompokIds)).toEqual(['kelompok-1'])
    })

    it('should return empty array for teacher', () => {
      const allKelompokIds = ['kelompok-1', 'kelompok-2']
      expect(getTransferableKelompokIds(teacherWithPermissions, 'desa-1', allKelompokIds)).toEqual([])
    })
  })

  // ========================================
  // APPROVAL-BASED TRANSFER WORKFLOW TESTS
  // ========================================

  describe('canRequestTransfer (Approval-Based)', () => {
    it('should allow superadmin to request transfer', () => {
      expect(canRequestTransfer(superadmin, studentInDaerah1)).toBe(true)
    })

    it('should allow admin to request transfer for students in their hierarchy', () => {
      expect(canRequestTransfer(adminDaerah, studentInDaerah1)).toBe(true)
      expect(canRequestTransfer(adminDaerah, studentInDifferentDaerah)).toBe(false)
    })

    it('should allow admin desa to request transfer', () => {
      expect(canRequestTransfer(adminDesa, studentInDaerah1)).toBe(true)
    })

    it('should allow admin kelompok to request transfer', () => {
      expect(canRequestTransfer(adminKelompok, studentInDaerah1)).toBe(true)
    })

    it('should allow teacher WITH permission to request transfer', () => {
      expect(canRequestTransfer(teacherWithPermissions, studentInDaerah1)).toBe(true)
    })

    it('should deny teacher WITHOUT permission', () => {
      expect(canRequestTransfer(teacherNoPermissions, studentInDaerah1)).toBe(false)
    })

    it('should deny student role', () => {
      expect(canRequestTransfer(student, studentInDaerah1)).toBe(false)
    })

    it('should handle null user', () => {
      expect(canRequestTransfer(null, studentInDaerah1)).toBe(false)
    })
  })

  describe('canReviewTransferRequest', () => {
    const requestToDaerah1: TransferRequest = {
      id: 'req-1',
      student_ids: ['student-a'],
      from_daerah_id: 'daerah-2',
      from_desa_id: 'desa-2',
      from_kelompok_id: 'kelompok-2',
      to_daerah_id: 'daerah-1',
      to_desa_id: 'desa-1',
      to_kelompok_id: 'kelompok-1',
      status: 'pending',
      requested_by: 'admin-2',
      requested_at: '2025-01-01',
    }

    const requestToDifferentDaerah: TransferRequest = {
      ...requestToDaerah1,
      to_daerah_id: 'daerah-2',
      to_desa_id: 'desa-2',
      to_kelompok_id: 'kelompok-2',
    }

    it('should allow superadmin to review any request', () => {
      expect(canReviewTransferRequest(superadmin, requestToDaerah1)).toBe(true)
      expect(canReviewTransferRequest(superadmin, requestToDifferentDaerah)).toBe(true)
    })

    it('should allow admin daerah to review requests targeting their daerah', () => {
      expect(canReviewTransferRequest(adminDaerah, requestToDaerah1)).toBe(true)
      expect(canReviewTransferRequest(adminDaerah, requestToDifferentDaerah)).toBe(false)
    })

    it('should allow admin desa to review requests targeting their desa', () => {
      expect(canReviewTransferRequest(adminDesa, requestToDaerah1)).toBe(true)
    })

    it('should allow admin kelompok to review requests targeting their kelompok', () => {
      expect(canReviewTransferRequest(adminKelompok, requestToDaerah1)).toBe(true)
    })

    it('should deny teacher from reviewing (admin-only)', () => {
      expect(canReviewTransferRequest(teacherWithPermissions, requestToDaerah1)).toBe(false)
    })

    it('should deny student from reviewing', () => {
      expect(canReviewTransferRequest(student, requestToDaerah1)).toBe(false)
    })

    it('should handle null user', () => {
      expect(canReviewTransferRequest(null, requestToDaerah1)).toBe(false)
    })
  })

  describe('needsApproval', () => {
    it('should NOT need approval for superadmin transfers', () => {
      const request: TransferRequest = {
        id: 'req-1',
        student_ids: ['student-a'],
        from_daerah_id: 'daerah-1',
        from_desa_id: 'desa-1',
        from_kelompok_id: 'kelompok-1',
        to_daerah_id: 'daerah-2',
        to_desa_id: 'desa-2',
        to_kelompok_id: 'kelompok-2',
        status: 'pending',
        requested_by: 'superadmin-1',
        requested_at: '2025-01-01',
      }
      expect(needsApproval(superadmin, request)).toBe(false)
    })

    it('should need approval when crossing daerah boundary', () => {
      const request: TransferRequest = {
        id: 'req-1',
        student_ids: ['student-a'],
        from_daerah_id: 'daerah-1',
        from_desa_id: 'desa-1',
        from_kelompok_id: 'kelompok-1',
        to_daerah_id: 'daerah-2', // Different daerah
        to_desa_id: 'desa-2',
        to_kelompok_id: 'kelompok-2',
        status: 'pending',
        requested_by: 'admin-daerah-1',
        requested_at: '2025-01-01',
      }
      expect(needsApproval(adminDaerah, request)).toBe(true)
    })

    it('should need approval when crossing desa boundary', () => {
      const request: TransferRequest = {
        id: 'req-1',
        student_ids: ['student-a'],
        from_daerah_id: 'daerah-1',
        from_desa_id: 'desa-1',
        from_kelompok_id: 'kelompok-1',
        to_daerah_id: 'daerah-1', // Same daerah
        to_desa_id: 'desa-2', // Different desa
        to_kelompok_id: 'kelompok-2',
        status: 'pending',
        requested_by: 'admin-desa-1',
        requested_at: '2025-01-01',
      }
      expect(needsApproval(adminDesa, request)).toBe(true)
    })

    it('should need approval when crossing kelompok boundary', () => {
      const request: TransferRequest = {
        id: 'req-1',
        student_ids: ['student-a'],
        from_daerah_id: 'daerah-1',
        from_desa_id: 'desa-1',
        from_kelompok_id: 'kelompok-1',
        to_daerah_id: 'daerah-1',
        to_desa_id: 'desa-1',
        to_kelompok_id: 'kelompok-2', // Different kelompok
        status: 'pending',
        requested_by: 'admin-kelompok-1',
        requested_at: '2025-01-01',
      }
      expect(needsApproval(adminKelompok, request)).toBe(true)
    })

    it('should NOT need approval for transfer within same organization', () => {
      const request: TransferRequest = {
        id: 'req-1',
        student_ids: ['student-a'],
        from_daerah_id: 'daerah-1',
        from_desa_id: 'desa-1',
        from_kelompok_id: 'kelompok-1',
        to_daerah_id: 'daerah-1', // Same daerah
        to_desa_id: 'desa-1', // Same desa
        to_kelompok_id: 'kelompok-1', // Same kelompok (class change only)
        status: 'pending',
        requested_by: 'admin-kelompok-1',
        requested_at: '2025-01-01',
      }
      expect(needsApproval(adminKelompok, request)).toBe(false)
    })
  })

  describe('isOrganizationInUserHierarchy', () => {
    it('should return true for superadmin (any org)', () => {
      expect(
        isOrganizationInUserHierarchy(superadmin, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-1',
          kelompok_id: 'kelompok-1',
        })
      ).toBe(true)
      expect(
        isOrganizationInUserHierarchy(superadmin, {
          daerah_id: 'daerah-2',
          desa_id: 'desa-2',
          kelompok_id: 'kelompok-2',
        })
      ).toBe(true)
    })

    it('should return true for admin daerah if org in their daerah', () => {
      expect(
        isOrganizationInUserHierarchy(adminDaerah, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-1',
          kelompok_id: 'kelompok-1',
        })
      ).toBe(true)
      expect(
        isOrganizationInUserHierarchy(adminDaerah, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-2', // Different desa, but same daerah
          kelompok_id: 'kelompok-2',
        })
      ).toBe(true)
    })

    it('should return false for admin daerah if org in different daerah', () => {
      expect(
        isOrganizationInUserHierarchy(adminDaerah, {
          daerah_id: 'daerah-2',
          desa_id: 'desa-2',
          kelompok_id: 'kelompok-2',
        })
      ).toBe(false)
    })

    it('should return true for admin desa if org in their desa', () => {
      expect(
        isOrganizationInUserHierarchy(adminDesa, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-1',
          kelompok_id: 'kelompok-1',
        })
      ).toBe(true)
    })

    it('should return false for admin desa if org in different desa', () => {
      expect(
        isOrganizationInUserHierarchy(adminDesa, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-2', // Different desa
          kelompok_id: 'kelompok-2',
        })
      ).toBe(false)
    })

    it('should return true for admin kelompok if org is their kelompok', () => {
      expect(
        isOrganizationInUserHierarchy(adminKelompok, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-1',
          kelompok_id: 'kelompok-1',
        })
      ).toBe(true)
    })

    it('should return false for admin kelompok if org is different kelompok', () => {
      expect(
        isOrganizationInUserHierarchy(adminKelompok, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-1',
          kelompok_id: 'kelompok-2', // Different kelompok
        })
      ).toBe(false)
    })

    it('should return false for teacher (no org hierarchy)', () => {
      expect(
        isOrganizationInUserHierarchy(teacherWithPermissions, {
          daerah_id: 'daerah-1',
          desa_id: 'desa-1',
          kelompok_id: 'kelompok-1',
        })
      ).toBe(false)
    })
  })
})
