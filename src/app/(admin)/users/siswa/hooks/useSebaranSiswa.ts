'use client'

import useSWR from 'swr'
import { getSebaranSiswa } from '../actions/sebaran/actions'
import { sebaranSiswaKeys } from '@/lib/swr'

export function useSebaranSiswa(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? sebaranSiswaKeys.all(userId) : null,
    () => getSebaranSiswa(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000,
    }
  )

  return {
    sebaranData: data?.data,
    sebaranStats: data?.stats,
    sebaranError: error || data?.error,
    sebaranLoading: isLoading,
    refreshSebaran: mutate,
  }
}
