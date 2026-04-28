'use client'

import useSWR from 'swr'
import { getMyActivityTypes } from '@/app/(admin)/kegiatan/actions'

const fetcher = () => getMyActivityTypes()

export function useMyActivityTypes() {
  const { data, error, isLoading, mutate } = useSWR(
    'my-activity-types',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10 * 60 * 1000,
    }
  )

  return {
    activityTypes: data || [],
    isLoading,
    error: error?.message,
    mutate
  }
}
