'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import type { ClassMonitoringData } from '../actions'
import { aggregateMonitoringData, type AggregatedData } from '../utils/aggregateMonitoringData'

// Re-export for backward compatibility
type ChartDataPoint = AggregatedData

interface ComparisonChartProps {
  monitoringData: ClassMonitoringData[]
  comparisonLevel: 'class' | 'kelompok' | 'desa' | 'daerah'
  filters: {
    kelompok: string[]
    kelas: string[]
    desa: string[]
    daerah: string[]
  }
  isLoading?: boolean
}

// Helper function to get bar color based on attendance rate
function getBarColor(rate: number): string {
  if (rate >= 80) return '#10B981' // green-500
  if (rate >= 60) return '#F59E0B' // yellow-500
  return '#EF4444' // red-500
}

// Custom label component for bar values
const CustomLabel = (props: any) => {
  const { x, y, width, value } = props
  const yPos = value >= 95 ? y - 3 : y - 5

  return (
    <text
      x={x + width / 2}
      y={yPos}
      fill="#6B7280"
      textAnchor="middle"
      fontSize={12}
      fontWeight="500"
    >
      {value}%
    </text>
  )
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {data.name}
        </p>
        <div className="space-y-1 mt-2">
          <p className="text-sm">
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {data.attendance_rate}%
            </span> kehadiran
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {data.meeting_count} Pertemuan
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {data.student_count} Peserta
          </p>
        </div>
      </div>
    )
  }
  return null
}

export default function ComparisonChart({
  monitoringData,
  comparisonLevel,
  filters,
  isLoading = false
}: ComparisonChartProps) {
  // Prepare chart data using shared utility
  const chartData = useMemo(() => {
    if (!monitoringData || monitoringData.length === 0) return []
    return aggregateMonitoringData(monitoringData, comparisonLevel, filters)
  }, [monitoringData, comparisonLevel, filters])

  // Get level label for display
  const levelLabel = comparisonLevel === 'class' ? 'Kelas' :
                     comparisonLevel === 'kelompok' ? 'Kelompok' :
                     comparisonLevel === 'desa' ? 'Desa' : 'Daerah'

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  // Empty state: no entities available or no filter selected
  if (chartData.length === 0) {
    // For class level, check if classes are selected
    if (comparisonLevel === 'class') {
      const selectedClassIds = filters.kelas
      if (!selectedClassIds || selectedClassIds.length === 0) {
        return (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Perbandingan {levelLabel}
            </h3>
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  Pilih {levelLabel}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Pilih minimal 1 {levelLabel.toLowerCase()} di filter untuk melihat perbandingan kehadiran.
                </p>
              </div>
            </div>
          </div>
        )
      }
    }

    // For organizational levels or when no data available after filtering
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Perbandingan {levelLabel}
        </h3>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Tidak ada data
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tidak ada data kehadiran untuk {levelLabel.toLowerCase()} di periode ini.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show warning if too many entities selected
  const selectedEntityIds = comparisonLevel === 'class' ? filters.kelas :
                            comparisonLevel === 'kelompok' ? filters.kelompok :
                            comparisonLevel === 'desa' ? filters.desa : filters.daerah
  const showWarning = (selectedEntityIds?.length || 0) > 15

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Perbandingan {levelLabel}
      </h3>

      {showWarning && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 Terlalu banyak {levelLabel.toLowerCase()} dipilih. Pilih maksimal 15 untuk perbandingan yang optimal.
          </p>
        </div>
      )}

      {chartData.length === 1 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 Pilih 2 atau lebih {levelLabel.toLowerCase()} untuk perbandingan yang lebih bermakna.
          </p>
        </div>
      )}

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 25, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#6B7280' }}
              angle={chartData.length > 5 ? -45 : 0}
              textAnchor={chartData.length > 5 ? 'end' : 'middle'}
              height={chartData.length > 5 ? 80 : 30}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#6B7280' }}
              label={{
                value: 'Persentase Kehadiran (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#6B7280' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="attendance_rate"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.attendance_rate)} />
              ))}
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
