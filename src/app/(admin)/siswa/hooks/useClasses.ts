'use client'

import useSWR from 'swr'
import { getClasses, type Class } from '../actions'
import { classKeys } from '@/lib/swr'

export function useClasses() {
  const { data, error, isLoading, mutate } = useSWR(
    classKeys.list(),
    getClasses,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes - classes change less frequently
    }
  )

  return {
    classes: data || [],
    isLoading,
    error,
    mutate
  }
}
