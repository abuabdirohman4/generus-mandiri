'use client'

import React, { useEffect, useState } from 'react'
import useSWR from 'swr'
import { getMeetingsByClass, getMeetingsWithStats } from '../actions'
import { getCurrentUserId } from '@/lib/userUtils'
import { getDummyMeetings } from '@/lib/dummy/processAttendanceLogs'

interface Meeting {
  id: any
  class_id: any
  title: any
  date: any
  topic?: any
  description?: any
  student_snapshot: any
  created_at: any
  classes: {
    id: string
    name: string
    kelompok_id?: string
    kelompok?: {
      id: string
      name: string
      desa_id?: string
      desa?: {
        id: string
        name: string
        daerah_id?: string
        daerah?: {
          id: string
          name: string
        }
      }
    }
  }
}

interface MeetingWithStats extends Meeting {
  attendancePercentage: number
  totalStudents: number
  presentCount: number
  absentCount: number
  sickCount: number
  excusedCount: number
}

export function useMeetings(classId?: string) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isGettingUserId, setIsGettingUserId] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  
  // Use environment variable to control dummy data
  const isDummy = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true'
  const [useDummyData, setUseDummyData] = useState(isDummy)
  
  // Update useDummyData when environment variable changes
  useEffect(() => {
    setUseDummyData(isDummy)
  }, [isDummy])
  
  // Temporarily use local state for currentPage
  const [currentPage, setCurrentPage] = useState(1)
  
  const ITEMS_PER_PAGE = 10

  // Get current user ID for cache key
  useEffect(() => {
    getCurrentUserId().then((id) => {
      setUserId(id)
      setIsGettingUserId(false)
    })
  }, [])

  // Reset page when classId changes
  useEffect(() => {
    setCurrentPage(1)
  }, [classId, setCurrentPage])

  // Process dummy data with realistic stats from attendance logs
  const processDummyData = (meetings: any[]) => {
    // For dummy data, ignore classId filtering since we use 'class-1' in dummy data
    return getDummyMeetings()
  }

  // Calculate cursor from page number
  const getCursor = async (pageNum: number) => {
    if (pageNum === 1) return undefined
    
    // Get the last meeting date from previous page
    const result = await getMeetingsByClass(classId, ITEMS_PER_PAGE * (pageNum - 1))
    if (result.success && result.data && result.data.length > 0) {
      return result.data[result.data.length - 1].date
    }
    return undefined
  }

  // Base SWR key without pagination for better caching
  const swrKey = userId 
    ? `${classId ? `/api/meetings/${classId}/${userId}` : `/api/meetings/${userId}`}?dummy=${useDummyData}`
    : null

  const { data, error, isLoading, mutate } = useSWR<{
    allMeetings: MeetingWithStats[]
    total: number
  }>(
    swrKey,
    async (): Promise<{
      allMeetings: MeetingWithStats[]
      total: number
    }> => {
      // If using dummy data, return processed dummy data
      if (useDummyData) {
        const processedDummy = processDummyData([])
        
        const totalPages = Math.ceil(processedDummy.length / ITEMS_PER_PAGE)
        setTotalPages(totalPages)
        
        return {
          allMeetings: processedDummy as MeetingWithStats[],
          total: processedDummy.length
        }
      }

      // Fetch ALL meetings at once for better caching
      const result = await getMeetingsWithStats(classId, 1000) // Large limit to get all data

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch meetings')
      }

      const allMeetings = result.data || []
      const totalPages = Math.ceil(allMeetings.length / ITEMS_PER_PAGE)
      setTotalPages(totalPages)

      return {
        allMeetings: allMeetings as MeetingWithStats[],
        total: allMeetings.length
      }
    },
    {
      revalidateOnFocus: false, // Don't revalidate on focus for better UX
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds deduplication (reduced for better responsiveness)
      revalidateIfStale: true, // Allow revalidation when data is stale
      revalidateOnMount: true, // Only revalidate on mount
      refreshInterval: 0, // No automatic refresh
      onError: (error) => {
        console.error('Error fetching meetings:', error)
        console.error('SWR Key:', swrKey)
        console.error('ClassId:', classId)
        console.error('UserId:', userId)
      }
    }
  )

  // Client-side pagination
  const paginatedMeetings = React.useMemo(() => {
    if (!data?.allMeetings) return []
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return data.allMeetings.slice(startIndex, endIndex)
  }, [data?.allMeetings, currentPage])

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
    }
  }

  const toggleDummyData = () => {
    setUseDummyData(!useDummyData)
    setCurrentPage(1) // Reset to first page
  }

  // Combined loading state: getting userId OR SWR loading
  const combinedLoading = isGettingUserId || isLoading

  return {
    meetings: paginatedMeetings,
    currentPage,
    totalPages,
    hasMore: currentPage < totalPages,
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    prevPage: () => goToPage(currentPage - 1),
    useDummyData,
    toggleDummyData,
    isDummy,
    error,
    isLoading: combinedLoading,
    mutate
  }
}
