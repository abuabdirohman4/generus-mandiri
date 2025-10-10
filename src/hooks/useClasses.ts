'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { classKeys } from '@/lib/swr'

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
  const { data, error, isLoading, mutate } = useSWR<Class[]>(
    classKeys.list(),
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
    }
  )

  return {
    classes: data || [],
    isLoading,
    error,
    mutate
  }
}
