# Plan: Guru Desa/Daerah — Class Master Restriction Feature

## Context

Saat ini, Guru Desa dan Guru Daerah mendapat akses penuh ke **semua kelas** di scope organisasi mereka. Hal ini tidak sesuai dengan realita operasional: Guru Desa/Daerah bertanggung jawab hanya untuk siswa generus (belum menikah), sehingga mereka seharusnya tidak perlu melihat kelas untuk kelompok yang sudah menikah (dewasa/pasca-nikah).

Fitur ini menambahkan kemampuan bagi admin untuk membatasi Guru Desa/Daerah hanya pada tingkatan kelas tertentu (class masters), seperti: PAUD, Kelas 1–6, SMP, SMA, Kuliah. Jika tidak ada pembatasan yang dipilih, guru tetap melihat semua (backward compatible).

## Approach

Buat tabel junction baru `teacher_class_masters` (mengikuti pola `teacher_classes`) untuk menyimpan class master restrictions. UI ditambahkan di GuruModal untuk Guru Desa/Daerah saja. Filter diterapkan di 3 tempat: siswa, laporan, dan absensi.

---

## Task 1 — Database Migration (Supabase via MCP)

Buat tabel `teacher_class_masters` via MCP Supabase:

```sql
CREATE TABLE public.teacher_class_masters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  class_master_id UUID        NOT NULL REFERENCES public.class_masters(id)  ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, class_master_id)
);

CREATE INDEX idx_teacher_class_masters_teacher_id
  ON public.teacher_class_masters(teacher_id);

ALTER TABLE public.teacher_class_masters ENABLE ROW LEVEL SECURITY;

-- Service role (used by createAdminClient) can do all
CREATE POLICY "Service role manages teacher_class_masters"
  ON public.teacher_class_masters
  FOR ALL
  USING (auth.role() = 'service_role');

-- Teachers can read their own restrictions
CREATE POLICY "Teachers read own class master restrictions"
  ON public.teacher_class_masters
  FOR SELECT
  USING (teacher_id = auth.uid());
```

---

## Task 2 — New Server Action Module: `teacher-class-masters`

Create 3 files following the 3-layer pattern:

### `src/app/(admin)/users/guru/actions/teacher-class-masters/queries.ts`

```typescript
// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchTeacherClassMasters(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_class_masters')
    .select('id, class_master_id, class_masters:class_master_id(id, name, sort_order)')
    .eq('teacher_id', teacherId)
}

export async function deleteTeacherClassMasterAssignments(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_class_masters')
    .delete()
    .eq('teacher_id', teacherId)
}

export async function insertTeacherClassMasterAssignments(
  supabase: SupabaseClient,
  mappings: Array<{ teacher_id: string; class_master_id: string }>
) {
  return await supabase
    .from('teacher_class_masters')
    .insert(mappings)
}
```

### `src/app/(admin)/users/guru/actions/teacher-class-masters/logic.ts`

```typescript
export function buildClassMasterMappings(
  teacherId: string,
  classMasterIds: string[]
): Array<{ teacher_id: string; class_master_id: string }> {
  return classMasterIds.map(cmId => ({ teacher_id: teacherId, class_master_id: cmId }))
}

export function mapTeacherClassMastersToResult(raw: any[]) {
  return (raw || []).map(tcm => {
    const cm = Array.isArray(tcm.class_masters) ? tcm.class_masters[0] : tcm.class_masters
    return {
      id: tcm.id,
      class_master_id: tcm.class_master_id,
      class_master_name: cm?.name || '',
    }
  })
}
```

### `src/app/(admin)/users/guru/actions/teacher-class-masters/actions.ts`

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import {
  fetchTeacherClassMasters,
  deleteTeacherClassMasterAssignments,
  insertTeacherClassMasterAssignments,
} from './queries'
import { buildClassMasterMappings, mapTeacherClassMastersToResult } from './logic'

export async function getTeacherClassMasters(teacherId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await fetchTeacherClassMasters(supabase, teacherId)
    if (error) throw error
    return mapTeacherClassMastersToResult(data || [])
  } catch (error) {
    throw handleApiError(error, 'memuat data', 'Gagal memuat tingkatan kelas guru')
  }
}

