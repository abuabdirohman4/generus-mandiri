/**
 * DataFilter Pure Logic Helpers
 *
 * Extracted pure functions from DataFilter.tsx for unit-testability.
 * These functions mirror the useMemo logic in the component without React dependencies.
 */

import type { Class } from '@/types/class'
import type { DesaBase, KelompokBase } from '@/types/organization'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface DataFilters {
  daerah: string[]
  desa: string[]
  kelompok: string[]
  kelas: string[]
  gender?: string
  status?: string
  meetingType?: string[]
}

export interface RoleFlags {
  isSuperAdmin: boolean
  isAdminDaerah: boolean
  isAdminDesa: boolean
  isAdminKelompok: boolean
  isAdmin: boolean
  isTeacher: boolean
  isTeacherDaerah: boolean
  isTeacherDesa: boolean
  isTeacherKelompok: boolean
}

type MinimalProfile = {
  role: string
  daerah_id?: string | null
  desa_id?: string | null
  kelompok_id?: string | null
  classes?: Array<{ id: string; kelompok_id?: string | null; kelompok?: { id: string; name: string } | null }>
} | null

// ─── Role Detection ───────────────────────────────────────────────────────────

/**
 * Detects the role flags for a user profile.
 * Mirrors the role detection logic at the top of DataFilter.tsx.
 */
export function detectRole(userProfile: MinimalProfile): RoleFlags {
  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isAdminDaerah = userProfile?.role === 'admin' && !!userProfile?.daerah_id && !userProfile?.desa_id
  const isAdminDesa = userProfile?.role === 'admin' && !!userProfile?.desa_id && !userProfile?.kelompok_id
  const isAdminKelompok = userProfile?.role === 'admin' && !!userProfile?.kelompok_id
  const isAdmin = isSuperAdmin || isAdminDaerah || isAdminDesa || isAdminKelompok
  const isTeacher = userProfile?.role === 'teacher'
  const isTeacherDaerah = isTeacher && !!userProfile?.daerah_id && !userProfile?.desa_id && !userProfile?.kelompok_id
  const isTeacherDesa = isTeacher && !!userProfile?.desa_id && !userProfile?.kelompok_id
  const isTeacherKelompok = isTeacher && !!userProfile?.kelompok_id
  return {
    isSuperAdmin,
    isAdminDaerah,
    isAdminDesa,
    isAdminKelompok,
    isAdmin,
    isTeacher,
    isTeacherDaerah,
    isTeacherDesa,
    isTeacherKelompok,
  }
}

// ─── Desa Filtering ───────────────────────────────────────────────────────────

interface FilterDesaParams {
  desaList: DesaBase[]
  filters: DataFilters
  userProfile: MinimalProfile
  role: RoleFlags
  /** When true, desa list cascades based on selected daerah. When false, shows all available options for the role. */
  cascadeFilters: boolean
}

/**
 * Filters the desa list based on user role and selected filters.
 * Mirrors the `filteredDesaList` useMemo in DataFilter.tsx.
 */
export function filterDesaList({ desaList, filters, userProfile, role, cascadeFilters }: FilterDesaParams): DesaBase[] {
  const { isSuperAdmin, isAdminDaerah, isTeacherDaerah } = role

  if (!cascadeFilters) {
    if (isAdminDaerah || isTeacherDaerah) {
      return desaList.filter(d => d.daerah_id === userProfile?.daerah_id)
    }
    return desaList
  }

  if (isSuperAdmin) {
    if (filters.daerah.length > 0) {
      return desaList.filter(d => filters.daerah.includes(d.daerah_id))
    }
    return desaList
  }

  if (isAdminDaerah || isTeacherDaerah) {
    return desaList.filter(d => d.daerah_id === userProfile?.daerah_id)
  }

  return desaList
}

// ─── Kelompok Filtering ───────────────────────────────────────────────────────

interface FilterKelompokParams {
  kelompokList: KelompokBase[]
  desaList: DesaBase[]
  filters: DataFilters
  userProfile: MinimalProfile
  role: RoleFlags
  /** When true, kelompok list cascades based on selected daerah/desa. When false, shows all available for the role. */
  cascadeFilters: boolean
  /** Pass true when teacher has classes spanning multiple kelompok */
  teacherHasMultipleKelompok?: boolean
}

