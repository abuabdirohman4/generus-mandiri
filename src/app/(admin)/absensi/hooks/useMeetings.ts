'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { getMeetingsByClass } from '../actions'

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
  const result = await getMeetingsByClass()
  
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

export function useMeetings() {
  const { data, error, isLoading, mutate } = useSWR<MeetingWithStats[]>(
    '/api/meetings',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds cache
      onError: (error) => {
        console.error('Error fetching meetings:', error)
      }
    }
  )

  return {
    meetings: data || [],
    error,
    isLoading,
    mutate
  }
}
