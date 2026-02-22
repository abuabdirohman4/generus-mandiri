import { describe, it, expect } from 'vitest'
import {
  isTeacherKelompok,
  isTeacherDesa,
  isTeacherDaerah,
  getTeacherScope,
  canTeacherAccessStudent,
  type UserProfile
} from '@/lib/accessControl'

describe('Teacher Level Detection', () => {
  const teacherKelompok: UserProfile = {
    id: '1',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: 'k1',
    full_name: 'Teacher Kelompok',
    email: 'teacher.kelompok@test.com'
  }

  const teacherDesa: UserProfile = {
    id: '2',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: null,
    full_name: 'Teacher Desa',
    email: 'teacher.desa@test.com'
  }

  const teacherDaerah: UserProfile = {
    id: '3',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: null,
    kelompok_id: null,
    full_name: 'Teacher Daerah',
    email: 'teacher.daerah@test.com'
  }

  describe('isTeacherKelompok', () => {
    it('should return true for teacher with kelompok_id', () => {
      expect(isTeacherKelompok(teacherKelompok)).toBe(true)
    })

    it('should return false for teacher desa', () => {
      expect(isTeacherKelompok(teacherDesa)).toBe(false)
    })

    it('should return false for teacher daerah', () => {
      expect(isTeacherKelompok(teacherDaerah)).toBe(false)
    })

    it('should return false for non-teacher', () => {
      expect(isTeacherKelompok({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(false)
    })
  })

  describe('isTeacherDesa', () => {
    it('should return true for teacher with desa_id but no kelompok_id', () => {
      expect(isTeacherDesa(teacherDesa)).toBe(true)
    })

    it('should return false for teacher kelompok', () => {
      expect(isTeacherDesa(teacherKelompok)).toBe(false)
    })

    it('should return false for teacher daerah', () => {
      expect(isTeacherDesa(teacherDaerah)).toBe(false)
    })

    it('should return false for non-teacher', () => {
      expect(isTeacherDesa({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(false)
    })
  })

  describe('isTeacherDaerah', () => {
    it('should return true for teacher with only daerah_id', () => {
      expect(isTeacherDaerah(teacherDaerah)).toBe(true)
    })

    it('should return false for teacher desa', () => {
      expect(isTeacherDaerah(teacherDesa)).toBe(false)
    })

    it('should return false for teacher kelompok', () => {
      expect(isTeacherDaerah(teacherKelompok)).toBe(false)
    })

    it('should return false for non-teacher', () => {
      expect(isTeacherDaerah({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(false)
    })
  })

  describe('getTeacherScope', () => {
    it('should return "kelompok" for teacher kelompok', () => {
      expect(getTeacherScope(teacherKelompok)).toBe('kelompok')
    })

    it('should return "desa" for teacher desa', () => {
      expect(getTeacherScope(teacherDesa)).toBe('desa')
    })

    it('should return "daerah" for teacher daerah', () => {
      expect(getTeacherScope(teacherDaerah)).toBe('daerah')
    })

    it('should return null for non-teacher', () => {
      expect(getTeacherScope({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(null)
    })
  })

  describe('canTeacherAccessStudent', () => {
    const teacherKelompok: UserProfile = {
      id: '1',
      role: 'teacher',
      daerah_id: 'd1',
      desa_id: 'ds1',
      kelompok_id: 'k1',
      full_name: 'Teacher Kelompok',
      email: 'teacher.k@test.com'
    }

    const teacherDesa: UserProfile = {
      id: '2',
      role: 'teacher',
      daerah_id: 'd1',
      desa_id: 'ds1',
      kelompok_id: null,
      full_name: 'Teacher Desa',
      email: 'teacher.ds@test.com'
    }

    const teacherDaerah: UserProfile = {
      id: '3',
      role: 'teacher',
      daerah_id: 'd1',
      desa_id: null,
      kelompok_id: null,
      full_name: 'Teacher Daerah',
      email: 'teacher.d@test.com'
    }

    const student = {
      id: 's1',
      daerah_id: 'd1',
      desa_id: 'ds1',
      kelompok_id: 'k1'
    }

    it('should allow teacher kelompok to access student in their kelompok', () => {
      expect(canTeacherAccessStudent(teacherKelompok, student)).toBe(true)
    })

    it('should deny teacher kelompok access to student in different kelompok', () => {
      const otherStudent = { ...student, kelompok_id: 'k2' }
      expect(canTeacherAccessStudent(teacherKelompok, otherStudent)).toBe(false)
    })

    it('should allow teacher desa to access all students in their desa', () => {
      expect(canTeacherAccessStudent(teacherDesa, student)).toBe(true)
      const studentK2 = { ...student, kelompok_id: 'k2' }
      expect(canTeacherAccessStudent(teacherDesa, studentK2)).toBe(true)
    })

    it('should deny teacher desa access to student in different desa', () => {
      const otherStudent = { ...student, desa_id: 'ds2' }
      expect(canTeacherAccessStudent(teacherDesa, otherStudent)).toBe(false)
    })

    it('should allow teacher daerah to access all students in their daerah', () => {
      expect(canTeacherAccessStudent(teacherDaerah, student)).toBe(true)
      const studentDs2 = { ...student, desa_id: 'ds2' }
      expect(canTeacherAccessStudent(teacherDaerah, studentDs2)).toBe(true)
    })

    it('should deny teacher daerah access to student in different daerah', () => {
      const otherStudent = { ...student, daerah_id: 'd2' }
      expect(canTeacherAccessStudent(teacherDaerah, otherStudent)).toBe(false)
    })

    it('should deny non-teacher access', () => {
      const admin = { id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' }
      expect(canTeacherAccessStudent(admin, student)).toBe(false)
    })
  })
})
