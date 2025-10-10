'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { getMeetingsByClass } from '../actions'
import { getCurrentUserId } from '@/lib/userUtils'
import dummyMeetings from '@/lib/dummy/meetings.json'

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
    id: any
    name: any
  }[]
}

interface MeetingWithStats extends Meeting {
  attendancePercentage: number
  totalStudents: number
  presentCount: number
  absentCount: number
  sickCount: number
  excusedCount: number
}

const fetcher = async (url: string): Promise<MeetingWithStats[]> => {
  // Extract classId from URL if present
  // URL format: /api/meetings/{userId} or /api/meetings/{classId}/{userId}
  let classId: string | undefined = undefined
  
  if (url.includes('/api/meetings/')) {
    const urlParts = url.split('/')
    // Check if we have classId (format: /api/meetings/{classId}/{userId})
    if (urlParts.length > 4) {
      const extractedClassId = urlParts[3]
      // Only use if it's a valid UUID format (not empty or 'meetings')
      if (extractedClassId && extractedClassId !== 'meetings' && extractedClassId.length > 10) {
        classId = extractedClassId
      }
    }
  }
  
  const result = await getMeetingsByClass(classId)
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch meetings')
  }

  const meetings = result.data || []
  
  // For each meeting, fetch attendance data and calculate stats
  const meetingsWithStats = await Promise.all(
    meetings.map(async (meeting) => {
      try {
        // Import the supabase client
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        // Fetch attendance data for this meeting
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_logs')
          .select('status')
          .eq('meeting_id', meeting.id)

        if (attendanceError) {
          console.error(`Error fetching attendance for meeting ${meeting.id}:`, attendanceError)
          // Return meeting with zero stats if error
          return {
            ...meeting,
            attendancePercentage: 0,
            totalStudents: meeting.student_snapshot.length,
            presentCount: 0,
            absentCount: 0,
            sickCount: 0,
            excusedCount: 0
          }
        }

        // Calculate attendance statistics
        const totalStudents = meeting.student_snapshot.length
        const presentCount = attendanceData?.filter(record => record.status === 'H').length || 0
        const absentCount = attendanceData?.filter(record => record.status === 'A').length || 0
        const sickCount = attendanceData?.filter(record => record.status === 'S').length || 0
        const excusedCount = attendanceData?.filter(record => record.status === 'I').length || 0
        
        // Calculate attendance percentage based on snapshot
        const attendancePercentage = totalStudents > 0 
          ? Math.round((presentCount / totalStudents) * 100)
          : 0

        return {
          ...meeting,
          attendancePercentage,
          totalStudents,
          presentCount,
          absentCount,
          sickCount,
          excusedCount
        }
      } catch (error) {
        console.error(`Error processing meeting ${meeting.id}:`, error)
        // Return meeting with zero stats if error
        return {
          ...meeting,
          attendancePercentage: 0,
          totalStudents: meeting.student_snapshot.length,
          presentCount: 0,
          absentCount: 0,
          sickCount: 0,
          excusedCount: 0
        }
      }
    })
  )

  return meetingsWithStats
}

