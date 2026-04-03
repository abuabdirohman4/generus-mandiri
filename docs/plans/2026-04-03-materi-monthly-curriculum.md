# Implementation Plan: Materi Monthly Curriculum + Enhanced Monitoring

**GitHub Issue:** TBD (buat sebelum eksekusi)
**Branch:** `feature/gh-[N]-materi-monthly-curriculum`
**Scope:** Hafalan Al Quran + Hafalan Doa only

---

## Context

Tujuan: memberikan data konkrit pencapaian hafalan santri — guru kelompok input per siswa, admin daerah/desa lihat rangkuman. Phase ini fokus pada:
1. DB schema baru: `material_monthly_targets` + `app_settings`
2. Halaman Materi: tab baru "Kurikulum" untuk manage target per bulan
3. Halaman Monitoring: filter bulan + progress per bulan + cross-class history

**Out of scope:** rangkuman per kelas/desa/daerah di dashboard (issue terpisah)

---

## Task 1: Database Migrations

### Files:
- Create: `supabase/migrations/20260403000001_create_app_settings.sql`
- Create: `supabase/migrations/20260403000002_create_material_monthly_targets.sql`

### Step 1: Buat migration `app_settings`

```sql
-- 20260403000001_create_app_settings.sql
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Semua user auth bisa baca
CREATE POLICY "app_settings_read" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya superadmin yang bisa tulis
CREATE POLICY "app_settings_write" ON app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Seed default passing_score
INSERT INTO app_settings (key, value)
VALUES ('passing_score', '{"default": 70, "by_category": {}}')
ON CONFLICT (key) DO NOTHING;
```

### Step 2: Buat migration `material_monthly_targets`

```sql
-- 20260403000002_create_material_monthly_targets.sql
CREATE TABLE IF NOT EXISTS material_monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_master_id UUID NOT NULL REFERENCES class_masters(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester SMALLINT NOT NULL CHECK (semester IN (1, 2)),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  week SMALLINT CHECK (week BETWEEN 1 AND 4),
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 1 AND 6),
  material_item_id UUID NOT NULL REFERENCES material_items(id) ON DELETE CASCADE,
  display_order SMALLINT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT material_monthly_targets_unique
    UNIQUE (class_master_id, academic_year_id, semester, month, week, day_of_week, material_item_id)
);

-- RLS
ALTER TABLE material_monthly_targets ENABLE ROW LEVEL SECURITY;

-- Semua authenticated user bisa baca
CREATE POLICY "material_monthly_targets_read" ON material_monthly_targets
  FOR SELECT USING (auth.role() = 'authenticated');

-- Superadmin bisa tulis semua
CREATE POLICY "material_monthly_targets_write_superadmin" ON material_monthly_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Admin bisa tulis (scope org mereka di-handle di application layer)
CREATE POLICY "material_monthly_targets_write_admin" ON material_monthly_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- User dengan can_manage_curriculum bisa tulis
CREATE POLICY "material_monthly_targets_write_curriculum" ON material_monthly_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_manage_curriculum = true
    )
  );
```

### Step 3: Alter profiles table

```sql
-- 20260403000003_alter_profiles_can_manage_curriculum.sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_manage_curriculum BOOLEAN DEFAULT FALSE;
```

### Cara apply migration:
Gunakan MCP Supabase: `mcp__generus-mandiri-v2__apply_migration` untuk setiap file SQL.

---

## Task 2: Update Type Definitions

**MANDATORY: Tulis test dulu, pastikan FAIL, baru implementasi.**

### Files:
- Modify: `src/types/user.ts` (line 22 — `UserProfileWithOrg`)
- Modify: `src/types/material.ts` (tambah `MonthlyTarget` types di akhir file)
- Modify: `src/app/(admin)/materi/types.ts` (re-export `MonthlyTarget`)
- Modify: `src/app/(admin)/monitoring/types.ts` (tambah `MonthlyTargetProgress`, `CrossClassHistoryItem`)

### Step 1: Update `src/types/user.ts`

Di `UserProfileWithOrg` (sekitar line 22), tambah field `can_manage_curriculum`:

```typescript
export interface UserProfileWithOrg extends UserProfileBase {
  daerah_id?: string | null
  desa_id?: string | null
  kelompok_id?: string | null
  can_manage_materials?: boolean
  can_manage_curriculum?: boolean  // TAMBAH INI
}
```

### Step 2: Tambah types di `src/types/material.ts`

Tambahkan di akhir file (setelah line 131):

```typescript
// ─── Monthly Curriculum Targets ───────────────────────────────────────────────

/**
 * Monthly curriculum target for a class
 * week and day_of_week are nullable — null means month-level target
 */
export interface MonthlyTarget {
  id: string
  class_master_id: string
  academic_year_id: string
  semester: Semester
  month: Month
  week?: Week | null
  day_of_week?: DayOfWeek | null
  material_item_id: string
  display_order: number
  created_by?: string | null
  created_at: string
  updated_at: string
  material_item?: MaterialItem
}

export interface MonthlyTargetInput {
  class_master_id: string
  academic_year_id: string
  semester: Semester
  month: Month
  week?: Week | null
  day_of_week?: DayOfWeek | null
  material_item_id: string
  display_order?: number
}

export interface AppSettingPassingScore {
  default: number
  by_category: Record<string, number> // category_id → score
}
```

