'use client'

import { useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectFilter from '@/components/form/input/MultiSelectFilter'
import { useActivityTypes } from '@/hooks/useActivityTypes'
import { useActivityLevels } from '@/hooks/useActivityLevels'
import type { UserProfile } from '@/types/user'
import type { Class } from '@/types/class'
import type { DaerahBase, DesaBase, KelompokBase } from '@/types/organization'
import { detectRole, filterDesaList, filterKelompokList, filterClassList } from './dataFilterHelpers'
import type { DataFilters } from './dataFilterHelpers'

export type { DataFilters }

interface DataFilterProps {
  filters: DataFilters
  onFilterChange: (filters: DataFilters) => void
  userProfile: UserProfile | null | undefined
  daerahList: DaerahBase[]
  desaList: DesaBase[]
  kelompokList: KelompokBase[]
  classList: Class[]
  showKelas?: boolean // For pages that need class filter (Siswa, Absensi, Laporan)
  showGender?: boolean
  showStatus?: boolean // active/graduated/inactive/all
  showActivityType?: boolean
  showActivityLevel?: boolean
  /** Override the activity type options shown in the filter (e.g. pass user's allowed types only) */
  activityTypeOptions?: { value: string; label: string }[]
  isLoading?: boolean
  /** @deprecated use showActivityType instead */
  showMeetingType?: boolean
  showDaerah?: boolean // Override role-based visibility
  showDesa?: boolean // Override role-based visibility
  showKelompok?: boolean // Override role-based visibility
  className?: string
  variant?: 'page' | 'modal'
  compact?: boolean
  /**
   * When true, the "All" option is removed from every select filter.
   * Use in modal forms where a specific value must be selected (e.g. add meeting modal).
   */
  hideAllOption?: boolean
  requiredFields?: {
    daerah?: boolean
    desa?: boolean
    kelompok?: boolean
    kelas?: boolean
    activityType?: boolean
    activityLevel?: boolean
  }
  errors?: {
    daerah?: string
    desa?: string
    kelompok?: string
    kelas?: string
    activityType?: string
    activityLevel?: string
  }
  /**
   * Override the full org lists with pre-filtered subsets.
   * Useful when the parent already has a scoped list (e.g. a teacher's assigned kelompok)
   * and you don't want DataFilter to re-filter from the full dataset.
   */
  filterLists?: {
    daerahList?: DaerahBase[]
    desaList?: DesaBase[]
    kelompokList?: KelompokBase[]
  }
  /**
   * Controls whether filters cascade (default: true).
   *
   * **Cascade mode (true):** Selecting a daerah narrows the desa options, selecting a desa
   * narrows kelompok, etc. Used on list pages (Siswa, Laporan) for drill-down filtering.
   *
   * **Independent mode (false):** All dropdowns show their full role-scoped options
   * regardless of other selections. Used in forms/modals where each field is selected
   * independently (e.g. add meeting modal, rapot filters).
   */
  cascadeFilters?: boolean
  classViewMode?: 'separated' | 'combined'
  onClassViewModeChange?: (mode: 'separated' | 'combined') => void
  // Comparison feature props
  showComparisonLevel?: boolean
  comparisonLevel?: 'class' | 'kelompok' | 'desa' | 'daerah'
  onComparisonLevelChange?: (level: 'class' | 'kelompok' | 'desa' | 'daerah') => void
  // Category group filter
  categoryGroup?: 'caberawit' | 'muda_mudi' | 'orang_tua'
  onCategoryGroupChange?: (group: 'caberawit' | 'muda_mudi' | 'orang_tua' | undefined) => void
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
  showGender = false,
  showStatus = false,
  showActivityType = false,
  showActivityLevel = false,
  activityTypeOptions,
  showMeetingType = false, // deprecated
  isLoading = false,
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
  onClassViewModeChange,
  // Comparison feature props
  showComparisonLevel = false,
  comparisonLevel = 'class',
  onComparisonLevelChange,
  // Category group filter
  categoryGroup,
  onCategoryGroupChange,
}: DataFilterProps) {
  // Role detection
  const role = useMemo(() => detectRole(userProfile ?? null), [userProfile])
  const { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok, isAdmin, isTeacher, isTeacherDaerah, isTeacherDesa, isTeacherKelompok } = role

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
  const baseShouldShowDaerah = showDaerah !== undefined ? showDaerah : (isSuperAdmin || isTeacherDaerah)
  const baseShouldShowDesa = showDesa !== undefined ? showDesa : (isSuperAdmin || isAdminDaerah || isTeacherDaerah || isTeacherDesa)
  const baseShouldShowKelompok = showKelompok !== undefined ? showKelompok : (isSuperAdmin || isAdminDaerah || isAdminDesa || isTeacherDaerah || isTeacherDesa || isTeacherKelompok || teacherHasMultipleKelompok)
  const baseShowKelasFilter = showKelas && (isSuperAdmin || isAdminDaerah || isAdminDesa || isAdminKelompok || teacherHasMultipleClasses || isTeacherDaerah || isTeacherDesa)

  // Apply Comparison Level restrictions (Hide child filters if comparing at a higher level)
  const shouldShowDaerah = baseShouldShowDaerah;
  const shouldShowDesa = baseShouldShowDesa && (!showComparisonLevel || comparisonLevel !== 'daerah')
  const shouldShowKelompok = baseShouldShowKelompok && (!showComparisonLevel || (comparisonLevel !== 'daerah' && comparisonLevel !== 'desa'))
  const showKelasFilter = baseShowKelasFilter && (!showComparisonLevel || comparisonLevel === 'class')

  // Force single-select for grouping levels when comparing classes to prevent massive data loads
  const forceSingleSelectGroupings = showComparisonLevel && comparisonLevel === 'class'

  // Filter options based on cascading logic (declare these before counting)
  const filteredDesaList = useMemo(() => {
    if (!shouldShowDesa) return []
    return filterDesaList({ desaList: activeDesaList, filters, userProfile: userProfile ?? null, role, cascadeFilters })
  }, [activeDesaList, filters, userProfile, role, shouldShowDesa, cascadeFilters])

  const filteredKelompokList = useMemo(() => {
    if (!shouldShowKelompok) return []
    return filterKelompokList({
      kelompokList: activeKelompokList,
      desaList: activeDesaList,
      filters,
      userProfile: userProfile ?? null,
      role,
      cascadeFilters,
      teacherHasMultipleKelompok,
    })
  }, [activeKelompokList, activeDesaList, filters, userProfile, role, shouldShowKelompok, cascadeFilters, teacherHasMultipleKelompok])

  // Count options to determine if filters should be hidden when only one option exists
  const daerahListCount = activeDaerahList.length
  const desaListCount = filteredDesaList.length
  const kelompokListCount = filteredKelompokList.length

  // Apply single-option hiding: hide filter if user only has access to 1 option.
  // Exception: if the parent explicitly passes showDaerah/showDesa/showKelompok as an override prop,
  // skip the list-count gate so the selector still renders while data is loading (count = 0)
  // or when the org list legitimately has 1 item and the user still needs to see/confirm their scope.
  const effectiveShouldShowDaerah = shouldShowDaerah && (showDaerah !== undefined || isLoading || daerahListCount > 1)
  const effectiveShouldShowDesa = shouldShowDesa && (showDesa !== undefined || isLoading || desaListCount > 1)
  const effectiveShouldShowKelompok = shouldShowKelompok && (showKelompok !== undefined || isLoading || kelompokListCount > 1)

  // Track whether to return null — evaluated AFTER all hooks to comply with Rules of Hooks
  const showCategoryGroup = !!onCategoryGroupChange
  const shouldReturnNull = !showGender && !showStatus && !effectiveShouldShowDaerah && !effectiveShouldShowDesa && !effectiveShouldShowKelompok && !showKelasFilter && !showActivityType && !showActivityLevel && !showMeetingType && !showCategoryGroup

  const filteredClassList = useMemo(() => {
    if (!showKelasFilter) return []
    return filterClassList({
      classList,
      filters,
      filteredKelompokList,
      role,
      userProfile: userProfile ?? null,
      cascadeFilters,
      activeDesaList,
      activeKelompokList,
      shouldShowKelompok,
      teacherHasMultipleClasses: teacherHasMultipleClasses ?? false,
    })
  }, [classList, filters, filteredKelompokList, role, userProfile, cascadeFilters, activeDesaList, activeKelompokList, shouldShowKelompok, teacherHasMultipleClasses, showKelasFilter])

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

  // Activity types and levels (DB-driven)
  const { activityTypes, isLoading: activityTypesLoading } = useActivityTypes()
  const { activityLevels, isLoading: activityLevelsLoading } = useActivityLevels()

  // Comparison feature logic
  const availableComparisonLevels = useMemo(() => {
    const hasAccessToDesa = isSuperAdmin || isAdminDaerah || isTeacherDaerah;
    const hasAccessToKelompok = hasAccessToDesa || isAdminDesa || isTeacherDesa || teacherHasMultipleKelompok;
                      
    const levels = [{ value: 'class', label: 'Per Kelas' }];

    if (hasAccessToKelompok) levels.push({ value: 'kelompok', label: 'Per Kelompok' });
    if (hasAccessToDesa) levels.push({ value: 'desa', label: 'Per Desa' });
    if (isSuperAdmin) levels.push({ value: 'daerah', label: 'Per Daerah' });

    return levels;    
  }, [isSuperAdmin, isAdminDaerah, isTeacherDaerah, isAdminDesa, isTeacherDesa]);

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

  const handleActivityTypeChange = useCallback((value: string[]) => {
    onFilterChange({ ...filters, activityType: value })
  }, [filters, onFilterChange])

  const handleActivityLevelChange = useCallback((value: string[]) => {
    onFilterChange({ ...filters, activityLevel: value })
  }, [filters, onFilterChange])

  const handleClassViewModeChange = useCallback((value: string) => {
    if (onClassViewModeChange) {
      onClassViewModeChange(value as 'separated' | 'combined')
    }
  }, [onClassViewModeChange])

  // Determine visible filters and their order
  // (All hooks above must be called before this return)
  if (shouldReturnNull) return null

  const visibleFilters = [
    showComparisonLevel && 'comparisonLevel',
    effectiveShouldShowDaerah && 'daerah',
    effectiveShouldShowDesa && 'desa',
    effectiveShouldShowKelompok && 'kelompok',
    showKelasFilter && 'kelas',
    showGender && 'gender',
    showStatus && 'status',
    (classViewMode !== undefined && onClassViewModeChange) && 'classViewMode',
    showActivityType && 'activityType',
    showActivityLevel && 'activityLevel',
    showCategoryGroup && 'categoryGroup',
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
    // console.log('filterType', filterType)
    const filterOrder = ['comparisonLevel', 'categoryGroup', 'gender', 'status', 'daerah', 'desa', 'kelompok', 'kelas', 'classViewMode', 'activityType', 'activityLevel']
    const visibleOrder = visibleFilters
    return visibleOrder.indexOf(filterType)
  }

  // For 3 filters: last filter (lowest level) spans 2 columns on mobile
  const getFilterClass = (index: number) => {
    // console.log('filterCount', filterCount)
    // console.log('index', index)
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
      {/* Comparison Level Filter - FIRST! */}
      {showComparisonLevel && (
        <div className={getFilterClass(getFilterIndex('comparisonLevel'))}>
          <InputFilter
            id="comparisonLevelFilter"
            label="Bandingkan"
            value={comparisonLevel}
            onChange={(value) => onComparisonLevelChange?.(value as 'class' | 'kelompok' | 'desa' | 'daerah')}
            options={availableComparisonLevels}
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
          />
        </div>
      )}

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
          {variant === 'page' && !forceSingleSelectGroupings ? (
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
              allOptionLabel={(hideAllOption || forceSingleSelectGroupings) ? undefined : "Semua Desa"}
              placeholder={(hideAllOption || forceSingleSelectGroupings) ? "Pilih Desa" : undefined}
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              required={requiredFields.desa}
              error={!!errors.desa}
              hint={errors.desa}
              disabled={!!effectiveShouldShowDaerah && !filters?.daerah?.[0]}
            />
          )}
        </div>
      )}

      {effectiveShouldShowKelompok && (
        <div className={getFilterClass(getFilterIndex('kelompok'))}>
          {variant === 'page' && !forceSingleSelectGroupings ? (
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
              allOptionLabel={(hideAllOption || forceSingleSelectGroupings) ? undefined : "Semua Kelompok"}
              placeholder={(hideAllOption || forceSingleSelectGroupings) ? "Pilih Kelompok" : undefined}
              widthClassName="!max-w-full"
              variant={variant}
              compact={compact}
              required={requiredFields.kelompok}
              error={!!errors.kelompok}
              hint={errors.kelompok}
              disabled={!!effectiveShouldShowDesa && !filters?.desa?.[0]}
            />
          )}
        </div>
      )}

      {showCategoryGroup && (
        <div className={getFilterClass(getFilterIndex('categoryGroup'))}>
          <InputFilter
            id="categoryGroupFilter"
            label="Kategori"
            value={categoryGroup || ''}
            onChange={(value) => onCategoryGroupChange?.(value as 'caberawit' | 'muda_mudi' | 'orang_tua' | undefined || undefined)}
            options={[
              { value: 'caberawit', label: 'Caberawit' },
              { value: 'muda_mudi', label: 'Muda Mudi' },
              { value: 'orang_tua', label: 'Orang Tua' },
            ]}
            allOptionLabel="Semua Kategori"
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
          />
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

      {/* {classViewMode !== undefined && !isAdminKelompok && kelompokListCount > 1 && onClassViewModeChange && (
        <div className={getFilterClass(getFilterIndex('classViewMode'))}>
          <InputFilter
            id="classViewModeFilter"
            label="Kelas Sama"
            value={classViewMode}
            onChange={handleClassViewModeChange}
            options={[
              { value: 'separated', label: 'Dipisah' },
              { value: 'combined', label: 'Digabung' }
            ]}
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
          />
        </div>
      )} */}

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

      {showActivityType && (
        <div className={getFilterClass(getFilterIndex('activityType'))}>
          <MultiSelectFilter
            id="activityTypeFilter"
            label="Tipe Kegiatan"
            value={filters?.activityType || []}
            onChange={handleActivityTypeChange}
            options={activityTypeOptions ?? (activityTypes || []).filter((t: any) => t.is_active).map((t: any) => ({
              value: t.id,
              label: t.name
            }))}
            allOptionLabel="Semua Tipe"
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
            placeholder="Pilih Tipe"
          />
        </div>
      )}

      {showActivityLevel && (
        <div className={getFilterClass(getFilterIndex('activityLevel'))}>
          <MultiSelectFilter
            id="activityLevelFilter"
            label="Tingkat Kegiatan"
            value={filters?.activityLevel || []}
            onChange={handleActivityLevelChange}
            options={(activityLevels || []).filter((l: any) => l.is_active).map((l: any) => ({
              value: l.id,
              label: l.name
            }))}
            allOptionLabel="Semua Tingkat"
            widthClassName="!max-w-full"
            variant={variant}
            compact={compact}
            placeholder="Pilih Tingkat"
          />
        </div>
      )}

    </div>
  )
}
