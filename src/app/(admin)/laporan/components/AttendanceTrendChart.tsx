'use client'

import { memo } from 'react'
import { TrendChart } from '@/components/charts'

interface TrendChartData {
  date: string
  fullDate: string
  attendancePercentage: number
  presentCount: number
  absentCount: number
  excusedCount: number
  sickCount: number
  totalRecords: number
}

interface AttendanceTrendChartProps {
  chartData: TrendChartData[]
  isLoading?: boolean
  className?: string
  period?: string
  viewMode?: 'general' | 'detailed'
}

const AttendanceTrendChart = memo(function AttendanceTrendChart({ 
  chartData, 
  isLoading = false,
  className = '',
  period = 'monthly',
  viewMode = 'detailed'
}: AttendanceTrendChartProps) {
  // Transform data from laporan format to TrendChart format
  const transformedData = chartData.map(item => ({
    date: item.date,
    fullDate: item.fullDate,
    percentage: item.attendancePercentage,
    details: {
      present: item.presentCount,
      absent: item.absentCount,
      excused: item.excusedCount,
      sick: item.sickCount,
      total: item.totalRecords
    }
  }))
  
  // Generate dynamic title based on period and view mode
  const getTitle = () => {
    if (viewMode === 'general') {
      return 'Tren Kehadiran Harian'
    }
    
    switch (period) {
      case 'daily':
        return 'Tren Kehadiran Harian'
      case 'weekly':
        return 'Tren Kehadiran Mingguan'
      case 'monthly':
        return 'Tren Kehadiran Bulanan'
      case 'yearly':
        return 'Tren Kehadiran Tahunan'
      default:
        return 'Tren Kehadiran'
    }
  }

  return (
    <TrendChart 
      data={transformedData} 
      title={getTitle()} 
      isLoading={isLoading}
      className={className}
    />
  )
})

export default AttendanceTrendChart
