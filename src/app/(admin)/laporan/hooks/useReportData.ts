'use client'

import useSWR from 'swr'
import { getAttendanceReport, getClasses, type ReportData, type ReportFilters } from '../actions'

interface Class {
  id: string
  name: string
}

interface UseReportDataOptions {
  filters: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    classId: string | undefined
    startDate: string | undefined
    endDate: string | undefined
  }
  enabled?: boolean
}

/**
 * Hook untuk fetching data laporan dengan SWR caching
 */
export function useReportData({ filters, enabled = true }: UseReportDataOptions) {
  // Convert dayjs objects to strings for API call
  const apiFilters: ReportFilters = {
    period: filters.period,
    classId: filters.classId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined
  }

  const swrKey = enabled ? ['report-data', apiFilters] : null

  const { data, error, isLoading, mutate } = useSWR<ReportData>(
    swrKey,
    async () => {
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
      }
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
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
