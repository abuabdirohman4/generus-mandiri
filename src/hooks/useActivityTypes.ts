'use client'

import useSWR from 'swr'
import { getAllActivityTypes } from '@/app/(admin)/kegiatan/actions'
import { activityTypeKeys } from '@/lib/swr'

const fetcher = () => getAllActivityTypes()

export function useActivityTypes() {
  const { data, error, isLoading, mutate } = useSWR(
    activityTypeKeys.list(),
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
    activityTypes: data,
    isLoading,
    error: error?.message,
    mutate
  }
}
