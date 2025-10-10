'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { classKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'

export interface Class {
  id: string
  name: string
}

const fetcher = async (): Promise<Class[]> => {
  const supabase = createClient()
  
  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, name')
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return classes || []
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
