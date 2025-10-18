'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { classKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'
import { getAllClasses, type Class } from '@/app/(admin)/users/siswa/actions/classes'

const fetcher = async (): Promise<Class[]> => {
  return await getAllClasses()
}

export function useClasses() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isGettingUserId, setIsGettingUserId] = useState(true)

  // Get current user ID for cache key
  useEffect(() => {
    getCurrentUserId().then((id) => {
      setUserId(id)
      setIsGettingUserId(false)
    })
  }, [])

  const { data, error, isLoading, mutate } = useSWR<Class[]>(
    userId ? classKeys.list(userId) : null, // Only fetch when we have userId
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Combined loading state: getting userId OR SWR loading
  const combinedLoading = isGettingUserId || isLoading

  return {
    classes: data || [],
    isLoading: combinedLoading,
    error,
    mutate
  }
}

// Re-export Class type for convenience
export type { Class }
