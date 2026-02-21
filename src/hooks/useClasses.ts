'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { classKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'
import { getAllClasses, type Class } from '@/app/(admin)/users/siswa/actions/classes'

const fetcher = async (): Promise<Class[]> => {
  // Add timeout wrapper to prevent infinite loading
  const fetchWithTimeout = (promise: Promise<any>, timeoutMs = 30000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - koneksi Anda mungkin lambat')), timeoutMs)
      )
    ])
  }

  try {
    const result = await fetchWithTimeout(getAllClasses(), 30000) as Class[]
    return result || []
  } catch (error: any) {
    console.error('useClasses - Fetch error:', error)
    console.error('Device:', {
      userAgent: navigator.userAgent,
      mobile: /mobile/i.test(navigator.userAgent),
      online: navigator.onLine
    })
    // Return empty array instead of throwing to prevent stuck loading
    return []
  }
}

export function useClasses() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isGettingUserId, setIsGettingUserId] = useState(true)

  // Get current user ID for cache key with error handling
  useEffect(() => {
    getCurrentUserId()
      .then((id) => {
        setUserId(id)
        setIsGettingUserId(false)
      })
      .catch((error) => {
        console.error('useClasses - Failed to get user ID:', error)
        console.error('Device:', /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop')
        // CRITICAL: Set loading to false even on error to prevent infinite skeleton
        setIsGettingUserId(false)
        setUserId(null)
      })
  }, [])

  const { data, error, isLoading, mutate } = useSWR<Class[]>(
    userId ? classKeys.list(userId) : null, // Only fetch when we have userId
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
      shouldRetryOnError: true, // Retry on error
      errorRetryCount: 3, // Max 3 retries
      errorRetryInterval: 5000, // 5 seconds between retries
      onError: (error) => {
        console.error('=== useClasses SWR Error ===')
        console.error('Error:', error)
        console.error('UserId:', userId)
        console.error('Device:', /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop')
        console.error('Online:', navigator.onLine)
        console.error('============================')
      }
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
