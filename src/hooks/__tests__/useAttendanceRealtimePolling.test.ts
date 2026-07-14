import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { AttendanceMap } from '../useAttendanceRealtime.logic'

vi.mock('@/app/(admin)/presensi/actions', () => ({
  getAttendanceByMeeting: vi.fn(),
}))

// Cloud path (useAttendanceRealtimeCloud) creates a Supabase channel; stub it.
vi.mock('@/lib/supabase/client', () => ({
  createAuthClient: () => ({
    channel: () => ({
      on: () => ({ subscribe: (cb?: (s: string) => void) => { cb?.('SUBSCRIBED'); return {} } }),
    }),
    removeChannel: () => {},
  }),
}))

import { getAttendanceByMeeting } from '@/app/(admin)/presensi/actions'
const mockGetAttendance = vi.mocked(getAttendanceByMeeting)

const setEnv = (val: string | undefined) => {
  if (val) process.env.NEXT_PUBLIC_DATA_POSTGREST_URL = val
  else delete process.env.NEXT_PUBLIC_DATA_POSTGREST_URL
}

describe('useAttendanceRealtimePolling (real timers)', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible', writable: true, configurable: true,
    })
    mockGetAttendance.mockResolvedValue({
      success: true,
      data: [{ student_id: 's1', status: 'H', reason: null, check_in_time: null }],
    })
  })
  afterEach(() => {
    vi.clearAllMocks()
    setEnv(undefined)
  })

  it('builds AttendanceMap from server rows on first poll', async () => {
    const { useAttendanceRealtimePolling } = await import('../useAttendanceRealtimePolling')
    const { result } = renderHook(() => useAttendanceRealtimePolling('m1'))
    await waitFor(() => expect(result.current.attendanceMap.s1?.status).toBe('H'))
    expect(mockGetAttendance).toHaveBeenCalledWith('m1')
  })

  it('poll result (DB truth) replaces the seeded initialAttendance — no stale override', async () => {
    // Regression for the "72 → 71" bug: prev must NOT override fresh poll data.
    mockGetAttendance.mockResolvedValue({
      success: true,
      data: [{ student_id: 's1', status: 'A', reason: null, check_in_time: null }],
    })
    const initial: AttendanceMap = { s1: { status: 'H' } } // stale seed
    const { useAttendanceRealtimePolling } = await import('../useAttendanceRealtimePolling')
    const { result } = renderHook(() =>
      useAttendanceRealtimePolling('m1', { initialAttendance: initial })
    )
    // After first poll, DB truth (A) must win over stale seed (H)
    await waitFor(() => expect(result.current.attendanceMap.s1?.status).toBe('A'))
  })

  it('does not poll when meetingId is undefined', async () => {
    const { useAttendanceRealtimePolling } = await import('../useAttendanceRealtimePolling')
    renderHook(() => useAttendanceRealtimePolling(undefined))
    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetAttendance).not.toHaveBeenCalled()
  })
})

describe('useAttendanceRealtime dispatcher (env-gated)', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible', writable: true, configurable: true,
    })
    mockGetAttendance.mockResolvedValue({ success: true, data: [] })
  })
  afterEach(() => {
    vi.clearAllMocks()
    setEnv(undefined)
    vi.resetModules()
  })

  it('uses polling when NEXT_PUBLIC_DATA_POSTGREST_URL is set', async () => {
    setEnv('http://127.0.0.1:3001')
    const { useAttendanceRealtime } = await import('../useAttendanceRealtime')
    renderHook(() => useAttendanceRealtime('m1'))
    await waitFor(() => expect(mockGetAttendance).toHaveBeenCalled())
  })

  it('does NOT poll when NEXT_PUBLIC_DATA_POSTGREST_URL is unset (Cloud mode)', async () => {
    setEnv(undefined)
    const { useAttendanceRealtime } = await import('../useAttendanceRealtime')
    renderHook(() => useAttendanceRealtime('m1'))
    await new Promise((r) => setTimeout(r, 50))
    expect(mockGetAttendance).not.toHaveBeenCalled()
  })
})
