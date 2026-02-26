'use client'

import { useMemo, useEffect, useCallback } from 'react'
import { useLaporan } from '../stores/laporanStore'
import { useReportData } from './useReportData'
import { useClasses } from '@/hooks/useClasses'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
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
      classId: filters.organisasi?.kelas?.length ? filters.organisasi.kelas.join(',') : filters.classId || undefined,
      kelompokId: filters.organisasi?.kelompok?.length ? filters.organisasi.kelompok.join(',') : undefined,
      gender: filters.gender || undefined,
      meetingType: filters.meetingType?.length ? filters.meetingType.join(',') : undefined,
      
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

  // Computed values - filter classes based on user role
  const tableData = useMemo(() => {
    if (!reportData?.detailedRecords) return []
    
    return reportData.detailedRecords
      .sort((a, b) => a.student_name.localeCompare(b.student_name))
      .map((record, index) => {
        // Filter classes based on user role
        let displayClassNames = record.class_name

        // If we have all_classes data
        if (record.all_classes && record.all_classes.length > 0) {
          if (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') {
            // Admin: show all classes
            displayClassNames = record.all_classes.map(c => c.name).join(', ')
          } else if (userProfile?.role === 'teacher') {
            // Check if hierarchical teacher (Guru Desa/Daerah)
            const isHierarchicalTeacher = (userProfile.daerah_id || userProfile.desa_id || userProfile.kelompok_id) &&
                                           (!userProfile.classes || userProfile.classes.length === 0)

            if (isHierarchicalTeacher) {
              // Guru Desa/Daerah: show all classes (like admin)
              displayClassNames = record.all_classes.map(c => c.name).join(', ')
            } else if (userProfile.classes && userProfile.classes.length > 0) {
              // Regular teacher: filter to only classes they teach
              const teacherClassIds = userProfile.classes.map(c => c.id)
              const studentTeacherClasses = record.all_classes.filter(c => teacherClassIds.includes(c.id))

              if (studentTeacherClasses.length > 0) {
                // For teacher with only 1 class, just show the class name
                if (userProfile.classes.length === 1) {
                  displayClassNames = studentTeacherClasses[0].name
                } else {
                  // Teacher teaches multiple classes, show all matching classes
                  displayClassNames = studentTeacherClasses.map(c => c.name).join(', ')
                }
              } else {
                // Student tidak punya kelas yang diajarkan guru ini
                displayClassNames = '-'
              }
            }
          }
          // Default: use primary class_name if no all_classes or not admin/teacher
        }

        return {
          no: index + 1,
          student_id: record.student_id,
          student_name: record.student_name,
          class_name: displayClassNames,
          // Add organizational fields for Guru Desa/Daerah
          kelompok_name: record.kelompok_name || '-',
          desa_name: record.desa_name || '-',
          daerah_name: record.daerah_name || '-',
          total_days: record.total_days,
          hadir: record.hadir,
          izin: record.izin,
          sakit: record.sakit,
          alpha: record.alpha,
          attendance_rate: `${record.attendance_rate}%`,
        }
      })
  }, [reportData?.detailedRecords, userProfile])

  const summaryStats = useMemo(() => {
    if (!reportData?.summary) return null
    
    const { summary, detailedRecords } = reportData
    const attendanceRate = summary.total > 0 
      ? Math.round((summary.hadir / summary.total) * 100)
      : 0

    // Calculate total meetings from detailedRecords (max total_days)
    // This represents the number of meetings in the period
    const totalMeetings = detailedRecords && detailedRecords.length > 0
      ? Math.max(...detailedRecords.map(record => record.total_days))
      : 0

    return {
      ...summary,
      attendanceRate,
      periodLabel: getPeriodLabel(filters.period),
      totalMeetings,
      dateRange: reportData.dateRange
    }
  }, [reportData?.summary, reportData?.detailedRecords, filters.period, reportData?.dateRange])

  const chartData = useMemo(() => {
    if (!reportData?.chartData) return []
    return reportData.chartData
  }, [reportData?.chartData])

  const trendChartData = useMemo(() => {
    if (!reportData?.trendChartData) return []
    return reportData.trendChartData
  }, [reportData?.trendChartData])

  // Auto-set class filter for teachers with exactly 1 class
  useEffect(() => {
    if (userProfile?.role === 'teacher' && userProfile.classes?.length === 1) {
      const teacherClassId = userProfile.classes[0].id
      // Check if organisasi.kelas is empty or doesn't include the teacher's class
      if (!filters.organisasi?.kelas?.includes(teacherClassId)) {
        setFilter('organisasi', {
          daerah: [],
          desa: [],
          kelompok: [],
          kelas: [teacherClassId]
        })
      }
    }
  }, [userProfile?.role, userProfile?.classes, filters.organisasi?.kelas, setFilter])

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
    // Clear SWR cache to remove data from UI
    mutate(undefined, { revalidate: false })
  }

  const handleOrganisasiFilterChange = useCallback((organisasiFilters: { daerah: string[]; desa: string[]; kelompok: string[]; kelas: string[]; gender?: string; meetingType?: string[] }) => {
    // Extract gender and meetingType from organisasiFilters and update separately
    const { gender, meetingType, ...organisasi } = organisasiFilters

    setFilter('organisasi', organisasi)
    if (gender !== undefined) {
      setFilter('gender', gender || '')
    }
    if (meetingType !== undefined) {
      setFilter('meetingType', meetingType)
    }
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
