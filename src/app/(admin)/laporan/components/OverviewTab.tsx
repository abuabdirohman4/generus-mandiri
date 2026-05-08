'use client'

import { useState, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import StatCard from '@/app/(admin)/dashboard/components/StatCard'
import PeriodTabs, { type PeriodType } from '@/app/(admin)/dashboard/components/PeriodTabs'
import ClassMonitoringTable from '@/app/(admin)/dashboard/components/ClassMonitoringTable'
import DataFilter from '@/components/shared/DataFilter'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useClasses } from '@/hooks/useClasses'
import { useUserProfile } from '@/stores/userProfileStore'
import { getClassMonitoring } from '@/app/(admin)/dashboard/actions'
import { useDashboardStore } from '@/app/(admin)/dashboard/stores/dashboardStore'
import { useDebounce } from '@/hooks/useDebounce'
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'
import { useLaporanStore } from '../stores/laporanStore'
import LaporanTimeFilter from './LaporanTimeFilter'
import { canAccessMaterials, canAccessMonitoring } from '@/lib/userUtils'
import { useMateriDashboard } from '@/app/(admin)/dashboard/hooks/useMateriDashboard'
import LaporanEmptyState from './LaporanEmptyState'

dayjs.locale('id')

export default function OverviewTab() {
  const { filters, setFilters, setFilter } = useDashboardStore()

  // Debounce only for the SWR cache key — limits server requests while user is
  // still interacting with filters. The fetcher always reads from raw `filters`
  // so data is always up-to-date when a fetch actually fires.
  const debouncedFiltersForKey = useDebounce(filters, 500)

  const selectedPeriod = filters.period
  const customDateRange = filters.customDateRange
  const classViewMode = filters.classViewMode

  const { sharedMonth, sharedYear, setSharedTime } = useLaporanStore()
  
  const selectedMonth = useMemo(() => 
    `${sharedYear}-${String(sharedMonth).padStart(2, '0')}`,
    [sharedMonth, sharedYear]
  )

  const { profile: userProfile } = useUserProfile()
  const { daerah, isLoading: isLoadingDaerah } = useDaerah()
  const { desa, isLoading: isLoadingDesa } = useDesa()
  const { kelompok, isLoading: isLoadingKelompok } = useKelompok()
  const { classes, isLoading: isLoadingClasses } = useClasses()
  const orgLoading = isLoadingDaerah || isLoadingDesa || isLoadingKelompok || isLoadingClasses

  const hasPencapaianAccess = useMemo(() => {
    if (!userProfile) return false
    return canAccessMaterials(userProfile) && canAccessMonitoring(userProfile)
  }, [userProfile])

  // Set default comparisonLevel based on user's org scope on first mount.
  // Only override if the current value is 'class' (the generic default) —
  // if the user has already changed it explicitly, we keep their choice.
  useEffect(() => {
    if (!userProfile) return
    const current = filters.comparisonLevel
    let suggested: typeof current = 'class'
    if (userProfile.role === 'superadmin') suggested = 'daerah'
    else if (!userProfile.kelompok_id && !userProfile.desa_id && userProfile.daerah_id) suggested = 'desa'
    else if (!userProfile.kelompok_id && userProfile.desa_id) suggested = 'kelompok'
    if (current === 'class' && suggested !== 'class') {
      setFilter('comparisonLevel', suggested)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id])

  // Only fetch when at least one org/class filter is selected to avoid
  // loading all data for large-scope accounts (daerah level) on tab open.
  const hasActiveFilter = (
    filters.daerah.length > 0 ||
    filters.desa.length > 0 ||
    filters.kelompok.length > 0 ||
    filters.kelas.length > 0
  )

  const [activeYearId, setActiveYearId] = useState('')

  // Fetch active academic year once on mount
  useEffect(() => {
    if (!hasPencapaianAccess) return
    getActiveAcademicYear().then(year => {
      if (year) setActiveYearId(year.id)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPencapaianAccess])

  // Derive semester from selectedMonth vs academic year convention:
  // Semester 1 = July–December, Semester 2 = January–June
  const activeSemester = useMemo((): 1 | 2 => {
    return sharedMonth >= 7 ? 1 : 2
  }, [sharedMonth])

  const activeStartYear = useMemo(() => sharedMonth >= 7 ? sharedYear : sharedYear - 1, [sharedMonth, sharedYear])
  const academicYearLabel = `${activeStartYear}/${activeStartYear + 1}`

  const materiFilters = {
    academicYearId: activeYearId,
    semester: activeSemester,
    daerahId: filters.daerah?.join(','),
    desaId: filters.desa?.join(','),
    kelompokId: filters.kelompok?.join(','),
    classIds: filters.kelas?.length
      ? filters.kelas.flatMap(v => v.split(','))
      : undefined,
    month: sharedMonth,
  }
  const materiEnabled = hasPencapaianAccess && !!activeYearId && hasActiveFilter && filters.comparisonLevel === 'class'

  const { data: materiDashboardData = [], isLoading: materiLoading } = useMateriDashboard(
    materiFilters,
    materiEnabled
  )

  const monitoringFetcher = async () => {
    return await getClassMonitoring({
      period: 'month',
      startDate: customDateRange?.start,
      endDate: customDateRange?.end,
      daerahId: filters.daerah,
      desaId: filters.desa,
      kelompokId: filters.kelompok,
      classId: filters.kelas,
      gender: filters.gender,
      status: filters.status,
      classViewMode,
      monthString: selectedMonth
    })
  }

  const monitoringCacheKey = useMemo(() => {
    // Use debouncedFiltersForKey so the SWR key (and therefore the fetch)
    // only changes after the user stops interacting for 500ms.
    // Spread [...arr] before .sort() to avoid mutating Zustand state in-place.
    return JSON.stringify({
      period: debouncedFiltersForKey.period,
      dateRange: debouncedFiltersForKey.customDateRange,
      daerah: [...debouncedFiltersForKey.daerah].sort().join(','),
      desa: [...debouncedFiltersForKey.desa].sort().join(','),
      kelompok: [...debouncedFiltersForKey.kelompok].sort().join(','),
      kelas: [...debouncedFiltersForKey.kelas].sort().join(','),
      gender: debouncedFiltersForKey.gender || '',
      viewMode: debouncedFiltersForKey.classViewMode,
      comparisonLevel: debouncedFiltersForKey.comparisonLevel,
      sharedMonth: sharedMonth,
      sharedYear: sharedYear
    })
  }, [debouncedFiltersForKey, selectedMonth, sharedMonth, sharedYear])

  // Pass null key when no filter selected → SWR will not fetch
  const { data: monitoringData, isLoading: monitoringLoading } = useSWR(
    hasActiveFilter ? ['class-monitoring-overview', monitoringCacheKey] : null,
    monitoringFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true }
  )

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      daerah: newFilters.daerah || [],
      desa: newFilters.desa || [],
      kelompok: newFilters.kelompok || [],
      kelas: newFilters.kelas || [],
      gender: newFilters.gender
    })
  }
  const handlePeriodChange = (period: PeriodType) => setFilter('period', period)
  const handleCustomDateChange = (start: string, end: string) => setFilter('customDateRange', { start, end })
  const handleViewModeChange = (mode: 'separated' | 'combined') => setFilter('classViewMode', mode)
  const handleComparisonLevelChange = (level: 'class' | 'kelompok' | 'desa' | 'daerah') => setFilter('comparisonLevel', level)

  const attendanceMetrics = useMemo(() => {
    if (!monitoringData || monitoringData.length === 0) {
      return { simpleAverage: 0, weightedAverage: 0, totalPresent: 0, totalPotential: 0, entityCount: 0 }
    }
    const comparisonLevel = filters.comparisonLevel
    const grouped = monitoringData.reduce((acc, cls) => {
      let entityKey: string | undefined
      if (comparisonLevel === 'class') entityKey = cls.class_name
      else if (comparisonLevel === 'kelompok') entityKey = cls.kelompok_name
      else if (comparisonLevel === 'desa') entityKey = cls.desa_name
      else entityKey = cls.daerah_name
      if (!entityKey) return acc
      if (!acc[entityKey]) {
        acc[entityKey] = { totalPresent: 0, totalPotential: 0, attendanceRate: 0, meetingIds: new Set<string>() }
      }
      if (cls.meeting_ids && cls.meeting_ids.length > 0) {
        cls.meeting_ids.forEach((id: string) => acc[entityKey!].meetingIds.add(id))
      }
      const potential = (cls.student_count || 0) * cls.meeting_count
      const present = (cls.attendance_rate / 100) * potential
      acc[entityKey].totalPresent += present
      acc[entityKey].totalPotential += potential
      return acc
    }, {} as Record<string, { totalPresent: number; totalPotential: number; attendanceRate: number; meetingIds: Set<string> }>)

    Object.keys(grouped).forEach(key => {
      const entity = grouped[key]
      entity.attendanceRate = entity.totalPotential > 0
        ? Math.round((entity.totalPresent / entity.totalPotential) * 100) : 0
    })
    const entities = Object.values(grouped)
    const entityCount = entities.length
    const simpleAverage = entityCount > 0
      ? Math.round(entities.reduce((sum, e) => sum + e.attendanceRate, 0) / entityCount) : 0
    const totalPresent = entities.reduce((sum, e) => sum + e.totalPresent, 0)
    const totalPotential = entities.reduce((sum, e) => sum + e.totalPotential, 0)
    const weightedAverage = totalPotential > 0
      ? Math.round((totalPresent / totalPotential) * 100) : 0
    return { simpleAverage, weightedAverage, totalPresent: Math.round(totalPresent), totalPotential: Math.round(totalPotential), entityCount }
  }, [monitoringData, filters.comparisonLevel])

  const materiMetrics = useMemo(() => {
    if (!materiDashboardData || materiDashboardData.length === 0) return { avg: 0 }
    const avg = Math.round(materiDashboardData.reduce((sum, item) => sum + item.avg_completion_rate, 0) / materiDashboardData.length)
    return { avg }
  }, [materiDashboardData])

  const entityLabel = useMemo(() => {
    const level = filters.comparisonLevel
    if (level === 'class') return 'Kelas'
    if (level === 'kelompok') return 'Kelompok'
    if (level === 'desa') return 'Desa'
    return 'Daerah'
  }, [filters.comparisonLevel])

  const attendanceLabel = useMemo(() => {
    return `Kehadiran`
    // if (dayjs(selectedMonth).isSame(dayjs(), 'month')) return 'Kehadiran Bulan Ini'
    // return `Kehadiran ${dayjs(selectedMonth).format('MMMM YYYY')}`
  }, [selectedMonth])

  const attendanceTooltip = useMemo(() => {
    if (!attendanceMetrics || attendanceMetrics.entityCount === 0) return ''
    const { simpleAverage, weightedAverage, totalPresent, totalPotential, entityCount } = attendanceMetrics
    return `Rata-rata ${entityCount} ${entityLabel.toLowerCase()}: ${simpleAverage}%\n\nTotal siswa hadir: ${weightedAverage}% (${totalPresent.toLocaleString('id-ID')} dari ${totalPotential.toLocaleString('id-ID')} kehadiran)`
  }, [attendanceMetrics, entityLabel])

  const materiLabel = useMemo(() => {
    // return `Pencapaian Materi s.d. ${dayjs(selectedMonth).format('MMMM YYYY')}`
    return `Pencapaian`
  }, [selectedMonth])

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-4">
        <DataFilter
          filters={{ daerah: filters.daerah, desa: filters.desa, kelompok: filters.kelompok, kelas: filters.kelas, gender: filters.gender }}
          onFilterChange={handleFilterChange}
          userProfile={userProfile}
          daerahList={daerah || []}
          desaList={desa || []}
          kelompokList={kelompok || []}
          classList={classes || []}
          showKelas={true}
          isLoading={orgLoading}
          showMeetingType={false}
          showGender={true}
          cascadeFilters={true}
          classViewMode={filters.classViewMode}
          onClassViewModeChange={handleViewModeChange}
          showComparisonLevel={true}
          comparisonLevel={filters.comparisonLevel}
          onComparisonLevelChange={handleComparisonLevelChange}
        />
        {/* Bulan & Tahun — dalam grid 2-kolom di dalam card */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <LaporanTimeFilter
            month={sharedMonth}
            year={sharedYear}
            onMonthChange={(m) => setSharedTime(m, sharedYear)}
            onYearChange={(y) => setSharedTime(sharedMonth, y)}
            semester={activeSemester}
            academicYear={academicYearLabel}
          />
        </div>
      </div>

      {!hasActiveFilter ? (
        <LaporanEmptyState 
          description="Pilih filter yang tersedia untuk melihat laporan gabungan."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-6">
            <StatCard
              title={attendanceLabel}
              value={
                monitoringLoading
                  ? <span className="inline-block h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  : `${attendanceMetrics.simpleAverage}%`
              }
              icon="✅"
              color="emerald"
              className={!hasPencapaianAccess ? 'col-span-2' : ''}
            />
            {hasPencapaianAccess && (
              <StatCard
                title={materiLabel}
                value={
                  materiLoading
                    ? <span className="inline-block h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    : `${materiMetrics.avg}%`
                }
                icon="📚"
                color="blue"
              />
            )}
          </div>

          <div className="mb-6">
            <ClassMonitoringTable
              data={monitoringData || []}
              isLoading={monitoringLoading}
              period={selectedPeriod}
              customDateRange={customDateRange}
              classViewMode={classViewMode}
              materiData={hasPencapaianAccess ? materiDashboardData : undefined}
              materiLoading={hasPencapaianAccess ? materiLoading : false}
            />
          </div>
        </>
      )}
    </div>
  )
}
