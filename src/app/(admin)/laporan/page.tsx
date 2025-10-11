'use client'

import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { useLaporanPage } from './hooks'
import { FilterSection, SummaryCards, StatsCards, ReportChart, DataTable } from './components'
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
    classes,
    filters,
    loading,
    error,
    hasError,
    hasData,
    hasActiveFilters,
    filterCount,
    handleFilterChange,
    handleDateChange,
    handleResetFilters,
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
        {/* Filter Section */}
        <FilterSection
          filters={filters}
          periodOptions={periodOptions}
          classOptions={classOptions}
          onFilterChange={handleFilterChange}
          onDateChange={handleDateChange}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          filterCount={filterCount}
        />

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
              />

              {/* Chart */}
              <ReportChart
                chartData={chartData}
                summaryStats={summaryStats}
              />
            </div>

            {/* Data Table */}
            {/* <DataTable tableData={tableData} /> */}
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
