import { describe, it, expect } from 'vitest'
import { mergeNewStudents } from '../logic'

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
