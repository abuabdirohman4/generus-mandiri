'use client'

import { useMemo } from 'react'
import { useLaporan } from '../stores/laporanStore'
import { useReportData, useClasses } from './useReportData'
import { Dayjs } from 'dayjs'

/**
 * Main hook yang menggabungkan store state, SWR hooks, dan computed values
 */
export function useLaporanPage() {
  // Store state
  const { filters, setFilters, resetFilters, setFilter, hasActiveFilters, filterCount } = useLaporan()
  
  // SWR hooks
  const { data: reportData, error, isLoading, mutate } = useReportData({ 
    filters: {
      period: filters.period,
      classId: filters.classId || undefined,
      startDate: filters.startDate?.format('DD-MM-YYYY') || undefined,
      endDate: filters.endDate?.format('DD-MM-YYYY') || undefined
    }
  })
  
  const { classes, isLoading: isLoadingClasses } = useClasses()

  // Computed values
  const tableData = useMemo(() => {
    if (!reportData?.detailedRecords) return []
    
    return reportData.detailedRecords
      .sort((a, b) => a.student_name.localeCompare(b.student_name))
      .map((record, index) => ({
        no: index + 1,
        student_name: record.student_name,
        class_name: record.class_name,
        total_days: record.total_days,
        hadir: record.hadir,
        izin: record.izin,
        sakit: record.sakit,
        alpha: record.alpha,
        attendance_rate: `${record.attendance_rate}%`,
      }))
  }, [reportData?.detailedRecords])

  const summaryStats = useMemo(() => {
    if (!reportData?.summary) return null
    
    const { summary } = reportData
    const attendanceRate = summary.total > 0 
      ? Math.round((summary.hadir / summary.total) * 100)
      : 0

    return {
      ...summary,
      attendanceRate,
      periodLabel: getPeriodLabel(filters.period),
      dateRange: reportData.dateRange
    }
  }, [reportData?.summary, filters.period, reportData?.dateRange])

  const chartData = useMemo(() => {
    return reportData?.chartData || []
  }, [reportData?.chartData])

  // Actions
  const handleFilterChange = (key: string, value: string) => {
    setFilter(key as keyof typeof filters, value)
  }

  const handleDateChange = (key: 'startDate' | 'endDate', date: Dayjs | null) => {
    setFilter(key, date)
  }

  const handleResetFilters = () => {
    resetFilters()
  }

  // Loading states
  const loading = isLoading || isLoadingClasses
  const hasError = !!error
  const hasData = !!reportData

  return {
    // Data
    reportData,
    tableData,
    summaryStats,
    chartData,
    classes,
    
    // State
    filters,
    loading,
    error,
    hasError,
    hasData,
    hasActiveFilters,
    filterCount,
    
    // Actions
    handleFilterChange,
    handleDateChange,
    handleResetFilters,
    mutate,
    
    // Computed
    classOptions: classes.map(cls => ({
      value: cls.id,
      label: cls.name
    })),
    periodOptions: [
      { value: 'daily', label: 'Harian' },
      { value: 'weekly', label: 'Mingguan' },
      { value: 'monthly', label: 'Bulanan' },
      { value: 'yearly', label: 'Tahunan' }
    ]
  }
}

/**
 * Helper function to get period label
 */
function getPeriodLabel(period: string): string {
  switch (period) {
    case 'daily': return 'Harian'
    case 'weekly': return 'Mingguan'
    case 'monthly': return 'Bulanan'
    case 'yearly': return 'Tahunan'
    default: return 'Bulanan'
  }
}
