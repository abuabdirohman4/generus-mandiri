'use client'

import useSWR from 'swr'
import { getAttendanceReport, type ReportData, type ReportFilters } from '../actions'
import { generateDummyReportData } from '@/lib/dummy/processAttendanceLogs'


interface UseReportDataOptions {
  filters: {
    // General mode filters
    month?: number
    year?: number
    viewMode?: 'general' | 'detailed'

    // Detailed mode filters - Period-specific
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    classId?: string
    kelompokId?: string
    gender?: string
    meetingType?: string
    
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
    kelompokId: filters.kelompokId || undefined,
    gender: filters.gender || undefined,
    meetingType: filters.meetingType || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    
    // Period-specific filters
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

  // Only fetch if classId is provided (either from classId or organisasi.kelas)
  const shouldFetch = enabled && !!apiFilters.classId
  const swrKey = shouldFetch ? ['report-data', apiFilters, useDummyData] : null

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
      // SWR retry configuration: retry 3 times before giving up
      errorRetryCount: 3,
      errorRetryInterval: 1000, // 1 second between retries
      shouldRetryOnError: true,
      // Only log error after all retries failed
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {

        // Don't retry more than 3 times
        if (retryCount >= 3) {
          console.error('[SWR] All retries failed:', error)
          return
        }

        // Retry after delay
        setTimeout(() => revalidate({ retryCount }), config.errorRetryInterval)
      },
      onError: (error, key) => {
        // Only show error in console after all retries failed
        console.error('[Laporan] Error fetching report data after retries:', error)
        console.error('[Laporan] SWR Key:', key)
        console.error('[Laporan] Filters:', apiFilters)
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

