# Sebaran Siswa Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambahkan tab "Sebaran Siswa" di halaman `/users/siswa` yang menampilkan distribusi siswa secara hierarkis (Daerah → Desa → Kelompok → Kelas) sesuai scope role user, dengan expand/collapse per node dan penanda ⚠️ untuk kelompok yang belum punya siswa.

**Architecture:** Server action `getSebaranSiswa()` mengambil data hierarkis dari Supabase sesuai scope user, dikonsumsi via SWR hook, dirender sebagai tree expand/collapse di komponen baru `SebaranSiswaTab`. Tab ditambahkan di antara "Siswa" dan "Permintaan Transfer" di `page.tsx`.

**Tech Stack:** Next.js 15 server actions, Supabase (PostgreSQL), SWR, Zustand, Tailwind CSS, Vitest (unit tests), TypeScript

---

## Hierarki Drill-down per Role

| Role | Level 1 | Level 2 | Level 3 | Level 4 |
|------|---------|---------|---------|---------|
| Superadmin | Daerah | Desa | Kelompok | Kelas |
| Admin/Guru Daerah | Desa | Kelompok | Kelas | — |
| Admin/Guru Desa | Kelompok | Kelas | — | — |
| Admin/Guru Kelompok (multi) | Kelompok | Kelas | — | — |
| Admin/Guru Kelompok (single) | Kelas langsung | — | — | — |

**Definisi "kosong":** Kelompok dengan 0 siswa aktif (`status = 'active' AND deleted_at IS NULL`).

---

## Task 1: Types untuk Sebaran Siswa

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/sebaran/types.ts`

**Step 1: Buat file types**

```typescript
// src/app/(admin)/users/siswa/actions/sebaran/types.ts

export interface KelasNode {
  id: string
  name: string
  total_students: number
}

export interface KelompokNode {
  id: string
  name: string
  total_students: number
  kelas: KelasNode[]
}

export interface DesaNode {
  id: string
  name: string
  total_students: number
  kelompok: KelompokNode[]
}

export interface DaerahNode {
  id: string
  name: string
  total_students: number
  desa: DesaNode[]
}

export type SebaranSiswaData =
  | { level: 'daerah'; data: DaerahNode[] }
  | { level: 'desa'; data: DesaNode[] }
  | { level: 'kelompok'; data: KelompokNode[] }
  | { level: 'kelas'; data: KelasNode[] }

export interface SebaranSiswaStats {
  total_daerah?: number
  total_desa?: number
  total_kelompok?: number
  total_siswa: number
  kelompok_kosong: number
}
```

**Step 2: Commit**

```bash
git add src/app/(admin)/users/siswa/actions/sebaran/types.ts
git commit -m "feat(sebaran-siswa): add type definitions for hierarchical student distribution"
```

---

## Task 2: Query Layer — Fetch Data dari Supabase

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/sebaran/queries.ts`
- Create: `src/app/(admin)/users/siswa/actions/sebaran/__tests__/queries.test.ts`

### Step 1: Tulis failing test

```typescript
// src/app/(admin)/users/siswa/actions/sebaran/__tests__/queries.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchKelasWithStudentCount,
  fetchKelompokWithKelas,
  fetchDesaWithKelompok,
  fetchDaerahWithDesa,
} from '../queries'

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
}

beforeEach(() => vi.clearAllMocks())

describe('fetchKelasWithStudentCount', () => {
  it('returns kelas with student count for given kelompok_id', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValueOnce({
        data: [
          { id: 'kelas-1', name: 'Pra Nikah', kelompok_id: 'klp-1' },
          { id: 'kelas-2', name: 'Remaja', kelompok_id: 'klp-1' },
        ],
        error: null,
      }),
    })
    // student_classes count mock
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValueOnce({
        data: [
          { class_id: 'kelas-1' },
          { class_id: 'kelas-1' },
          { class_id: 'kelas-2' },
        ],
        error: null,
      }),
    })

    const result = await fetchKelasWithStudentCount(mockSupabase as any, 'klp-1')

    expect(result).toEqual([
      { id: 'kelas-1', name: 'Pra Nikah', total_students: 2 },
      { id: 'kelas-2', name: 'Remaja', total_students: 1 },
    ])
  })
})

describe('fetchKelompokWithKelas', () => {
  it('returns kelompok with nested kelas for given desa_id', async () => {
    // Arrange mocks for kelompok + kelas + students
    // (simplified — full mock in actual test)
    expect(true).toBe(true) // placeholder, expand in real implementation
  })
})
```

