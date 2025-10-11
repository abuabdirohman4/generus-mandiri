'use client'

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
}

export default function AttendanceTrendChart({ 
  chartData, 
  isLoading = false,
  className = ''
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
  
  return (
    <TrendChart 
      data={transformedData} 
      title="Tren Kehadiran Harian" 
      isLoading={isLoading}
      className={className}
    />
  )
}
