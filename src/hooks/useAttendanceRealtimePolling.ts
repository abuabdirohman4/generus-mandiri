'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getAttendanceByMeeting } from '@/app/(admin)/presensi/actions'
import type { AttendanceMap } from './useAttendanceRealtime.logic'
import { attendanceDebug } from '@/app/(admin)/presensi/[meetingId]/attendanceDebug'

const INTERVAL_ACTIVE_MS = 5_000
const INTERVAL_IDLE_MS = 15_000
const IDLE_AFTER_MS = 60_000

interface UseAttendanceRealtimeOptions {
  initialAttendance?: AttendanceMap
}

function buildAttendanceMap(
  rows: { student_id?: string; status?: string; reason?: string | null; check_in_time?: string | null }[]
): AttendanceMap {
  const map: AttendanceMap = {}
  for (const row of rows) {
    if (!row.student_id || !row.status) continue
    map[row.student_id] = {
      status: row.status as AttendanceMap[string]['status'],
      reason: row.reason ?? undefined,
      check_in_time: row.check_in_time ?? undefined,
    }
  }
  return map
}

export function useAttendanceRealtimePolling(
  meetingId: string | undefined,
  options: UseAttendanceRealtimeOptions = {}
) {
  const { initialAttendance } = options
  const [attendanceMap, setAttendanceMap] = useState<AttendanceMap>(initialAttendance ?? {})
  const [connectionStatus, setConnectionStatus] = useState<string>('POLLING')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const lastChangeRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const poll = useCallback(async () => {
    if (!meetingId || !mountedRef.current) return
    if (document.visibilityState === 'hidden') return

    setConnectionStatus('POLLING')
    const result = await getAttendanceByMeeting(meetingId)
    if (!mountedRef.current) return

    if (result.success && result.data) {
      const newMap = buildAttendanceMap(result.data)
      const hadirCount = Object.values(newMap).filter((e) => e.status === 'H').length
      attendanceDebug('POLL', meetingId?.slice(0, 8), 'hadir:', hadirCount, 'keys:', Object.keys(newMap).length)
      setAttendanceMap((prev) => {
        const prevKeys = Object.keys(prev).sort().join()
        const nextKeys = Object.keys(newMap).sort().join()
        if (prevKeys !== nextKeys) lastChangeRef.current = Date.now()
        else {
          for (const id of Object.keys(newMap)) {
            if (prev[id]?.status !== newMap[id]?.status) {
              lastChangeRef.current = Date.now()
              break
            }
          }
        }
        return newMap
      })
      setLastUpdated(new Date())
      setConnectionStatus('SUBSCRIBED')
    }

    if (!mountedRef.current) return
    const idleMs = Date.now() - lastChangeRef.current
    const interval = idleMs > IDLE_AFTER_MS ? INTERVAL_IDLE_MS : INTERVAL_ACTIVE_MS
    timerRef.current = setTimeout(poll, interval)
  }, [meetingId])

  const seededRef = useRef(false)
  useEffect(() => {
    if (!initialAttendance || seededRef.current) return
    // Seed once, only before the first poll returns. After that, poll() owns
    // the map (DB truth) — never let a stale initialAttendance override it.
    setAttendanceMap((prev) =>
      Object.keys(prev).length === 0 ? initialAttendance : prev
    )
    seededRef.current = true
  }, [initialAttendance])

  useEffect(() => {
    if (!meetingId) return
    mountedRef.current = true

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (timerRef.current) clearTimeout(timerRef.current)
        poll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    poll()

    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
      setConnectionStatus('DISCONNECTED')
    }
  }, [meetingId, poll])

  return { attendanceMap, connectionStatus, lastUpdated }
}
