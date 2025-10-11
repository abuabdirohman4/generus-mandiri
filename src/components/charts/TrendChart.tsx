'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LabelList } from 'recharts'

interface TrendChartData {
  date: string
  fullDate: string
  percentage: number
  details?: {
    present: number
    absent: number
    excused: number
    sick: number
    total: number
  }
}

interface TrendChartProps {
  data: TrendChartData[]
  title?: string
  isLoading?: boolean
  className?: string
}

type ChartType = 'line' | 'bar'

export default function TrendChart({ 
  data, 
  title = "Tren Kehadiran",
  isLoading = false,
  className = ''
}: TrendChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line')

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">
            {data.fullDate}
          </p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {data.percentage}%
              </span> kehadiran
            </p>
            {data.details && (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data.details.present} hadir, {data.details.absent} alfa
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data.details.excused} izin, {data.details.sick} sakit
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total: {data.details.total} catatan
                </p>
              </>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  // Show empty state
  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {title}
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
              Tidak ada data kehadiran untuk periode yang dipilih.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${className}`}>
      {/* Chart Controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              chartType === 'line'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Garis
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              chartType === 'bar'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Batang
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6B7280' }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6B7280' }}
                label={{ 
                  value: 'Persentase Kehadiran (%)', 
                  angle: -90, 
                  position: 'insideLeft' 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              >
                <LabelList 
                  dataKey="percentage" 
                  position="top" 
                  formatter={(value: any) => `${value}%`}
                  style={{ fontSize: 12, fill: '#6B7280' }}
                />
              </Line>
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6B7280' }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6B7280' }}
                label={{ 
                  value: 'Persentase Kehadiran (%)', 
                  angle: -90, 
                  position: 'insideLeft' 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="percentage"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              >
                <LabelList 
                  dataKey="percentage" 
                  position="top" 
                  formatter={(value: any) => `${value}%`}
                  style={{ fontSize: 12, fill: '#6B7280' }}
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
