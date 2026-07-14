'use client'

import { useAttendanceRealtimeCloud } from './useAttendanceRealtimeCloud'
import { useAttendanceRealtimePolling } from './useAttendanceRealtimePolling'
import type { AttendanceMap } from './useAttendanceRealtime.logic'

export type { AttendanceMap, AttendanceEntry, AttendanceStatus } from './useAttendanceRealtime.logic'

interface UseAttendanceRealtimeOptions {
  initialAttendance?: AttendanceMap
}

const isSelfHost = () =>
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_DATA_POSTGREST_URL

/**
 * Env-gated dispatcher:
 * - NEXT_PUBLIC_DATA_POSTGREST_URL unset -> Cloud postgres_changes (existing)
 * - NEXT_PUBLIC_DATA_POSTGREST_URL set  -> adaptive polling to local PostgREST
 *
 * Return shape is identical in both modes so consumers need no changes.
 */
export function useAttendanceRealtime(
  meetingId: string | undefined,
  options: UseAttendanceRealtimeOptions = {}
) {
  const selfHost = isSelfHost()

  const cloud = useAttendanceRealtimeCloud(selfHost ? undefined : meetingId, options)
  const polling = useAttendanceRealtimePolling(selfHost ? meetingId : undefined, options)

  return selfHost ? polling : cloud
}
