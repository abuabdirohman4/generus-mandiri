'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { getStudents, type Student } from '../actions'
import { studentKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'

interface UseStudentsOptions {
  classId?: string
  enabled?: boolean
}

export function useStudents({ classId, enabled = true }: UseStudentsOptions = {}) {
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user ID for cache key
  useEffect(() => {
    getCurrentUserId().then(setUserId)
  }, [])

  const key = enabled && userId ? studentKeys.list(classId, userId) : null
  
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
