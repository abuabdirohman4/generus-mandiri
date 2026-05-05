# Plan: Batch Kelas Standar (Multi-Kelompok)

**Beads:** sm-828 | **GitHub:** [#48](https://github.com/abuabdirohman4/generus-mandiri/issues/48)

## Context

Saat mendaftarkan daerah baru, admin perlu membuat 20 kelas standar untuk setiap kelompok. Saat ini kelas harus dibuat satu per satu via ClassModal. Fitur ini memungkinkan pembuatan 20 kelas standar sekaligus untuk **banyak kelompok** dalam satu operasi — pilih kelompok yang diinginkan, klik buat, selesai.

## 20 Kelas Standar (sudah ada di DB — `class_masters`)

| sort_order | id | name |
|---|---|---|
| 1 | 2db07133-... | Kelas Paud |
| 2–7 | ... | Kelas 1 – Kelas 6 |
| 9–11 | ... | SMP 1 – SMP 3 |
| 13–15 | ... | SMA 1 – SMA 3 |
| 17–20 | ... | Pra Nikah 1 – Pra Nikah 4 |
| 21 | d0672e7b-... | Orang Tua (<35) |
| 22 | 95a85fe3-... | Orang Tua (>35) |
| 23 | bfee4232-... | Lansia |

**Note:** Tidak semua class_master adalah "standar". Yang termasuk standar hanya 20 di atas.
Yang bukan standar: Pra Remaja (8), Remaja (12), Pra Nikah (16 — tanpa angka), Pengajar (24), Aghniya (25), KBM (26), Pengurus (27).

Cara identifikasi standar: hardcode list 20 `sort_order` di `logic.ts` → filter dari `getAllClassMasters()`.

## UI Flow

1. Tombol **"Kelas Standar"** di header tab Kelompok, di samping tombol "Tambah Kelas"
2. Klik → buka modal dua kolom:
   - **Kiri**: Filter Daerah→Desa (cascade, hidden untuk admin kelompok) + checklist kelompok
   - **Kanan**: Checklist 20 kelas standar (semua pre-checked) + tombol "Pilih Semua" / "Hapus Semua"
   - **Footer**: info "Duplikat akan dilewati otomatis" + tombol Batal / Buat Kelas Standar
3. Setelah submit → tampil summary inline (ganti konten modal): X kelas dibuat, Y dilewati → tombol Tutup

---

## Files to Create

```
src/app/(admin)/kelas/actions/batch-standard/
  queries.ts
  logic.ts
  actions.ts
  __tests__/
    queries.test.ts
    logic.test.ts
    actions.test.ts

src/app/(admin)/kelas/components/
  BatchStandardKelasModal.tsx
```

## Files to Modify

```
src/app/(admin)/kelas/stores/kelasStore.ts         (tambah 3 state)
src/app/(admin)/kelas/hooks/useKelasPage.ts        (expose 3 state baru)
src/app/(admin)/kelas/components/ClassesKelompokTab.tsx  (tombol + mount modal)
```

---

## Task 1 — logic.ts (TDD)

### 1a. Tulis test dulu: `__tests__/logic.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { STANDARD_SORT_ORDERS, filterStandardMasters, buildBatchPlan } from '../logic'
import type { ClassMaster } from '@/types/class'

const makeMaster = (id: string, name: string, sort_order: number): ClassMaster =>
  ({ id, name, sort_order, description: null, category_id: null, category: null })

describe('STANDARD_SORT_ORDERS', () => {
  it('contains exactly 20 entries', () => {
    expect(STANDARD_SORT_ORDERS.size).toBe(20)
  })
})

describe('filterStandardMasters', () => {
  it('returns only masters with sort_order in STANDARD_SORT_ORDERS', () => {
    const allMasters = [
      makeMaster('a', 'Kelas Paud', 1),
      makeMaster('b', 'Pra Remaja', 8),  // bukan standar
      makeMaster('c', 'SMP 1', 9),
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
    makeMaster('m3', 'SMP 1', 9),
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
```

**Run (expect FAIL):** `npx vitest run src/app/\(admin\)/kelas/actions/batch-standard/__tests__/logic.test.ts`

### 1b. Implementasi: `logic.ts`

```typescript
import type { ClassMaster } from '@/types/class'

export const STANDARD_SORT_ORDERS = new Set([
  1, 2, 3, 4, 5, 6, 7,  // Kelas Paud, Kelas 1-6
  9, 10, 11,             // SMP 1-3
  13, 14, 15,            // SMA 1-3
  17, 18, 19, 20,        // Pra Nikah 1-4
  21, 22, 23             // Orang Tua (<35), Orang Tua (>35), Lansia
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
  return allMasters.filter(m => STANDARD_SORT_ORDERS.has(m.sort_order))
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
```

**Run (expect PASS):** `npx vitest run src/app/\(admin\)/kelas/actions/batch-standard/__tests__/logic.test.ts`

---

## Task 2 — queries.ts (TDD)

### 2a. Tulis test dulu: `__tests__/queries.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from '../queries'

function makeSupabase(overrides: any = {}) {
  const chain: any = {
    select: vi.fn(() => chain),
    in: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }
  return { from: vi.fn(() => ({ ...chain, ...overrides })) }
}

describe('fetchExistingClassesForKelompoks', () => {
  it('calls from("classes") with .select and .in(kelompok_id)', async () => {
    const supabase = makeSupabase()
    await fetchExistingClassesForKelompoks(supabase as any, ['k1', 'k2'])
    expect(supabase.from).toHaveBeenCalledWith('classes')
  })
})

describe('insertClassWithMasterMapping', () => {
  it('calls from("classes").insert with name and kelompok_id', async () => {
    const supabase = makeSupabase({
      single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
    })
    await insertClassWithMasterMapping(supabase as any, 'k1', 'Kelas Paud', 'm1')
    expect(supabase.from).toHaveBeenCalledWith('classes')
  })

  it('returns error if classes insert fails', async () => {
    const supabase = makeSupabase({
      single: vi.fn(() => Promise.resolve({ data: null, error: new Error('insert failed') })),
    })
    const result = await insertClassWithMasterMapping(supabase as any, 'k1', 'Kelas Paud', 'm1')
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })
})
```

**Run (expect FAIL):** `npx vitest run src/app/\(admin\)/kelas/actions/batch-standard/__tests__/queries.test.ts`

### 2b. Implementasi: `queries.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExistingClass } from './logic'

export async function fetchExistingClassesForKelompoks(
  supabase: SupabaseClient,
  kelompokIds: string[]
): Promise<{ data: (ExistingClass & { kelompok_id: string })[] | null; error: any }> {
  return supabase
    .from('classes')
    .select('id, name, kelompok_id, class_master_mappings(class_master_id)')
    .in('kelompok_id', kelompokIds)
}

export async function insertClassWithMasterMapping(
  supabase: SupabaseClient,
  kelompokId: string,
  name: string,
  masterId: string
): Promise<{ data: { id: string } | null; error: any }> {
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .insert({ name, kelompok_id: kelompokId })
    .select('id')
    .single()

  if (classError || !classData) return { data: null, error: classError }

  const { error: mappingError } = await supabase
    .from('class_master_mappings')
    .insert({ class_id: classData.id, class_master_id: masterId })

  if (mappingError) return { data: null, error: mappingError }

  return { data: classData, error: null }
}
```

**Run (expect PASS):** `npx vitest run src/app/\(admin\)/kelas/actions/batch-standard/__tests__/queries.test.ts`

---

## Task 3 — actions.ts

### 3a. Tulis test dulu: `__tests__/actions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
  canAccessFeature: vi.fn(),
}))
vi.mock('../../masters', () => ({
  getAllClassMasters: vi.fn(),
}))
vi.mock('../queries', () => ({
  fetchExistingClassesForKelompoks: vi.fn(),
  insertClassWithMasterMapping: vi.fn(),
}))
vi.mock('@/lib/activityLogger', () => ({ logActivity: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createBatchStandardClasses } from '../actions'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import { getAllClassMasters } from '../../masters'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from '../queries'

const mockProfile = { id: 'u1', role: 'superadmin' }
const mockMasters = [
  { id: 'm1', name: 'Kelas Paud', sort_order: 1 },
  { id: 'm2', name: 'Kelas 1', sort_order: 2 },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUserProfile).mockResolvedValue(mockProfile as any)
  vi.mocked(canAccessFeature).mockReturnValue(true)
  vi.mocked(createAdminClient).mockResolvedValue({} as any)
  vi.mocked(getAllClassMasters).mockResolvedValue(mockMasters as any)
  vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({ data: [], error: null })
  vi.mocked(insertClassWithMasterMapping).mockResolvedValue({ data: { id: 'new-id' }, error: null })
})

describe('createBatchStandardClasses', () => {
  it('throws when no manage_classes permission', async () => {
    vi.mocked(canAccessFeature).mockReturnValue(false)
    await expect(
      createBatchStandardClasses(['k1'], ['m1'])
    ).rejects.toThrow('Anda tidak memiliki akses')
  })

  it('creates classes for each kelompok', async () => {
    const result = await createBatchStandardClasses(['k1', 'k2'], ['m1', 'm2'])
    expect(result.totalCreated).toBe(4) // 2 masters × 2 kelompoks
    expect(result.success).toBe(true)
  })

  it('skips duplicates per kelompok independently', async () => {
    vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({
      data: [
        { id: 'c1', name: 'Kelas Paud', kelompok_id: 'k1', class_master_mappings: [] }
      ],
      error: null
    })
    const result = await createBatchStandardClasses(['k1'], ['m1', 'm2'])
    expect(result.totalCreated).toBe(1)
    expect(result.totalSkipped).toBe(1)
  })

  it('calls revalidatePath("/kelas") on success', async () => {
    const { revalidatePath } = await import('next/cache')
    await createBatchStandardClasses(['k1'], ['m1'])
    expect(revalidatePath).toHaveBeenCalledWith('/kelas')
  })

  it('returns success=false when all are duplicates', async () => {
    vi.mocked(fetchExistingClassesForKelompoks).mockResolvedValue({
      data: [
        { id: 'c1', name: 'Kelas Paud', kelompok_id: 'k1', class_master_mappings: [] },
        { id: 'c2', name: 'Kelas 1', kelompok_id: 'k1', class_master_mappings: [] },
      ],
      error: null
    })
    const result = await createBatchStandardClasses(['k1'], ['m1', 'm2'])
    expect(result.success).toBe(false)
    expect(result.totalCreated).toBe(0)
  })
})
```

**Run (expect FAIL):** `npx vitest run src/app/\(admin\)/kelas/actions/batch-standard/__tests__/actions.test.ts`

### 3b. Implementasi: `actions.ts`

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature, getCurrentUserProfile } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import { getAllClassMasters } from '../masters'
import { fetchExistingClassesForKelompoks, insertClassWithMasterMapping } from './queries'
import { filterStandardMasters, buildBatchPlan } from './logic'

export interface KelompokResult {
  kelompokId: string
  created: string[]
  skipped: string[]
  errors: string[]
}

export interface BatchStandardResult {
  success: boolean
  totalCreated: number
  totalSkipped: number
  byKelompok: KelompokResult[]
}

export async function createBatchStandardClasses(
  kelompokIds: string[],
  masterIds: string[]
): Promise<BatchStandardResult> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile || !canAccessFeature(profile, 'manage_classes')) {
      throw new Error('Anda tidak memiliki akses untuk membuat kelas')
    }

    if (!kelompokIds?.length) throw new Error('Pilih minimal satu kelompok')
    if (!masterIds?.length) throw new Error('Pilih minimal satu kelas standar')

    const supabase = await createAdminClient()

    // Get all masters, filter to selected IDs only (from the standard list)
    const allMasters = await getAllClassMasters()
    const standardMasters = filterStandardMasters(allMasters)
    const selectedMasters = standardMasters.filter(m => masterIds.includes(m.id))

    if (selectedMasters.length === 0) throw new Error('Tidak ada master kelas yang valid')

    // Fetch existing classes for all kelompoks at once
    const { data: existingClasses, error: fetchError } = await fetchExistingClassesForKelompoks(
      supabase,
      kelompokIds
    )
    if (fetchError) throw fetchError

    // Group existing classes by kelompok_id
    const byKelompokId = (existingClasses || []).reduce<Record<string, typeof existingClasses>>((acc, cls) => {
      if (!cls) return acc
      const kid = (cls as any).kelompok_id as string
      if (!acc[kid]) acc[kid] = []
      acc[kid]!.push(cls)
      return acc
    }, {})

    let totalCreated = 0
    let totalSkipped = 0
    const byKelompok: KelompokResult[] = []

    for (const kelompokId of kelompokIds) {
      const existing = byKelompokId[kelompokId] || []
      const plan = buildBatchPlan(selectedMasters, kelompokId, existing as any)
      const kelompokResult: KelompokResult = {
        kelompokId,
        created: [],
        skipped: plan.toSkip.map(s => s.master.name),
        errors: [],
      }

      totalSkipped += plan.toSkip.length

      for (const master of plan.toCreate) {
        const { data, error } = await insertClassWithMasterMapping(
          supabase, kelompokId, master.name, master.id
        )
        if (error) {
          kelompokResult.errors.push(`${master.name}: ${error.message}`)
        } else if (data) {
          kelompokResult.created.push(master.name)
          totalCreated++
        }
      }

      byKelompok.push(kelompokResult)
    }

    revalidatePath('/kelas')

    if (totalCreated > 0) {
      void logActivity({
        userId: profile.id,
        action: 'batch_create_standard_classes',
        entityType: 'class',
        entityId: kelompokIds[0],
        entityLabel: `${totalCreated} kelas standar`,
        pagePath: '/kelas',
        metadata: { kelompokIds, masterIds, totalCreated, totalSkipped }
      })
    }

    return { success: totalCreated > 0, totalCreated, totalSkipped, byKelompok }
  } catch (error) {
    handleApiError(error, 'membuat kelas standar', 'Gagal membuat kelas standar')
    throw error
  }
}
```

**Run (expect PASS):** `npx vitest run src/app/\(admin\)/kelas/actions/batch-standard/__tests__/actions.test.ts`

---

## Task 4 — kelasStore.ts

Tambahkan 3 fields ke `KelasState` interface dan implementasinya di `create()`.

**File:** `src/app/(admin)/kelas/stores/kelasStore.ts`

Setelah `deleteMasterConfirm` field di interface, tambahkan:
```typescript
// Batch standard modal
isBatchStandardModalOpen: boolean
openBatchStandardModal: () => void
closeBatchStandardModal: () => void
```

Setelah `closeDeleteMasterConfirm` implementation, tambahkan:
```typescript
isBatchStandardModalOpen: false,
openBatchStandardModal: () => set({ isBatchStandardModalOpen: true }),
closeBatchStandardModal: () => set({ isBatchStandardModalOpen: false }),
```

---

## Task 5 — useKelasPage.ts

**File:** `src/app/(admin)/kelas/hooks/useKelasPage.ts`

Tambahkan ke destructure dari `useKelasStore()`:
```typescript
isBatchStandardModalOpen,
openBatchStandardModal,
closeBatchStandardModal,
```

Tambahkan ke return value:
```typescript
isBatchStandardModalOpen,
openBatchStandardModal,
closeBatchStandardModal,
```

---

## Task 6 — BatchStandardKelasModal.tsx

**File:** `src/app/(admin)/kelas/components/BatchStandardKelasModal.tsx`

```typescript
'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { isAdminKelompok } from '@/lib/userUtils'
import { useUserProfile } from '@/stores/userProfileStore'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useClassMasters } from '@/hooks/useClassMasters'
import { createBatchStandardClasses } from '../actions/batch-standard/actions'
import { filterStandardMasters } from '../actions/batch-standard/logic'
import type { BatchStandardResult } from '../actions/batch-standard/actions'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import type { Kelompok } from '@/types/organization'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function BatchStandardKelasModal({ isOpen, onClose, onSuccess }: Props) {
  const { profile: userProfile } = useUserProfile()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok: allKelompok } = useKelompok()
  const { masters: allMasters, isLoading: mastersLoading } = useClassMasters()

  // Local state (no Zustand needed — modal is simple enough)
  const [filterDaerahId, setFilterDaerahId] = useState('')
  const [filterDesaId, setFilterDesaId] = useState('')
  const [selectedKelompokIds, setSelectedKelompokIds] = useState<string[]>([])
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<BatchStandardResult | null>(null)

  const standardMasters = useMemo(() => filterStandardMasters(allMasters), [allMasters])

  // Pre-select all standard masters on open
  useEffect(() => {
    if (isOpen && standardMasters.length > 0) {
      setSelectedMasterIds(standardMasters.map(m => m.id))
    }
  }, [isOpen, standardMasters.length])

  // Auto-select kelompok for admin kelompok
  useEffect(() => {
    if (isOpen && userProfile && isAdminKelompok(userProfile) && userProfile.kelompok_id) {
      setSelectedKelompokIds([userProfile.kelompok_id])
    }
  }, [isOpen, userProfile])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setFilterDaerahId('')
      setFilterDesaId('')
      setSelectedKelompokIds([])
      setSelectedMasterIds([])
      setIsSubmitting(false)
      setResult(null)
    }
  }, [isOpen])

  // Filter kelompok list based on cascade selection
  const filteredKelompok = useMemo(() => {
    if (!allKelompok) return []
    if (userProfile && isAdminKelompok(userProfile)) {
      return allKelompok.filter((k: Kelompok) => k.id === userProfile.kelompok_id)
    }
    if (filterDesaId) return allKelompok.filter((k: Kelompok) => (k as any).desa_id === filterDesaId)
    if (filterDaerahId) {
      const desaIds = (desa || [])
        .filter((d: any) => d.daerah_id === filterDaerahId)
        .map((d: any) => d.id)
      return allKelompok.filter((k: Kelompok) => desaIds.includes((k as any).desa_id))
    }
    return allKelompok
  }, [allKelompok, desa, filterDaerahId, filterDesaId, userProfile])

  const filteredDesa = useMemo(() => {
    if (!desa) return []
    if (filterDaerahId) return desa.filter((d: any) => d.daerah_id === filterDaerahId)
    return desa
  }, [desa, filterDaerahId])

  const toggleKelompok = (id: string) => {
    setSelectedKelompokIds(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    )
  }

  const toggleMaster = (id: string) => {
    setSelectedMasterIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (selectedKelompokIds.length === 0) {
      toast.error('Pilih minimal satu kelompok')
      return
    }
    if (selectedMasterIds.length === 0) {
      toast.error('Pilih minimal satu kelas standar')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createBatchStandardClasses(selectedKelompokIds, selectedMasterIds)
      setResult(res)
      if (res.totalCreated > 0) {
        toast.success(`${res.totalCreated} kelas berhasil dibuat`)
        onSuccess?.()
      } else {
        toast.info('Semua kelas sudah ada — tidak ada yang dibuat')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const isAdminKelompokUser = userProfile && isAdminKelompok(userProfile)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={result ? 'Hasil Pembuatan Kelas' : 'Tambah Kelas Standar'}>
      {result ? (
        // Result view
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{result.totalCreated} kelas dibuat</p>
            {result.totalSkipped > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{result.totalSkipped} dilewati (sudah ada)</p>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {result.byKelompok.map(k => (
              <div key={k.kelompokId} className="text-sm border rounded p-3 dark:border-gray-700">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {filteredKelompok.find(kl => kl.id === k.kelompokId)?.name || k.kelompokId}
                </p>
                {k.created.length > 0 && (
                  <p className="text-green-600 dark:text-green-400">✓ {k.created.join(', ')}</p>
                )}
                {k.skipped.length > 0 && (
                  <p className="text-yellow-600 dark:text-yellow-400">⏭ Dilewati: {k.skipped.join(', ')}</p>
                )}
                {k.errors.length > 0 && (
                  <p className="text-red-600 dark:text-red-400">✗ Error: {k.errors.join(', ')}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleClose}>Tutup</Button>
          </div>
        </div>
      ) : (
        // Input view
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Kelompok selection */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pilih Kelompok <span className="text-red-500">*</span>
              </p>

              {/* Cascade filter — hidden for admin kelompok */}
              {!isAdminKelompokUser && (
                <div className="space-y-2 mb-3">
                  <select
                    className="w-full text-sm border rounded px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600"
                    value={filterDaerahId}
                    onChange={e => { setFilterDaerahId(e.target.value); setFilterDesaId(''); setSelectedKelompokIds([]) }}
                  >
                    <option value="">Semua Daerah</option>
                    {(daerah || []).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-full text-sm border rounded px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600"
                    value={filterDesaId}
                    onChange={e => { setFilterDesaId(e.target.value); setSelectedKelompokIds([]) }}
                  >
                    <option value="">Semua Desa</option>
                    {filteredDesa.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kelompok checkboxes */}
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2 dark:border-gray-700">
                {filteredKelompok.length === 0 ? (
                  <p className="text-sm text-gray-400 p-2">Tidak ada kelompok</p>
                ) : (
                  filteredKelompok.map((k: Kelompok) => (
                    <label key={k.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedKelompokIds.includes(k.id)}
                        onChange={() => toggleKelompok(k.id)}
                        disabled={isAdminKelompokUser}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{k.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedKelompokIds.length > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{selectedKelompokIds.length} kelompok dipilih</p>
              )}
            </div>

            {/* Right: Standard masters selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pilih Kelas Standar <span className="text-red-500">*</span>
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMasterIds(standardMasters.map(m => m.id))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Semua
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMasterIds([])}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 border rounded p-2 dark:border-gray-700">
                {mastersLoading ? (
                  <p className="text-sm text-gray-400 p-2">Memuat...</p>
                ) : (
                  standardMasters.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedMasterIds.includes(m.id)}
                        onChange={() => toggleMaster(m.id)}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{m.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{selectedMasterIds.length} / {standardMasters.length} dipilih</p>
            </div>
          </div>

          {/* Footer info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">
            ℹ Kelas yang sudah ada di kelompok yang dipilih akan dilewati otomatis
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedKelompokIds.length === 0 || selectedMasterIds.length === 0}
              loading={isSubmitting}
              loadingText="Membuat kelas..."
            >
              Buat Kelas Standar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
```

---

## Task 7 — ClassesKelompokTab.tsx

**File:** `src/app/(admin)/kelas/components/ClassesKelompokTab.tsx`

### 7a. Tambah import

```typescript
import BatchStandardKelasModal from './BatchStandardKelasModal'
```

### 7b. Tambah destructure dari useKelasPage()

```typescript
isBatchStandardModalOpen,
openBatchStandardModal,
closeBatchStandardModal,
```

### 7c. Ganti header section (baris 63-73) dari:

```tsx
<div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
      Kelas Kelompok
    </h2>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Kelola implementasi kelas per kelompok
    </p>
  </div>
</div>
```

Menjadi:

```tsx
<div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
      Kelas Kelompok
    </h2>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Kelola implementasi kelas per kelompok
    </p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" onClick={openBatchStandardModal}>
      Kelas Standar
    </Button>
    <Button onClick={openCreateModal}>
      Tambah Kelas
    </Button>
  </div>
</div>
```

### 7d. Tambah modal di bawah ClassModal (setelah baris 163):

```tsx
{isBatchStandardModalOpen && (
  <BatchStandardKelasModal
    isOpen={isBatchStandardModalOpen}
    onClose={() => { closeBatchStandardModal(); mutate() }}
    onSuccess={mutate}
  />
)}
```

---

## Verification

1. **Unit tests:** `npx vitest run src/app/\(admin\)/kelas/actions/batch-standard`
   - logic.test.ts: pass tanpa mock
   - queries.test.ts: pass dengan mock client
   - actions.test.ts: pass dengan semua mock

2. **Type check:** `npm run type-check` — tidak ada error baru

3. **Manual happy path:** Pilih 2 kelompok kosong → centang semua 20 → Buat → hasil: 40 kelas dibuat, 0 dilewati → cek tabel kelas di Supabase

4. **Manual duplikat:** Jalankan lagi pada kelompok yang sama → 0 dibuat, 40 dilewati

5. **Role test:** Login sebagai admin kelompok → kelompok auto-selected, filter daerah/desa tidak muncul

6. **SWR refresh:** Setelah tutup modal, tabel kelas ter-refresh

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? — Tidak, mengikuti 3-layer pattern yang sudah ada (sm-d15)
- [ ] Apakah ada tabel database baru? — Tidak
- [ ] Apakah ada route/page baru? — Tidak
- [ ] Apakah ada permission pattern baru? — Tidak, menggunakan `canAccessFeature(profile, 'manage_classes')` yang sudah ada
- [ ] Update docs jika ada yang baru → Tidak diperlukan

---

## Commit Template

```
feat(kelas): tambah fitur batch kelas standar multi-kelompok

- Server action createBatchStandardClasses() dengan 3-layer architecture
- Modal BatchStandardKelasModal dengan cascading kelompok filter
- Deteksi duplikat otomatis per kelompok (nama + master mapping)
- Tombol "Kelas Standar" di tab Kelompok

fixes #48

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