/**
 * Filters the kelompok list based on user role and selected filters.
 * Mirrors the `filteredKelompokList` useMemo in DataFilter.tsx.
 */
export function filterKelompokList({ kelompokList, desaList, filters, userProfile, role, cascadeFilters, teacherHasMultipleKelompok = false }: FilterKelompokParams): KelompokBase[] {
  const { isSuperAdmin, isAdminDaerah, isAdminDesa, isTeacherDaerah, isTeacherDesa, isTeacher } = role

  const buildFromClasses = (): KelompokBase[] => {
    const seen = new Set<string>()
    const result: KelompokBase[] = []
    userProfile?.classes?.forEach(cls => {
      if (cls.kelompok_id && cls.kelompok && !seen.has(cls.kelompok_id)) {
        seen.add(cls.kelompok_id)
        result.push({ id: cls.kelompok.id, name: cls.kelompok.name, desa_id: '' })
      }
    })
    return result
  }

  if (!cascadeFilters) {
    if (isAdminDesa || isTeacherDesa) {
      return kelompokList.filter(k => k.desa_id === userProfile?.desa_id)
    }
    if (isAdminDaerah || isTeacherDaerah) {
      const validDesaIds = desaList
        .filter(d => d.daerah_id === userProfile?.daerah_id)
        .map(d => d.id)
      return kelompokList.filter(k => validDesaIds.includes(k.desa_id))
    }
    if (isTeacher && teacherHasMultipleKelompok) {
      return buildFromClasses()
    }
    return kelompokList
  }

  if (isSuperAdmin) {
    if (filters.desa.length > 0) {
      return kelompokList.filter(k => filters.desa.includes(k.desa_id))
    }
    if (filters.daerah.length > 0) {
      const validDesaIds = desaList
        .filter(d => filters.daerah.includes(d.daerah_id))
        .map(d => d.id)
      return kelompokList.filter(k => validDesaIds.includes(k.desa_id))
    }
    return kelompokList
  }

  if (isAdminDesa || isTeacherDesa) {
    return kelompokList.filter(k => k.desa_id === userProfile?.desa_id)
  }

  if (isAdminDaerah || isTeacherDaerah) {
    if (filters.desa.length > 0) {
      return kelompokList.filter(k => filters.desa.includes(k.desa_id))
    }
    const validDesaIds = desaList
      .filter(d => d.daerah_id === userProfile?.daerah_id)
      .map(d => d.id)
    return kelompokList.filter(k => validDesaIds.includes(k.desa_id))
  }

  if (isTeacher && teacherHasMultipleKelompok) {
    return buildFromClasses()
  }

  return kelompokList
}

// ─── Class Filtering ──────────────────────────────────────────────────────────

interface FilterClassParams {
  classList: Class[]
  filters: DataFilters
  filteredKelompokList: KelompokBase[]
  role: RoleFlags
  userProfile: MinimalProfile
  cascadeFilters: boolean
  activeDesaList: DesaBase[]
  activeKelompokList: KelompokBase[]
  /** When false, skip kelompok-based filtering entirely */
  shouldShowKelompok: boolean
  /** True when teacher has >1 class across their assignments */
  teacherHasMultipleClasses: boolean
}

/**
 * Filters the class list based on user role, selected kelompok filter, and cascade mode.
 * Mirrors the `filteredClassList` useMemo in DataFilter.tsx.
 */
