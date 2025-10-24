'use client'

import React, { useEffect, useState } from 'react'
import useSWR from 'swr'
import { getMeetingsByClass, getMeetingsWithStats } from '../actions'
import { getCurrentUserId } from '@/lib/userUtils'
import { getDummyMeetings } from '@/lib/dummy/processAttendanceLogs'

interface Meeting {
  id: any
  class_id: any
  class_ids?: any[]
  class_names?: string[]
  teacher_id: any
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
  
  // Use environment variable to control dummy data
  const isDummy = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true'
  const [useDummyData, setUseDummyData] = useState(isDummy)
  
  // Update useDummyData when environment variable changes
  useEffect(() => {
    setUseDummyData(isDummy)
  }, [isDummy])

  // Get current user ID for cache key
  useEffect(() => {
    getCurrentUserId().then((id) => {
      setUserId(id)
      setIsGettingUserId(false)
    })
  }, [])


  // Process dummy data with realistic stats from attendance logs
  const processDummyData = (meetings: any[]) => {
    // For dummy data, ignore classId filtering since we use 'class-1' in dummy data
    return getDummyMeetings()
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

      return {
        allMeetings: allMeetings as MeetingWithStats[],
        total: allMeetings.length
      }
    },
    {
      revalidateOnFocus: true,       // Fetch when window gains focus (changed from false)
      revalidateOnReconnect: true,
      dedupingInterval: 2000, // 2 seconds
      revalidateIfStale: true, // Allow revalidation when data is stale
      revalidateOnMount: true, // Always fetch on page load
      refreshInterval: 0, // No automatic refresh
      onError: (error) => {
        console.error('Error fetching meetings:', error)
        console.error('SWR Key:', swrKey)
        console.error('ClassId:', classId)
        console.error('UserId:', userId)
      }
    }
  )

  const toggleDummyData = () => {
    setUseDummyData(!useDummyData)
  }

  // Combined loading state: getting userId OR SWR loading
  const combinedLoading = isGettingUserId || isLoading

  return {
    meetings: data?.allMeetings || [],
    useDummyData,
    toggleDummyData,
    isDummy,
    error,
    isLoading: combinedLoading,
    mutate
  }
}
