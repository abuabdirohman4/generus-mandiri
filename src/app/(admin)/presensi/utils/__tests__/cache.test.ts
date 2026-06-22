import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock swr's global mutate
const mutateMock = vi.fn()
vi.mock('swr', () => ({
  mutate: (...args: any[]) => mutateMock(...args),
}))

import { upsertMeetingInCache } from '../cache'

const baseMeeting = {
  id: 'meeting-1',
  title: 'A',
  date: '2026-06-20',
}

const baseStats = {
  totalStudents: 10,
  presentCount: 8,
  absentCount: 1,
  sickCount: 1,
  excusedCount: 0,
}

describe('upsertMeetingInCache', () => {
  beforeEach(() => {
    mutateMock.mockReset()
  })

  it('calls mutate with a key matcher fn, updater fn, and revalidate:true', async () => {
    await upsertMeetingInCache('user-1', baseMeeting, baseStats)

    expect(mutateMock).toHaveBeenCalledTimes(1)
    const [keyMatcher, updater, opts] = mutateMock.mock.calls[0]
    expect(typeof keyMatcher).toBe('function')
    expect(typeof updater).toBe('function')
    expect(opts).toEqual({ revalidate: true })
  })

  it('key matcher matches /api/meetings/ keys containing the userId', async () => {
    await upsertMeetingInCache('user-1', baseMeeting, baseStats)
    const keyMatcher = mutateMock.mock.calls[0][0]

    expect(keyMatcher('/api/meetings/user-1?dummy=false')).toBe(true)
    expect(keyMatcher('/api/meetings/user-1?dummy=true')).toBe(true)
    expect(keyMatcher('/api/meetings/class-x/user-1?dummy=false')).toBe(true)
    expect(keyMatcher('/api/meetings/user-2?dummy=false')).toBe(false) // different user
    expect(keyMatcher('/api/other/user-1')).toBe(false) // different path
  })

  it('updater patches ONLY the matching meeting and recomputes percentage', async () => {
    await upsertMeetingInCache('user-1', baseMeeting, baseStats)
    const updater = mutateMock.mock.calls[0][1]

    const current = {
      total: 2,
      allMeetings: [
        { id: 'meeting-1', title: 'A', date: '2026-06-20', attendancePercentage: 0, presentCount: 0, totalStudents: 0 },
        { id: 'meeting-2', title: 'B', date: '2026-06-10', attendancePercentage: 50, presentCount: 5, totalStudents: 10 },
      ],
    }

    const next = updater(current)
    const m1 = next.allMeetings.find((m: any) => m.id === 'meeting-1')
    const m2 = next.allMeetings.find((m: any) => m.id === 'meeting-2')

    expect(m1.presentCount).toBe(8)
    expect(m1.totalStudents).toBe(10)
    expect(m1.absentCount).toBe(1)
    expect(m1.sickCount).toBe(1)
    expect(m1.excusedCount).toBe(0)
    expect(m1.attendancePercentage).toBe(80)
    expect(m1.title).toBe('A')

    expect(m2).toEqual({ id: 'meeting-2', title: 'B', date: '2026-06-10', attendancePercentage: 50, presentCount: 5, totalStudents: 10 })
    expect(next.total).toBe(2) // unchanged for existing meeting
  })

  it('updater INSERTS new meeting (prepend + sort by date desc) and increments total', async () => {
    const newMeeting = { id: 'meeting-new', title: 'New', date: '2026-06-22' }
    await upsertMeetingInCache('user-1', newMeeting, baseStats)
    const updater = mutateMock.mock.calls[0][1]

    const current = {
      total: 2,
      allMeetings: [
        { id: 'meeting-1', title: 'A', date: '2026-06-20', attendancePercentage: 80 },
        { id: 'meeting-2', title: 'B', date: '2026-06-10', attendancePercentage: 50 },
      ],
    }

    const next = updater(current)
    const mNew = next.allMeetings.find((m: any) => m.id === 'meeting-new')
    expect(mNew).toBeDefined()
    expect(mNew.presentCount).toBe(8)
    expect(mNew.attendancePercentage).toBe(80)

    expect(next.allMeetings[0].id).toBe('meeting-new')
    expect(next.allMeetings[1].id).toBe('meeting-1')
    expect(next.allMeetings[2].id).toBe('meeting-2')
    expect(next.total).toBe(3)
  })

  it('updater returns 0% when totalStudents is 0 (no NaN)', async () => {
    await upsertMeetingInCache('user-1', baseMeeting, { ...baseStats, totalStudents: 0, presentCount: 0 })
    const updater = mutateMock.mock.calls[0][1]
    const next = updater({ total: 1, allMeetings: [{ id: 'meeting-1', date: '2026-06-20', attendancePercentage: 99 }] })
    expect(next.allMeetings[0].attendancePercentage).toBe(0)
  })

  it('updater returns current unchanged when cache is undefined/empty', async () => {
    await upsertMeetingInCache('user-1', baseMeeting, baseStats)
    const updater = mutateMock.mock.calls[0][1]
    expect(updater(undefined)).toBeUndefined()
    expect(updater({ allMeetings: null })).toEqual({ allMeetings: null })
  })
})