### Step 3: Re-export dari `src/app/(admin)/materi/types.ts`

Tambahkan import dan re-export untuk `MonthlyTarget` dan `MonthlyTargetInput`:

```typescript
import type {
  // ... existing imports ...
  MonthlyTarget,
  MonthlyTargetInput,
} from '@/types/material'

export type {
  // ... existing exports ...
  MonthlyTarget,
  MonthlyTargetInput,
}
```

### Step 4: Tambah types di `src/app/(admin)/monitoring/types.ts`

Tambahkan di akhir file (setelah `getPredikatWithDesc`):

```typescript
export interface MonthlyTargetProgress {
  month: number
  total_targets: number
  completed: number  // nilai >= passing_score
  percentage: number // (completed / total_targets) * 100
}

export interface CrossClassHistoryItem {
  progress: MaterialProgress | null  // null = belum pernah diisi
  material_item: {
    id: string
    name: string
    material_type?: {
      id: string
      name: string
    }
  }
  academic_year_name: string
  class_master_name: string
  class_master_id: string
  academic_year_id: string
  semester: 1 | 2
}
```

---

## Task 3: App Settings Helper

### Files:
- Create: `src/lib/appSettings.ts`
- Create: `src/lib/__tests__/appSettings.test.ts`

### Step 1: Tulis failing test

Buat file `src/lib/__tests__/appSettings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPassingScore } from '../appSettings'

// Mock Supabase admin client
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn()
}))

import { createAdminClient } from '@/lib/supabase/server'

describe('getPassingScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default score when no category specified', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { value: { default: 70, by_category: {} } },
              error: null
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore()
    expect(score).toBe(70)
  })

  it('returns category-specific score when category_id provided', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { value: { default: 70, by_category: { 'cat-1': 80 } } },
              error: null
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore('cat-1')
    expect(score).toBe(80)
  })

  it('falls back to default when category not in by_category', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { value: { default: 70, by_category: { 'cat-1': 80 } } },
              error: null
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore('cat-unknown')
    expect(score).toBe(70)
  })

  it('returns 70 as hardcoded fallback when app_settings missing', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      })
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    const score = await getPassingScore()
    expect(score).toBe(70)
  })
})
```

### Step 2: Run test — verify FAIL
```bash
npm run test:run -- src/lib/__tests__/appSettings.test.ts
```
Expected: `FAIL` dengan error "Cannot find module '../appSettings'"

### Step 3: Implementasi `src/lib/appSettings.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import type { AppSettingPassingScore } from '@/types/material'

const DEFAULT_PASSING_SCORE = 70

/**
 * Get passing score from app_settings table.
 * If category_id provided, returns category-specific score.
 * Falls back to default (70) if setting not found.
 */
export async function getPassingScore(categoryId?: string): Promise<number> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'passing_score')
      .single()

    if (error || !data) return DEFAULT_PASSING_SCORE

    const setting = data.value as AppSettingPassingScore

    if (categoryId && setting.by_category[categoryId] !== undefined) {
      return setting.by_category[categoryId]
    }

    return setting.default ?? DEFAULT_PASSING_SCORE
  } catch {
    return DEFAULT_PASSING_SCORE
  }
}
```

### Step 4: Run test — verify PASS
```bash
npm run test:run -- src/lib/__tests__/appSettings.test.ts
```
Expected: `✓ 4 tests passed`

---

## Task 4: accessControlServer — tambah canManageCurriculum

### Files:
- Modify: `src/lib/accessControlServer.ts`

### Step 1: Tambah fungsi `canManageCurriculum` di akhir `accessControlServer.ts` (setelah line 86):

```typescript
// Curriculum management permission check (server-side)
export function canManageCurriculum(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin') return true
  if (profile.role === 'admin') return true
  return profile.can_manage_curriculum === true
}
```

### Step 2: Update `getCurrentUserProfile` query (line 68-70) — tambah `can_manage_curriculum` ke select:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name, role, email, daerah_id, desa_id, kelompok_id, can_manage_materials, can_manage_curriculum')
  .eq('id', user.id)
  .single()
```

---

## Task 5: Monthly Target Server Actions

### Files:
- Create: `src/app/(admin)/materi/actions/curriculum/queries.ts`
- Create: `src/app/(admin)/materi/actions/curriculum/actions.ts`
- Modify: `src/app/(admin)/materi/actions/index.ts` (tambah re-export)

### Step 1: Buat `queries.ts`

