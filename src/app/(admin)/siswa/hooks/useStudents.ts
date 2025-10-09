'use client'

import useSWR from 'swr'
import { getStudents, type Student } from '../actions'
import { studentKeys } from '@/lib/swr'

interface UseStudentsOptions {
  classId?: string
  enabled?: boolean
}

export function useStudents({ classId, enabled = true }: UseStudentsOptions = {}) {
  const key = enabled ? studentKeys.list(classId) : null
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => getStudents(classId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  )

  return {
    students: data || [],
    isLoading,
    error,
    mutate
  }
}
