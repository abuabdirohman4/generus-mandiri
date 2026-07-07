import { describe, it, expect } from 'vitest'
import { applyAttendanceEvent, type AttendanceMap } from '../useAttendanceRealtime.logic'

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
})
