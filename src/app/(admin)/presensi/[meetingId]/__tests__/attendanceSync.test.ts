import { describe, it, expect } from 'vitest'
import { mergeNewStudents, reconcileRealtimeAttendance } from '../logic'

type Entry = { status: string; reason?: string }

describe('mergeNewStudents', () => {
  it('preserves local value when server has different (stale) value for same student', () => {
    const prev: Record<string, Entry> = { 'a': { status: 'H' } }
    const incoming: Record<string, Entry> = { 'a': { status: 'A' } }
    const result = mergeNewStudents(prev, incoming)
    expect(result['a'].status).toBe('H')
  })

  it('adds new students from server without overwriting existing', () => {
    const prev: Record<string, Entry> = { 'a': { status: 'H' } }
    const incoming: Record<string, Entry> = { 'a': { status: 'A' }, 'b': { status: 'H' } }
    const result = mergeNewStudents(prev, incoming)
    expect(result['a'].status).toBe('H')
    expect(result['b'].status).toBe('H')
  })

  it('returns same reference when no new students (no unnecessary re-render)', () => {
    const prev: Record<string, Entry> = { 'a': { status: 'H' } }
    const incoming: Record<string, Entry> = { 'a': { status: 'A' } }
    const result = mergeNewStudents(prev, incoming)
    expect(result).toBe(prev)
  })

  it('handles empty prev — populates from server', () => {
    const prev: Record<string, Entry> = {}
    const incoming: Record<string, Entry> = { 'a': { status: 'H' }, 'b': { status: 'A' } }
    const result = mergeNewStudents(prev, incoming)
    expect(result['a'].status).toBe('H')
    expect(result['b'].status).toBe('A')
  })

  it('handles empty incoming — returns same prev reference', () => {
    const prev: Record<string, Entry> = { 'a': { status: 'H' } }
    const result = mergeNewStudents(prev, {})
    expect(result).toBe(prev)
  })
})


describe('reconcileRealtimeAttendance', () => {
  it('adopts incoming realtime value when student is not pending a local edit', () => {
    const local: Record<string, Entry> = { a: { status: 'A' } }
    const baseline: Record<string, Entry> = { a: { status: 'A' } }
    const incoming: Record<string, Entry> = { a: { status: 'H' } }
    const result = reconcileRealtimeAttendance(local, incoming, baseline)
    expect(result.a.status).toBe('H')
  })

  it('keeps local value when student is in the pendingEditIds set (unsaved manual edit)', () => {
    const local: Record<string, Entry> = { a: { status: 'I' } }
    const baseline: Record<string, Entry> = { a: { status: 'A' } }
    const incoming: Record<string, Entry> = { a: { status: 'H' } }
    const result = reconcileRealtimeAttendance(local, incoming, baseline, new Set(['a']))
    expect(result.a.status).toBe('I') // pending edit preserved
  })

  it('72-vs-71 stuck bug: a poll-adopted student (NOT in pendingEditIds) stays in sync', () => {
    // Regression: previously a stale SWR baseline made an adopted student look
    // "dirty" and froze it. With explicit pendingEditIds (empty here), the
    // student must follow the poll both up (A→H) and back down (H→A).
    const localUp: Record<string, Entry> = { a: { status: 'A' } }
    const up = reconcileRealtimeAttendance(localUp, { a: { status: 'H' } }, { a: { status: 'A' } })
    expect(up.a.status).toBe('H')
    // Now poll says A again → must revert (not stuck at H)
    const down = reconcileRealtimeAttendance(up, { a: { status: 'A' } }, { a: { status: 'A' } })
    expect(down.a.status).toBe('A')
  })

  it('adds a student present in incoming but missing locally', () => {
    const local: Record<string, Entry> = { a: { status: 'H' } }
    const incoming: Record<string, Entry> = { a: { status: 'H' }, b: { status: 'H' } }
    const result = reconcileRealtimeAttendance(local, incoming, {})
    expect(result.b.status).toBe('H')
  })

  it('returns same reference when nothing changes (no re-render)', () => {
    const local: Record<string, Entry> = { a: { status: 'H' } }
    const incoming: Record<string, Entry> = { a: { status: 'H' } }
    const result = reconcileRealtimeAttendance(local, incoming, {})
    expect(result).toBe(local)
  })

  it('a pending student blocks its own update but others still sync', () => {
    const local: Record<string, Entry> = { a: { status: 'I' }, b: { status: 'A' } }
    const incoming: Record<string, Entry> = { a: { status: 'H' }, b: { status: 'H' } }
    const result = reconcileRealtimeAttendance(local, incoming, {}, new Set(['a']))
    expect(result.a.status).toBe('I') // pending, kept
    expect(result.b.status).toBe('H') // not pending, synced
  })
})
