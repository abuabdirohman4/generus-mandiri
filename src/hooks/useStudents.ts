'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { studentKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'

export interface Student {
  id: string
  name: string
  gender: string | null
  class_id: string
  created_at: string
  updated_at: string
  category?: string | null
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
  classes: {
    id: string
    name: string
  } | null
  // For backward compatibility with existing components
  class_name?: string
}

interface UseStudentsOptions {
  classId?: string
  enabled?: boolean
}

const fetcher = async (classId?: string): Promise<Student[]> => {
  const supabase = createClient()
  
  let query = supabase
    .from('students')
    .select(`
      id,
      name,
      gender,
      category,
      class_id,
      kelompok_id,
      desa_id,
      daerah_id,
      created_at,
      updated_at,
      classes (
        id,
        name
      )
    `)
    .order('name')

  // Filter by class if classId provided
  if (classId) {
    query = query.eq('class_id', classId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(student => {
    const classesData = Array.isArray(student.classes) ? student.classes[0] || null : student.classes
    return {
      ...student,
      classes: classesData ? {
        id: String(classesData.id || ''),
        name: String(classesData.name || '')
      } : null,
      // Add class_name for backward compatibility
      class_name: classesData?.name || ''
    }
  })
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