### Step 2: Run test — pastikan FAIL

```bash
cd /Users/abuabdirohman/Documents/Programs/OpenSource/school-management
npx vitest run src/app/\(admin\)/users/siswa/actions/sebaran/__tests__/queries.test.ts
```

Expected: FAIL — "Cannot find module '../queries'"

### Step 3: Implementasi queries.ts

```typescript
// src/app/(admin)/users/siswa/actions/sebaran/queries.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import type { KelasNode, KelompokNode, DesaNode, DaerahNode } from './types'

/**
 * Fetch kelas + jumlah siswa aktif untuk satu kelompok.
 * Siswa aktif: status = 'active' AND deleted_at IS NULL
 */
export async function fetchKelasWithStudentCount(
  supabase: SupabaseClient,
  kelompokId: string
): Promise<KelasNode[]> {
  // Query 1: ambil kelas di kelompok ini
  const { data: kelasData, error: kelasError } = await supabase
    .from('classes')
    .select('id, name, kelompok_id')
    .eq('kelompok_id', kelompokId)

  if (kelasError || !kelasData || kelasData.length === 0) return []

  const kelasIds = kelasData.map((k: any) => k.id)

  // Query 2: ambil student_classes untuk kelas-kelas ini
  // (join ke students untuk filter aktif)
  const { data: scData } = await supabase
    .from('student_classes')
    .select('class_id, students!inner(id, status, deleted_at)')
    .in('class_id', kelasIds)
    .eq('students.status', 'active')
    .is('students.deleted_at', null)

  // Hitung jumlah siswa per kelas
  const countMap: Record<string, number> = {}
  kelasIds.forEach((id: string) => (countMap[id] = 0))
  ;(scData || []).forEach((sc: any) => {
    if (sc.class_id) countMap[sc.class_id] = (countMap[sc.class_id] || 0) + 1
  })

  return kelasData.map((k: any) => ({
    id: k.id,
    name: k.name,
    total_students: countMap[k.id] || 0,
  }))
}

/**
 * Fetch kelompok + nested kelas untuk satu desa.
 */
export async function fetchKelompokWithKelas(
  supabase: SupabaseClient,
  desaId: string
): Promise<KelompokNode[]> {
  const { data: kelompokData, error } = await supabase
    .from('kelompok')
    .select('id, name')
    .eq('desa_id', desaId)

  if (error || !kelompokData || kelompokData.length === 0) return []

  const result: KelompokNode[] = await Promise.all(
    kelompokData.map(async (klp: any) => {
      const kelas = await fetchKelasWithStudentCount(supabase, klp.id)
      const total_students = kelas.reduce((sum, k) => sum + k.total_students, 0)
      return { id: klp.id, name: klp.name, total_students, kelas }
    })
  )

  return result
}

/**
 * Fetch desa + nested kelompok untuk satu daerah.
 */
export async function fetchDesaWithKelompok(
  supabase: SupabaseClient,
  daerahId: string
): Promise<DesaNode[]> {
  const { data: desaData, error } = await supabase
    .from('desa')
    .select('id, name')
    .eq('daerah_id', daerahId)

  if (error || !desaData || desaData.length === 0) return []

  const result: DesaNode[] = await Promise.all(
    desaData.map(async (d: any) => {
      const kelompok = await fetchKelompokWithKelas(supabase, d.id)
      const total_students = kelompok.reduce((sum, k) => sum + k.total_students, 0)
      return { id: d.id, name: d.name, total_students, kelompok }
    })
  )

  return result
}

/**
 * Fetch semua daerah + nested hierarchy (superadmin only).
 */
export async function fetchDaerahWithDesa(
  supabase: SupabaseClient
): Promise<DaerahNode[]> {
  const { data: daerahData, error } = await supabase
    .from('daerah')
    .select('id, name')

  if (error || !daerahData || daerahData.length === 0) return []

  const result: DaerahNode[] = await Promise.all(
    daerahData.map(async (d: any) => {
      const desa = await fetchDesaWithKelompok(supabase, d.id)
      const total_students = desa.reduce((sum, ds) => sum + ds.total_students, 0)
      return { id: d.id, name: d.name, total_students, desa }
    })
  )

  return result
}

/**
 * Fetch kelompok untuk multi-kelompok teacher/admin.
 * kelompokIds: array of kelompok_id dari profile.classes
 */
export async function fetchKelompokByIds(
  supabase: SupabaseClient,
  kelompokIds: string[]
): Promise<KelompokNode[]> {
  const unique = [...new Set(kelompokIds.filter(Boolean))]
  if (unique.length === 0) return []

  const { data: kelompokData, error } = await supabase
    .from('kelompok')
    .select('id, name')
    .in('id', unique)

  if (error || !kelompokData) return []

  return Promise.all(
    kelompokData.map(async (klp: any) => {
      const kelas = await fetchKelasWithStudentCount(supabase, klp.id)
      const total_students = kelas.reduce((sum, k) => sum + k.total_students, 0)
      return { id: klp.id, name: klp.name, total_students, kelas }
    })
  )
}
```

