import { describe, it, expect } from 'vitest'
import {
  detectRole,
  filterDesaList,
  filterKelompokList,
  filterClassList,
  deduplicateClasses,
} from '../dataFilterHelpers'

// --- Mock data ---
const mockUserSuperAdmin = {
  role: 'superadmin' as const,
  id: 'user-super',
  full_name: 'Super Admin',
  daerah_id: null,
  desa_id: null,
  kelompok_id: null,
  classes: [],
}
const mockUserAdminDaerah = {
  role: 'admin' as const,
  id: 'user-daerah',
  full_name: 'Admin Daerah',
  daerah_id: 'daerah-1',
  desa_id: null,
  kelompok_id: null,
  classes: [],
}
const mockUserAdminDesa = {
  role: 'admin' as const,
  id: 'user-desa',
  full_name: 'Admin Desa',
  daerah_id: 'daerah-1',
  desa_id: 'desa-1',
  kelompok_id: null,
  classes: [],
}
const mockUserAdminKelompok = {
  role: 'admin' as const,
  id: 'user-kelompok',
  full_name: 'Admin Kelompok',
  daerah_id: 'daerah-1',
  desa_id: 'desa-1',
  kelompok_id: 'kelompok-1',
  classes: [],
}
const mockDaerahList = [
  { id: 'daerah-1', name: 'Daerah 1' },
  { id: 'daerah-2', name: 'Daerah 2' },
]
const mockDesaList = [
  { id: 'desa-1', name: 'Desa 1', daerah_id: 'daerah-1' },
  { id: 'desa-2', name: 'Desa 2', daerah_id: 'daerah-1' },
  { id: 'desa-3', name: 'Desa 3', daerah_id: 'daerah-2' },
]
const mockKelompokList = [
  { id: 'kelompok-1', name: 'Kelompok 1', desa_id: 'desa-1' },
  { id: 'kelompok-2', name: 'Kelompok 2', desa_id: 'desa-1' },
  { id: 'kelompok-3', name: 'Kelompok 3', desa_id: 'desa-3' }, // desa-3 is in daerah-2
]
const mockClassList = [
  { id: 'cls-1', name: 'Remaja', kelompok_id: 'kelompok-1' },
  { id: 'cls-2', name: 'Remaja', kelompok_id: 'kelompok-2' },
  { id: 'cls-3', name: 'Pemuda', kelompok_id: 'kelompok-1' },
]
const emptyFilters = { daerah: [], desa: [], kelompok: [], kelas: [] }

// --- detectRole ---

describe('detectRole', () => {
  it('detects superadmin', () => {
    const role = detectRole(mockUserSuperAdmin)
    expect(role.isSuperAdmin).toBe(true)
    expect(role.isAdminDaerah).toBe(false)
  })

  it('detects admin daerah', () => {
    const role = detectRole(mockUserAdminDaerah)
    expect(role.isAdminDaerah).toBe(true)
    expect(role.isSuperAdmin).toBe(false)
  })

  it('detects admin desa', () => {
    const role = detectRole(mockUserAdminDesa)
    expect(role.isAdminDesa).toBe(true)
    expect(role.isAdminDaerah).toBe(false)
  })

  it('detects admin kelompok', () => {
    const role = detectRole(mockUserAdminKelompok)
    expect(role.isAdminKelompok).toBe(true)
  })

  it('returns all false for null user', () => {
    const role = detectRole(null)
    expect(role.isSuperAdmin).toBe(false)
    expect(role.isAdminDaerah).toBe(false)
    expect(role.isTeacher).toBe(false)
  })

  it('detects teacher', () => {
    const user = { ...mockUserAdminKelompok, role: 'teacher' as const }
    const role = detectRole(user)
    expect(role.isTeacher).toBe(true)
    expect(role.isAdmin).toBe(false)
    expect(role.isTeacherKelompok).toBe(true)
  })
})

// --- filterDesaList ---

