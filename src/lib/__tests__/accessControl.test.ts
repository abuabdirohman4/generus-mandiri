import { describe, it, expect } from 'vitest'
import {
  modalShouldShowDesaFilter,
  modalShouldShowKelompokFilter,
  type UserProfile
} from '@/lib/accessControl'

// Helper factories for each role
function makeSuperAdmin(): UserProfile {
  return { id: '1', full_name: 'Super', role: 'superadmin', email: 'superadmin@test.com' }
}

function makeAdminDaerah(): UserProfile {
  return { id: '2', full_name: 'Admin Daerah', role: 'admin', daerah_id: 'd1', email: 'admin.daerah@test.com' }
}

function makeAdminDesa(): UserProfile {
  return { id: '3', full_name: 'Admin Desa', role: 'admin', daerah_id: 'd1', desa_id: 'v1', email: 'admin.desa@test.com' }
}

function makeAdminKelompok(): UserProfile {
  return { id: '4', full_name: 'Admin Kelompok', role: 'admin', daerah_id: 'd1', desa_id: 'v1', kelompok_id: 'k1', email: 'admin.kelompok@test.com' }
}

function makeTeacherDaerah(): UserProfile {
  return { id: '5', full_name: 'Teacher Daerah', role: 'teacher', daerah_id: 'd1', email: 'teacher.daerah@test.com' }
}

function makeTeacherDesa(): UserProfile {
  return { id: '6', full_name: 'Teacher Desa', role: 'teacher', daerah_id: 'd1', desa_id: 'v1', email: 'teacher.desa@test.com' }
}

function makeTeacherKelompok(): UserProfile {
  return { id: '7', full_name: 'Teacher Kelompok', role: 'teacher', daerah_id: 'd1', desa_id: 'v1', kelompok_id: 'k1', email: 'teacher.kelompok@test.com' }
}

describe('modalShouldShowDesaFilter', () => {
  it('returns true for superadmin', () => {
    expect(modalShouldShowDesaFilter(makeSuperAdmin())).toBe(true)
  })

  it('returns true for adminDaerah', () => {
    expect(modalShouldShowDesaFilter(makeAdminDaerah())).toBe(true)
  })

  it('returns false for adminDesa', () => {
    expect(modalShouldShowDesaFilter(makeAdminDesa())).toBe(false)
  })

  it('returns false for adminKelompok', () => {
    expect(modalShouldShowDesaFilter(makeAdminKelompok())).toBe(false)
  })

  it('returns true for teacherDaerah', () => {
    expect(modalShouldShowDesaFilter(makeTeacherDaerah())).toBe(true)
  })

  it('returns false for teacherDesa', () => {
    expect(modalShouldShowDesaFilter(makeTeacherDesa())).toBe(false)
  })

  it('returns false for teacherKelompok', () => {
    expect(modalShouldShowDesaFilter(makeTeacherKelompok())).toBe(false)
  })
})

describe('modalShouldShowKelompokFilter', () => {
  it('returns true for superadmin', () => {
    expect(modalShouldShowKelompokFilter(makeSuperAdmin())).toBe(true)
  })

  it('returns true for adminDaerah', () => {
    expect(modalShouldShowKelompokFilter(makeAdminDaerah())).toBe(true)
  })

  it('returns true for adminDesa', () => {
    expect(modalShouldShowKelompokFilter(makeAdminDesa())).toBe(true)
  })

  it('returns false for adminKelompok', () => {
    expect(modalShouldShowKelompokFilter(makeAdminKelompok())).toBe(false)
  })

  it('returns true for teacherDaerah', () => {
    expect(modalShouldShowKelompokFilter(makeTeacherDaerah())).toBe(true)
  })

  it('returns true for teacherDesa', () => {
    expect(modalShouldShowKelompokFilter(makeTeacherDesa())).toBe(true)
  })

  it('returns false for teacherKelompok', () => {
    expect(modalShouldShowKelompokFilter(makeTeacherKelompok())).toBe(false)
  })
})