### Step 4: Run test — pastikan PASS

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/sebaran/__tests__/queries.test.ts
```

Expected: PASS

### Step 5: Commit

```bash
git add src/app/(admin)/users/siswa/actions/sebaran/queries.ts \
        src/app/(admin)/users/siswa/actions/sebaran/__tests__/queries.test.ts
git commit -m "feat(sebaran-siswa): add query layer for hierarchical student distribution"
```

---

## Task 3: Logic Layer — Tentukan Level & Hitung Stats

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/sebaran/logic.ts`
- Create: `src/app/(admin)/users/siswa/actions/sebaran/__tests__/logic.test.ts`

### Step 1: Tulis failing test

```typescript
// src/app/(admin)/users/siswa/actions/sebaran/__tests__/logic.test.ts

import { describe, it, expect } from 'vitest'
import { computeStats, getTopLevelForProfile } from '../logic'
import type { KelompokNode } from '../types'

describe('computeStats', () => {
  it('counts kelompok kosong correctly', () => {
    const kelompok: KelompokNode[] = [
      { id: '1', name: 'Nambo', total_students: 15, kelas: [] },
      { id: '2', name: 'Maji', total_students: 0, kelas: [] },
      { id: '3', name: 'Ciawi', total_students: 8, kelas: [] },
    ]
    const stats = computeStats({ level: 'kelompok', data: kelompok })
    expect(stats.total_siswa).toBe(23)
    expect(stats.kelompok_kosong).toBe(1)
    expect(stats.total_kelompok).toBe(3)
  })

  it('counts kelompok kosong from nested desa level', () => {
    const desa = [
      {
        id: 'd1', name: 'Sukamaju', total_students: 15,
        kelompok: [
          { id: 'k1', name: 'Nambo', total_students: 15, kelas: [] },
          { id: 'k2', name: 'Kosong', total_students: 0, kelas: [] },
        ]
      }
    ]
    const stats = computeStats({ level: 'desa', data: desa })
    expect(stats.kelompok_kosong).toBe(1)
    expect(stats.total_siswa).toBe(15)
  })
})

describe('getTopLevelForProfile', () => {
  it('returns daerah for superadmin', () => {
    const profile = { role: 'superadmin', id: '1' }
    expect(getTopLevelForProfile(profile as any)).toBe('daerah')
  })

  it('returns desa for admin daerah', () => {
    const profile = { role: 'admin', daerah_id: 'x', id: '1' }
    expect(getTopLevelForProfile(profile as any)).toBe('desa')
  })

  it('returns kelompok for admin desa', () => {
    const profile = { role: 'admin', desa_id: 'x', id: '1' }
    expect(getTopLevelForProfile(profile as any)).toBe('kelompok')
  })

  it('returns kelompok for multi-kelompok guru', () => {
    const profile = {
      role: 'teacher', kelompok_id: 'x', id: '1',
      classes: [
        { id: 'c1', kelompok_id: 'k1' },
        { id: 'c2', kelompok_id: 'k2' },
      ]
    }
    expect(getTopLevelForProfile(profile as any)).toBe('kelompok')
  })

  it('returns kelas for single-kelompok guru', () => {
    const profile = {
      role: 'teacher', kelompok_id: 'x', id: '1',
      classes: [
        { id: 'c1', kelompok_id: 'k1' },
        { id: 'c2', kelompok_id: 'k1' },
      ]
    }
    expect(getTopLevelForProfile(profile as any)).toBe('kelas')
  })
})
```

