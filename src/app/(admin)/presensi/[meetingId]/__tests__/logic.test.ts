import { describe, it, expect } from 'vitest'
import {
  shouldShowBreakdown,
  isMultiDesaMeeting,
  aggregateMeetingByOrg,
  type MeetingForBreakdown,
  type AttendanceOrgRow,
} from '../logic'

describe('shouldShowBreakdown', () => {
  it('returns false for a single-class meeting', () => {
    const meeting: MeetingForBreakdown = {
      class_ids: ['class-1'],
      allClasses: [
        { id: 'class-1', kelompok_id: 'kel-1', kelompok: { id: 'kel-1', name: 'Kelompok A' } },
      ],
    }
    expect(shouldShowBreakdown(meeting)).toBe(false)
  })

  it('returns false when meeting has no classes', () => {
    expect(shouldShowBreakdown({ class_ids: [], allClasses: [] })).toBe(false)
    expect(shouldShowBreakdown(null)).toBe(false)
    expect(shouldShowBreakdown(undefined)).toBe(false)
  })

  it('returns false when multiple classes all belong to the same kelompok', () => {
    const meeting: MeetingForBreakdown = {
      class_ids: ['class-1', 'class-2'],
      allClasses: [
        { id: 'class-1', kelompok_id: 'kel-1', kelompok: { id: 'kel-1', name: 'Kelompok A' } },
        { id: 'class-2', kelompok_id: 'kel-1', kelompok: { id: 'kel-1', name: 'Kelompok A' } },
      ],
    }
    expect(shouldShowBreakdown(meeting)).toBe(false)
  })

  it('returns true for a multi-kelompok meeting (Sambung Desa)', () => {
    const meeting: MeetingForBreakdown = {
      class_ids: ['class-1', 'class-2'],
      allClasses: [
        { id: 'class-1', kelompok_id: 'kel-1', kelompok: { id: 'kel-1', name: 'Kelompok A' } },
        { id: 'class-2', kelompok_id: 'kel-2', kelompok: { id: 'kel-2', name: 'Kelompok B' } },
      ],
    }
    expect(shouldShowBreakdown(meeting)).toBe(true)
  })
})

describe('isMultiDesaMeeting', () => {
  it('returns false when all kelompok belong to the same desa', () => {
    const meeting: MeetingForBreakdown = {
      class_ids: ['class-1', 'class-2'],
      allClasses: [
        { id: 'class-1', kelompok_id: 'kel-1', kelompok: { id: 'kel-1', name: 'A', desa: { id: 'desa-1', name: 'Desa 1' } } },
        { id: 'class-2', kelompok_id: 'kel-2', kelompok: { id: 'kel-2', name: 'B', desa: { id: 'desa-1', name: 'Desa 1' } } },
      ],
    }
    expect(isMultiDesaMeeting(meeting)).toBe(false)
  })

  it('returns true when kelompok span multiple desa (Sambung Daerah)', () => {
    const meeting: MeetingForBreakdown = {
      class_ids: ['class-1', 'class-2'],
      allClasses: [
        { id: 'class-1', kelompok_id: 'kel-1', kelompok: { id: 'kel-1', name: 'A', desa: { id: 'desa-1', name: 'Desa 1' } } },
        { id: 'class-2', kelompok_id: 'kel-2', kelompok: { id: 'kel-2', name: 'B', desa: { id: 'desa-2', name: 'Desa 2' } } },
      ],
    }
    expect(isMultiDesaMeeting(meeting)).toBe(true)
  })
})

describe('aggregateMeetingByOrg', () => {
  it('returns empty array for no rows', () => {
    expect(aggregateMeetingByOrg([], 'kelompok')).toEqual([])
  })

  it('groups attendance by kelompok and computes correct rate', () => {
    const rows: AttendanceOrgRow[] = [
      { student_id: 's1', status: 'H', kelompok_id: 'kel-1', kelompok_name: 'Kelompok A' },
      { student_id: 's2', status: 'A', kelompok_id: 'kel-1', kelompok_name: 'Kelompok A' },
      { student_id: 's3', status: 'H', kelompok_id: 'kel-2', kelompok_name: 'Kelompok B' },
      { student_id: 's4', status: 'H', kelompok_id: 'kel-2', kelompok_name: 'Kelompok B' },
    ]

    const result = aggregateMeetingByOrg(rows, 'kelompok')

    expect(result).toHaveLength(2)

    const kelA = result.find(r => r.id === 'kel-1')
    expect(kelA).toMatchObject({ name: 'Kelompok A', present: 1, total: 2, rate: 50 })

    const kelB = result.find(r => r.id === 'kel-2')
    expect(kelB).toMatchObject({ name: 'Kelompok B', present: 2, total: 2, rate: 100 })
  })

  it('groups attendance by desa when level is desa', () => {
    const rows: AttendanceOrgRow[] = [
      { student_id: 's1', status: 'H', desa_id: 'desa-1', desa_name: 'Desa 1' },
      { student_id: 's2', status: 'H', desa_id: 'desa-1', desa_name: 'Desa 1' },
      { student_id: 's3', status: 'A', desa_id: 'desa-2', desa_name: 'Desa 2' },
    ]

    const result = aggregateMeetingByOrg(rows, 'desa')

    expect(result).toHaveLength(2)
    expect(result.find(r => r.id === 'desa-1')).toMatchObject({ present: 2, total: 2, rate: 100 })
    expect(result.find(r => r.id === 'desa-2')).toMatchObject({ present: 0, total: 1, rate: 0 })
  })

  it('does not double-count a student who appears in more than one row (e.g. multi-class)', () => {
    const rows: AttendanceOrgRow[] = [
      { student_id: 's1', status: 'H', kelompok_id: 'kel-1', kelompok_name: 'Kelompok A' },
      // Same student appears twice (e.g. belongs to 2 classes within the same kelompok) —
      // must still be counted once in `total` and once in `present`.
      { student_id: 's1', status: 'H', kelompok_id: 'kel-1', kelompok_name: 'Kelompok A' },
    ]

    const result = aggregateMeetingByOrg(rows, 'kelompok')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ present: 1, total: 1, rate: 100 })
  })

  it('does not double-count meeting_count when the same meeting spans multiple rows/classes', () => {
    // Simulates a single multi-kelompok meeting whose attendance rows all
    // share the same meeting_id — dedup must collapse to meeting_count: 1,
    // never 2 (the historical "Meeting Count Deduplication" bug).
    const rows: AttendanceOrgRow[] = [
      { student_id: 's1', status: 'H', kelompok_id: 'kel-1', kelompok_name: 'Kelompok A', meeting_id: 'm1' },
      { student_id: 's2', status: 'H', kelompok_id: 'kel-1', kelompok_name: 'Kelompok A', meeting_id: 'm1' },
    ]

    const result = aggregateMeetingByOrg(rows, 'kelompok')

    expect(result).toHaveLength(1)
    expect(result[0].meeting_count).toBe(1)
  })

  it('skips rows missing the relevant org id instead of throwing', () => {
    const rows: AttendanceOrgRow[] = [
      { student_id: 's1', status: 'H', kelompok_id: 'kel-1', kelompok_name: 'Kelompok A' },
      { student_id: 's2', status: 'H' }, // no kelompok_id
    ]

    const result = aggregateMeetingByOrg(rows, 'kelompok')

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'kel-1', present: 1, total: 1 })
  })
})