export function filterClassList({ classList, filters, filteredKelompokList, role, userProfile, cascadeFilters, activeDesaList, activeKelompokList, shouldShowKelompok, teacherHasMultipleClasses }: FilterClassParams): Class[] {
  const { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok, isTeacher, isTeacherDesa, isTeacherDaerah } = role

  if (!classList.length) return []

  // Guard: kelompok filter not shown → no kelompok-based narrowing
  if (!shouldShowKelompok) return classList

  // Independent Mode
  if (!cascadeFilters) {
    if (isAdminKelompok) {
      return classList.filter(cls => !cls.kelompok_id || cls.kelompok_id === userProfile?.kelompok_id)
    }
    if (isTeacherDesa) {
      const validKelompokIds = activeKelompokList
        .filter(k => k.desa_id === userProfile?.desa_id)
        .map(k => k.id)
      return classList.filter(cls => cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id))
    }
    if (isTeacherDaerah) {
      const validDesaIds = activeDesaList
        .filter(d => d.daerah_id === userProfile?.daerah_id)
        .map(d => d.id)
      const validKelompokIds = activeKelompokList
        .filter(k => validDesaIds.includes(k.desa_id))
        .map(k => k.id)
      return classList.filter(cls => cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id))
    }
    if (isTeacher && teacherHasMultipleClasses && userProfile?.classes) {
      const teacherClassIds = userProfile.classes.map(c => c.id)
      return classList.filter(cls => teacherClassIds.includes(cls.id))
    }
    if (filters.kelompok.length > 0) {
      const selectedClassIds = (filters.kelas || []).flatMap(k => k.split(','))
      return classList.filter(cls =>
        (cls.kelompok_id && filters.kelompok.includes(cls.kelompok_id)) ||
        selectedClassIds.includes(cls.id)
      )
    }
    return classList
  }

  // Cascade Mode: kelompok filter takes priority
  if (filters.kelompok.length > 0) {
    return classList.filter(cls => cls.kelompok_id && filters.kelompok.includes(cls.kelompok_id))
  }

  if (filteredKelompokList.length === 0) {
    return classList
  }

  if (isSuperAdmin || isAdminDaerah || isAdminDesa || isTeacherDaerah || isTeacherDesa) {
    const validKelompokIds = filteredKelompokList.map(k => k.id)
    if (validKelompokIds.length > 0) {
      return classList.filter(cls => cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id))
    }
    return classList
  }

  if (isAdminKelompok) {
    return classList.filter(cls => !cls.kelompok_id || cls.kelompok_id === userProfile?.kelompok_id)
  }

  if (isTeacher && userProfile?.classes) {
    const teacherClassIds = userProfile.classes.map(c => c.id)
    return classList.filter(cls => teacherClassIds.includes(cls.id))
  }

  return classList
}

// ─── Class Deduplication ─────────────────────────────────────────────────────

export interface ClassOption {
  value: string
  label: string
  name: string
  ids: string[]
}

/**
 * Deduplicates a class list into display options.
 *
 * When multiple kelompok are selected (selectedKelompokCount > 1), classes with the
 * same name from different kelompok are grouped with a "(N kelompok)" suffix.
 *
 * When a single kelompok is selected, duplicate class names are collapsed to one entry.
 *
 * @param classList - The pre-filtered list of classes
 * @param selectedKelompokCount - Number of currently selected kelompok
 */
export function deduplicateClasses(
  classList: { id: string; name: string; kelompok_id?: string | null }[],
  selectedKelompokCount: number
): ClassOption[] {
  if (!classList.length) return []

  if (selectedKelompokCount > 1) {
    const groups = classList.reduce(
      (acc, cls) => {
        if (!acc[cls.name]) {
          acc[cls.name] = { name: cls.name, ids: [], kelompokIds: new Set<string>() }
        }
        acc[cls.name].ids.push(cls.id)
        if (cls.kelompok_id) acc[cls.name].kelompokIds.add(cls.kelompok_id)
        return acc
      },
      {} as Record<string, { name: string; ids: string[]; kelompokIds: Set<string> }>
    )

    return Object.values(groups).map(group => ({
      value: group.ids.join(','),
      label: group.kelompokIds.size > 1 ? `${group.name} (${group.kelompokIds.size} kelompok)` : group.name,
      name: group.name,
      ids: group.ids,
    }))
  }

  // Single kelompok — return unique by name (first occurrence wins)
  const seen = new Set<string>()
  return classList
    .filter(cls => {
      if (seen.has(cls.name)) return false
      seen.add(cls.name)
      return true
    })
    .map(cls => ({
      value: cls.id,
      label: cls.name,
      name: cls.name,
      ids: [cls.id],
    }))
}