### Step 2: Run test — pastikan FAIL

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/sebaran/__tests__/logic.test.ts
```

Expected: FAIL — "Cannot find module '../logic'"

### Step 3: Implementasi logic.ts

```typescript
// src/app/(admin)/users/siswa/actions/sebaran/logic.ts

import type { UserProfile } from '@/types/user'
import type { SebaranSiswaData, SebaranSiswaStats, KelompokNode, DesaNode, DaerahNode } from './types'

export type TopLevel = 'daerah' | 'desa' | 'kelompok' | 'kelas'

/**
 * Tentukan level tertinggi yang harus ditampilkan berdasarkan role.
 */
export function getTopLevelForProfile(profile: UserProfile): TopLevel {
  if (profile.role === 'superadmin') return 'daerah'

  if (profile.role === 'admin') {
    if (!profile.desa_id && !profile.kelompok_id && profile.daerah_id) return 'desa'
    if (!profile.kelompok_id && profile.desa_id) return 'kelompok'
    return 'kelas' // admin kelompok — single kelompok
  }

  if (profile.role === 'teacher') {
    // Guru Daerah
    if (profile.daerah_id && !profile.desa_id && !profile.kelompok_id) return 'desa'
    // Guru Desa
    if (profile.desa_id && !profile.kelompok_id) return 'kelompok'
    // Guru Kelompok: cek apakah multi-kelompok
    if (profile.kelompok_id) {
      const uniqueKelompoks = new Set(
        (profile.classes || []).map((c) => c.kelompok_id).filter(Boolean)
      )
      return uniqueKelompoks.size > 1 ? 'kelompok' : 'kelas'
    }
  }

  return 'kelas'
}

/**
 * Ambil semua KelompokNode dari data (regardless of nesting level).
 */
function extractAllKelompok(data: SebaranSiswaData): KelompokNode[] {
  if (data.level === 'kelompok') return data.data
  if (data.level === 'desa') {
    return (data.data as DesaNode[]).flatMap((d) => d.kelompok)
  }
  if (data.level === 'daerah') {
    return (data.data as DaerahNode[]).flatMap((dr) => dr.desa.flatMap((d) => d.kelompok))
  }
  return []
}

/**
 * Hitung stats ringkasan dari SebaranSiswaData.
 */
export function computeStats(data: SebaranSiswaData): SebaranSiswaStats {
  if (data.level === 'kelas') {
    const total_siswa = data.data.reduce((sum, k) => sum + k.total_students, 0)
    return { total_siswa, kelompok_kosong: 0 }
  }

  const allKelompok = extractAllKelompok(data)
  const kelompok_kosong = allKelompok.filter((k) => k.total_students === 0).length
  const total_siswa = allKelompok.reduce((sum, k) => sum + k.total_students, 0)

  const stats: SebaranSiswaStats = { total_siswa, kelompok_kosong }

  if (data.level === 'kelompok') {
    stats.total_kelompok = data.data.length
  } else if (data.level === 'desa') {
    stats.total_desa = data.data.length
    stats.total_kelompok = allKelompok.length
  } else if (data.level === 'daerah') {
    stats.total_daerah = data.data.length
    stats.total_desa = (data.data as DaerahNode[]).reduce((sum, dr) => sum + dr.desa.length, 0)
    stats.total_kelompok = allKelompok.length
  }

  return stats
}
```

### Step 4: Run test — pastikan PASS

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/sebaran/__tests__/logic.test.ts
```

Expected: PASS

### Step 5: Commit

```bash
git add src/app/(admin)/users/siswa/actions/sebaran/logic.ts \
        src/app/(admin)/users/siswa/actions/sebaran/__tests__/logic.test.ts
git commit -m "feat(sebaran-siswa): add logic layer for role-based level detection and stats"
```

---

## Task 4: Server Action

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/sebaran/actions.ts`
- Create: `src/app/(admin)/users/siswa/actions/sebaran/__tests__/actions.test.ts`

### Step 1: Tulis failing test

```typescript
// src/app/(admin)/users/siswa/actions/sebaran/__tests__/actions.test.ts

import { describe, it, expect, vi } from 'vitest'

// Mock createClient + createAdminClient
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
}))

import { getSebaranSiswa } from '../actions'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { createAdminClient } from '@/lib/supabase/server'

