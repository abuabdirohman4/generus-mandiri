'use client'

import useSWR from 'swr'
import { getAttendanceReport, getClasses, type ReportData, type ReportFilters } from '../actions'
import { generateDummyReportData } from '@/lib/dummy/processAttendanceLogs'

interface Class {
  id: string
  name: string
}

interface UseReportDataOptions {
  filters: {
    // General mode filters
    month?: number
    year?: number
    viewMode?: 'general' | 'detailed'
    
    // Detailed mode filters - Period-specific
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    classId?: string
    
    // Daily filters
    startDate?: string
    endDate?: string
    
    // Weekly filters
    weekYear?: number
    weekMonth?: number
    startWeekNumber?: number
    endWeekNumber?: number
    
    // Monthly filters
    monthYear?: number
    startMonth?: number
    endMonth?: number
    
    // Yearly filters
    startYear?: number
    endYear?: number
  }
  enabled?: boolean
}

/**
 * Hook untuk fetching data laporan dengan SWR caching
 */
export function useReportData({ filters, enabled = true }: UseReportDataOptions) {
  // Check if dummy data should be used
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true'
  
  // Convert filters for API call
  const apiFilters: ReportFilters = {
    // General mode filters
    month: filters.month,
    year: filters.year,
    viewMode: filters.viewMode,
    
    // Detailed mode filters
    period: filters.period,
    classId: filters.classId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined
  }

  const swrKey = enabled ? ['report-data', apiFilters, useDummyData] : null

  const { data, error, isLoading, mutate } = useSWR<ReportData>(
    swrKey,
    async () => {
      // If using dummy data, generate from JSON
      if (useDummyData) {
        return generateDummyReportData(apiFilters)
      }
      
      // Otherwise fetch from server
      const reportData = await getAttendanceReport(apiFilters)
      return reportData
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      revalidateIfStale: true,
      revalidateOnMount: true,
      refreshInterval: 0,
      onError: (error) => {
        console.error('Error fetching report data:', error)
        console.error('SWR Key:', swrKey)
        console.error('Filters:', apiFilters)
        console.error('Using dummy data:', useDummyData)
      }
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
    useDummyData,
    // Helper to check if data is available
    hasData: !!data,
    // Helper to get error message
    errorMessage: error?.message || (error ? 'Failed to fetch report data' : null)
  }
}

/**
 * Hook untuk fetching daftar kelas
 */
export function useClasses() {
  const { data, error, isLoading, mutate } = useSWR<Class[]>(
    'classes-list',
    async () => {
      const classes = await getClasses()
      return classes
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds for classes (less frequent updates)
      revalidateIfStale: true,
      revalidateOnMount: true,
      refreshInterval: 0,
      onError: (error) => {
        console.error('Error fetching classes:', error)
      }
    }
  )

  return {
    classes: data || [],
    error,
    isLoading,
    mutate,
    hasClasses: !!data && data.length > 0
  }
}
