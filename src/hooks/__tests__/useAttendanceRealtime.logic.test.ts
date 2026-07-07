import { describe, it, expect } from 'vitest'
import { applyAttendanceEvent, getNewlyPresentIds, type AttendanceMap } from '../useAttendanceRealtime.logic'

describe('applyAttendanceEvent', () => {
  it('INSERT adds a new student entry to the map', () => {
    const map: AttendanceMap = {}
    const result = applyAttendanceEvent(map, {
      eventType: 'INSERT',
      new: { student_id: 's1', status: 'H', reason: null },
      old: {},
    })
    expect(result).toEqual({
      s1: { status: 'H', reason: undefined },
    })
  })

  it('UPDATE changes the status of an existing student', () => {
    const map: AttendanceMap = {
      s1: { status: 'A', reason: undefined },
    }
    const result = applyAttendanceEvent(map, {
      eventType: 'UPDATE',
      new: { student_id: 's1', status: 'I', reason: 'Sakit' },
      old: { student_id: 's1', status: 'A', reason: null },
    })
    expect(result).toEqual({
      s1: { status: 'I', reason: 'Sakit' },
    })
  })

  it('DELETE removes the student entry from the map', () => {
    const map: AttendanceMap = {
      s1: { status: 'H', reason: undefined },
      s2: { status: 'A', reason: undefined },
    }
    const result = applyAttendanceEvent(map, {
      eventType: 'DELETE',
      new: {},
      old: { student_id: 's1' },
    })
    expect(result).toEqual({
      s2: { status: 'A', reason: undefined },
    })
  })

  it('does not mutate the original map (returns a new object)', () => {
    const map: AttendanceMap = { s1: { status: 'A', reason: undefined } }
    const result = applyAttendanceEvent(map, {
      eventType: 'INSERT',
      new: { student_id: 's2', status: 'H', reason: null },
      old: {},
    })
    expect(result).not.toBe(map)
    expect(map).toEqual({ s1: { status: 'A', reason: undefined } })
  })

  it('ignores events with no student_id', () => {
    const map: AttendanceMap = { s1: { status: 'A', reason: undefined } }
    const result = applyAttendanceEvent(map, {
      eventType: 'INSERT',
      new: { status: 'H' },
      old: {},
    })
    expect(result).toBe(map)
  })

  it('UPDATE on unknown student_id still adds it (upsert semantics)', () => {
    const map: AttendanceMap = {}
    const result = applyAttendanceEvent(map, {
      eventType: 'UPDATE',
      new: { student_id: 's3', status: 'S', reason: 'Izin keluarga' },
      old: { student_id: 's3' },
    })
    expect(result).toEqual({
      s3: { status: 'S', reason: 'Izin keluarga' },
    })
  })

  it('propagates check_in_time on INSERT/UPDATE', () => {
    const result = applyAttendanceEvent({}, {
      eventType: 'INSERT',
      new: { student_id: 's1', status: 'H', check_in_time: '2026-07-07T12:05:00.000Z' },
      old: {},
    })
    expect(result.s1.check_in_time).toBe('2026-07-07T12:05:00.000Z')
  })
})


describe('getNewlyPresentIds', () => {
  it('returns ids that transitioned to H (present) since the previous map', () => {
    const prev: AttendanceMap = { s1: { status: 'A' }, s2: { status: 'H' } }
    const next: AttendanceMap = { s1: { status: 'H' }, s2: { status: 'H' }, s3: { status: 'H' } }
    // s1 A->H (new), s3 absent->H (new), s2 was already H (not new)
    expect(getNewlyPresentIds(prev, next).sort()).toEqual(['s1', 's3'])
  })

  it('returns an empty array when nothing became present', () => {
    const prev: AttendanceMap = { s1: { status: 'H' } }
    const next: AttendanceMap = { s1: { status: 'H' }, s2: { status: 'I' } }
    expect(getNewlyPresentIds(prev, next)).toEqual([])
  })

  it('does not report a student that changed away from H', () => {
    const prev: AttendanceMap = { s1: { status: 'H' } }
    const next: AttendanceMap = { s1: { status: 'A' } }
    expect(getNewlyPresentIds(prev, next)).toEqual([])
  })

  it('treats a missing previous entry as not-present before', () => {
    const prev: AttendanceMap = {}
    const next: AttendanceMap = { s1: { status: 'H' } }
    expect(getNewlyPresentIds(prev, next)).toEqual(['s1'])
  })

  it('handles empty next map', () => {
    expect(getNewlyPresentIds({ s1: { status: 'H' } }, {})).toEqual([])
  })
})