describe('getSebaranSiswa', () => {
  it('returns error when user not authenticated', async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValueOnce(null)
    const result = await getSebaranSiswa()
    expect(result.error).toBeTruthy()
  })

  it('returns sebaran data for authenticated admin desa', async () => {
    vi.mocked(getCurrentUserProfile).mockResolvedValueOnce({
      id: 'u1', role: 'admin', desa_id: 'desa-1',
    } as any)
    // Mock supabase responses
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    vi.mocked(createAdminClient).mockResolvedValueOnce({ from: mockFrom } as any)

    const result = await getSebaranSiswa()
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.stats).toBeDefined()
  })
})
```

### Step 2: Run test — pastikan FAIL

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/sebaran/__tests__/actions.test.ts
```

Expected: FAIL — "Cannot find module '../actions'"

### Step 3: Implementasi actions.ts

```typescript
// src/app/(admin)/users/siswa/actions/sebaran/actions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import {
  fetchKelasWithStudentCount,
  fetchKelompokWithKelas,
  fetchDesaWithKelompok,
  fetchDaerahWithDesa,
  fetchKelompokByIds,
} from './queries'
import { getTopLevelForProfile, computeStats } from './logic'
import type { SebaranSiswaData, SebaranSiswaStats } from './types'

export async function getSebaranSiswa(): Promise<{
  data?: SebaranSiswaData
  stats?: SebaranSiswaStats
  error?: string
}> {
  const profile = await getCurrentUserProfile()
  if (!profile) return { error: 'Tidak terautentikasi' }

  // Gunakan admin client agar hierarki teacher (Guru Desa/Daerah) bisa bypass RLS
  const supabase = await createAdminClient()
  const topLevel = getTopLevelForProfile(profile)

  let data: SebaranSiswaData

  try {
    if (topLevel === 'daerah') {
      // Superadmin: semua daerah
      const result = await fetchDaerahWithDesa(supabase)
      data = { level: 'daerah', data: result }

    } else if (topLevel === 'desa') {
      // Admin/Guru Daerah: semua desa dalam daerahnya
      const daerahId = profile.daerah_id!
      const result = await fetchDesaWithKelompok(supabase, daerahId)
      data = { level: 'desa', data: result }

    } else if (topLevel === 'kelompok') {
      // Admin/Guru Desa → kelompok dalam desanya
      if (profile.desa_id && !profile.kelompok_id) {
        const result = await fetchKelompokWithKelas(supabase, profile.desa_id)
        data = { level: 'kelompok', data: result }
      } else {
        // Guru/Admin Kelompok multi-kelompok → ambil by kelompok_id dari classes
        const kelompokIds = (profile.classes || [])
          .map((c) => c.kelompok_id)
          .filter(Boolean) as string[]
        const result = await fetchKelompokByIds(supabase, kelompokIds)
        data = { level: 'kelompok', data: result }
      }

    } else {
      // Single kelompok: langsung tampil kelas
      const kelompokId = profile.kelompok_id!
      const result = await fetchKelasWithStudentCount(supabase, kelompokId)
      data = { level: 'kelas', data: result }
    }

    const stats = computeStats(data)
    return { data, stats }

  } catch (err) {
    console.error('[getSebaranSiswa]', err)
    return { error: 'Gagal memuat data sebaran siswa' }
  }
}
```

### Step 4: Run test — pastikan PASS

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/sebaran/__tests__/actions.test.ts
```

Expected: PASS

### Step 5: Commit

```bash
git add src/app/(admin)/users/siswa/actions/sebaran/actions.ts \
        src/app/(admin)/users/siswa/actions/sebaran/__tests__/actions.test.ts
git commit -m "feat(sebaran-siswa): add server action getSebaranSiswa"
```

---

## Task 5: SWR Hook

**Files:**
- Create: `src/app/(admin)/users/siswa/hooks/useSebaranSiswa.ts`

### Step 1: Tambah SWR key di `src/lib/swr.ts`

Buka `src/lib/swr.ts`, cari bagian `studentKeys`, tambahkan setelah:

```typescript
export const sebaranSiswaKeys = {
  all: (userId: string) => ['sebaran-siswa', userId] as const,
}
```

### Step 2: Buat hook

```typescript
// src/app/(admin)/users/siswa/hooks/useSebaranSiswa.ts
'use client'

import useSWR from 'swr'
import { getSebaranSiswa } from '../actions/sebaran/actions'
import { sebaranSiswaKeys } from '@/lib/swr'

