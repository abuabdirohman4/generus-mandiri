'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { getUserProfile } from '../actions'
import { userProfileKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'

export function useUserProfile() {
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user ID for cache key
  useEffect(() => {
    getCurrentUserId().then(setUserId)
  }, [])

  const { data, error, isLoading, mutate } = useSWR(
    userId ? userProfileKeys.profile(userId) : null,
    getUserProfile,
    {
      revalidateOnFocus: false, // User profile doesn't change often
      revalidateOnReconnect: true,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes
    }
  )

  return {
    userProfile: data,
    isLoading,
    error,
    mutate
  }
}