export function useMeetings(classId?: string) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isGettingUserId, setIsGettingUserId] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [useDummyData, setUseDummyData] = useState(false)
  
  // Set to true to enable dummy data toggle in UI
  const isDummy = false
  
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
    setPage(1)
  }, [classId])

  // Process dummy data with mock stats
  const processDummyData = (meetings: any[]) => {
    return meetings.map((meeting, index) => {
      // Generate random attendance stats for testing
      const totalStudents = meeting.student_snapshot.length
      const presentCount = Math.floor(Math.random() * totalStudents)
      const absentCount = Math.floor(Math.random() * (totalStudents - presentCount))
      const sickCount = Math.floor(Math.random() * (totalStudents - presentCount - absentCount))
      const excusedCount = totalStudents - presentCount - absentCount - sickCount
      
      const attendancePercentage = totalStudents > 0 
        ? Math.round((presentCount / totalStudents) * 100)
        : 0

      return {
        ...meeting,
        classes: [{ id: 'class-1', name: 'Kelas 1' }], // Mock class data
        attendancePercentage,
        totalStudents,
        presentCount,
        absentCount,
        sickCount,
        excusedCount
      }
    })
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

  const swrKey = userId 
    ? `${classId ? `/api/meetings/${classId}/${userId}` : `/api/meetings/${userId}`}?page=${page}&dummy=${useDummyData}`
    : null

  const { data, error, isLoading, mutate } = useSWR<{
    meetings: MeetingWithStats[]
    hasMore: boolean
    total: number
  }>(
    swrKey,
    async () => {
      // If using dummy data, return processed dummy data
      if (useDummyData) {
        const startIndex = (page - 1) * ITEMS_PER_PAGE
        const endIndex = startIndex + ITEMS_PER_PAGE
        const paginatedDummy = dummyMeetings.slice(startIndex, endIndex)
        const processedDummy = processDummyData(paginatedDummy)
        
        const totalPages = Math.ceil(dummyMeetings.length / ITEMS_PER_PAGE)
        setTotalPages(totalPages)
        
        return {
          meetings: processedDummy,
          hasMore: endIndex < dummyMeetings.length,
          total: dummyMeetings.length
        }
      }

      // Original database logic
      const cursor = await getCursor(page)
      const result = await getMeetingsByClass(classId, ITEMS_PER_PAGE, cursor)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch meetings')
      }

      // Process meetings with stats using the existing fetcher logic
      const meetings = result.data || []
      const meetingsWithStats = await Promise.all(
        meetings.map(async (meeting) => {
          try {
            // Import the supabase client
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            
            // Fetch attendance data for this meeting
            const { data: attendanceData, error: attendanceError } = await supabase
              .from('attendance_logs')
              .select('status')
              .eq('meeting_id', meeting.id)

            if (attendanceError) {
              console.error(`Error fetching attendance for meeting ${meeting.id}:`, attendanceError)
              // Return meeting with zero stats if error
              return {
                ...meeting,
                attendancePercentage: 0,
                totalStudents: meeting.student_snapshot.length,
                presentCount: 0,
                absentCount: 0,
                sickCount: 0,
                excusedCount: 0
              }
            }

            // Calculate attendance statistics
            const totalStudents = meeting.student_snapshot.length
            const presentCount = attendanceData?.filter(record => record.status === 'H').length || 0
            const absentCount = attendanceData?.filter(record => record.status === 'A').length || 0
            const sickCount = attendanceData?.filter(record => record.status === 'S').length || 0
            const excusedCount = attendanceData?.filter(record => record.status === 'I').length || 0
            
            // Calculate attendance percentage based on snapshot
            const attendancePercentage = totalStudents > 0 
              ? Math.round((presentCount / totalStudents) * 100)
              : 0

            return {
              ...meeting,
              attendancePercentage,
              totalStudents,
              presentCount,
              absentCount,
              sickCount,
              excusedCount
            }
          } catch (error) {
            console.error(`Error processing meeting ${meeting.id}:`, error)
            // Return meeting with zero stats if error
            return {
              ...meeting,
              attendancePercentage: 0,
              totalStudents: meeting.student_snapshot.length,
              presentCount: 0,
              absentCount: 0,
              sickCount: 0,
              excusedCount: 0
            }
          }
        })
      )

      // Get total count for pagination
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      let countQuery = supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })

      // Apply same filters as the main query
      if (classId) {
        countQuery = countQuery.eq('class_id', classId)
      }

      const { count } = await countQuery
      
      const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)
      setTotalPages(totalPages)
      
      return {
        meetings: meetingsWithStats,
        hasMore: result.hasMore || false,
        total: count || 0
      }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      onError: (error) => {
        console.error('Error fetching meetings:', error)
        console.error('SWR Key:', swrKey)
        console.error('ClassId:', classId)
        console.error('UserId:', userId)
      }
    }
  )

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum)
    }
  }

  const toggleDummyData = () => {
    setUseDummyData(!useDummyData)
    setPage(1) // Reset to first page
  }

  // Combined loading state: getting userId OR SWR loading
  const combinedLoading = isGettingUserId || isLoading

  return {
    meetings: data?.meetings || [],
    currentPage: page,
    totalPages,
    hasMore: data?.hasMore || false,
    goToPage,
    nextPage: () => goToPage(page + 1),
    prevPage: () => goToPage(page - 1),
    useDummyData,
    toggleDummyData,
    isDummy,
    error,
    isLoading: combinedLoading,
    mutate
  }
}