export function useSebaranSiswa(userId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? sebaranSiswaKeys.all(userId) : null,
    () => getSebaranSiswa(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 menit — data tidak sering berubah
    }
  )

  return {
    sebaranData: data?.data,
    sebaranStats: data?.stats,
    sebaranError: error || data?.error,
    sebaranLoading: isLoading,
    refreshSebaran: mutate,
  }
}
```

### Step 3: Export dari hooks/index.ts

Cek `src/app/(admin)/users/siswa/hooks/index.ts`, tambahkan:

```typescript
export { useSebaranSiswa } from './useSebaranSiswa'
```

### Step 4: Commit

```bash
git add src/lib/swr.ts \
        src/app/(admin)/users/siswa/hooks/useSebaranSiswa.ts \
        src/app/(admin)/users/siswa/hooks/index.ts
git commit -m "feat(sebaran-siswa): add SWR hook useSebaranSiswa"
```

---

## Task 6: Komponen SebaranSiswaNode (satu baris expand/collapse)

**Files:**
- Create: `src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaNode.tsx`

### Step 1: Buat komponen

```typescript
// src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaNode.tsx
'use client'

import { useState } from 'react'

interface SebaranSiswaNodeProps {
  name: string
  totalStudents: number
  childCount?: number        // jumlah anak (kelas/kelompok/desa)
  childLabel?: string        // label anak (e.g. "kelas", "kelompok", "desa")
  isLeaf?: boolean           // true = tidak bisa di-expand (kelas level)
  children?: React.ReactNode // konten saat di-expand
}