export async function updateTeacherClassMasters(teacherId: string, classMasterIds: string[]) {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile || !canAccessFeature(profile, 'users')) {
      throw new Error('Anda tidak memiliki akses untuk mengubah tingkatan kelas guru')
    }

    const adminClient = await createAdminClient()
    const { error: deleteError } = await deleteTeacherClassMasterAssignments(adminClient, teacherId)
    if (deleteError) throw deleteError

    if (classMasterIds.length > 0) {
      const mappings = buildClassMasterMappings(teacherId, classMasterIds)
      const { error: insertError } = await insertTeacherClassMasterAssignments(adminClient, mappings)
      if (insertError) throw insertError
    }

    revalidatePath('/users/guru')
    return { success: true }
  } catch (error) {
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate tingkatan kelas guru')
  }
}
```

### Update `src/app/(admin)/users/guru/actions/index.ts`

Add after the existing class assignments section:
```typescript
// ─── Class Master Restrictions (Guru Desa/Daerah) ──────────────────────────────
export {
    getTeacherClassMasters,
    updateTeacherClassMasters,
} from './teacher-class-masters/actions'
```

---

## Task 3 — TDD for New Logic (Write Tests FIRST)

### `src/app/(admin)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts`

```typescript
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
```

Run: `npm run test:run` → expect RED (logic.ts doesn't exist yet). Implement logic.ts → GREEN.

---

## Task 4 — Update `laporan/actions/reports/logic.ts`

**File:** `src/app/(admin)/laporan/actions/reports/logic.ts`

**Change `filterMeetingsByRole` signature** (add optional 5th param):

```typescript
export function filterMeetingsByRole(
  meetings: any[],
  profile: any,
  teacherClassIds: string[],
  maps: {
    classKelompokMap: Map<string, string>
    classToDesaMap: Map<string, string>
    classToDaerahMap: Map<string, string>
  },
  allowedClassMasterClassIds?: Set<string>  // NEW — undefined = no restriction
): string[]
```

**Update hierarchical teacher filter blocks** (~lines 286–293):

Replace:
```typescript
} else if (profile.desa_id) {
  return meetingClassIds.some((classId: string) => maps.classToDesaMap.get(classId) === profile.desa_id)
} else if (profile.daerah_id) {
  return meetingClassIds.some((classId: string) => maps.classToDaerahMap.get(classId) === profile.daerah_id)
}
```

With:
```typescript
} else if (profile.desa_id) {
  return meetingClassIds.some((classId: string) => {
    if (maps.classToDesaMap.get(classId) !== profile.desa_id) return false
    if (!allowedClassMasterClassIds || allowedClassMasterClassIds.size === 0) return true
    return allowedClassMasterClassIds.has(classId)
  })
} else if (profile.daerah_id) {
  return meetingClassIds.some((classId: string) => {
    if (maps.classToDaerahMap.get(classId) !== profile.daerah_id) return false
    if (!allowedClassMasterClassIds || allowedClassMasterClassIds.size === 0) return true
    return allowedClassMasterClassIds.has(classId)
  })
}
```

**Tests to add** in `src/app/(admin)/laporan/actions/reports/__tests__/logic.test.ts`:

```typescript
describe('filterMeetingsByRole – class master restriction for Guru Desa', () => {
  const maps = {
    classKelompokMap: new Map(),
    classToDesaMap: new Map([['c1', 'desa-1'], ['c2', 'desa-1'], ['c3', 'desa-1']]),
    classToDaerahMap: new Map(),
  }
  const desaProfile = { role: 'teacher', desa_id: 'desa-1' }
  const meetings = [
    { id: 'm1', class_id: 'c1', class_ids: [] },   // class master PAUD
    { id: 'm2', class_id: 'c2', class_ids: [] },   // class master Dewasa
    { id: 'm3', class_ids: ['c1', 'c2'], class_id: 'c1' }, // multi-class
  ]

  it('returns all desa meetings when no class master restriction', () => {
    const result = filterMeetingsByRole(meetings, desaProfile, [], maps, undefined)
    expect(result).toEqual(['m1', 'm2', 'm3'])
  })

  it('filters to only allowed class master classes', () => {
    const allowed = new Set(['c1'])
    const result = filterMeetingsByRole(meetings, desaProfile, [], maps, allowed)
    expect(result).toContain('m1')
    expect(result).not.toContain('m2')
    expect(result).toContain('m3') // m3 has c1 which is allowed
  })
})
```

---

## Task 5 — Update `laporan/actions/reports/actions.ts`

**File:** `src/app/(admin)/laporan/actions/reports/actions.ts`

After the teacher class IDs block (after line 51), add class master restriction lookup for hierarchical teachers:

```typescript
// Fetch class master restrictions for Guru Desa/Daerah
let allowedClassMasterClassIds: Set<string> | undefined

