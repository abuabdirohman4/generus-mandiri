import { describe, it, expect } from 'vitest'
import { buildKelompokAccessMappings, validateKelompokAccessInput } from '../logic'

describe('buildKelompokAccessMappings', () => {
  it('returns correct mapping shape', () => {
    const result = buildKelompokAccessMappings('teacher-1', ['kelompok-1', 'kelompok-2'])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', kelompok_id: 'kelompok-1' },
      { teacher_id: 'teacher-1', kelompok_id: 'kelompok-2' },
    ])
  })
  it('returns empty array for empty kelompokIds', () => {
    expect(buildKelompokAccessMappings('t-1', [])).toEqual([])
  })
})

describe('validateKelompokAccessInput', () => {
  it('invalid for empty teacherId', () => {
    expect(validateKelompokAccessInput('', ['k1']).valid).toBe(false)
  })
  it('invalid for array with empty string', () => {
    expect(validateKelompokAccessInput('t-1', ['k1', '']).valid).toBe(false)
  })
  it('valid for empty kelompokIds (means full access)', () => {
    expect(validateKelompokAccessInput('t-1', []).valid).toBe(true)
  })
  it('valid for well-formed input', () => {
    expect(validateKelompokAccessInput('t-1', ['k1', 'k2']).valid).toBe(true)
  })
})
