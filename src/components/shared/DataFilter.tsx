'use client'

import { useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectFilter from '@/components/form/input/MultiSelectFilter'
import { useMeetingTypes } from '@/app/(admin)/absensi/hooks/useMeetingTypes'
import { MEETING_TYPES } from '@/lib/constants/meetingTypes'

interface Daerah {
  id: string
  name: string
}

interface Desa {
  id: string
  name: string
  daerah_id: string
}

interface Kelompok {
  id: string
  name: string
  desa_id: string
}

interface Class {
  id: string
  name: string
  kelompok_id?: string | null
}

interface UserProfile {
  id?: string
  full_name?: string
  role: string
  email?: string
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
  kelompok?: { id: string; name: string } | null
  desa?: { id: string; name: string } | null
  daerah?: { id: string; name: string } | null
  classes?: Array<{
    id: string
    name: string
    kelompok_id?: string | null
    kelompok?: { id: string; name: string } | null
  }>
  // Siswa page user profile structure
  class_id?: string | null
  class_name?: string | null
}

interface DataFilters {
  daerah: string[]
  desa: string[]
  kelompok: string[]
  kelas: string[]
  gender?: string // NEW - single select for gender
  status?: string // NEW - single select for status (active/graduated/inactive/all)
  meetingType?: string[] // NEW - multi select for meeting type
}

interface DataFilterProps {
  filters: DataFilters
  onFilterChange: (filters: DataFilters) => void
  userProfile: UserProfile | null | undefined
  daerahList: Daerah[]
  desaList: Desa[]
  kelompokList: Kelompok[]
  classList: Class[]
  showKelas?: boolean // For pages that need class filter (Siswa, Absensi, Laporan)
  showGender?: boolean // NEW - for pages that need gender filter
  showStatus?: boolean // NEW - for pages that need status filter (active/graduated/inactive/all)
  showMeetingType?: boolean // NEW - for pages that need meeting type filter
  forceShowAllMeetingTypes?: boolean // NEW - for reporting/filtering pages (bypass role restrictions)
  showDaerah?: boolean // Override role-based visibility
  showDesa?: boolean // Override role-based visibility
  showKelompok?: boolean // Override role-based visibility
  className?: string
  variant?: 'page' | 'modal'           // NEW
  compact?: boolean                     // NEW
  hideAllOption?: boolean               // NEW - for modals (must select specific)
  requiredFields?: {                    // NEW - mark which fields are required
    daerah?: boolean
    desa?: boolean
    kelompok?: boolean
    kelas?: boolean
    meetingType?: boolean
  }
  errors?: {                            // NEW - field-specific error messages
    daerah?: string
    desa?: string
    kelompok?: string
    kelas?: string
    meetingType?: string
  }
  filterLists?: {                       // NEW - override for filtered lists
    daerahList?: Daerah[]
    desaList?: Desa[]
    kelompokList?: Kelompok[]
  }
  cascadeFilters?: boolean              // NEW - control cascading behavior (default: true)
  classViewMode?: 'separated' | 'combined'  // NEW - for dashboard class monitoring
  onClassViewModeChange?: (mode: 'separated' | 'combined') => void // NEW
}

export default function DataFilter({
  filters,
  onFilterChange,
  userProfile,
  daerahList,
  desaList,
  kelompokList,
  classList,
  showKelas = false,
  showGender = false, // NEW
  showStatus = false, // NEW
  showMeetingType = false, // NEW
  forceShowAllMeetingTypes = false, // NEW
  showDaerah,
  showDesa,
  showKelompok,
  className = "grid gap-x-4",
  variant = 'page',
  compact = false,
  hideAllOption = false,
  requiredFields = {},
  errors = {},
  filterLists,
  cascadeFilters = true,
  classViewMode,
  onClassViewModeChange
}: DataFilterProps) {
  // Role detection logic
  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isAdminDaerah = userProfile?.role === 'admin' && userProfile?.daerah_id && !userProfile?.desa_id
  const isAdminDesa = userProfile?.role === 'admin' && userProfile?.desa_id && !userProfile?.kelompok_id
  const isAdminKelompok = userProfile?.role === 'admin' && userProfile?.kelompok_id
  const isAdmin = isSuperAdmin || isAdminDaerah || isAdminDesa || isAdminKelompok
  const isTeacher = userProfile?.role === 'teacher'

  // Teacher level detection (NEW - for Teacher Desa/Daerah roles)
  const isTeacherDaerah = isTeacher && userProfile?.daerah_id && !userProfile?.desa_id && !userProfile?.kelompok_id
  const isTeacherDesa = isTeacher && userProfile?.desa_id && !userProfile?.kelompok_id
  const isTeacherKelompok = isTeacher && userProfile?.kelompok_id

  // Use filtered lists if provided, otherwise use full lists
  const activeDaerahList = filterLists?.daerahList || daerahList
  const activeDesaList = filterLists?.desaList || desaList
  const activeKelompokList = filterLists?.kelompokList || kelompokList

  const teacherHasMultipleClasses = isTeacher && userProfile?.classes && userProfile.classes.length > 1
  // Detect regular teachers whose classes span multiple kelompok
  // Note: don't exclude by isTeacherKelompok — regular teachers with teacher_classes
  // can also have kelompok_id set in their profile. We use classes data directly.
  const teacherHasMultipleKelompok = useMemo(() => {
    if (!isTeacher || !userProfile?.classes || userProfile.classes.length <= 1) return false
    // Use kelompok_id from the classes themselves (available in userProfile.classes)
    const kelompokIds = new Set<string>()
    userProfile.classes.forEach(cls => {
      if (cls.kelompok_id) {
        kelompokIds.add(cls.kelompok_id)
      }
    })
    return kelompokIds.size > 1
  }, [isTeacher, userProfile?.classes])

  // Determine which filters to show (use override props if provided, otherwise use role-based logic)
  const shouldShowDaerah = showDaerah !== undefined ? showDaerah : (isSuperAdmin || isTeacherDaerah)
  const shouldShowDesa = showDesa !== undefined ? showDesa : (isSuperAdmin || isAdminDaerah || isTeacherDaerah || isTeacherDesa)
  const shouldShowKelompok = showKelompok !== undefined ? showKelompok : (isSuperAdmin || isAdminDaerah || isAdminDesa || isTeacherDaerah || isTeacherDesa || isTeacherKelompok || teacherHasMultipleKelompok)
  const showKelasFilter = showKelas && (isSuperAdmin || isAdminDaerah || isAdminDesa || isAdminKelompok || teacherHasMultipleClasses || isTeacherDaerah || isTeacherDesa)

  // Filter options based on cascading logic (declare these before counting)
  const filteredDesaList = useMemo(() => {
    if (!shouldShowDesa) return []

    // Independent Mode: Show all options (respecting role restrictions)
    if (!cascadeFilters) {
      if (isAdminDaerah || isTeacherDaerah) {
        return activeDesaList.filter(desa => desa.daerah_id === userProfile?.daerah_id)
      }
      // Superadmin sees all
      return activeDesaList
    }

    if (isSuperAdmin) {
      // Superadmin: filter by selected Daerah
      if (filters?.daerah && filters.daerah.length > 0) {
        return activeDesaList.filter(desa => filters.daerah.includes(desa.daerah_id))
      }
      return activeDesaList
    } else if (isAdminDaerah || isTeacherDaerah) {
      // Admin Daerah / Guru Daerah: filter by their daerah_id
      return activeDesaList.filter(desa => desa.daerah_id === userProfile?.daerah_id)
    }

    return activeDesaList
  }, [activeDesaList, filters?.daerah, userProfile?.daerah_id, isSuperAdmin, isAdminDaerah, isTeacherDaerah, shouldShowDesa, cascadeFilters])

  const filteredKelompokList = useMemo(() => {
    if (!shouldShowKelompok) return []

    // Independent Mode: Show all options (respecting role restrictions)
    if (!cascadeFilters) {
      if (isAdminDesa || isTeacherDesa) {
        return activeKelompokList.filter(kelompok => kelompok.desa_id === userProfile?.desa_id)
      }
      if (isAdminDaerah || isTeacherDaerah) {
        // Admin daerah / Guru daerah sees all groups in their daerah
        const validDesaIds = activeDesaList
          .filter(desa => desa.daerah_id === userProfile?.daerah_id)
          .map(desa => desa.id)
        return activeKelompokList.filter(kelompok => validDesaIds.includes(kelompok.desa_id))
      }
      if (isTeacher && teacherHasMultipleKelompok) {
        // Regular teacher with classes in multiple kelompok: build list from their classes
        // (activeKelompokList may only contain 1 kelompok due to profile-level filtering)
        const seen = new Set<string>()
        const result: typeof activeKelompokList = []
        userProfile!.classes!.forEach(cls => {
          if (cls.kelompok_id && cls.kelompok && !seen.has(cls.kelompok_id)) {
            seen.add(cls.kelompok_id)
            result.push({ id: cls.kelompok.id, name: cls.kelompok.name, desa_id: '' })
          }
        })
        return result
      }
      // Superadmin sees all
      return activeKelompokList
    }

    if (isSuperAdmin) {
      // Superadmin: filter by selected Daerah or Desa
      if (filters?.desa && filters.desa.length > 0) {
        return activeKelompokList.filter(kelompok => filters.desa.includes(kelompok.desa_id))
      }
      if (filters?.daerah && filters.daerah.length > 0) {
        const validDesaIds = activeDesaList
          .filter(desa => filters.daerah.includes(desa.daerah_id))
          .map(desa => desa.id)
        return activeKelompokList.filter(kelompok => validDesaIds.includes(kelompok.desa_id))
      }
      return activeKelompokList
    } else if (isAdminDesa || isTeacherDesa) {
      // Admin Desa / Guru Desa: filter by their desa_id
      return activeKelompokList.filter(kelompok => kelompok.desa_id === userProfile?.desa_id)
    } else if (isAdminDaerah || isTeacherDaerah) {
      // Admin Daerah / Guru Daerah: filter by selected Desa or their Daerah
      if (filters?.desa && filters.desa.length > 0) {
        return activeKelompokList.filter(kelompok => filters.desa.includes(kelompok.desa_id))
      }
      const validDesaIds = activeDesaList
        .filter(desa => desa.daerah_id === userProfile?.daerah_id)
        .map(desa => desa.id)
      return activeKelompokList.filter(kelompok => validDesaIds.includes(kelompok.desa_id))
    } else if (isTeacher && teacherHasMultipleKelompok) {
      // Regular teacher with classes in multiple kelompok: build list from their classes
      // (activeKelompokList may only contain 1 kelompok due to profile-level filtering)
      const seen = new Set<string>()
      const result: typeof activeKelompokList = []
      userProfile!.classes!.forEach(cls => {
        if (cls.kelompok_id && cls.kelompok && !seen.has(cls.kelompok_id)) {
          seen.add(cls.kelompok_id)
          result.push({ id: cls.kelompok.id, name: cls.kelompok.name, desa_id: '' })
        }
      })
      return result
    }

    return activeKelompokList
  }, [activeKelompokList, filters?.desa, filters?.daerah, userProfile?.desa_id, userProfile?.daerah_id, activeDesaList, isSuperAdmin, isAdminDesa, isAdminDaerah, isTeacherDesa, isTeacherDaerah, isTeacher, teacherHasMultipleKelompok, shouldShowKelompok, cascadeFilters])

  // Count options to determine if filters should be hidden when only one option exists
  const daerahListCount = useMemo(() => activeDaerahList.length, [activeDaerahList])
  const desaListCount = useMemo(() => filteredDesaList.length, [filteredDesaList])
  const kelompokListCount = useMemo(() => filteredKelompokList.length, [filteredKelompokList])

  // Apply single-option hiding: hide filter if user only has access to 1 option
  const effectiveShouldShowDaerah = shouldShowDaerah && daerahListCount > 1
  const effectiveShouldShowDesa = shouldShowDesa && desaListCount > 1
  const effectiveShouldShowKelompok = shouldShowKelompok && kelompokListCount > 1

  // Teacher special case - only show Kelas filter if they have multiple classes
  // if (isTeacher && teacherHasMultipleClasses && showKelas && !showGender) {
  //   return (
  //     <div className={cn("grid gap-x-4 grid-cols-1", className)}>
  //       <MultiSelectFilter
  //         id="kelasFilter"
  //         label="Kelas"
  //         value={filters.kelas || []}
  //         onChange={(value) => onFilterChange({ ...filters, kelas: value })}
  //         options={userProfile.classes?.map(c => ({ value: c.id, label: c.name })) || []}
  //         allOptionLabel="Semua Kelas"
  //         widthClassName="!max-w-full"
  //         variant={variant}
  //         compact={compact}
  //       />
  //     </div>
  //   )
  // }

  // If no filters to show, return null
  if (!showGender && !showStatus && !effectiveShouldShowDaerah && !effectiveShouldShowDesa && !effectiveShouldShowKelompok && !showKelasFilter && !showMeetingType) {
    return null
  }

  const filteredClassList = useMemo(() => {
    if (!showKelasFilter) return []

    // If kelompok filter is not shown, return all classes (no filtering by kelompok_id)
    // This is important for pages like meeting detail where we don't filter by kelompok
    if (!shouldShowKelompok) {
      return classList
    }

    // Independent Mode: Show all classes (respecting role restrictions)
    if (!cascadeFilters) {
      if (isAdminKelompok) {
        return classList.filter(cls => !cls.kelompok_id || cls.kelompok_id === userProfile?.kelompok_id)
      }
      if (isTeacherDesa) {
        // Guru Desa: show classes from all kelompok in their desa
        const validKelompokIds = activeKelompokList
          .filter(k => k.desa_id === userProfile?.desa_id)
          .map(k => k.id)
        return classList.filter(cls => cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id))
      }
      if (isTeacherDaerah) {
        // Guru Daerah: show classes from all kelompok in their daerah
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
      // Superadmin, Admin Daerah, Admin Desa see all classes (or filtered by selected Kelompok if any)
      // In Independent Mode, we filter by Kelompok BUT keep selected classes visible
      if (filters?.kelompok && filters.kelompok.length > 0) {
        const selectedClassIds = (filters.kelas || []).flatMap(k => k.split(','))
        return classList.filter(cls =>
          (cls.kelompok_id && filters.kelompok.includes(cls.kelompok_id)) ||
          selectedClassIds.includes(cls.id)
        )
      }
      return classList
    }

    // PRIORITY: Jika user sudah pilih kelompok, gunakan yang dipilih
    if (filters?.kelompok && filters.kelompok.length > 0) {
      // Filter kelas berdasarkan kelompok yang dipilih user
      return classList.filter(cls =>
        cls.kelompok_id && filters.kelompok.includes(cls.kelompok_id)
      )
    }

    // Fallback: Jika belum pilih kelompok, tampilkan dari semua kelompok tersedia
    if (filteredKelompokList.length === 0) {
      return classList
    }

    if (isSuperAdmin || isAdminDaerah || isAdminDesa || isTeacherDaerah || isTeacherDesa) {
      // Get valid kelompok IDs from filteredKelompokList (kelompok yang tersedia)
      const validKelompokIds = filteredKelompokList.map(k => k.id)

      // Filter classes by valid kelompok IDs only if we have valid kelompok IDs
      if (validKelompokIds.length > 0) {
        return classList.filter(cls =>
          cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id)
        )
      }

      // If no kelompok filter applied, show all classes
      return classList
    } else if (isAdminKelompok) {
      // Admin Kelompok: filter by their kelompok_id only if kelas have kelompok_id
      // But if some classes don't have kelompok_id (null), include them too
      return classList.filter(cls =>
        !cls.kelompok_id || cls.kelompok_id === userProfile?.kelompok_id
      )
    } else if (isTeacher && teacherHasMultipleClasses && userProfile?.classes) {
      // Teacher with multiple classes: filter only classes they teach
      const teacherClassIds = userProfile.classes.map(c => c.id)
      return classList.filter(cls => teacherClassIds.includes(cls.id))
    }

    // For teacher or other roles, return all classes when kelompok filter is not active
    return classList
  }, [classList, filters?.kelompok, filteredKelompokList, shouldShowKelompok, isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok, isTeacher, isTeacherDaerah, isTeacherDesa, teacherHasMultipleClasses, showKelasFilter, userProfile?.kelompok_id, userProfile?.classes, cascadeFilters, activeDesaList, activeKelompokList, userProfile?.desa_id, userProfile?.daerah_id])

  // Deduplicate class names and count occurrences
  const uniqueClassList = useMemo(() => {
    if (!filteredClassList.length) return []

    // Special handling for teacher with multiple classes from different kelompok OR Guru Desa/Daerah
    if ((isTeacher && teacherHasMultipleClasses) || isTeacherDesa || isTeacherDaerah || (isAdmin && !isAdminKelompok)) {
      // When multiple kelompok are selected, group classes by name with "(N kelompok)" suffix
      const selectedKelompokCount = filters?.kelompok?.length || 0
      if (selectedKelompokCount > 1) {
        const classGroups = filteredClassList.reduce((acc, cls) => {
          if (!acc[cls.name]) {
            acc[cls.name] = { name: cls.name, ids: [], kelompokIds: new Set<string>() }
          }
          acc[cls.name].ids.push(cls.id)
          if (cls.kelompok_id) acc[cls.name].kelompokIds.add(cls.kelompok_id)
          return acc
        }, {} as Record<string, { name: string; ids: string[]; kelompokIds: Set<string> }>)

        return Object.values(classGroups).map(group => ({
          value: group.ids.join(','),
          label: group.kelompokIds.size > 1 ? `${group.name} (${group.kelompokIds.size} kelompok)` : group.name,
          name: group.name,
          ids: group.ids
        }))
      }

      // Create mapping kelompok_id -> kelompok name
      const kelompokMap = new Map(
        activeKelompokList.map(k => [k.id, k.name])
      )
      // Also include kelompok from teacher's classes (activeKelompokList may be incomplete)
      if (userProfile?.classes) {
        userProfile.classes.forEach(cls => {
          if (cls.kelompok_id && cls.kelompok && !kelompokMap.has(cls.kelompok_id)) {
            kelompokMap.set(cls.kelompok_id, cls.kelompok.name)
          }
        })
      }

      // Group by name + kelompok_id to get unique combinations
      const classGroups = filteredClassList.reduce((acc, cls) => {
        const key = `${cls.name}::${cls.kelompok_id || 'no-kelompok'}`
        if (!acc[key]) {
          acc[key] = {
            name: cls.name,
            kelompok_id: cls.kelompok_id || null,
            ids: [],
            kelompokName: null as string | null
          }
        }
        acc[key].ids.push(cls.id)
        return acc
      }, {} as Record<string, { name: string; kelompok_id: string | null; ids: string[]; kelompokName: string | null }>)

      // Get kelompok names from kelompokMap
      const groupsWithNames = Object.values(classGroups).map(group => {
        const kelompokName = group.kelompok_id ? (kelompokMap.get(group.kelompok_id) || null) : null
        return {
          ...group,
          kelompokName
        }
      })

      // Check if there are duplicate class names (same name, different kelompok)
      const nameCounts = groupsWithNames.reduce((acc, group) => {
        acc[group.name] = (acc[group.name] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Format labels: show kelompok name if there are duplicates with same name from different kelompok
      return groupsWithNames.map(group => {
        const hasDuplicate = nameCounts[group.name] > 1
        const label = hasDuplicate && group.kelompokName
          ? `${group.name} (${group.kelompokName})`
          : group.name

        return {
          value: group.ids.join(','),
          label,
          name: group.name,
          ids: group.ids
        }
      })
    }

    // Existing logic for non-teacher or teacher without multiple classes
    // Group classes by name and track unique kelompok IDs
    const classGroups = filteredClassList.reduce((acc, cls) => {
      if (!acc[cls.name]) {
        acc[cls.name] = {
          name: cls.name,
          ids: [],
          kelompokIds: new Set<string>() // Track unique kelompok IDs for this class name
        }
      }
      acc[cls.name].ids.push(cls.id)
      // Track unique kelompok IDs for this class name
      if (cls.kelompok_id) {
        acc[cls.name].kelompokIds.add(cls.kelompok_id)
      }
      return acc
    }, {} as Record<string, { name: string; ids: string[]; kelompokIds: Set<string> }>)

    // Convert to array with formatted labels
    // Count should be based on unique kelompok IDs, not total class count
    return Object.values(classGroups).map(group => {
      const uniqueKelompokCount = group.kelompokIds.size

      // Show deduplicated names when no kelompok filter is active (Semua Kelompok)
      // Only show kelompok suffix when specific kelompok is selected AND there are duplicates
      const shouldShowKelompokSuffix = filters?.kelompok && filters.kelompok.length > 0 && uniqueKelompokCount > 1

      return {
        value: group.ids.join(','), // Store all IDs comma-separated for backward compatibility
        label: shouldShowKelompokSuffix && cascadeFilters ? `${group.name} (${uniqueKelompokCount} kelompok)` : group.name,
        name: group.name,
        ids: group.ids
      }
    })
  }, [filteredClassList, isTeacher, teacherHasMultipleClasses, teacherHasMultipleKelompok, activeKelompokList, filters?.kelompok, userProfile?.classes])

  // Get available meeting types based on user profile
  const { availableTypes, isLoading: meetingTypesLoading } = useMeetingTypes(userProfile as any)

  // Determine which meeting types to show
  // For reporting/filtering pages, show all types regardless of role
  // For creation pages, use role-restricted types
  const meetingTypesToShow = forceShowAllMeetingTypes
    ? MEETING_TYPES  // Show all types for reporting/filtering
    : availableTypes // Use role-restricted types for creation

  // Validation for Independent Mode
  const isDesaInvalid = useMemo(() => {
    if (cascadeFilters || !filters.daerah?.length || !filters.desa?.length) return false

    // Check if selected Desa belongs to selected Daerah
    const invalidDesa = filters.desa.some(desaId => {
      const desa = activeDesaList.find(d => d.id === desaId)
      return desa && !filters.daerah.includes(desa.daerah_id)
    })

    return invalidDesa
  }, [filters.daerah, filters.desa, cascadeFilters, activeDesaList])

  const isKelompokInvalid = useMemo(() => {
    if (cascadeFilters || !filters.desa?.length || !filters.kelompok?.length) return false

    const invalidKelompok = filters.kelompok.some(kelompokId => {
      const kelompok = activeKelompokList.find(k => k.id === kelompokId)
      return kelompok && !filters.desa.includes(kelompok.desa_id)
    })

    return invalidKelompok
  }, [filters.desa, filters.kelompok, cascadeFilters, activeKelompokList])

  const isKelasInvalid = useMemo(() => {
    if (cascadeFilters || !filters.kelas?.length) return false

    const hasKelompokFilter = filters.kelompok && filters.kelompok.length > 0
    const hasDesaFilter = filters.desa && filters.desa.length > 0
    const hasDaerahFilter = filters.daerah && filters.daerah.length > 0

    if (!hasKelompokFilter && !hasDesaFilter && !hasDaerahFilter) return false

    return filters.kelas.some(classId => {
      // Handle comma-separated IDs (e.g. "id1,id2")
      const ids = classId.split(',')

      // Check if ANY of the split IDs are invalid
      return ids.some(id => {
        const cls = classList.find(c => c.id === id)
        if (!cls) return false

        // Check Kelompok
        if (hasKelompokFilter) {
          if (!cls.kelompok_id || !filters.kelompok.includes(cls.kelompok_id)) {
            return true
          }
        }

        // Check Desa (only if Kelompok not filtered)
        if (!hasKelompokFilter && hasDesaFilter) {
          const kelompok = activeKelompokList.find(k => k.id === cls.kelompok_id)
          if (!kelompok || !filters.desa.includes(kelompok.desa_id)) {
            return true
          }
        }

        // Check Daerah (only if Kelompok and Desa not filtered)
        if (!hasKelompokFilter && !hasDesaFilter && hasDaerahFilter) {
          const kelompok = activeKelompokList.find(k => k.id === cls.kelompok_id)
          const desa = kelompok ? activeDesaList.find(d => d.id === kelompok.desa_id) : null
          if (!desa || !filters.daerah.includes(desa.daerah_id)) {
            return true
          }
        }

        return false
      })
    })
  }, [filters.kelas, filters.kelompok, filters.desa, filters.daerah, cascadeFilters, classList, activeKelompokList, activeDesaList])

  // Handlers with cascading reset logic
  const handleDaerahChange = useCallback((value: string[]) => {
    const updates = {
      daerah: value,
      ...(cascadeFilters && {
        desa: [], // Reset desa when daerah changes
        kelompok: [], // Reset kelompok when daerah changes
        kelas: [] // Reset kelas when daerah changes
      })
    }
    onFilterChange({
      ...filters,
      ...updates
    })
  }, [filters, cascadeFilters, onFilterChange])

  const handleDesaChange = useCallback((value: string[]) => {
    const updates = {
      desa: value,
      ...(cascadeFilters && {
        kelompok: [], // Reset kelompok when desa changes
        kelas: [] // Reset kelas when desa changes
      })
    }
    onFilterChange({
      ...filters,
      ...updates
    })
  }, [filters, cascadeFilters, onFilterChange])

  const handleKelompokChange = useCallback((value: string[]) => {
    const updates = {
      kelompok: value,
      ...(cascadeFilters && { kelas: [] })  // Only reset kelas if cascading
    }
    onFilterChange({
      ...filters,  // Spread current filters first
      ...updates   // Apply updates
    })
  }, [filters, cascadeFilters, onFilterChange])

  const handleKelasChange = useCallback((value: string[]) => {
    onFilterChange({
      ...filters,
      kelas: value
    })
  }, [filters, onFilterChange])

  const handleGenderChange = useCallback((value: string) => {
    onFilterChange({
      ...filters,
      gender: value
    })
  }, [filters, onFilterChange])

  const handleStatusChange = useCallback((value: string) => {
    onFilterChange({
      ...filters,
      status: value
    })
  }, [filters, onFilterChange])

  const handleMeetingTypeChange = useCallback((value: string[]) => {
    onFilterChange({
      ...filters,
      meetingType: value
    })
  }, [filters, onFilterChange])

  const handleClassViewModeChange = useCallback((value: string) => {
    if (onClassViewModeChange) {
      onClassViewModeChange(value as 'separated' | 'combined')
    }
  }, [onClassViewModeChange])

  // Determine visible filters and their order
  const visibleFilters = [
    showGender && 'gender', // NEW - add gender first
    showStatus && 'status', // NEW - add status after gender
    effectiveShouldShowDaerah && 'daerah',
    effectiveShouldShowDesa && 'desa',
    effectiveShouldShowKelompok && 'kelompok',
    showKelasFilter && 'kelas',
    (classViewMode !== undefined && onClassViewModeChange) && 'classViewMode', // NEW - for dashboard
    showMeetingType && 'meetingType' // NEW
  ].filter(Boolean)

  const filterCount = visibleFilters.length

  // Responsive layout classes
  const containerClass = cn(
    variant === 'modal'
      ? (compact ? "space-y-6" : "space-y-4")
      : "grid gap-x-4",
    variant === 'page' && filterCount === 1 && "grid-cols-1 md:grid-cols-4",
    variant === 'page' && filterCount >= 2 && filterCount <= 4 && "grid-cols-2 md:grid-cols-4",
    variant === 'page' && filterCount === 5 && "grid-cols-2 md:grid-cols-5",
    variant === 'page' && filterCount === 6 && "grid-cols-2 md:grid-cols-6",
    variant === 'modal' && filterCount >= 1 && filterCount <= 6 && "grid-cols-1",
    className
  )

  // Helper function to calculate filter index
  const getFilterIndex = (filterType: string) => {
    const filterOrder = ['gender', 'status', 'daerah', 'desa', 'kelompok', 'kelas', 'classViewMode', 'meetingType']
    const visibleOrder = visibleFilters
    return visibleOrder.indexOf(filterType)
  }

  // For 3 filters: last filter (lowest level) spans 2 columns on mobile
  const getFilterClass = (index: number) => {
    if (variant === 'page' && filterCount === 3 && index === 2) {
      return "col-span-2 md:col-span-1" // Last filter full width on mobile
    }
    // if (variant === 'modal' && filterCount === 3 && index === 2) {
    //   return "md:col-span-2" // Last filter spans 2 columns in modal
    // }
    return ""
  }

  return (
    <div className={containerClass}>
      {effectiveShouldShowDaerah && (
        <div className={getFilterClass(getFilterIndex('daerah'))}>
          {variant === 'page' ? (
            <MultiSelectFilter
              id="daerahFilter"
              label="Daerah"
              value={filters?.daerah || []}
              onChange={handleDaerahChange}
              options={activeDaerahList.map(daerah => ({ value: daerah.id, label: daerah.name }))}
              allOptionLabel="Semua Daerah"
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              placeholder="Pilih Daerah"
            />
          ) : (
            <InputFilter
              id="daerahFilter"
              label="Daerah"
              value={filters?.daerah[0] || ''}
              onChange={(value) => handleDaerahChange(value ? [value] : [])}
              options={activeDaerahList.map(daerah => ({ value: daerah.id, label: daerah.name }))}
              allOptionLabel={hideAllOption ? undefined : "Semua Daerah"}
              placeholder={hideAllOption ? "Pilih Daerah" : undefined}
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              required={requiredFields.daerah}
              error={!!errors.daerah}
              hint={errors.daerah}
            />
          )}
        </div>
      )}

      {effectiveShouldShowDesa && (
        <div className={getFilterClass(getFilterIndex('desa'))}>
          {variant === 'page' ? (
            <MultiSelectFilter
              id="desaFilter"
              label="Desa"
              value={filters?.desa || []}
              onChange={handleDesaChange}
              options={filteredDesaList.map(desa => ({ value: desa.id, label: desa.name }))}
              allOptionLabel="Semua Desa"
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              placeholder="Pilih Desa"
              error={!!errors.desa || isDesaInvalid}
              hint={errors.desa || (isDesaInvalid ? "Pilihan Desa tidak sesuai dengan Daerah" : undefined)}
            />
          ) : (
            <InputFilter
              id="desaFilter"
              label="Desa"
              value={filters?.desa[0] || ''}
              onChange={(value) => handleDesaChange(value ? [value] : [])}
              options={filteredDesaList.map(desa => ({ value: desa.id, label: desa.name }))}
              allOptionLabel={hideAllOption ? undefined : "Semua Desa"}
              placeholder={hideAllOption ? "Pilih Desa" : undefined}
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              required={requiredFields.desa}
              error={!!errors.desa}
              hint={errors.desa}
            />
          )}
        </div>
      )}

      {effectiveShouldShowKelompok && (
        <div className={getFilterClass(getFilterIndex('kelompok'))}>
          {variant === 'page' ? (
            <MultiSelectFilter
              id="kelompokFilter"
              label="Kelompok"
              value={filters?.kelompok || []}
              onChange={handleKelompokChange}
              options={filteredKelompokList.map(kelompok => ({ value: kelompok.id, label: kelompok.name }))}
              allOptionLabel="Semua Kelompok"
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              placeholder="Pilih Kelompok"
              error={!!errors.kelompok || isKelompokInvalid}
              hint={errors.kelompok || (isKelompokInvalid ? "Pilihan Kelompok tidak sesuai dengan Desa" : undefined)}
            />
          ) : (
            <InputFilter
              id="kelompokFilter"
              label="Kelompok"
              value={filters?.kelompok[0] || ''}
              onChange={(value) => handleKelompokChange(value ? [value] : [])}
              options={filteredKelompokList.map(kelompok => ({ value: kelompok.id, label: kelompok.name }))}
              allOptionLabel={hideAllOption ? undefined : "Semua Kelompok"}
              placeholder={hideAllOption ? "Pilih Kelompok" : undefined}
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              required={requiredFields.kelompok}
              error={!!errors.kelompok}
              hint={errors.kelompok}
            />
          )}
        </div>
      )}

      {showKelasFilter && (
        <div className={getFilterClass(getFilterIndex('kelas'))}>
          {variant === 'page' ? (
            <MultiSelectFilter
              id="kelasFilter"
              label="Kelas"
              value={filters?.kelas || []}
              onChange={handleKelasChange}
              options={uniqueClassList.map(cls => ({
                value: cls.value, // This now contains comma-separated IDs
                label: cls.label  // This includes count if > 1
              }))}
              allOptionLabel="Semua Kelas"
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              placeholder="Pilih Kelas"
            // error={!!errors.kelas || isKelasInvalid}
            // hint={errors.kelas || (isKelasInvalid ? "Pilihan Kelas tidak sesuai dengan Kelompok/Desa/Daerah" : undefined)}
            />
          ) : (
            <InputFilter
              id="kelasFilter"
              label="Kelas"
              value={filters?.kelas[0] || ''}
              onChange={(value) => handleKelasChange(value ? [value] : [])}
              options={uniqueClassList.map(cls => ({
                value: cls.value, // This now contains comma-separated IDs
                label: cls.label  // This includes count if > 1
              }))}
              allOptionLabel={hideAllOption ? undefined : "Semua Kelas"}
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              required={requiredFields.kelas}
              error={!!errors.kelas}
              hint={errors.kelas}
            // error={!!errors.kelas || isKelasInvalid}
            // hint={errors.kelas || (isKelasInvalid ? "Pilihan Kelas tidak sesuai dengan Kelompok/Desa/Daerah" : undefined)}
            />
          )}
        </div>
      )}

      {classViewMode !== undefined && !isAdminKelompok && onClassViewModeChange && (
        <div className={getFilterClass(getFilterIndex('classViewMode'))}>
          <InputFilter
            id="classViewModeFilter"
            label="Mode Tampilan"
            value={classViewMode}
            onChange={handleClassViewModeChange}
            options={[
              { value: 'separated', label: 'Terpisah' },
              { value: 'combined', label: 'Gabungan' }
            ]}
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
          />
        </div>
      )}

      {showGender && (
        <div className={getFilterClass(getFilterIndex('gender'))}>
          <InputFilter
            id="genderFilter"
            label="Jenis Kelamin"
            value={filters?.gender || ''}
            onChange={handleGenderChange}
            options={[
              { value: 'Laki-laki', label: 'Laki-Laki' },
              { value: 'Perempuan', label: 'Perempuan' }
            ]}
            allOptionLabel="Semua"
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
          />
        </div>
      )}

      {showStatus && (
        <div className={getFilterClass(getFilterIndex('status'))}>
          <InputFilter
            id="statusFilter"
            label="Status"
            value={filters?.status || 'active'}
            onChange={handleStatusChange}
            options={[
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Tidak Aktif' },
              { value: 'all', label: 'Semua' }
            ]}
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
          />
        </div>
      )}

      {showMeetingType && (
        <div className={getFilterClass(getFilterIndex('meetingType'))}>
          {variant === 'page' ? (
            (meetingTypesLoading || Object.keys(meetingTypesToShow).length === 0) ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {meetingTypesLoading ? 'Memuat tipe pertemuan...' : 'Pilih kelas terlebih dahulu'}
              </div>
            ) : (
              <MultiSelectFilter
                id="meetingTypeFilter"
                label="Tipe Pertemuan"
                value={filters?.meetingType || []}
                onChange={handleMeetingTypeChange}
                options={Object.entries(meetingTypesToShow).map(([key, type]) => ({
                  value: type.code,
                  label: type.label
                }))}
                allOptionLabel="Semua Tipe"
                widthClassName="!max-w-full"
                variant={variant}
                compact={compact}
                placeholder="Pilih Tipe"
              />
            )
          ) : (
            <InputFilter
              id="meetingTypeFilter"
              label="Tipe Pertemuan"
              value={filters?.meetingType?.[0] || ''}
              onChange={(value) => handleMeetingTypeChange(value ? [value] : [])}
              options={Object.entries(meetingTypesToShow).map(([key, type]) => ({
                value: type.code,
                label: type.label
              }))}
              allOptionLabel={hideAllOption ? undefined : "Semua Tipe"}
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              required={requiredFields.meetingType}
              error={!!errors.meetingType}
              hint={errors.meetingType}
              disabled={meetingTypesLoading || Object.keys(availableTypes).length === 0}
            />
          )}
        </div>
      )}
    </div>
  )
}