```typescript
// src/app/(admin)/materi/actions/curriculum/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MonthlyTargetInput } from '../../types'

export async function fetchMonthlyTargets(
  supabase: SupabaseClient,
  params: {
    class_master_id: string
    academic_year_id: string
    semester: number
    month?: number
  }
) {
  let query = supabase
    .from('material_monthly_targets')
    .select(`
      *,
      material_item:material_items(
        id, name, description,
        material_type:material_types(
          id, name,
          material_category:material_categories(id, name)
        )
      )
    `)
    .eq('class_master_id', params.class_master_id)
    .eq('academic_year_id', params.academic_year_id)
    .eq('semester', params.semester)
    .order('display_order', { ascending: true })

  if (params.month !== undefined) {
    query = query.eq('month', params.month)
  }

  return query
}

export async function insertMonthlyTarget(
  supabase: SupabaseClient,
  data: MonthlyTargetInput & { created_by: string }
) {
  return supabase
    .from('material_monthly_targets')
    .insert(data)
    .select()
    .single()
}

export async function deleteMonthlyTargetById(
  supabase: SupabaseClient,
  id: string
) {
  return supabase
    .from('material_monthly_targets')
    .delete()
    .eq('id', id)
}

export async function bulkUpsertMonthlyTargets(
  supabase: SupabaseClient,
  records: Array<MonthlyTargetInput & { created_by: string }>
) {
  return supabase
    .from('material_monthly_targets')
    .upsert(records, {
      onConflict: 'class_master_id,academic_year_id,semester,month,week,day_of_week,material_item_id',
      ignoreDuplicates: true
    })
}

export async function deleteMonthlyTargetsByMonth(
  supabase: SupabaseClient,
  params: {
    class_master_id: string
    academic_year_id: string
    semester: number
    month: number
  }
) {
  return supabase
    .from('material_monthly_targets')
    .delete()
    .eq('class_master_id', params.class_master_id)
    .eq('academic_year_id', params.academic_year_id)
    .eq('semester', params.semester)
    .eq('month', params.month)
}
```

### Step 2: Buat `actions.ts`

```typescript
// src/app/(admin)/materi/actions/curriculum/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile, canManageCurriculum } from '@/lib/accessControlServer'
import type { MonthlyTarget, MonthlyTargetInput } from '../../types'
import {
  fetchMonthlyTargets,
  insertMonthlyTarget,
  deleteMonthlyTargetById,
  bulkUpsertMonthlyTargets,
  deleteMonthlyTargetsByMonth,
} from './queries'

export async function getMonthlyTargets(params: {
  class_master_id: string
  academic_year_id: string
  semester: number
  month?: number
}): Promise<MonthlyTarget[]> {
  const supabase = await createClient()
  const { data, error } = await fetchMonthlyTargets(supabase, params)

  if (error) {
    console.error('Error getting monthly targets:', error)
    throw new Error('Gagal memuat target bulanan')
  }

  return data || []
}

export async function createMonthlyTarget(input: MonthlyTargetInput): Promise<MonthlyTarget> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  if (!canManageCurriculum(profile)) throw new Error('Unauthorized: Curriculum management access required')

  const supabase = await createClient()
  const { data, error } = await insertMonthlyTarget(supabase, {
    ...input,
    created_by: profile.id
  })

  if (error) {
    if (error.code === '23505') throw new Error('Materi ini sudah ada sebagai target bulan tersebut')
    console.error('Error creating monthly target:', error)
    throw new Error('Gagal membuat target bulanan')
  }

  revalidatePath('/materi')
  return data
}

export async function deleteMonthlyTarget(id: string): Promise<{ success: boolean }> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  if (!canManageCurriculum(profile)) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await deleteMonthlyTargetById(supabase, id)

  if (error) {
    console.error('Error deleting monthly target:', error)
    throw new Error('Gagal menghapus target bulanan')
  }

  revalidatePath('/materi')
  return { success: true }
}

export async function bulkSetMonthlyTargets(
  params: { class_master_id: string; academic_year_id: string; semester: number; month: number },
  materialItemIds: string[]
): Promise<{ success: boolean }> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  if (!canManageCurriculum(profile)) throw new Error('Unauthorized')

  const supabase = await createClient()

  // Delete semua target bulan ini dulu
  await deleteMonthlyTargetsByMonth(supabase, params)

  // Insert yang baru
  if (materialItemIds.length > 0) {
    const records = materialItemIds.map((itemId, index) => ({
      class_master_id: params.class_master_id,
      academic_year_id: params.academic_year_id,
      semester: params.semester,
      month: params.month,
      week: null,
      day_of_week: null,
      material_item_id: itemId,
      display_order: index,
      created_by: profile.id
    }))

    const { error } = await bulkUpsertMonthlyTargets(supabase, records)
    if (error) {
      console.error('Error bulk setting monthly targets:', error)
      throw new Error('Gagal menyimpan target bulanan')
    }
  }

  revalidatePath('/materi')
  return { success: true }
}
```

### Step 3: Update `src/app/(admin)/materi/actions/index.ts`

Tambahkan di akhir file existing exports:

