'use client'

import { memo } from 'react'
import AttendancePieChart from '@/components/charts/AttendancePieChart'

interface ChartData {
  name: string
  value: number
}

interface ReportChartProps {
  chartData: ChartData[]
  summaryStats: {
    total: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    attendanceRate: number
  } | null
}

const ReportChart = memo(function ReportChart({ chartData, summaryStats }: ReportChartProps) {
  if (!summaryStats) return null

  const { total, hadir, izin, sakit, alpha, attendanceRate } = summaryStats

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Visualisasi Kehadiran
      </h3>
      
      {chartData.length > 0 ? (
        <div className="h-64">
          <AttendancePieChart data={chartData} />
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Tidak ada data
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tidak ada data kehadiran untuk ditampilkan.
            </p>
          </div>
        </div>
      )}
    </div>
  )
})

export default ReportChart