describe('filterDesaList', () => {
  it('returns all desa for superadmin with no daerah filter', () => {
    const result = filterDesaList({
      desaList: mockDesaList,
      filters: emptyFilters,
      userProfile: mockUserSuperAdmin,
      role: detectRole(mockUserSuperAdmin),
      cascadeFilters: true,
    })
    expect(result).toHaveLength(3)
  })

  it('filters desa by selected daerah for superadmin', () => {
    const result = filterDesaList({
      desaList: mockDesaList,
      filters: { ...emptyFilters, daerah: ['daerah-1'] },
      userProfile: mockUserSuperAdmin,
      role: detectRole(mockUserSuperAdmin),
      cascadeFilters: true,
    })
    expect(result).toHaveLength(2)
    expect(result.every(d => d.daerah_id === 'daerah-1')).toBe(true)
  })

  it('filters desa by own daerah_id for admin daerah', () => {
    const result = filterDesaList({
      desaList: mockDesaList,
      filters: emptyFilters,
      userProfile: mockUserAdminDaerah,
      role: detectRole(mockUserAdminDaerah),
      cascadeFilters: true,
    })
    expect(result.every(d => d.daerah_id === 'daerah-1')).toBe(true)
  })

  it('returns empty array when desaList is empty', () => {
    const result = filterDesaList({
      desaList: [],
      filters: emptyFilters,
      userProfile: mockUserSuperAdmin,
      role: detectRole(mockUserSuperAdmin),
      cascadeFilters: true,
    })
    expect(result).toHaveLength(0)
  })

  it('returns own daerah desa in independent mode for admin daerah', () => {
    const result = filterDesaList({
      desaList: mockDesaList,
      filters: emptyFilters,
      userProfile: mockUserAdminDaerah,
      role: detectRole(mockUserAdminDaerah),
      cascadeFilters: false,
    })
    expect(result.every(d => d.daerah_id === 'daerah-1')).toBe(true)
    expect(result).toHaveLength(2)
  })
})

// --- filterKelompokList ---

describe('filterKelompokList', () => {
  it('returns all kelompok for superadmin with no filters', () => {
    const result = filterKelompokList({
      kelompokList: mockKelompokList,
      desaList: mockDesaList,
      filters: emptyFilters,
      userProfile: mockUserSuperAdmin,
      role: detectRole(mockUserSuperAdmin),
      cascadeFilters: true,
    })
    expect(result).toHaveLength(3)
  })

  it('filters kelompok by selected desa for superadmin', () => {
    const result = filterKelompokList({
      kelompokList: mockKelompokList,
      desaList: mockDesaList,
      filters: { ...emptyFilters, desa: ['desa-1'] },
      userProfile: mockUserSuperAdmin,
      role: detectRole(mockUserSuperAdmin),
      cascadeFilters: true,
    })
    expect(result).toHaveLength(2)
  })

  it('limits kelompok to own desa for admin desa', () => {
    const result = filterKelompokList({
      kelompokList: mockKelompokList,
      desaList: mockDesaList,
      filters: emptyFilters,
      userProfile: mockUserAdminDesa,
      role: detectRole(mockUserAdminDesa),
      cascadeFilters: true,
    })
    expect(result.every(k => k.desa_id === 'desa-1')).toBe(true)
  })

  it('returns all kelompok in cascade=false for superadmin', () => {
    const result = filterKelompokList({
      kelompokList: mockKelompokList,
      desaList: mockDesaList,
      filters: emptyFilters,
      userProfile: mockUserSuperAdmin,
      role: detectRole(mockUserSuperAdmin),
      cascadeFilters: false,
    })
    expect(result).toHaveLength(3)
  })

  it('filters kelompok by daerah cascade for superadmin', () => {
    const result = filterKelompokList({
      kelompokList: mockKelompokList,
      desaList: mockDesaList,
      filters: { ...emptyFilters, daerah: ['daerah-2'] },
      userProfile: mockUserSuperAdmin,
      role: detectRole(mockUserSuperAdmin),
      cascadeFilters: true,
    })
    // daerah-2 has desa-3, kelompok-3 is in desa-3
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('kelompok-3')
  })
})

// --- filterClassList ---

