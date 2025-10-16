'use client'

import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { useLaporanPage } from './hooks'
import { FilterSection, SummaryCards, StatsCards, ReportChart, AttendanceTrendChart, DataTable } from './components'
import DataFilter from '@/components/shared/DataFilter'
import LaporanSkeleton from '@/components/ui/skeleton/LaporanSkeleton'

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
    classOptions,
    periodOptions
  } = useLaporanPage()

  if (hasError) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
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
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Dummy Data Indicator */}
        {process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true' && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
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

        {/* Filter Section */}
        <div className="space-y-4">
          {/* <DataFilter
            filters={filters.organisasi}
            onFilterChange={handleOrganisasiFilterChange}
            userProfile={userProfile}
            daerahList={daerah || []}
            desaList={desa || []}
            kelompokList={kelompok || []}
            classList={classes || []}
            showKelas={true}
          /> */}
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
          />
        </div>

        {loading ? (
          <LaporanSkeleton />
        ) : hasData ? (
          <>
            {/* Summary Cards */}
            {/* <SummaryCards summary={reportData!.summary} /> */}

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
            <DataTable tableData={tableData} />
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Tidak ada data
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tidak ada data laporan yang tersedia.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
