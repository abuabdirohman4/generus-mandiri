import type { ClassMaster } from '@/types/class'

export const STANDARD_SORT_ORDERS = new Set([
  1, 2, 3, 4, 5, 6, 7,  // Kelas Paud, Kelas 1-6
  8, 9, 10,             // SMP 1-3
  11, 12, 13,            // SMA 1-3
  14, 15, 16, 17,        // Pra Nikah 1-4
  18                     // Orang Tua
])

export interface ExistingClass {
  id: string
  name: string
  class_master_mappings: Array<{ class_master_id: string }>
}

export interface BatchPlanItem {
  master: ClassMaster
  reason?: string
}

export interface KelompokBatchPlan {
  kelompokId: string
  toCreate: ClassMaster[]
  toSkip: BatchPlanItem[]
}

export function filterStandardMasters(allMasters: ClassMaster[]): ClassMaster[] {
  return allMasters.filter(m => 
    STANDARD_SORT_ORDERS.has(m.sort_order) && 
    !m.name.toLowerCase().includes('pengurus')
  )
}

export function buildBatchPlan(
  masters: ClassMaster[],
  kelompokId: string,
  existingClasses: ExistingClass[]
): KelompokBatchPlan {
  const existingNames = new Set(existingClasses.map(c => c.name.toLowerCase().trim()))
  const existingMasterIds = new Set(
    existingClasses.flatMap(c => c.class_master_mappings.map(m => m.class_master_id))
  )

  const toCreate: ClassMaster[] = []
  const toSkip: BatchPlanItem[] = []

  for (const master of masters) {
    if (existingNames.has(master.name.toLowerCase().trim())) {
      toSkip.push({ master, reason: 'Nama kelas sudah ada' })
    } else if (existingMasterIds.has(master.id)) {
      toSkip.push({ master, reason: 'Master kelas sudah terpetakan' })
    } else {
      toCreate.push(master)
    }
  }

  return { kelompokId, toCreate, toSkip }
}
