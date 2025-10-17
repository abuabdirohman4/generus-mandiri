'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { studentKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'
import { getAllStudents, type Student } from '@/app/(admin)/siswa/actions'

interface UseStudentsOptions {
  classId?: string
  enabled?: boolean
}

const fetcher = async (classId?: string): Promise<Student[]> => {
  return await getAllStudents(classId)
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
    () => fetcher(classId),
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

// Re-export Student type for convenience
export type { Student }