describe('filterClassList', () => {
  it('returns empty when showKelasFilter is false (classList empty input)', () => {
    // filterClassList receives already-filtered classList; empty means no filter applied
    const result = filterClassList({
      classList: [],
      filters: emptyFilters,
      filteredKelompokList: mockKelompokList,
      role: detectRole(mockUserSuperAdmin),
      userProfile: mockUserSuperAdmin,
      cascadeFilters: true,
    })
    expect(result).toHaveLength(0)
  })

  it('returns classes for selected kelompok', () => {
    const result = filterClassList({
      classList: mockClassList,
      filters: { ...emptyFilters, kelompok: ['kelompok-1'] },
      filteredKelompokList: mockKelompokList,
      role: detectRole(mockUserSuperAdmin),
      userProfile: mockUserSuperAdmin,
      cascadeFilters: true,
    })
    // kelompok-1 has cls-1 (Remaja) and cls-3 (Pemuda)
    expect(result).toHaveLength(2)
    expect(result.every(c => c.kelompok_id === 'kelompok-1')).toBe(true)
  })

  it('filters classes by filteredKelompokList for admin daerah', () => {
    const kelompokInDaerah1 = mockKelompokList.filter(k => ['kelompok-1', 'kelompok-2'].includes(k.id))
    const result = filterClassList({
      classList: mockClassList,
      filters: emptyFilters,
      filteredKelompokList: kelompokInDaerah1,
      role: detectRole(mockUserAdminDaerah),
      userProfile: mockUserAdminDaerah,
      cascadeFilters: true,
    })
    expect(result).toHaveLength(3) // all 3 classes in kelompok-1 and kelompok-2
  })

  it('restricts classes to own kelompok for admin kelompok', () => {
    const result = filterClassList({
      classList: mockClassList,
      filters: emptyFilters,
      filteredKelompokList: [{ id: 'kelompok-1', name: 'Kelompok 1', desa_id: 'desa-1' }],
      role: detectRole(mockUserAdminKelompok),
      userProfile: mockUserAdminKelompok,
      cascadeFilters: true,
    })
    // Admin kelompok-1 should see cls-1 and cls-3 (both in kelompok-1), not cls-2 (kelompok-2)
    expect(result.every(c => !c.kelompok_id || c.kelompok_id === 'kelompok-1')).toBe(true)
    expect(result).toHaveLength(2)
  })
})

// --- deduplicateClasses ---

describe('deduplicateClasses', () => {
  it('returns unique class options when 1 kelompok selected', () => {
    const classes = [
      { id: 'cls-1', name: 'Remaja', kelompok_id: 'kelompok-1' },
      { id: 'cls-3', name: 'Pemuda', kelompok_id: 'kelompok-1' },
    ]
    const result = deduplicateClasses(classes, 1)
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('Remaja')
  })

  it('groups same-named classes with (N kelompok) suffix when 2+ kelompok selected', () => {
    const result = deduplicateClasses(mockClassList, 2)
    const remajaOption = result.find(o => o.name === 'Remaja')
    expect(remajaOption).toBeDefined()
    expect(remajaOption?.label).toBe('Remaja (2 kelompok)')
    expect(remajaOption?.value).toContain(',') // combined IDs
  })

  it('returns empty array for empty input', () => {
    const result = deduplicateClasses([], 0)
    expect(result).toHaveLength(0)
  })

  it('does not add suffix when all classes are from 1 kelompok even with 2 selected', () => {
    const singleKelompokClasses = [
      { id: 'cls-1', name: 'Remaja', kelompok_id: 'kelompok-1' },
      { id: 'cls-2', name: 'Remaja', kelompok_id: 'kelompok-1' },
    ]
    const result = deduplicateClasses(singleKelompokClasses, 2)
    const remajaOption = result.find(o => o.name === 'Remaja')
    // Only 1 unique kelompok, so no suffix
    expect(remajaOption?.label).toBe('Remaja')
  })

  it('returns single class per name in single-kelompok mode (deduplication)', () => {
    const duplicates = [
      { id: 'cls-1', name: 'Remaja', kelompok_id: 'kelompok-1' },
      { id: 'cls-2', name: 'Remaja', kelompok_id: 'kelompok-1' },
      { id: 'cls-3', name: 'Pemuda', kelompok_id: 'kelompok-1' },
    ]
    const result = deduplicateClasses(duplicates, 1)
    expect(result).toHaveLength(2) // Remaja deduplicated
    const remajaOption = result.find(o => o.name === 'Remaja')
    expect(remajaOption?.ids).toHaveLength(1)
  })
})