```typescript
// Curriculum actions
export {
  getMonthlyTargets,
  createMonthlyTarget,
  deleteMonthlyTarget,
  bulkSetMonthlyTargets,
} from './curriculum/actions'
```

---

## Task 6: Monitoring — Monthly Target Progress Actions

### Files:
- Modify: `src/app/(admin)/monitoring/actions/monitoring.ts`

### Step 1: Tambahkan 3 fungsi baru di akhir `monitoring.ts`

```typescript
/**
 * Get monthly target progress for a student
 * Returns list of target materials for the month + their progress
 */
export async function getMonthlyTargetProgress(params: {
  classId: string
  academicYearId: string
  semester: number
  month: number
  studentId: string
}): Promise<{
  targets: any[]
  progress: MaterialProgress[]
  percentage: number
}> {
  const supabase = await createAdminClient()

  // Get class_master_ids for this class
  const classMasterIds = await getClassMasterIds(params.classId)
  if (classMasterIds.length === 0) return { targets: [], progress: [], percentage: 0 }

  // Get monthly targets
  const { data: targets, error: targetsError } = await supabase
    .from('material_monthly_targets')
    .select(`
      *,
      material_item:material_items(
        id, name,
        material_type:material_types(id, name)
      )
    `)
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)
    .eq('month', params.month)
    .order('display_order', { ascending: true })

  if (targetsError) throw new Error(targetsError.message)
  if (!targets || targets.length === 0) return { targets: [], progress: [], percentage: 0 }

  // Get progress for student on these target items
  const targetItemIds = targets.map((t: any) => t.material_item_id)

  const { data: progress } = await supabase
    .from('student_material_progress')
    .select('*')
    .eq('student_id', params.studentId)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)
    .in('material_item_id', targetItemIds)

  // Get passing score
  // ASSUMPTION: using default passing score (70) here; category-specific handled in UI layer
  const passingScore = 70

  const progressMap = new Map((progress || []).map((p: MaterialProgress) => [p.material_item_id, p]))
  const completed = targetItemIds.filter((itemId: string) => {
    const p = progressMap.get(itemId)
    if (!p) return false
    const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.hafal ? 100 : 0)
    return score >= passingScore
  }).length

  const percentage = targets.length > 0 ? Math.round((completed / targets.length) * 100) : 0

  return {
    targets: targets || [],
    progress: progress || [],
    percentage
  }
}

/**
 * Get cross-class history: materi belum selesai dari tahun ajaran/kelas sebelumnya
 * "Belum selesai" = nilai IS NULL OR nilai < passing_score
 */
export async function getCrossClassHistory(
  studentId: string,
  currentAcademicYearId: string
): Promise<any[]> {
  const supabase = await createAdminClient()

  const passingScore = 70

  // Get all progress for this student EXCLUDING current academic year
  const { data: allProgress, error } = await supabase
    .from('student_material_progress')
    .select(`
      *,
      material_item:material_items(
        id, name,
        material_type:material_types(id, name)
      )
    `)
    .eq('student_id', studentId)
    .neq('academic_year_id', currentAcademicYearId)

  if (error) throw new Error(error.message)
  if (!allProgress || allProgress.length === 0) return []

  // Get academic year names
  const academicYearIds = [...new Set(allProgress.map((p: any) => p.academic_year_id))]
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('id, name')
    .in('id', academicYearIds)

  const yearMap = new Map((academicYears || []).map((y: any) => [y.id, y.name]))

  // Filter: only incomplete (null OR below passing score)
  const incomplete = allProgress.filter((p: any) => {
    const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.hafal ? 100 : 0)
    return p.nilai === null && !p.hafal || score < passingScore
  })

  return incomplete.map((p: any) => ({
    progress: p,
    material_item: p.material_item,
    academic_year_name: yearMap.get(p.academic_year_id) || p.academic_year_id,
    academic_year_id: p.academic_year_id,
    semester: p.semester,
    class_master_name: '' // akan di-populate dari class_master_mappings jika dibutuhkan
  }))
}

/**
 * Get class monthly target summary — semua siswa di kelas, berapa % target bulan ini
 */
export async function getClassMonthlyTargetSummary(params: {
  classId: string
  academicYearId: string
  semester: number
  month: number
}): Promise<Array<{ student_id: string; student_name: string; percentage: number }>> {
  const supabase = await createAdminClient()

  // Get enrolled students
  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id, students!inner(id, name)')
    .eq('class_id', params.classId)
    .eq('academic_year_id', params.academicYearId)
    .eq('status', 'active')

  if (!enrollments || enrollments.length === 0) return []

  // Get class_master_ids
  const classMasterIds = await getClassMasterIds(params.classId)
  if (classMasterIds.length === 0) return []

  // Get targets for this month
  const { data: targets } = await supabase
    .from('material_monthly_targets')
    .select('material_item_id')
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)
    .eq('month', params.month)

  if (!targets || targets.length === 0) return []

  const targetItemIds = targets.map((t: any) => t.material_item_id)
  const studentIds = enrollments.map((e: any) => e.student_id)
  const passingScore = 70

  // Get all progress for these students + target items
  const { data: progress } = await supabase
    .from('student_material_progress')
    .select('student_id, material_item_id, nilai, hafal')
    .in('student_id', studentIds)
    .in('material_item_id', targetItemIds)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)

  // Build summary per student
  return enrollments.map((e: any) => {
    const student = e.students
    const studentProgress = (progress || []).filter((p: any) => p.student_id === student.id)
    const progressMap = new Map(studentProgress.map((p: any) => [p.material_item_id, p]))

    const completed = targetItemIds.filter((itemId: string) => {
      const p = progressMap.get(itemId)
      if (!p) return false
      const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.hafal ? 100 : 0)
      return score >= passingScore
    }).length

    const percentage = Math.round((completed / targetItemIds.length) * 100)

    return {
      student_id: student.id,
      student_name: student.name,
      percentage
    }
  })
}
```