if (profile.role === 'teacher' && (profile.desa_id || profile.daerah_id) && !profile.kelompok_id) {
  const { data: cmRestrictions } = await adminClient
    .from('teacher_class_masters')
    .select('class_master_id')
    .eq('teacher_id', user.id)

  if (cmRestrictions && cmRestrictions.length > 0) {
    const { data: allowedMappings } = await adminClient
      .from('class_master_mappings')
      .select('class_id')
      .in('class_master_id', cmRestrictions.map((r: any) => r.class_master_id))

    allowedClassMasterClassIds = new Set((allowedMappings || []).map((m: any) => m.class_id))
  }
}
```

Then update the `filterMeetingsByRole` call (~line 83) to pass the 5th argument:
```typescript
const meetingIdsForAttendance = filterMeetingsByRole(
  meetingsForFilter || [],
  profile,
  teacherClassIds,
  maps,
  allowedClassMasterClassIds  // NEW
)
```

---

## Task 6 — Update `siswa/actions/students/actions.ts`

**File:** `src/app/(admin)/users/siswa/actions/students/actions.ts`

In the `getAllStudents()` function, hierarchical teacher branch (lines 211–274), after fetching students and before calling `transformStudentsData`:

Insert after `const { data: students, error } = await studentsQuery` (line ~261):

```typescript
if (error) throw error

// Apply class master restriction for Guru Desa/Daerah
let filteredStudents = students || []

const { data: cmRestrictions } = await adminClient
  .from('teacher_class_masters')
  .select('class_master_id')
  .eq('teacher_id', user.id)

if (cmRestrictions && cmRestrictions.length > 0) {
  const { data: allowedMappings } = await adminClient
    .from('class_master_mappings')
    .select('class_id')
    .in('class_master_id', cmRestrictions.map((r: any) => r.class_master_id))

  const allowedClassIds = new Set((allowedMappings || []).map((m: any) => m.class_id))

  filteredStudents = filteredStudents.filter((student: any) => {
    const studentClassIds = (student.student_classes || [])
      .map((sc: any) => sc.classes?.id)
      .filter(Boolean)
    return studentClassIds.some((classId: string) => allowedClassIds.has(classId))
  })
}
```

Replace `transformStudentsData(students || [], classNameMap)` with `transformStudentsData(filteredStudents, classNameMap)`.

---

## Task 7 — Update `absensi/actions/meetings/actions.ts`

**File:** `src/app/(admin)/absensi/actions/meetings/actions.ts`

In the hierarchical teacher section (around line 1282, after the classToDesaMap/classToDaerahMap are built at line 1278), add before the filtering block:

```typescript
// Fetch class master restrictions for Guru Desa/Daerah
let allowedClassMasterClassIdsAbsensi: Set<string> | null = null

