'use client'

import { useMemo, useEffect, useCallback } from 'react'
import { useLaporan } from '../stores/laporanStore'
import { useReportData } from './useReportData'
import { useClasses } from '@/hooks/useClasses'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { isAdmin } from '@/lib/userUtils'
import { Dayjs } from 'dayjs'

/**
 * Main hook yang menggabungkan store state, SWR hooks, dan computed values
 */
export function useLaporanPage() {
  // Store state
  const { filters, setFilters, resetFilters, setFilter, hasActiveFilters, filterCount } = useLaporan()
  
  // User profile for class filtering
  const { profile: userProfile } = useUserProfile()
  
  // Organisasi data
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()
  
  // SWR hooks
  const { data: reportData, error, isLoading, mutate } = useReportData({ 
    filters: {
      // General mode filters
      month: filters.viewMode === 'general' ? filters.month : undefined,
      year: filters.viewMode === 'general' ? filters.year : undefined,
      viewMode: filters.viewMode,
      
      // Detailed mode filters
      period: filters.period,
      classId: filters.organisasi?.kelas || filters.classId || undefined,
      
      // Period-specific filters
      ...(filters.period === 'daily' && {
        startDate: filters.startDate?.format('YYYY-MM-DD') || undefined,
        endDate: filters.endDate?.format('YYYY-MM-DD') || undefined
      }),
      ...(filters.period === 'weekly' && {
        weekYear: filters.weekYear,
        weekMonth: filters.weekMonth,
        startWeekNumber: filters.startWeekNumber,
        endWeekNumber: filters.endWeekNumber
      }),
      ...(filters.period === 'monthly' && {
        monthYear: filters.monthYear,
        startMonth: filters.startMonth,
        endMonth: filters.endMonth
      }),
      ...(filters.period === 'yearly' && {
        startYear: filters.startYear,
        endYear: filters.endYear
      })
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
    if (!reportData?.chartData) return []
    return reportData.chartData
  }, [reportData?.chartData])

  const trendChartData = useMemo(() => {
    if (!reportData?.trendChartData) return []
    return reportData.trendChartData
  }, [reportData?.trendChartData])

  // Auto-set class filter for teachers
  useEffect(() => {
    if (userProfile?.role === 'teacher' && userProfile.classes?.[0]?.id && !filters.classId) {
      setFilter('classId', userProfile.classes[0].id)
    }
  }, [userProfile?.role, userProfile?.classes, filters.classId, setFilter])

  // Actions
  const handleFilterChange = (key: string, value: string) => {
    // Convert numeric fields to numbers
    const numericFields = ['month', 'year', 'weekYear', 'weekMonth', 'startWeekNumber', 'endWeekNumber', 'monthYear', 'startMonth', 'endMonth', 'startYear', 'endYear']
    
    if (numericFields.includes(key)) {
      const numericValue = parseInt(value) || 0
      setFilter(key as keyof typeof filters, numericValue)
    } else {
      setFilter(key as keyof typeof filters, value)
    }
  }

  const handleDateChange = (key: 'startDate' | 'endDate', date: Dayjs | null) => {
    setFilter(key, date)
  }

  const handleWeekChange = (weeks: [Dayjs | null, Dayjs | null]) => {
    setFilter('startDate', weeks[0])
    setFilter('endDate', weeks[1])
  }

  const handleResetFilters = () => {
    resetFilters()
  }

  const handleOrganisasiFilterChange = useCallback((organisasiFilters: { daerah: string; desa: string; kelompok: string; kelas: string }) => {
    setFilter('organisasi', organisasiFilters)
  }, [setFilter])

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
    trendChartData,
    classes,
    daerah,
    desa,
    kelompok,
    userProfile,
    
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
    handleWeekChange,
    handleResetFilters,
    handleOrganisasiFilterChange,
    mutate,
    
    // Computed
    classOptions: classes.map(cls => ({ value: cls.id, label: cls.name })),
    periodOptions: [
      { value: 'daily', label: 'Harian' },
      // { value: 'weekly', label: 'Mingguan' },
      { value: 'monthly', label: 'Bulanan' },
      // { value: 'yearly', label: 'Tahunan' }
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
