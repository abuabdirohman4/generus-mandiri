import { describe, it, expect } from 'vitest'
import { deriveClassIdsBySelection } from './logic'

const classes = [
  { id: 'c1', name: 'Pra Nikah 1', kelompok_id: 'k1', desa_id: 'd1' },
  { id: 'c2', name: 'Pra Nikah 1', kelompok_id: 'k2', desa_id: 'd2' },
  { id: 'c3', name: 'SMP 1',       kelompok_id: 'k1', desa_id: 'd1' },
  { id: 'c4', name: 'SMP 1',       kelompok_id: 'k3', desa_id: 'd2' },
]

describe('deriveClassIdsBySelection', () => {
  it('expand by desa_id: Pra Nikah 1 × 2 desa → c1 + c2', () => {
    const result = deriveClassIdsBySelection(classes, ['Pra Nikah 1'], ['d1', 'd2'], 'desa_id')
    expect(result.sort()).toEqual(['c1', 'c2'])
  })

  it('expand by desa_id: single desa → only c1', () => {
    const result = deriveClassIdsBySelection(classes, ['Pra Nikah 1'], ['d1'], 'desa_id')
    expect(result).toEqual(['c1'])
  })

  it('scope empty → all matching by name', () => {
    const result = deriveClassIdsBySelection(classes, ['SMP 1'], [], 'desa_id')
    expect(result.sort()).toEqual(['c3', 'c4'])
  })

  it('expand by kelompok_id: backward compat', () => {
    const result = deriveClassIdsBySelection(classes, ['Pra Nikah 1'], ['k1'], 'kelompok_id')
    expect(result).toEqual(['c1'])
  })

  it('no class names → empty', () => {
    const result = deriveClassIdsBySelection(classes, [], ['d1'], 'desa_id')
    expect(result).toEqual([])
  })
})