if (profile.desa_id || profile.daerah_id) {
  const { data: cmRestrictions } = await adminClientTeacher
    .from('teacher_class_masters')
    .select('class_master_id')
    .eq('teacher_id', user.id)

  if (cmRestrictions && cmRestrictions.length > 0) {
    const { data: allowedMappings } = await adminClientTeacher
      .from('class_master_mappings')
      .select('class_id')
      .in('class_master_id', cmRestrictions.map((r: any) => r.class_master_id))

    allowedClassMasterClassIdsAbsensi = new Set((allowedMappings || []).map((m: any) => m.class_id))
  }
}
```

Then update the filter at lines 1294–1315:

```typescript
} else if (profile.desa_id) {
  filteredMeetings = (meetings || []).filter((meeting: any) => {
    const meetingClassIds = meeting.class_ids?.length > 0
      ? meeting.class_ids
      : [meeting.class_id].filter(Boolean)

    return meetingClassIds.some((classId: string) => {
      if (classToDesaMap.get(classId) !== profile.desa_id) return false
      if (!allowedClassMasterClassIdsAbsensi) return true
      return allowedClassMasterClassIdsAbsensi.has(classId)
    })
  })
} else if (profile.daerah_id) {
  filteredMeetings = (meetings || []).filter((meeting: any) => {
    const meetingClassIds = meeting.class_ids?.length > 0
      ? meeting.class_ids
      : [meeting.class_id].filter(Boolean)

    return meetingClassIds.some((classId: string) => {
      if (classToDaerahMap.get(classId) !== profile.daerah_id) return false
      if (!allowedClassMasterClassIdsAbsensi) return true
      return allowedClassMasterClassIdsAbsensi.has(classId)
    })
  })
}
```

---

## Task 8 — Update GuruModal.tsx

**File:** `src/app/(admin)/users/guru/components/GuruModal.tsx`

### 8a. Add imports (top of file)

```typescript
import { getAllClassMasters } from '@/app/(admin)/kelas/actions/masters'
import { getTeacherClassMasters, updateTeacherClassMasters } from '../actions'
import type { ClassMaster } from '@/types/class'
```

### 8b. Add state (after existing state declarations, ~line 112)

```typescript
const [allClassMasters, setAllClassMasters] = useState<ClassMaster[]>([])
```

Extend `formData` state (line 92) to add:
```typescript
classMasterIds: [] as string[]
```

### 8c. Load class masters + existing restrictions in `useEffect`

Find the existing `useEffect` that runs on `isOpen` and loads data. Inside the `loadData()` function, add:

```typescript
// Load all class masters
const classMasters = await getAllClassMasters()
setAllClassMasters(classMasters)

