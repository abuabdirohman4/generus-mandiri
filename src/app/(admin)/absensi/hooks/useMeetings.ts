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
  meeting_type_code?: string | null // NEW: Meeting type code
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
    class_master_mappings?: Array<{
      class_master?: {
        category?: {
          is_sambung_capable: boolean
        }
      }
    }>
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

  // Get current user ID for cache key with error handling
  useEffect(() => {
    getCurrentUserId()
      .then((id) => {
        setUserId(id)
        setIsGettingUserId(false)
      })
      .catch((error) => {
        console.error('Failed to get user ID:', error)
        console.error('User Agent:', navigator.userAgent)
        console.error('Device:', /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop')
        // CRITICAL: Set loading to false even on error to prevent infinite skeleton
        setIsGettingUserId(false)
        // Set null userId - SWR will not fetch, but at least UI won't stuck
        setUserId(null)
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

      // Add timeout wrapper to prevent infinite loading
      const fetchWithTimeout = (promise: Promise<any>, timeoutMs = 30000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout - koneksi Anda mungkin lambat')), timeoutMs)
          )
        ])
      }

      try {
        // Fetch ALL meetings at once for better caching with timeout
        const result = await fetchWithTimeout(
          getMeetingsWithStats(classId, 1000), // Large limit to get all data
          30000 // 30 second timeout for mobile networks
        ) as any

        if (!result.success) {
          console.error('getMeetingsWithStats failed:', result.error)
          // Return empty data instead of throwing to prevent skeleton stuck
          return {
            allMeetings: [],
            total: 0
          }
        }

        const allMeetings = result.data || []

        return {
          allMeetings: allMeetings as MeetingWithStats[],
          total: allMeetings.length
        }
      } catch (error: any) {
        console.error('Fetch meetings error:', error)
        console.error('Device info:', {
          userAgent: navigator.userAgent,
          mobile: /mobile/i.test(navigator.userAgent),
          online: navigator.onLine,
          connection: (navigator as any).connection?.effectiveType
        })
        // Return empty data instead of throwing
        return {
          allMeetings: [],
          total: 0
        }
      }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000, // 2 seconds
      revalidateIfStale: true,
      revalidateOnMount: true,
      refreshInterval: 0,
      shouldRetryOnError: true, // Retry on error
      errorRetryCount: 3, // Max 3 retries
      errorRetryInterval: 5000, // 5 seconds between retries
      onError: (error) => {
        console.error('=== SWR Error Details ===')
        console.error('Error:', error)
        console.error('SWR Key:', swrKey)
        console.error('ClassId:', classId)
        console.error('UserId:', userId)
        console.error('Device:', /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop')
        console.error('Online:', navigator.onLine)
        console.error('========================')
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
