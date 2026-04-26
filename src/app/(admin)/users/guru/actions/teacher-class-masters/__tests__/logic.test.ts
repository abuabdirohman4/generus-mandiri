import { describe, it, expect } from 'vitest'
import { buildClassMasterMappings, mapTeacherClassMastersToResult } from '../logic'

describe('buildClassMasterMappings', () => {
  it('returns correctly shaped array', () => {
    const result = buildClassMasterMappings('teacher-1', ['cm-A', 'cm-B'])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', class_master_id: 'cm-A' },
      { teacher_id: 'teacher-1', class_master_id: 'cm-B' },
    ])
  })

  it('returns empty array when classMasterIds is empty', () => {
    expect(buildClassMasterMappings('t1', [])).toEqual([])
  })
})

describe('mapTeacherClassMastersToResult', () => {
  it('maps PostgREST object format', () => {
    const raw = [{ id: '1', class_master_id: 'cm-A', class_masters: { id: 'cm-A', name: 'PAUD', sort_order: 1 } }]
    expect(mapTeacherClassMastersToResult(raw)).toEqual([{ id: '1', class_master_id: 'cm-A', class_master_name: 'PAUD' }])
  })

  it('maps PostgREST array format', () => {
    const raw = [{ id: '1', class_master_id: 'cm-B', class_masters: [{ id: 'cm-B', name: 'SMP', sort_order: 5 }] }]
    expect(mapTeacherClassMastersToResult(raw)[0].class_master_name).toBe('SMP')
  })

  it('returns empty array for empty input', () => {
    expect(mapTeacherClassMastersToResult([])).toEqual([])
  })
})