// Load existing class master restrictions if editing
if (guru) {
  const teacherClassMasters = await getTeacherClassMasters(guru.id)
  setFormData(prev => ({
    ...prev,
    classMasterIds: teacherClassMasters.map(tcm => tcm.class_master_id)
  }))
}
```

### 8d. Add class master multi-select UI (after DataFilter block, before class selection for kelompok)

After the closing `</div>` of DataFilter block (~line 677), add:

```tsx
{/* Tingkatan Kelas — ONLY for Guru Desa/Daerah */}
{(teacherLevel === 'desa' || teacherLevel === 'daerah') && allClassMasters.length > 0 && (
  <div>
    <Label>Tingkatan Kelas yang Dapat Diakses (opsional)</Label>
    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
      Biarkan kosong untuk mengizinkan akses ke semua tingkatan kelas. Pilih satu atau lebih untuk membatasi akses.
    </p>
    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-3">
      {allClassMasters.map(cm => (
        <label key={cm.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.classMasterIds.includes(cm.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setFormData(prev => ({ ...prev, classMasterIds: [...prev.classMasterIds, cm.id] }))
              } else {
                setFormData(prev => ({ ...prev, classMasterIds: prev.classMasterIds.filter(id => id !== cm.id) }))
              }
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isLoading}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{cm.name}</span>
        </label>
      ))}
    </div>
  </div>
)}
```

### 8e. Update handleSubmit (lines 494–502)

Replace:
```typescript
if (guru) {
  await updateTeacher(guru.id, submitData);
  await updateTeacherClasses(guru.id, formData.classIds);
} else {
  const result = await createTeacher(submitData);
  if (result.teacher?.id && formData.classIds.length > 0) {
    await updateTeacherClasses(result.teacher.id, formData.classIds);
  }
}
```

With:
```typescript
if (guru) {
  await updateTeacher(guru.id, submitData);
  if (teacherLevel === 'kelompok') {
    await updateTeacherClasses(guru.id, formData.classIds);
  } else {
    await updateTeacherClassMasters(guru.id, formData.classMasterIds);
  }
} else {
  const result = await createTeacher(submitData);
  if (result.teacher?.id) {
    if (teacherLevel === 'kelompok' && formData.classIds.length > 0) {
      await updateTeacherClasses(result.teacher.id, formData.classIds);
    } else if (teacherLevel !== 'kelompok') {
      await updateTeacherClassMasters(result.teacher.id, formData.classMasterIds);
    }
  }
}
```

---

## Critical Files

| File | Change |
|------|--------|
| **NEW** `src/app/(admin)/users/guru/actions/teacher-class-masters/queries.ts` | Layer 1 queries |
| **NEW** `src/app/(admin)/users/guru/actions/teacher-class-masters/logic.ts` | Layer 2 pure logic |
| **NEW** `src/app/(admin)/users/guru/actions/teacher-class-masters/actions.ts` | Layer 3 server actions |
| **NEW** `src/app/(admin)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts` | TDD tests |
| `src/app/(admin)/users/guru/actions/index.ts` | Export new actions |
| `src/app/(admin)/users/guru/components/GuruModal.tsx` | Add UI + submit logic |
| `src/app/(admin)/laporan/actions/reports/logic.ts` | Add allowedClassMasterClassIds param |
| `src/app/(admin)/laporan/actions/reports/actions.ts` | Fetch restrictions + pass to filter |
| `src/app/(admin)/laporan/actions/reports/__tests__/logic.test.ts` | Add class master filter tests |
| `src/app/(admin)/users/siswa/actions/students/actions.ts` | Post-fetch student filter |
| `src/app/(admin)/absensi/actions/meetings/actions.ts` | Absensi meeting filter |
| `src/app/(admin)/dashboard/actions/overview/actions.ts` | Intersect classIds with allowed class masters |
| **DB Migration via MCP** | `teacher_class_masters` table |

---

---

## Task 9 — Dashboard: Apply Class Master Restriction

The Dashboard uses `buildFilterConditions()` in `src/app/(admin)/dashboard/dashboardHelpers.ts` which calls the RPC `get_valid_class_ids`. The result (`classIds`) is then passed to all dashboard queries.

For Guru Desa/Daerah with class master restrictions, we need to intersect the RPC result with allowed class IDs from class masters.

**File:** `src/app/(admin)/dashboard/actions/overview/actions.ts`

After `const { classIds, studentIds, hasFilters } = filterConditions` (line ~35), add:

```typescript
// Apply class master restriction for Guru Desa/Daerah
let effectiveClassIds = classIds
if (profile?.role === 'teacher' && (profile.desa_id || profile.daerah_id) && !profile.kelompok_id) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminClient = await createAdminClient()

  const { data: cmRestrictions } = await adminClient
    .from('teacher_class_masters')
    .select('class_master_id')
    .eq('teacher_id', profile.id)

  if (cmRestrictions && cmRestrictions.length > 0) {
    const { data: allowedMappings } = await adminClient
      .from('class_master_mappings')
      .select('class_id')
      .in('class_master_id', cmRestrictions.map((r: any) => r.class_master_id))

    const allowedClassIds = new Set((allowedMappings || []).map((m: any) => m.class_id))
    // Intersect: only keep classes that are BOTH in org scope AND in allowed class masters
    effectiveClassIds = classIds.filter(id => allowedClassIds.has(id))
  }
}
```

Then replace all `classIds` references in the function with `effectiveClassIds`.

Note: `getCurrentUserProfile()` in `accessControlServer.ts` currently doesn't include `id` in the select. Update line 68:
```typescript
.select('id, full_name, role, email, daerah_id, desa_id, kelompok_id, can_manage_materials')
```
(This field is already in the select — it's `id` from `profiles.id` — this is fine.)

---

## Verification

1. `npm run test:run` — all tests pass (including new logic tests)
2. `npm run type-check` — no TS errors
3. Manual: Create Guru Desa, select only "PAUD" and "SMP" class masters → save
4. Manual: Login as that Guru Desa → go to `/users/siswa` → should see only students in PAUD/SMP classes
5. Manual: Go to `/laporan` → should only see meetings for PAUD/SMP classes
6. Manual: Go to `/absensi` → should only see absensi for PAUD/SMP classes
7. Manual: Existing Guru Desa with NO class masters selected → should see ALL classes (backward compat)
8. Manual: Guru Kelompok is unchanged (no class master UI shown for them)

---

## Implementation Sequence

1. Run DB migration (MCP)
2. TDD: write logic tests (RED)
3. Create teacher-class-masters module (GREEN)
4. Export from index.ts
5. TDD: write laporan logic tests (RED)
6. Update filterMeetingsByRole + laporan actions (GREEN)
7. Update siswa/students/actions.ts
8. Update absensi/meetings/actions.ts
9. Update dashboard/actions/overview/actions.ts
10. Update GuruModal.tsx
11. `npm run type-check` + `npm run test:run`
