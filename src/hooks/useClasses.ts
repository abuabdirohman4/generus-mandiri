'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { classKeys } from '@/lib/swr'
import { getCurrentUserId, isAdmin } from '@/lib/userUtils'

export interface Class {
  id: string
  name: string
  kelompok_id?: string | null
}

const fetcher = async (): Promise<Class[]> => {
  const supabase = createClient()
  
  // First get user profile to determine role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  // If user is admin or superadmin, get all classes in their hierarchy
  // If user is teacher, get only their assigned classes
  if (isAdmin(profile.role)) {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, kelompok_id')
      .order('name')

    if (error) {
      throw new Error(error.message)
    }

    return classes || []
  } else if (profile.role === 'teacher') {
    // Get classes assigned to this teacher
    const { data: classes, error } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        kelompok_id,
        teacher_classes!inner(teacher_id)
      `)
      .eq('teacher_classes.teacher_id', user.id)
      .order('name')

    if (error) {
      throw new Error(error.message)
    }

    return classes || []
  } else {
    // For other roles, get all classes (fallback)
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, kelompok_id')
      .order('name')

    if (error) {
      throw new Error(error.message)
    }

    return classes || []
  }
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