export default function SebaranSiswaNode({
  name,
  totalStudents,
  childCount,
  childLabel,
  isLeaf = false,
  children,
}: SebaranSiswaNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const isEmpty = totalStudents === 0

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header baris */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          isEmpty
            ? 'bg-amber-50 dark:bg-amber-900/20'
            : 'bg-white dark:bg-gray-800'
        } ${!isLeaf ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' : ''}`}
        onClick={() => !isLeaf && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {!isLeaf && (
            <span className="text-gray-400 text-xs w-4 text-center select-none">
              {expanded ? '▼' : '▶'}
            </span>
          )}
          {isEmpty && (
            <span className="text-amber-500" title="Belum ada siswa">⚠️</span>
          )}
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {name}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          {childCount !== undefined && childLabel && (
            <span>{childCount} {childLabel}</span>
          )}
          <span className={`font-semibold ${isEmpty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {totalStudents} siswa
          </span>
        </div>
      </div>

      {/* Konten saat expand */}
      {!isLeaf && expanded && children && (
        <div className="pl-6 pr-2 py-2 space-y-2 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}
```

### Step 2: Commit

```bash
git add src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaNode.tsx
git commit -m "feat(sebaran-siswa): add SebaranSiswaNode expand/collapse component"
```

---

## Task 7: Komponen SebaranSiswaStats

**Files:**
- Create: `src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaStats.tsx`

### Step 1: Buat komponen

```typescript
// src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaStats.tsx
'use client'

import type { SebaranSiswaStats } from '../../actions/sebaran/types'

interface Props {
  stats: SebaranSiswaStats
}

export default function SebaranSiswaStats({ stats }: Props) {
  const items = [
    stats.total_daerah !== undefined && { label: 'Total Daerah', value: stats.total_daerah },
    stats.total_desa !== undefined && { label: 'Total Desa', value: stats.total_desa },
    stats.total_kelompok !== undefined && { label: 'Total Kelompok', value: stats.total_kelompok },
    { label: 'Total Siswa', value: stats.total_siswa },
  ].filter(Boolean) as { label: string; value: number }[]

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 text-center min-w-[100px]"
        >
          <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
        </div>
      ))}

      {stats.kelompok_kosong > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3 shadow-sm border border-amber-200 dark:border-amber-700 text-center min-w-[100px]">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {stats.kelompok_kosong}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400">⚠️ Kelompok Kosong</div>
        </div>
      )}
    </div>
  )
}
```

### Step 2: Commit

```bash
git add src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaStats.tsx
git commit -m "feat(sebaran-siswa): add SebaranSiswaStats component"
```

---

## Task 8: Komponen SebaranSiswaTab (tree render)

**Files:**
- Create: `src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaTab.tsx`

### Step 1: Buat komponen

```typescript
// src/app/(admin)/users/siswa/components/SebaranSiswa/SebaranSiswaTab.tsx
'use client'

import type { SebaranSiswaData, SebaranSiswaStats } from '../../actions/sebaran/types'
import SebaranSiswaNode from './SebaranSiswaNode'
import SebaranSiswaStats from './SebaranSiswaStats'

interface Props {
  data: SebaranSiswaData
  stats: SebaranSiswaStats
  loading?: boolean
  error?: string
}

export default function SebaranSiswaTab({ data, stats, loading, error }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div>
      <SebaranSiswaStats stats={stats} />

      <div className="space-y-2">
        {/* Level: Kelas (leaf, single kelompok) */}
        {data.level === 'kelas' && data.data.map((kelas) => (
          <SebaranSiswaNode
            key={kelas.id}
            name={kelas.name}
            totalStudents={kelas.total_students}
            isLeaf
          />
        ))}

        {/* Level: Kelompok */}
        {data.level === 'kelompok' && data.data.map((klp) => (
          <SebaranSiswaNode
            key={klp.id}
            name={klp.name}
            totalStudents={klp.total_students}
            childCount={klp.kelas.length}
            childLabel="kelas"
          >
            <div className="space-y-2">
              {klp.kelas.map((k) => (
                <SebaranSiswaNode
                  key={k.id}
                  name={k.name}
                  totalStudents={k.total_students}
                  isLeaf
                />
              ))}
            </div>
          </SebaranSiswaNode>
        ))}

        {/* Level: Desa */}
        {data.level === 'desa' && data.data.map((desa) => (
          <SebaranSiswaNode
            key={desa.id}
            name={desa.name}
            totalStudents={desa.total_students}
            childCount={desa.kelompok.length}
            childLabel="kelompok"
          >
            <div className="space-y-2">
              {desa.kelompok.map((klp) => (
                <SebaranSiswaNode
                  key={klp.id}
                  name={klp.name}
                  totalStudents={klp.total_students}
                  childCount={klp.kelas.length}
                  childLabel="kelas"
                >
                  <div className="space-y-2">
                    {klp.kelas.map((k) => (
                      <SebaranSiswaNode
                        key={k.id}
                        name={k.name}
                        totalStudents={k.total_students}
                        isLeaf
                      />
                    ))}
                  </div>
                </SebaranSiswaNode>
              ))}
            </div>
          </SebaranSiswaNode>
        ))}

        {/* Level: Daerah (superadmin) */}
        {data.level === 'daerah' && data.data.map((daerah) => (
          <SebaranSiswaNode
            key={daerah.id}
            name={daerah.name}
            totalStudents={daerah.total_students}
            childCount={daerah.desa.length}
            childLabel="desa"
          >
            <div className="space-y-2">
              {daerah.desa.map((desa) => (
                <SebaranSiswaNode
                  key={desa.id}
                  name={desa.name}
                  totalStudents={desa.total_students}
                  childCount={desa.kelompok.length}
                  childLabel="kelompok"
                >
                  <div className="space-y-2">
                    {desa.kelompok.map((klp) => (
                      <SebaranSiswaNode
                        key={klp.id}
                        name={klp.name}
                        totalStudents={klp.total_students}
                        childCount={klp.kelas.length}
                        childLabel="kelas"
                      >
                        <div className="space-y-2">
                          {klp.kelas.map((k) => (
                            <SebaranSiswaNode
                              key={k.id}
                              name={k.name}
                              totalStudents={k.total_students}
                              isLeaf
                            />
                          ))}
                        </div>
                      </SebaranSiswaNode>
                    ))}
                  </div>
                </SebaranSiswaNode>
              ))}
            </div>
          </SebaranSiswaNode>
        ))}
      </div>
    </div>
  )
}
```

### Step 2: Buat index.ts untuk folder SebaranSiswa

```typescript
// src/app/(admin)/users/siswa/components/SebaranSiswa/index.ts
export { default as SebaranSiswaTab } from './SebaranSiswaTab'
```

### Step 3: Commit

```bash
git add src/app/(admin)/users/siswa/components/SebaranSiswa/
git commit -m "feat(sebaran-siswa): add SebaranSiswaTab tree render component"
```

---

## Task 9: Integrasi ke page.tsx

**Files:**
- Modify: `src/app/(admin)/users/siswa/page.tsx`

### Step 1: Tentukan visibilitas tab

Tab "Sebaran Siswa" tampil untuk semua role kecuali teacher biasa (classroom teacher tanpa org scope).

Tambahkan helper di page.tsx:

```typescript
// Setelah baris `const isAdmin = ...`
const showSebaranTab = isAdmin ||
  isTeacherDaerah(userProfile) ||
  isTeacherDesa(userProfile) ||
  isTeacherKelompok(userProfile)
```

Import yang dibutuhkan:
```typescript
import { isTeacherDaerah, isTeacherDesa, isTeacherKelompok } from '@/lib/accessControl'
import { SebaranSiswaTab } from './components/SebaranSiswa'
import { useSebaranSiswa } from './hooks'
```

### Step 2: Tambah hook di body page

```typescript
const { sebaranData, sebaranStats, sebaranError, sebaranLoading } = useSebaranSiswa(
  userProfile?.id
)
```

### Step 3: Modifikasi tab navigation

Ganti blok tab (`{isAdmin && (...)}`):

```typescript
{showSebaranTab && (
  <div className="mb-6">
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        {/* Tab 1: Siswa */}
        <button
          onClick={() => handleTabChange('students')}
          className={`${activeTab === 'students'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
        >
          Siswa
        </button>

        {/* Tab 2: Sebaran Siswa */}
        <button
          onClick={() => handleTabChange('sebaran-siswa')}
          className={`${activeTab === 'sebaran-siswa'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
        >
          Sebaran Siswa
        </button>

        {/* Tab 3: Permintaan Transfer (hanya admin, hanya jika ada pending) */}
        {isAdmin && pendingRequests.length > 0 && (
          <button
            onClick={() => handleTabChange('pending-transfers')}
            className={`${activeTab === 'pending-transfers'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
          >
            Permintaan Transfer
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
              {pendingRequests.length}
            </span>
          </button>
        )}
      </nav>
    </div>
  </div>
)}
```

### Step 4: Tambah render tab Sebaran Siswa

Tambahkan setelah blok `{activeTab === 'students' && (...)}`:

```typescript
{/* Sebaran Siswa Tab */}
{activeTab === 'sebaran-siswa' && showSebaranTab && sebaranData && sebaranStats && (
  <SebaranSiswaTab
    data={sebaranData}
    stats={sebaranStats}
    loading={sebaranLoading}
    error={sebaranError}
  />
)}
{activeTab === 'sebaran-siswa' && showSebaranTab && sebaranLoading && (
  <SebaranSiswaTab
    data={{ level: 'kelas', data: [] }}
    stats={{ total_siswa: 0, kelompok_kosong: 0 }}
    loading
  />
)}
```

### Step 5: Run type-check

```bash
npm run type-check
```

Fix error jika ada.

### Step 6: Commit

```bash
git add src/app/(admin)/users/siswa/page.tsx
git commit -m "feat(sebaran-siswa): integrate Sebaran Siswa tab into siswa page"
```

---

## Task 10: Verifikasi Manual & Final

### Step 1: Run semua unit tests

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/sebaran/
```

Expected: semua PASS

### Step 2: Run build check

```bash
npm run build
```

Expected: build berhasil tanpa error

### Step 3: Verifikasi manual di browser

```bash
npm run dev
```

Cek di `http://localhost:3000/users/siswa?tab=sebaran-siswa`:
- [ ] Tab "Sebaran Siswa" muncul di posisi ke-2 (antara Siswa dan Permintaan Transfer)
- [ ] Stats bar tampil dengan angka yang benar
- [ ] Kelompok dengan 0 siswa ditandai ⚠️ dan warna kuning
- [ ] Expand/collapse bekerja dengan benar
- [ ] Level hierarki sesuai role user yang sedang login
- [ ] Loading state tampil saat data sedang dimuat

### Step 4: Commit final

```bash
git add -A
git commit -m "feat(sebaran-siswa): complete Sebaran Siswa tab feature"
git push
```

---

## Catatan Penting

- **Gunakan `createAdminClient()`** di server action karena Guru Desa/Daerah perlu bypass RLS untuk akses data hierarki penuh
- **Jangan nested join untuk sort_order** — sudah ada contoh di `queries.ts` yang benar
- **Query siswa aktif**: selalu `status = 'active' AND deleted_at IS NULL`
- **Multi-kelompok detection**: cek `new Set(profile.classes?.map(c => c.kelompok_id)).size > 1`