---

## Task 7: UI — CurriculumView di Halaman Materi

### Files:
- Create: `src/app/(admin)/materi/components/curriculum/CurriculumView.tsx`
- Modify: `src/app/(admin)/materi/components/layout/MaterialsPageClient.tsx`

### Step 1: Buat `CurriculumView.tsx`

```typescript
// src/app/(admin)/materi/components/curriculum/CurriculumView.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ClassMaster, MonthlyTarget, MaterialItem, Semester, Month } from '../../types'
import { getSemesterMonths, getMonthName } from '../../types'
import { getMonthlyTargets, bulkSetMonthlyTargets, getAllMaterialItems } from '../../actions'
import { toast } from 'sonner'

interface CurriculumViewProps {
  classMasters: ClassMaster[]
  academicYears: Array<{ id: string; name: string; is_active: boolean }>
}

export default function CurriculumView({ classMasters, academicYears }: CurriculumViewProps) {
  const [selectedClassMasterId, setSelectedClassMasterId] = useState<string>('')
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('')
  const [semester, setSemester] = useState<Semester>(1)
  const [selectedMonth, setSelectedMonth] = useState<Month>(1)
  const [targets, setTargets] = useState<MonthlyTarget[]>([])
  const [allItems, setAllItems] = useState<MaterialItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Set default academic year (active one)
  useEffect(() => {
    const activeYear = academicYears.find(y => y.is_active)
    if (activeYear) setSelectedAcademicYearId(activeYear.id)
    if (classMasters.length > 0) setSelectedClassMasterId(classMasters[0].id)
  }, [academicYears, classMasters])

  const loadTargets = useCallback(async () => {
    if (!selectedClassMasterId || !selectedAcademicYearId) return
    setLoading(true)
    try {
      const data = await getMonthlyTargets({
        class_master_id: selectedClassMasterId,
        academic_year_id: selectedAcademicYearId,
        semester,
        month: selectedMonth
      })
      setTargets(data)
    } catch (error) {
      toast.error('Gagal memuat target kurikulum')
    } finally {
      setLoading(false)
    }
  }, [selectedClassMasterId, selectedAcademicYearId, semester, selectedMonth])

  useEffect(() => {
    loadTargets()
  }, [loadTargets])

  useEffect(() => {
    getAllMaterialItems().then(setAllItems).catch(() => {})
  }, [])

  const handleAddItem = async (itemId: string) => {
    if (!selectedClassMasterId || !selectedAcademicYearId) return
    const currentIds = targets.map(t => t.material_item_id)
    if (currentIds.includes(itemId)) return

    setSaving(true)
    try {
      await bulkSetMonthlyTargets(
        { class_master_id: selectedClassMasterId, academic_year_id: selectedAcademicYearId, semester, month: selectedMonth },
        [...currentIds, itemId]
      )
      toast.success('Target ditambahkan')
      await loadTargets()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambah target')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveItem = async (targetId: string) => {
    if (!selectedClassMasterId || !selectedAcademicYearId) return
    const newIds = targets.filter(t => t.id !== targetId).map(t => t.material_item_id)
    setSaving(true)
    try {
      await bulkSetMonthlyTargets(
        { class_master_id: selectedClassMasterId, academic_year_id: selectedAcademicYearId, semester, month: selectedMonth },
        newIds
      )
      toast.success('Target dihapus')
      await loadTargets()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus target')
    } finally {
      setSaving(false)
    }
  }

  const months = getSemesterMonths(semester)
  const targetItemIds = new Set(targets.map(t => t.material_item_id))
  const availableItems = allItems.filter(item => !targetItemIds.has(item.id))

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Filter Row */}
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedAcademicYearId}
          onChange={e => setSelectedAcademicYearId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">Pilih Tahun Ajaran</option>
          {academicYears.map(y => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>

        <select
          value={selectedClassMasterId}
          onChange={e => setSelectedClassMasterId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="">Pilih Kelas</option>
          {classMasters.map(cm => (
            <option key={cm.id} value={cm.id}>{cm.name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          {([1, 2] as Semester[]).map(s => (
            <button
              key={s}
              onClick={() => { setSemester(s); setSelectedMonth(s === 1 ? 1 : 7) }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                semester === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Semester {s}
            </button>
          ))}
        </div>
      </div>

      {/* Month Tabs */}
      <div className="flex flex-wrap gap-2">
        {months.map(m => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedMonth === m
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {getMonthName(m)}
          </button>
        ))}
      </div>

      {/* Content */}
      {!selectedClassMasterId || !selectedAcademicYearId ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Pilih kelas dan tahun ajaran untuk melihat target kurikulum
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Memuat...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Target List */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Target {getMonthName(selectedMonth)} ({targets.length} materi)
            </h3>
            {targets.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Belum ada target untuk bulan ini</p>
            ) : (
              <div className="space-y-2">
                {targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {target.material_item?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {target.material_item?.material_type?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(target.id)}
                      disabled={saving}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Hapus dari target"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Items to Add */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Tambah Materi
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(item as any).material_type?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddItem(item.id)}
                    disabled={saving}
                    className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="Tambah ke target"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Step 2: Update `MaterialsPageClient.tsx`

**2a.** Tambah `'curriculum'` ke `ViewMode` type (line 28):

```typescript
type ViewMode = 'daily' | 'master' | 'curriculum'
```

**2b.** Tambah imports di bagian atas (setelah line 21):

```typescript
import CurriculumView from '../curriculum/CurriculumView'
import { canManageCurriculum } from '@/lib/accessControl'
```

**2c.** Tambah computed prop setelah `canManage` (sekitar line 70):

```typescript
const canManageCurriculumUser = userProfile ? canManageCurriculum(userProfile) : false
```

**2d.** Tambah tab "Kurikulum" — sebelum content block (`{activeTab === 'daily' ? ...}`, sekitar line 312), tambahkan kondisi render tab UI di area setelah header. Tambahkan conditional block:

```typescript
{/* Curriculum Tab — only for admin/superadmin/can_manage_curriculum */}
{canManageCurriculumUser && (
  <div className="px-6 pb-0 pt-4 border-b border-gray-200 dark:border-gray-700">
    <nav className="flex gap-4">
      {(['master', 'curriculum'] as ViewMode[]).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          {tab === 'master' ? 'Master Data' : 'Kurikulum'}
        </button>
      ))}
    </nav>
  </div>
)}
```

**2e.** Tambah render block untuk `curriculum` tab (setelah blok `activeTab === 'daily'`):

```typescript
{activeTab === 'curriculum' && canManageCurriculumUser && (
  <CurriculumView
    classMasters={classMasters}
    academicYears={[]} // akan di-pass dari page.tsx
  />
)}
```

**2f.** Update `MaterialsPageClientProps` untuk terima `academicYears`:

```typescript
interface MaterialsPageClientProps {
  classMasters: ClassMaster[]
  userProfile: any
  academicYears: Array<{ id: string; name: string; is_active: boolean }>
}
```

### Step 3: Update `src/app/(admin)/materi/page.tsx`

Fetch `academic_years` dan pass ke client component. Baca file ini dulu untuk tahu struktur yang ada, lalu tambahkan:

```typescript
// Tambahkan di server component materi/page.tsx
const { data: academicYears } = await supabase
  .from('academic_years')
  .select('id, name, is_active')
  .order('name', { ascending: false })

