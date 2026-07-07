import { describe, it, expect } from 'vitest'
import {
  modalShouldShowDesaFilter,
  modalShouldShowKelompokFilter,
  canAccessMaterials,
  canManageCheckTime,
  canAccessMonitoring,
  canAccessOverview,
  canTeacherAccessStudent,
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

describe('canAccessMaterials', () => {
    it('returns true for superadmin', () => {
        expect(canAccessMaterials({ role: 'superadmin' } as any)).toBe(true)
    })
    it('returns true for admin', () => {
        expect(canAccessMaterials({ role: 'admin' } as any)).toBe(true)
    })
    it('returns true if can_manage_materials is true (superset)', () => {
        expect(canAccessMaterials({
            role: 'teacher',
            permissions: { can_manage_materials: true }
        } as any)).toBe(true)
    })
    it('returns true if can_access_materials is true', () => {
        expect(canAccessMaterials({
            role: 'teacher',
            permissions: { can_access_materials: true }
        } as any)).toBe(true)
    })
    it('returns false if teacher has no permissions', () => {
        expect(canAccessMaterials({ role: 'teacher', permissions: {} } as any)).toBe(false)
    })
})

describe('canManageCheckTime', () => {
    it('returns true for superadmin', () => {
        expect(canManageCheckTime({ role: 'superadmin' } as any)).toBe(true)
    })
    it('returns true for admin', () => {
        expect(canManageCheckTime({ role: 'admin' } as any)).toBe(true)
    })
    it('returns true if can_manage_check_time is true', () => {
        expect(canManageCheckTime({
            role: 'teacher',
            permissions: { can_manage_check_time: true }
        } as any)).toBe(true)
    })
    it('returns false if teacher has no permissions', () => {
        expect(canManageCheckTime({ role: 'teacher', permissions: {} } as any)).toBe(false)
    })
    it('returns false for null profile', () => {
        expect(canManageCheckTime(null)).toBe(false)
    })
})

describe('canAccessMonitoring', () => {
    it('returns true for superadmin', () => {
        expect(canAccessMonitoring({ role: 'superadmin' } as any)).toBe(true)
    })
    it('returns true if can_access_monitoring is true', () => {
        expect(canAccessMonitoring({
            role: 'teacher',
            permissions: { can_access_monitoring: true }
        } as any)).toBe(true)
    })
    it('returns false if teacher has no permissions', () => {
        expect(canAccessMonitoring({ role: 'teacher', permissions: {} } as any)).toBe(false)
    })
})

describe('canAccessOverview', () => {
  it('returns true for superadmin', () => {
    expect(canAccessOverview({ role: 'superadmin' } as UserProfile)).toBe(true)
  })
  it('returns true for admin', () => {
    expect(canAccessOverview({ role: 'admin' } as UserProfile)).toBe(true)
  })
  it('returns true for teacher', () => {
    expect(canAccessOverview({ role: 'teacher' } as UserProfile)).toBe(true)
  })
  it('returns false for null profile', () => {
    expect(canAccessOverview(null)).toBe(false)
  })
  it('returns false for student role', () => {
    expect(canAccessOverview({ role: 'student' } as UserProfile)).toBe(false)
  })
})

describe('canTeacherAccessStudent — multi-kelompok teacher', () => {
    const multiKelompokTeacher: UserProfile = {
        id: 'mt1',
        full_name: 'Guru Multi Kelompok',
        role: 'teacher',
        daerah_id: 'da1',
        desa_id: 'd1',
        kelompok_id: null, // null karena lintas kelompok
        classes: [
            { id: 'class-k1', name: 'Kelas 1 Kelompok A' },
            { id: 'class-k2', name: 'Kelas 1 Kelompok B' },
        ],
        permissions: { can_archive_students: true },
    }

    it('returns true for student in one of teacher classes (via classes[])', () => {
        const student = {
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'kA',
            classes: [{ id: 'class-k1' }],
        }
        expect(canTeacherAccessStudent(multiKelompokTeacher, student)).toBe(true)
    })

    it('returns false for student not in any of teacher classes', () => {
        const student = {
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'kC',
            classes: [{ id: 'class-k3' }],
        }
        expect(canTeacherAccessStudent(multiKelompokTeacher, student)).toBe(false)
    })

    it('returns true for student with matching class_id', () => {
        const student = {
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'kA',
            class_id: 'class-k1',
        }
        expect(canTeacherAccessStudent(multiKelompokTeacher, student)).toBe(true)
    })
})
