'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { studentKeys } from '@/lib/swr'
import { getCurrentUserId } from '@/lib/userUtils'
import { getAllStudents, getStudentsPaginated, type Student } from '@/app/(admin)/users/siswa/actions'
import type { PaginatedStudentRow } from '@/types/student'

interface UseStudentsOptions {
  classId?: string
  enabled?: boolean
}

const fetcher = async (classId?: string): Promise<Student[]> => {
  try {
    const result = await getAllStudents(classId)
    if (!result.success) {
      console.error('Gagal memuat siswa:', result.message)
      return []
    }
    return result.data as Student[]
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
      revalidateOnFocus: false, // sm-kt2j: full-list payload was re-fetched on every focus, dominant egress cost
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

export interface UseStudentsPaginatedOptions {
  page: number
  pageSize: number
  search?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  filters?: {
    daerah?: string[]
    desa?: string[]
    kelompok?: string[]
    kelas?: string[]
    gender?: string
    status?: string
  }
  enabled?: boolean
}

const fetcherPaginated = async (params: UseStudentsPaginatedOptions) => {
  try {
    const result = await getStudentsPaginated(params)
    if (!result.success) {
      console.error('Gagal memuat siswa:', result.message)
      return { rows: [], totalCount: 0 }
    }
    return result.data
  } catch (error) {
    console.error('Error fetching paginated students:', error)
    return { rows: [], totalCount: 0 }
  }
}

export function useStudentsPaginated({ page, pageSize, search, sortColumn, sortDirection, filters, enabled = true }: UseStudentsPaginatedOptions) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUserId()
      .then(setUserId)
      .catch((error) => console.error('Error getting user ID:', error))
  }, [])

  const sortKey = `${sortColumn || ''}:${sortDirection || ''}`
  const key = enabled && userId ? studentKeys.listPaginated(userId, page, pageSize, search, JSON.stringify(filters), sortKey) : null

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetcherPaginated({ page, pageSize, search, sortColumn, sortDirection, filters }),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 2 * 60 * 1000,
    }
  )

  return {
    data: data || { rows: [], totalCount: 0 },
    isLoading,
    error,
    mutate
  }
}

// Re-export Student type for convenience
export type { Student }
