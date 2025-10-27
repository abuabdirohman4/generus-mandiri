'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getAvailableMeetingTypes, MEETING_TYPES } from '@/lib/constants/meetingTypes'

interface Category {
  is_sambung_capable: boolean
}

interface ClassData {
  master_class: {
    category: Category | null
  } | null
}

export function useMeetingTypes(classIds: string[]) {
  const { data, isLoading, error } = useSWR(
    classIds.length > 0 ? ['meeting-types', classIds] : null,
    async () => {
      const supabase = createClient()
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          master_class:class_master_id (
            category:category_id (
              is_sambung_capable
            )
          )
        `)
        .in('id', classIds)
      
      if (classesError) {
        console.error('Error fetching classes for meeting types:', classesError)
        return {}
      }
      
      // Type assertion to fix the type inference issue
      const classes = classesData as any[]
      const categories = (classes || [])
        .map((c) => c.master_class?.category)
        .filter(Boolean) as Category[]
      
      return getAvailableMeetingTypes(categories)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000 // Cache for 1 minute
    }
  )
  
  return { 
    availableTypes: data || {}, 
    isLoading, 
    error 
  }
}
