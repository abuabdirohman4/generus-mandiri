'use client'

import { useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createAuthClient } from '@/lib/supabase/client'
import {
  applyAttendanceEvent,
  type AttendanceMap,
  type AttendanceChangePayload,
} from './useAttendanceRealtime.logic'

interface UseAttendanceRealtimeOptions {
  initialAttendance?: AttendanceMap
}

export function useAttendanceRealtimeCloud(
  meetingId: string | undefined,
  options: UseAttendanceRealtimeOptions = {}
) {
  const { initialAttendance } = options
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>(initialAttendance ?? {})
  const [connectionStatus, setConnectionStatus] = useState<string>('DISCONNECTED')
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!initialAttendance) return
    setAttendanceMap((prev) => ({ ...initialAttendance, ...prev }))
  }, [initialAttendance])

  useEffect(() => {
    if (!meetingId) return

    const supabase = createAuthClient()
    const channel = supabase
      .channel(`attendance-realtime-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          setAttendanceMap((prev) =>
            applyAttendanceEvent(prev, payload as unknown as AttendanceChangePayload)
          )
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status)
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setConnectionStatus('DISCONNECTED')
    }
  }, [meetingId])

  return { attendanceMap, connectionStatus }
}
