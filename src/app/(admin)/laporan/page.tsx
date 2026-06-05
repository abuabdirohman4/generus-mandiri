'use client'

import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { useLaporanPage } from './hooks'
import { FilterSection, StatsCards, ReportChart, AttendanceTrendChart, DataTable } from './components'
import MateriFilterSection from './components/MateriFilterSection'
import MateriStatsCards from './components/MateriStatsCards'
import LaporanEmptyState from './components/LaporanEmptyState'
import MateriDataTable from './components/MateriDataTable'
import { useMateriReportData } from './hooks/useMateriReportData'
import { useState, useEffect, useMemo } from 'react'
import MateriTrendChart from './components/MateriTrendChart'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useLaporanStore, type LaporanTab } from '@/stores/laporanStore'
import LaporanSkeleton from '@/components/ui/skeleton/LaporanSkeleton'
import { useMyActivityTypes } from '@/hooks/useMyActivityTypes'
import { canAccessMonitoring, canAccessOverview } from '@/lib/accessControl'
import { useTeacherKelompokAccess } from '@/hooks/useTeacherKelompokAccess'
import LaporanTabHeader from './components/LaporanTabHeader'
import OverviewTab from './components/OverviewTab'

// Set Indonesian locale
dayjs.locale('id')

// Main laporan page component using new architecture
export default function LaporanPage() {
  const {
    reportData,
    tableData,
    summaryStats,
    chartData,
    trendChartData,
    classes,
    daerah,
    desa,
    kelompok,
    userProfile,
    filters,
    loading,
    error,
    hasError,
    hasData,
    hasActiveFilters,
    filterCount,
    handleFilterChange,
    handleDateChange,
    handleWeekChange,
    handleResetFilters,
    handleOrganisasiFilterChange,
    isLoadingOrgs,
    classOptions,
    periodOptions,
    sharedMonth,
    sharedYear,
    setSharedTime
  } = useLaporanPage()

  const {
    activeTab: laporanTab,
    setActiveTab: setLaporanTab,
    materiFilters,
    setMateriFilters,
    materiViewMode,
    setMateriViewMode
  } = useLaporanStore()
  
  const [materiReportMode, setMateriReportMode] = useState<'monthly' | 'cumulative'>('cumulative')

  const { activityTypes: myActivityTypes } = useMyActivityTypes()
  const allowedKelompokIds = useTeacherKelompokAccess()
  const filteredKelompok = useMemo(() => {
    if (!kelompok || allowedKelompokIds === null) return kelompok || []
    return kelompok.filter((k: any) => allowedKelompokIds.includes(k.id))
  }, [kelompok, allowedKelompokIds])

  const hasMateriAccess = useMemo(() => {
    if (!userProfile) return false
    return canAccessMonitoring(userProfile)
  }, [userProfile])

  const hasOverviewAccess = useMemo(() => {
    if (!userProfile) return false
    return canAccessOverview(userProfile)
  }, [userProfile])

  // Reset tab ke presensi jika tidak ada akses
  useEffect(() => {
    if (!hasMateriAccess && laporanTab === 'materi') {
      setLaporanTab('presensi')
    }
    if (!hasOverviewAccess && laporanTab === 'overview') {
      setLaporanTab('presensi')
    }
  }, [hasMateriAccess, hasOverviewAccess, laporanTab, setLaporanTab])

  // Calculate active semester and year derived from sharedMonth/sharedYear
  const activeSemester = useMemo(() => (sharedMonth >= 7 ? 1 : 2), [sharedMonth])
  const activeStartYear = useMemo(() => (sharedMonth >= 7 ? sharedYear : sharedYear - 1), [sharedMonth, sharedYear])
  const [activeAcademicYearId, setActiveAcademicYearId] = useState<string>('')

  // Sync academic year ID from derived start year
  useEffect(() => {
    const fetchYearId = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('academic_years')
        .select('id')
        .eq('start_year', activeStartYear)
      
      if (data && data.length > 0) {
        setActiveAcademicYearId(data[0].id)
      }
    }
    fetchYearId()
  }, [activeStartYear])

  // Initialize filters from user profile and fetch active academic year
  useEffect(() => {
    const initializeFilters = async () => {
      const supabase = createClient()
      
      // Fetch active year if not already set
      if (!materiFilters.academicYearId) {
        const { data: activeYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_active', true)
          .single()
        
        if (activeYear) {
          setMateriFilters({ academicYearId: activeYear.id })
        }
      }

      // Set org filters from profile
      if (userProfile && !materiFilters.daerahId && !materiFilters.desaId && !materiFilters.kelompokId) {
        setMateriFilters({
          daerahId: userProfile.daerah_id || '',
          desaId: userProfile.desa_id || '',
          kelompokId: userProfile.kelompok_id || '',
        })
      }
    }

    initializeFilters()
  }, [userProfile]) // Only depend on userProfile to avoid infinite loop

  // Sync materi filters with shared time
  useEffect(() => {
    setMateriFilters({
      month: sharedMonth,
      semester: activeSemester,
      academicYearId: activeAcademicYearId || materiFilters.academicYearId // Fallback to existing if not found
    })
  }, [sharedMonth, activeSemester, activeAcademicYearId, setMateriFilters])

  const visibleTabs = useMemo(() => {
    const tabs: { id: LaporanTab; label: string }[] = [{ id: 'presensi' as const, label: 'Presensi' }]
    if (hasMateriAccess) tabs.push({ id: 'materi' as const, label: 'Materi' })
    if (hasOverviewAccess) tabs.push({ id: 'overview' as const, label: 'Semua' })
    return tabs
  }, [hasMateriAccess, hasOverviewAccess])

  const { data: categories = [] } = useSWR('material-categories-options', async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('material_categories')
        .select('id, name')
        .order('name');
      return (data || []).map(c => ({ value: c.id, label: c.name }))
  })

  // Auto-select "Hafalan" category by default when loaded
  /*
  useEffect(() => {
    if (categories.length > 0 && !materiFilters.categoryId) {
      const hafalanCategory = categories.find(c => c.label.toLowerCase() === 'hafalan')
      const defaultId = hafalanCategory ? hafalanCategory.value : categories[0].value
      setMateriFilters({ categoryId: defaultId })
    }
  }, [categories, materiFilters.categoryId, setMateriFilters])
  */

  const { data: materiData, trendData: materiTrendData, isLoading: isLoadingMateri } = useMateriReportData({
      filters: materiFilters,
      enabled: laporanTab === 'materi',
      viewMode: materiViewMode,
      reportMode: materiReportMode
  })

  const handleMateriFilterChange = (key: string, value: any) => {
      setMateriFilters({ [key]: value })
  }

  if (hasError) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>Gagal memuat data laporan. Silakan coba lagi nanti.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Laporan
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Kelola data laporan
            </p>
          </div>
        </div>

        {/* Dummy Data Indicator */}
        {process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true' && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Mode Dummy Data:</strong> Data yang ditampilkan adalah data dummy untuk keperluan pengembangan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab header — hanya tampil jika user punya akses ke lebih dari satu tab */}
        {visibleTabs.length > 1 && (
          <LaporanTabHeader
            activeTab={laporanTab}
            onTabChange={setLaporanTab}
            tabs={visibleTabs}
          />
        )}

        {laporanTab === 'presensi' && (
          <>
            {/* Filter Section */}
            <FilterSection
              filters={filters}
              periodOptions={periodOptions}
              classOptions={classOptions}
              onFilterChange={handleFilterChange}
              onDateChange={handleDateChange}
              onWeekChange={handleWeekChange}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
              filterCount={filterCount}
              userProfile={userProfile}
              daerahList={daerah || []}
              desaList={desa || []}
              kelompokList={filteredKelompok}
              classList={classes || []}
              organisasiFilters={{
                ...(filters.organisasi || { daerah: [], desa: [], kelompok: [], kelas: [] }),
                gender: filters.gender || '',
                activityType: filters.activityType || [],
                activityLevel: filters.activityLevel || []
              }}
              onOrganisasiFilterChange={handleOrganisasiFilterChange}
              activityTypeOptions={myActivityTypes?.map(t => ({ value: t.id, label: t.name }))}
              isLoading={isLoadingOrgs}
              sharedMonth={sharedMonth}
              sharedYear={sharedYear}
              onMonthChange={(m) => setSharedTime(m, sharedYear)}
              onYearChange={(y) => setSharedTime(sharedMonth, y)}
              semester={activeSemester}
              academicYear={`${activeStartYear}/${activeStartYear + 1}`}
            />

            {loading ? (
              <LaporanSkeleton />
            ) : hasData ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Stats Cards */}
                  <StatsCards
                    summaryStats={summaryStats}
                    period={filters.period}
                    viewMode={filters.viewMode}
                    filters={filters}
                  />

                  {/* Chart */}
                  <ReportChart
                    key={`report-chart-${filters.period}-${filters.viewMode}`}
                    chartData={chartData}
                    summaryStats={summaryStats}
                  />
                </div>

                {/* Attendance Trend Chart */}
                <AttendanceTrendChart
                  key={`trend-chart-${filters.period}-${filters.viewMode}`}
                  chartData={trendChartData}
                  isLoading={loading}
                  period={filters.period}
                  viewMode={filters.viewMode}
                />

                {/* Data Table */}
                <div className='mt-4'>
                  <DataTable tableData={tableData} userProfile={userProfile} />
                </div>
              </>
            ) : (
              <LaporanEmptyState 
                description="Pilih filter yang tersedia untuk melihat laporan presensi."
              />
            )}
          </>
        )}

        {laporanTab === 'materi' && (
          <>
            <MateriFilterSection
              categories={categories}
              userProfile={userProfile}
              daerahList={daerah || []}
              desaList={desa || []}
              kelompokList={filteredKelompok}
              classList={classes || []}
              sharedMonth={sharedMonth}
              sharedYear={sharedYear}
              onMonthChange={(m) => setSharedTime(m, sharedYear)}
              onYearChange={(y) => setSharedTime(sharedMonth, y)}
              semester={activeSemester}
              academicYear={`${activeStartYear}/${activeStartYear + 1}`}
              reportMode={materiReportMode}
              onModeChange={setMateriReportMode}
            />

            {isLoadingMateri ? (
              <LaporanSkeleton />
            ) : materiData ? (
              <>
                <MateriStatsCards 
                  data={materiData} 
                  isLoading={isLoadingMateri} 
                  mode={materiReportMode}
                />

                {/* Trend Chart - Cumulative and Monthly */}
                {(materiReportMode === 'cumulative' || materiReportMode === 'monthly') && (
                  <div className="mb-6">
                    <MateriTrendChart
                      data={materiTrendData}
                      isLoading={isLoadingMateri}
                      semester={activeSemester}
                      viewMode={materiViewMode}
                      reportMode={materiReportMode}
                    />
                  </div>
                )}
                
                <MateriDataTable 
                  rows={materiData?.rows || []} 
                  isLoading={isLoadingMateri} 
                  siswaRows={materiData?.siswaRows || []}
                />
              </>
            ) : !isLoadingMateri && (
              <LaporanEmptyState 
                description="Pilih filter yang tersedia untuk melihat laporan materi."
              />
            )}
          </>
        )}

        {laporanTab === 'overview' && hasOverviewAccess && (
          <OverviewTab />
        )}
      </div>
    </div>
  )
}
