'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { studentKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'
import { getAllStudents, type Student } from '@/app/(admin)/users/siswa/actions'

interface UseStudentsOptions {
  classId?: string
  enabled?: boolean
}

const fetcher = async (classId?: string): Promise<Student[]> => {
  try {
    const result = await getAllStudents(classId)
    // Ensure result is always an array
    if (!Array.isArray(result)) {
      console.error('getAllStudents returned non-array:', result)
      return []
    }
    return result
  } catch (error) {
    console.error('Error fetching students:', error)
    // Return empty array instead of throwing to prevent app crash
    return []
  }
}

export function useStudents({ classId, enabled = true }: UseStudentsOptions = {}) {
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user ID for cache key
  useEffect(() => {
    getCurrentUserId()
      .then(setUserId)
      .catch((error) => {
        console.error('Error getting user ID:', error)
      })
  }, [])

  const key = enabled && userId ? studentKeys.list(classId, userId) : null
  
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetcher(classId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      onError: (error) => {
        console.error('SWR error in useStudents:', error)
      },
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  )

  // Ensure data is always an array
  const students = Array.isArray(data) ? data : []

  return {
    students,
    isLoading,
    error,
    mutate
  }
}

// Re-export Student type for convenience
export type { Student }
