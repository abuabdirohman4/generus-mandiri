import { describe, it, expect } from 'vitest'
import { STANDARD_SORT_ORDERS, filterStandardMasters, buildBatchPlan } from '../logic'
import type { ClassMaster } from '@/types/class'

const makeMaster = (id: string, name: string, sort_order: number): ClassMaster =>
  ({ id, name, sort_order, description: null, category_group: null })

describe('STANDARD_SORT_ORDERS', () => {
  it('contains exactly 18 entries', () => {
    expect(STANDARD_SORT_ORDERS.size).toBe(18)
  })
})

describe('filterStandardMasters', () => {
  it('returns only masters with sort_order in STANDARD_SORT_ORDERS', () => {
    const allMasters = [
      makeMaster('a', 'Kelas Paud', 1),
      makeMaster('b', 'Pra Remaja', 19),  // bukan standar
      makeMaster('c', 'SMP 1', 8),
      makeMaster('d', 'Pengajar', 24),   // bukan standar
    ]
    const result = filterStandardMasters(allMasters)
    expect(result).toHaveLength(2)
    expect(result.map(m => m.name)).toEqual(['Kelas Paud', 'SMP 1'])
  })
})

describe('buildBatchPlan', () => {
  const masters = [
    makeMaster('m1', 'Kelas Paud', 1),
    makeMaster('m2', 'Kelas 1', 2),
    makeMaster('m3', 'SMP 1', 8),
  ]

  it('returns all masters as toCreate when kelompok has no existing classes', () => {
    const plan = buildBatchPlan(masters, 'k1', [])
    expect(plan.toCreate).toHaveLength(3)
    expect(plan.toSkip).toHaveLength(0)
  })

  it('skips master when class name already exists (case-insensitive)', () => {
    const existing = [
      { id: 'c1', name: 'kelas paud', class_master_mappings: [] }
    ]
    const plan = buildBatchPlan(masters, 'k1', existing)
    expect(plan.toSkip).toHaveLength(1)
    expect(plan.toSkip[0].master.name).toBe('Kelas Paud')
    expect(plan.toCreate).toHaveLength(2)
  })

  it('skips master when master_id already mapped in kelompok', () => {
    const existing = [
      { id: 'c1', name: 'Custom Name', class_master_mappings: [{ class_master_id: 'm2' }] }
    ]
    const plan = buildBatchPlan(masters, 'k1', existing)
    expect(plan.toSkip[0].master.id).toBe('m2')
  })

  it('kelompok A and B are independent — skip in A does not affect B', () => {
    const existingA = [{ id: 'c1', name: 'Kelas Paud', class_master_mappings: [] }]
    const existingB: any[] = []
    const planA = buildBatchPlan(masters, 'kA', existingA)
    const planB = buildBatchPlan(masters, 'kB', existingB)
    expect(planA.toCreate).toHaveLength(2)
    expect(planB.toCreate).toHaveLength(3)
  })
})
