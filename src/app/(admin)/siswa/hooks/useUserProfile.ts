'use client'

import useSWR from 'swr'
import { getUserProfile } from '../actions'
import { userProfileKeys } from '@/lib/swr'

export function useUserProfile() {
  const { data, error, isLoading, mutate } = useSWR(
    userProfileKeys.profile(),
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