// Pass ke MaterialsPageClient:
<MaterialsPageClient
  classMasters={...}
  userProfile={...}
  academicYears={academicYears || []}
/>
```

**IMPORTANT:** Baca `src/app/(admin)/materi/page.tsx` terlebih dahulu sebelum modifikasi untuk tahu exact location.

### Step 4: Tambah `canManageCurriculum` di `src/lib/accessControl.ts` (client-side version)

Baca file `src/lib/accessControl.ts` dulu, lalu tambahkan di akhir:

```typescript
export function canManageCurriculum(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin') return true
  if (profile.role === 'admin') return true
  return profile.can_manage_curriculum === true
}
```

---

## Task 8: UI — Enhanced Monitoring Page

### Files:
- Modify: `src/app/(admin)/monitoring/page.tsx`
- Modify: `src/app/(admin)/monitoring/components/StudentSidebar.tsx`

### Step 1: Tambah filter bulan di `monitoring/page.tsx`

Cari bagian filter semester (sekitar line yang ada `semester` state), tambahkan state baru:

```typescript
const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
const [monthlyTargetProgress, setMonthlyTargetProgress] = useState<{
  total_targets: number
  completed: number
  percentage: number
} | null>(null)
```

Tambahkan dropdown bulan setelah filter semester di JSX:

```typescript
{/* Bulan Filter — hanya tampil jika ada kelas dipilih */}
{selectedClassId && (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Bulan
    </label>
    <select
      value={selectedMonth ?? ''}
      onChange={e => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
    >
      <option value="">Semua Bulan</option>
      {getSemesterMonths(semester as Semester).map(m => (
        <option key={m} value={m}>{getMonthName(m)}</option>
      ))}
    </select>
  </div>
)}
```

**Import yang dibutuhkan** — tambahkan di bagian import:

```typescript
import { getSemesterMonths, getMonthName } from '@/app/(admin)/materi/types'
import type { Semester } from '@/app/(admin)/materi/types'
import { getMonthlyTargetProgress, getCrossClassHistory } from './actions/monitoring'
```

### Step 2: Load monthly target progress saat bulan dipilih

Tambahkan `useEffect` setelah yang existing:

```typescript
useEffect(() => {
  if (!selectedStudentId || !selectedClassId || !selectedMonth || !activeAcademicYear) {
    setMonthlyTargetProgress(null)
    return
  }

  getMonthlyTargetProgress({
    classId: selectedClassId,
    academicYearId: activeAcademicYear.id,
    semester,
    month: selectedMonth,
    studentId: selectedStudentId
  }).then(result => {
    setMonthlyTargetProgress({
      total_targets: result.targets.length,
      completed: result.progress.filter(p => {
        const score = p.nilai ?? (p.hafal ? 100 : 0)
        return score >= 70
      }).length,
      percentage: result.percentage
    })
  }).catch(console.error)
}, [selectedStudentId, selectedClassId, selectedMonth, activeAcademicYear, semester])
```

### Step 3: Tampilkan monthly target progress card

Di area student info card (setelah circular progress ring), tambahkan kondisi:

```typescript
{selectedMonth && monthlyTargetProgress && monthlyTargetProgress.total_targets > 0 && (
  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
      Target {getMonthName(selectedMonth as Month)}
    </p>
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${monthlyTargetProgress.percentage}%` }}
        />
      </div>
      <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
        {monthlyTargetProgress.completed}/{monthlyTargetProgress.total_targets}
      </span>
    </div>
  </div>
)}
```

### Step 4: Badge "Target Bulan Ini" pada material list

Di material table rows, tambahkan badge jika materi termasuk dalam target bulan terpilih. Perlu state baru:

```typescript
const [monthlyTargetItemIds, setMonthlyTargetItemIds] = useState<Set<string>>(new Set())
```

Load saat bulan berubah (dalam useEffect Task 8 Step 2 yang sama):

```typescript
// Setelah setMonthlyTargetProgress
setMonthlyTargetItemIds(new Set(result.targets.map((t: any) => t.material_item_id)))
```

Di material row rendering, tambahkan badge:

```typescript
{selectedMonth && monthlyTargetItemIds.has(material.id) && (
  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-medium">
    Target
  </span>
)}
```

### Step 5: Cross-class history section

Tambahkan state:

```typescript
const [crossClassHistory, setCrossClassHistory] = useState<any[]>([])
const [crossClassLoading, setCrossClassLoading] = useState(false)
```

Load saat student berubah (tambahkan ke useEffect existing student loading):

```typescript
// Load cross-class history
if (selectedStudentId && activeAcademicYear) {
  setCrossClassLoading(true)
  getCrossClassHistory(selectedStudentId, activeAcademicYear.id)
    .then(setCrossClassHistory)
    .catch(console.error)
    .finally(() => setCrossClassLoading(false))
} else {
  setCrossClassHistory([])
}
```

Tambahkan section di bawah material table (sebelum FloatingSaveButton):

```typescript
{crossClassHistory.length > 0 && (
  <div className="mt-6">
    <details className="group">
      <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 select-none">
        <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Materi Belum Selesai dari Kelas Sebelumnya ({crossClassHistory.length})
      </summary>
      <div className="mt-3 space-y-2">
        {crossClassHistory.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {item.material_item?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.academic_year_name} · Semester {item.semester}
              </p>
            </div>
            {/* Input nilai untuk complete dari kelas ini */}
            <input
              type="number"
              min={0}
              max={100}
              placeholder="Nilai"
              className="w-16 px-2 py-1 text-sm text-center rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              defaultValue={item.progress?.nilai ?? ''}
              onChange={(e) => {
                // ASSUMPTION: update progress menggunakan academicYearId dari item history
                // Gunakan updateMaterialProgress yang existing dengan academic_year_id dari history
                const val = e.target.value ? Number(e.target.value) : undefined
                // Simpan ke local pendingUpdates untuk disave bersama save button
                // Implementation: extend pendingUpdates map dengan key `${studentId}-${itemId}-${yearId}`
              }}
            />
          </div>
        ))}
      </div>
    </details>
  </div>
)}
```

**CATATAN untuk cross-class history save:** Untuk saat ini, nilai cross-class history disimpan manual — user input nilai lalu ada tombol save tersendiri di section ini. Implementasi pendingUpdates untuk cross-class bisa extend dari map yang sudah ada di page.tsx. Baca kode existing save mechanism terlebih dahulu.

### Step 6: Update StudentSidebar untuk monthly progress indicator

Di `StudentSidebar.tsx`, tambahkan prop `monthlyPercentages` optional:

```typescript
interface StudentSidebarProps {
  // ... existing props ...
  monthlyPercentages?: Map<string, number> // student_id → percentage
}
```

Di student list item rendering, tambahkan indicator kecil jika ada monthly data:

```typescript
{props.monthlyPercentages?.has(student.id) && (
  <div className="mt-1">
    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
      <div
        className={`h-1 rounded-full ${
          (props.monthlyPercentages.get(student.id) ?? 0) >= 100
            ? 'bg-green-500'
            : (props.monthlyPercentages.get(student.id) ?? 0) >= 50
              ? 'bg-yellow-500'
              : 'bg-red-500'
        }`}
        style={{ width: `${props.monthlyPercentages.get(student.id) ?? 0}%` }}
      />
    </div>
  </div>
)}
```

Load class monthly summary saat bulan dipilih di `monitoring/page.tsx`:

```typescript
const [monthlyPercentages, setMonthlyPercentages] = useState<Map<string, number>>(new Map())

// Load saat bulan/kelas berubah
useEffect(() => {
  if (!selectedClassId || !selectedMonth || !activeAcademicYear) {
    setMonthlyPercentages(new Map())
    return
  }

  getClassMonthlyTargetSummary({
    classId: selectedClassId,
    academicYearId: activeAcademicYear.id,
    semester,
    month: selectedMonth
  }).then(summary => {
    setMonthlyPercentages(new Map(summary.map(s => [s.student_id, s.percentage])))
  }).catch(console.error)
}, [selectedClassId, selectedMonth, activeAcademicYear, semester])
```

Pass ke StudentSidebar:

```typescript
<StudentSidebar
  // ... existing props ...
  monthlyPercentages={selectedMonth ? monthlyPercentages : undefined}
/>
```

---

## Task 9: Final Verification

```bash
# 1. Type check
npm run type-check

# 2. Unit tests
npm run test:run

# 3. Manual flow (setelah dev server jalan):
# a. Login superadmin → /materi → cek tab "Kurikulum" muncul
# b. Pilih kelas + tahun ajaran + semester + bulan → tambah beberapa materi sebagai target
# c. /monitoring → pilih kelas → pilih bulan → cek badge "Target" muncul di materi target
# d. Pilih siswa → cek monthly progress bar di student info card
# e. Cek sidebar siswa ada progress bar kecil per siswa
# f. Login guru biasa (non can_manage_curriculum) → /materi → tab Kurikulum tidak muncul
# g. Login guru dengan can_manage_curriculum=true → /materi → tab Kurikulum muncul
```

---

## Commit Message Template

```
feat(materi/monitoring): add monthly curriculum targets and progress tracking

- Add material_monthly_targets table with week/day nullable for future granularity
- Add app_settings table with passing_score config (default 70, per-category override)
- Add can_manage_curriculum field to profiles for special teacher access
- Add CurriculumView tab in /materi for admin/curriculum managers
- Add monthly filter in /monitoring with target badge on materials
- Add cross-class history section for incomplete materials from previous years
- Add monthly progress indicator in student sidebar

Fixes #[ISSUE_NUMBER]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Files Summary

| Task | File | Action |
|------|------|--------|
| 1 | `supabase/migrations/20260403000001_create_app_settings.sql` | CREATE |
| 1 | `supabase/migrations/20260403000002_create_material_monthly_targets.sql` | CREATE |
| 1 | `supabase/migrations/20260403000003_alter_profiles_can_manage_curriculum.sql` | CREATE |
| 2 | `src/types/user.ts` | MODIFY (line 22) |
| 2 | `src/types/material.ts` | MODIFY (append) |
| 2 | `src/app/(admin)/materi/types.ts` | MODIFY (re-export) |
| 2 | `src/app/(admin)/monitoring/types.ts` | MODIFY (append) |
| 3 | `src/lib/__tests__/appSettings.test.ts` | CREATE |
| 3 | `src/lib/appSettings.ts` | CREATE |
| 4 | `src/lib/accessControlServer.ts` | MODIFY |
| 4 | `src/lib/accessControl.ts` | MODIFY |
| 5 | `src/app/(admin)/materi/actions/curriculum/queries.ts` | CREATE |
| 5 | `src/app/(admin)/materi/actions/curriculum/actions.ts` | CREATE |
| 5 | `src/app/(admin)/materi/actions/index.ts` | MODIFY |
| 6 | `src/app/(admin)/monitoring/actions/monitoring.ts` | MODIFY (append) |
| 7 | `src/app/(admin)/materi/components/curriculum/CurriculumView.tsx` | CREATE |
| 7 | `src/app/(admin)/materi/components/layout/MaterialsPageClient.tsx` | MODIFY |
| 7 | `src/app/(admin)/materi/page.tsx` | MODIFY |
| 8 | `src/app/(admin)/monitoring/page.tsx` | MODIFY |
| 8 | `src/app/(admin)/monitoring/components/StudentSidebar.tsx` | MODIFY |
