import { describe, it, expect } from 'vitest'
import { buildClassMasterMappings, mapTeacherClassMastersToResult } from '../logic'

describe('buildClassMasterMappings', () => {
  it('maps assignments dengan no custom → custom_class_names null', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-A' },
      { classMasterId: 'cm-B' },
    ])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', class_master_id: 'cm-A', custom_class_names: null },
      { teacher_id: 'teacher-1', class_master_id: 'cm-B', custom_class_names: null },
    ])
  })

  it('maps assignment dengan 1 custom class name → array', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-lainnya', customClassNames: ['CAI 2026'] },
    ])
    expect(result[0].custom_class_names).toEqual(['CAI 2026'])
  })

  it('maps assignment dengan multiple custom class names', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-lainnya', customClassNames: ['CAI 2026', 'KBM'] },
    ])
    expect(result[0].custom_class_names).toEqual(['CAI 2026', 'KBM'])
  })

  it('empty array customClassNames → null (no restriction)', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-lainnya', customClassNames: [] },
    ])
    expect(result[0].custom_class_names).toBeNull()
  })

  it('returns empty array when assignments is empty', () => {
    expect(buildClassMasterMappings('t1', [])).toEqual([])
  })
})

describe('mapTeacherClassMastersToResult', () => {
  it('maps dengan custom_class_names array', () => {
    const raw = [{
      id: '1',
      class_master_id: 'cm-A',
      custom_class_names: ['CAI 2026', 'KBM'],
      class_masters: { id: 'cm-A', name: 'Lainnya', sort_order: 19 }
    }]
    expect(mapTeacherClassMastersToResult(raw)).toEqual([{
      id: '1',
      class_master_id: 'cm-A',
      class_master_name: 'Lainnya',
      custom_class_names: ['CAI 2026', 'KBM'],
    }])
  })

  it('maps dengan custom_class_names null', () => {
    const raw = [{
      id: '1',
      class_master_id: 'cm-B',
      custom_class_names: null,
      class_masters: { id: 'cm-B', name: 'SMP', sort_order: 5 }
    }]
    expect(mapTeacherClassMastersToResult(raw)[0].custom_class_names).toBeNull()
  })

  it('returns empty array for empty input', () => {
    expect(mapTeacherClassMastersToResult([])).toEqual([])
  })
})

