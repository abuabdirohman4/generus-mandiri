import { describe, it, expect } from 'vitest'
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent,
  type UserProfile,
  type StudentWithOrg
} from '@/lib/studentPermissions'

describe('Teacher Permissions by Scope', () => {
  const teacherDesaWithPerms: UserProfile = {
    id: '1',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: null,
    full_name: 'Teacher Desa',
    permissions: {
      can_archive_students: true,
      can_transfer_students: true,
      can_soft_delete_students: false,
      can_hard_delete_students: false
    }
  }

  const teacherDesaNoPerms: UserProfile = {
    id: '2',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: null,
    full_name: 'Teacher Desa No Perms',
    permissions: {
      can_archive_students: false,
      can_transfer_students: false,
      can_soft_delete_students: false,
      can_hard_delete_students: false
    }
  }

  const studentInDesa: StudentWithOrg = {
    id: 's1',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: 'k1',
    name: 'Student 1',
    gender: 'Laki-laki',
    status: 'active'
  }

  const studentOutsideDesa: StudentWithOrg = {
    id: 's2',
    daerah_id: 'd1',
    desa_id: 'ds2',
    kelompok_id: 'k2',
    name: 'Student 2',
    gender: 'Laki-laki',
    status: 'active'
  }

  describe('canArchiveStudent', () => {
    it('should allow teacher desa with permission to archive student in their desa', () => {
      expect(canArchiveStudent(teacherDesaWithPerms, studentInDesa)).toBe(true)
    })

    it('should deny teacher desa from archiving student outside their desa', () => {
      expect(canArchiveStudent(teacherDesaWithPerms, studentOutsideDesa)).toBe(false)
    })

    it('should deny teacher without permission', () => {
      expect(canArchiveStudent(teacherDesaNoPerms, studentInDesa)).toBe(false)
    })
  })

  describe('canTransferStudent', () => {
    it('should allow teacher desa with permission to transfer student in their desa', () => {
      expect(canTransferStudent(teacherDesaWithPerms, studentInDesa)).toBe(true)
    })

    it('should deny teacher desa from transferring student outside their desa', () => {
      expect(canTransferStudent(teacherDesaWithPerms, studentOutsideDesa)).toBe(false)
    })

    it('should deny teacher without permission', () => {
      expect(canTransferStudent(teacherDesaNoPerms, studentInDesa)).toBe(false)
    })
  })

  describe('canSoftDeleteStudent', () => {
    it('should deny teacher desa without permission', () => {
      expect(canSoftDeleteStudent(teacherDesaWithPerms, studentInDesa)).toBe(false)
    })
  })

  describe('canHardDeleteStudent', () => {
    it('should deny teacher desa without permission', () => {
      expect(canHardDeleteStudent(teacherDesaWithPerms, studentInDesa)).toBe(false)
    })
  })
})
