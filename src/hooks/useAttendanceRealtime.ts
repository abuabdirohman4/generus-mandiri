'use client'

import { useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createAuthClient } from '@/lib/supabase/client'
import {
  applyAttendanceEvent,
  type AttendanceMap,
  type AttendanceChangePayload,
} from './useAttendanceRealtime.logic'

export type { AttendanceMap, AttendanceEntry, AttendanceStatus } from './useAttendanceRealtime.logic'

interface UseAttendanceRealtimeOptions {
  /** Initial attendance map (e.g. from the server-fetched meeting data) to merge realtime deltas into. */
  initialAttendance?: AttendanceMap
}

/**
 * Subscribes to Supabase `postgres_changes` on `attendance_logs` filtered by
 * `meeting_id`, keeping a live-updated attendance map without polling/refresh.
 *
 * Follows the same dedicated-channel + cleanup-on-unmount pattern as
 * `usePresenceStore`/`usePresence`, but is scoped per-meeting (channel per
 * meetingId) rather than a single shared global channel, since each meeting
 * detail page only needs updates for its own meeting.
 */
export function useAttendanceRealtime(
  meetingId: string | undefined,
  options: UseAttendanceRealtimeOptions = {}
) {
  const { initialAttendance } = options
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>(initialAttendance ?? {})
  const [connectionStatus, setConnectionStatus] = useState<string>('DISCONNECTED')
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Merge in fresh server data (e.g. after SWR revalidation) without clobbering
  // realtime-only updates that may not yet be reflected in the server fetch.
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
