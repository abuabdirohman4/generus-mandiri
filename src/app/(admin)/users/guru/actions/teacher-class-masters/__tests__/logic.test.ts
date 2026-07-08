import { describe, it, expect } from 'vitest'
import { buildClassMasterMappings, mapTeacherClassMastersToResult } from '../logic'

describe('buildClassMasterMappings', () => {
  it('maps assignments to insert rows with custom_class_name null by default', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-A' },
      { classMasterId: 'cm-B' },
    ])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', class_master_id: 'cm-A', custom_class_name: null },
      { teacher_id: 'teacher-1', class_master_id: 'cm-B', custom_class_name: null },
    ])
  })

  it('includes custom_class_name when provided', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-lainnya', customClassName: 'CAI 2026' },
    ])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', class_master_id: 'cm-lainnya', custom_class_name: 'CAI 2026' },
    ])
  })

  it('trims whitespace and treats empty string as null', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-lainnya', customClassName: '  ' },
    ])
    expect(result[0].custom_class_name).toBeNull()
  })

  it('returns empty array when assignments is empty', () => {
    expect(buildClassMasterMappings('t1', [])).toEqual([])
  })
})

describe('mapTeacherClassMastersToResult', () => {
  it('maps PostgREST object format including custom_class_name', () => {
    const raw = [{ id: '1', class_master_id: 'cm-A', custom_class_name: 'CAI 2026', class_masters: { id: 'cm-A', name: 'Lainnya', sort_order: 19 } }]
    expect(mapTeacherClassMastersToResult(raw)).toEqual([
      { id: '1', class_master_id: 'cm-A', class_master_name: 'Lainnya', custom_class_name: 'CAI 2026' },
    ])
  })

  it('maps PostgREST array format', () => {
    const raw = [{ id: '1', class_master_id: 'cm-B', custom_class_name: null, class_masters: [{ id: 'cm-B', name: 'SMP', sort_order: 5 }] }]
    expect(mapTeacherClassMastersToResult(raw)[0].class_master_name).toBe('SMP')
  })

  it('defaults custom_class_name to null when missing', () => {
    const raw = [{ id: '1', class_master_id: 'cm-A', class_masters: { id: 'cm-A', name: 'PAUD', sort_order: 1 } }]
    expect(mapTeacherClassMastersToResult(raw)[0].custom_class_name).toBeNull()
  })

  it('returns empty array for empty input', () => {
    expect(mapTeacherClassMastersToResult([])).toEqual([])
  })
})
