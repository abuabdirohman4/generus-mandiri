'use client'

import { useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectFilter from '@/components/form/input/MultiSelectFilter'

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
  }
  errors?: {                            // NEW - field-specific error messages
    daerah?: string
    desa?: string
    kelompok?: string
    kelas?: string
  }
  filterLists?: {                       // NEW - override for filtered lists
    daerahList?: Daerah[]
    desaList?: Desa[]
    kelompokList?: Kelompok[]
  }
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
  showDaerah,
  showDesa,
  showKelompok,
  className = "grid gap-x-4",
  variant = 'page',
  compact = false,
  hideAllOption = false,
  requiredFields = {},
  errors = {},
  filterLists
}: DataFilterProps) {
  
  // Role detection logic
  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isAdminDaerah = userProfile?.role === 'admin' && userProfile?.daerah_id && !userProfile?.desa_id
  const isAdminDesa = userProfile?.role === 'admin' && userProfile?.desa_id && !userProfile?.kelompok_id
  const isAdminKelompok = userProfile?.role === 'admin' && userProfile?.kelompok_id
  const isTeacher = userProfile?.role === 'teacher'

  // Use filtered lists if provided, otherwise use full lists
  const activeDaerahList = filterLists?.daerahList || daerahList
  const activeDesaList = filterLists?.desaList || desaList
  const activeKelompokList = filterLists?.kelompokList || kelompokList

  // Determine which filters to show (use override props if provided, otherwise use role-based logic)
  const shouldShowDaerah = showDaerah !== undefined ? showDaerah : isSuperAdmin
  const shouldShowDesa = showDesa !== undefined ? showDesa : (isSuperAdmin || isAdminDaerah)
  const shouldShowKelompok = showKelompok !== undefined ? showKelompok : (isSuperAdmin || isAdminDaerah || isAdminDesa)
  const teacherHasMultipleClasses = isTeacher && userProfile?.classes && userProfile.classes.length > 1
  const showKelasFilter = showKelas && (isSuperAdmin || isAdminDaerah || isAdminDesa || isAdminKelompok || teacherHasMultipleClasses)

  // Teacher special case - only show Kelas filter if they have multiple classes
  if (isTeacher && teacherHasMultipleClasses && showKelas && !showGender) {
    return (
      <div className={cn("grid gap-x-4 grid-cols-1", className)}>
        <MultiSelectFilter
          id="kelasFilter"
          label="Kelas"
          value={filters.kelas || []}
          onChange={(value) => onFilterChange({ ...filters, kelas: value })}
          options={userProfile.classes?.map(c => ({ value: c.id, label: c.name })) || []}
          allOptionLabel="Semua Kelas"
          widthClassName="!max-w-full"
          variant={variant}
          compact={compact}
        />
      </div>
    )
  }

  // If no filters to show, return null
  if (!showGender && !shouldShowDaerah && !shouldShowDesa && !shouldShowKelompok && !showKelasFilter) {
    return null
  }

  // Filter options based on cascading logic
  const filteredDesaList = useMemo(() => {
    if (!shouldShowDesa) return []
    
    if (isSuperAdmin) {
      // Superadmin: filter by selected Daerah
      if (filters?.daerah && filters.daerah.length > 0) {
        return activeDesaList.filter(desa => filters.daerah.includes(desa.daerah_id))
      }
      return activeDesaList
    } else if (isAdminDaerah) {
      // Admin Daerah: filter by their daerah_id
      return activeDesaList.filter(desa => desa.daerah_id === userProfile?.daerah_id)
    }
    
    return activeDesaList
  }, [activeDesaList, filters?.daerah, userProfile?.daerah_id, isSuperAdmin, isAdminDaerah, shouldShowDesa])

  const filteredKelompokList = useMemo(() => {
    if (!shouldShowKelompok) return []
    
    if (isSuperAdmin) {
      // Superadmin: filter by selected Desa, but also consider Daerah filter
      if (filters?.desa && filters.desa.length > 0) {
        return activeKelompokList.filter(kelompok => filters.desa.includes(kelompok.desa_id))
      } else if (filters?.daerah && filters.daerah.length > 0) {
        // If no Desa selected but Daerah is selected, filter by desas in that daerah
        const validDesaIds = filteredDesaList.map(d => d.id)
        return activeKelompokList.filter(kelompok => validDesaIds.includes(kelompok.desa_id))
      }
      return activeKelompokList
    } else if (isAdminDaerah) {
      // Admin Daerah: filter by selected Desa or their desa_id
      if (filters?.desa && filters.desa.length > 0) {
        return activeKelompokList.filter(kelompok => filters.desa.includes(kelompok.desa_id))
      } else if (userProfile?.desa_id) {
        return activeKelompokList.filter(kelompok => kelompok.desa_id === userProfile.desa_id)
      }
      return activeKelompokList
    } else if (isAdminDesa) {
      // Admin Desa: filter by their desa_id
      return activeKelompokList.filter(kelompok => kelompok.desa_id === userProfile?.desa_id)
    }
    
    return activeKelompokList
  }, [activeKelompokList, filters?.desa, filters?.daerah, filteredDesaList, userProfile?.desa_id, isSuperAdmin, isAdminDaerah, isAdminDesa, shouldShowKelompok])

  const filteredClassList = useMemo(() => {
    if (!showKelasFilter) return []
    
    if (isSuperAdmin || isAdminDaerah || isAdminDesa) {
      // Get valid kelompok IDs from filteredKelompokList
      const validKelompokIds = filteredKelompokList.map(k => k.id)
      
      // Filter classes by valid kelompok IDs
      if (validKelompokIds.length > 0) {
        return classList.filter(cls => 
          cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id)
        )
      }
      
      // If no kelompok filter applied, show all classes
      return classList
    } else if (isAdminKelompok) {
      // Admin Kelompok: filter by their kelompok_id
      return classList.filter(cls => cls.kelompok_id === userProfile?.kelompok_id)
    }
    
    return classList
  }, [classList, filteredKelompokList, isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok, showKelasFilter])

  // Deduplicate class names and count occurrences
  const uniqueClassList = useMemo(() => {
    if (!filteredClassList.length) return []
    
    // Group classes by name
    const classGroups = filteredClassList.reduce((acc, cls) => {
      if (!acc[cls.name]) {
        acc[cls.name] = {
          name: cls.name,
          ids: [],
          count: 0
        }
      }
      acc[cls.name].ids.push(cls.id)
      acc[cls.name].count++
      return acc
    }, {} as Record<string, { name: string; ids: string[]; count: number }>)
    
    // Convert to array with formatted labels
    return Object.values(classGroups).map(group => ({
      value: group.ids.join(','), // Store all IDs comma-separated for backward compatibility
      label: group.count > 1 ? `${group.name} (${group.count} kelompok)` : group.name,
      name: group.name,
      ids: group.ids
    }))
  }, [filteredClassList])

  // Handlers with cascading reset logic
  const handleDaerahChange = useCallback((value: string[]) => {
    onFilterChange({
      daerah: value,
      desa: [], // Reset desa when daerah changes
      kelompok: [], // Reset kelompok when daerah changes
      kelas: [] // Reset kelas when daerah changes
    })
  }, [onFilterChange])

  const handleDesaChange = useCallback((value: string[]) => {
    onFilterChange({
      daerah: filters?.daerah || [],
      desa: value,
      kelompok: [], // Reset kelompok when desa changes
      kelas: [] // Reset kelas when desa changes
    })
  }, [filters?.daerah, onFilterChange])

  const handleKelompokChange = useCallback((value: string[]) => {
    onFilterChange({
      daerah: filters?.daerah || [],
      desa: filters?.desa || [],
      kelompok: value,
      kelas: [] // Reset kelas when kelompok changes
    })
  }, [filters?.daerah, filters?.desa, onFilterChange])

  const handleKelasChange = useCallback((value: string[]) => {
    onFilterChange({
      daerah: filters?.daerah || [],
      desa: filters?.desa || [],
      kelompok: filters?.kelompok || [],
      kelas: value
    })
  }, [filters?.daerah, filters?.desa, filters?.kelompok, onFilterChange])

  const handleGenderChange = useCallback((value: string) => {
    onFilterChange({
      ...filters,
      gender: value
    })
  }, [filters, onFilterChange])

  // Determine visible filters and their order
  const visibleFilters = [
    showGender && 'gender', // NEW - add gender first
    shouldShowDaerah && 'daerah',
    shouldShowDesa && 'desa',
    shouldShowKelompok && 'kelompok',
    showKelasFilter && 'kelas'
  ].filter(Boolean)

  const filterCount = visibleFilters.length

  // Responsive layout classes
  const containerClass = cn(
    variant === 'modal' 
      ? (compact ? "space-y-6" : "space-y-4")
      : "grid gap-x-4",
    variant === 'page' && filterCount === 1 && "grid-cols-1 md:grid-cols-4",
    variant === 'page' && filterCount === 2 && "grid-cols-2 md:grid-cols-4",
    variant === 'page' && filterCount === 3 && "grid-cols-2 md:grid-cols-4",
    variant === 'page' && filterCount === 4 && "grid-cols-2 md:grid-cols-4",
    variant === 'modal' && filterCount === 1 && "grid-cols-1",
    variant === 'modal' && filterCount === 2 && "grid-cols-1",
    variant === 'modal' && filterCount === 3 && "grid-cols-1",
    variant === 'modal' && filterCount === 4 && "grid-cols-1",
    className
  )

  // Helper function to calculate filter index
  const getFilterIndex = (filterType: string) => {
    const filterOrder = ['gender', 'daerah', 'desa', 'kelompok', 'kelas']
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
      {shouldShowDaerah && (
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
      
      {shouldShowDesa && (
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
      
      {shouldShowKelompok && (
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
            />
          )}
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
    </div>
  )
}
