'use client'

import useSWR from 'swr'
import { getAllActivityLevels } from '@/app/(admin)/kegiatan/actions'
import { activityLevelKeys } from '@/lib/swr'

const fetcher = () => getAllActivityLevels()

export function useActivityLevels() {
  const { data, error, isLoading, mutate } = useSWR(
    activityLevelKeys.list(),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10 * 60 * 1000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )

  return {
    activityLevels: data,
    isLoading,
    error: error?.message,
    mutate
  }
}
