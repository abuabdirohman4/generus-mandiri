# sm-dv3: feat: guru desa restricted kelompok access

## Context

Guru desa saat ini punya `desa_id` dan otomatis akses **semua kelompok** di desa tersebut. Butuh fitur agar admin bisa membatasi guru desa ke kelompok-kelompok tertentu saja. Use case: guru desa yang hanya ditugaskan mengajar di 2 dari 5 kelompok dalam 1 desa.

**Design decision:**
- Junction table baru `teacher_kelompok_access(teacher_id, kelompok_id)` — bukan kolom di `profiles`
- Kosong = akses penuh ke semua kelompok (backward compatible, tidak perlu migrate data existing)
- Hanya berlaku untuk `guru desa` (yang punya `desa_id`, tidak punya `kelompok_id`)

---

## DB Migration

```sql
-- Migration: create teacher_kelompok_access
create table teacher_kelompok_access (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  kelompok_id uuid not null references kelompok(id) on delete cascade,
  created_at timestamptz default now(),
  unique(teacher_id, kelompok_id)
);

-- RLS: admin can manage, teacher can read own
alter table teacher_kelompok_access enable row level security;

create policy "admins can manage teacher_kelompok_access"
  on teacher_kelompok_access
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('superadmin', 'admin')
    )
  );

create policy "teachers can read own kelompok access"
  on teacher_kelompok_access
  for select
  using (teacher_id = auth.uid());
```

Run migration via Supabase MCP: `mcp__generus-mandiri-v2__apply_migration`

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `actions/teacher-kelompok-access/queries.ts` | NEW — Layer 1 |
| `actions/teacher-kelompok-access/logic.ts` | NEW — Layer 2 |
| `actions/teacher-kelompok-access/actions.ts` | NEW — Layer 3 |
| `actions/teacher-kelompok-access/__tests__/logic.test.ts` | NEW — tests |
| `actions/index.ts` | Add exports |
| `components/GuruModal.tsx` | Add kelompok multi-select for guru desa |
| `src/lib/userUtils.ts` | Add `getTeacherAllowedKelompokIds()` helper |
| `src/app/(admin)/laporan/actions/reports/queries.ts` | Filter by allowed kelompok |
| `src/app/(admin)/laporan/hooks/useLaporanPage.ts` | Pass allowed kelompok to filter |

All in `src/app/(admin)/users/guru/` kecuali yang disebutkan eksplisit.

---

## Task 1: DB Migration

Apply migration SQL di atas via Supabase MCP tool `mcp__generus-mandiri-v2__apply_migration`.

Verify dengan `mcp__generus-mandiri-v2__list_tables` — pastikan `teacher_kelompok_access` muncul.

---

## Task 2: Layer 1 — `actions/teacher-kelompok-access/queries.ts`

```typescript
// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchTeacherKelompokAccess(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_kelompok_access')
    .select('id, kelompok_id, kelompok:kelompok_id(id, name)')
    .eq('teacher_id', teacherId)
}

export async function deleteTeacherKelompokAccess(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_kelompok_access')
    .delete()
    .eq('teacher_id', teacherId)
}

export async function insertTeacherKelompokAccess(
  supabase: SupabaseClient,
  mappings: Array<{ teacher_id: string; kelompok_id: string }>
) {
  return await supabase
    .from('teacher_kelompok_access')
    .insert(mappings)
}

export async function fetchTeacherKelompokIds(supabase: SupabaseClient, teacherId: string) {
  const { data, error } = await supabase
    .from('teacher_kelompok_access')
    .select('kelompok_id')
    .eq('teacher_id', teacherId)
  return { data: data?.map(r => r.kelompok_id) ?? [], error }
}
```

---

## Task 3: Layer 2 — `actions/teacher-kelompok-access/logic.ts`

```typescript
export function buildKelompokAccessMappings(
  teacherId: string,
  kelompokIds: string[]
): Array<{ teacher_id: string; kelompok_id: string }> {
  return kelompokIds.map(kelompok_id => ({ teacher_id: teacherId, kelompok_id }))
}

export function validateKelompokAccessInput(
  teacherId: string,
  kelompokIds: string[]
): { valid: boolean; message?: string } {
  if (!teacherId) return { valid: false, message: 'Teacher ID diperlukan' }
  if (!Array.isArray(kelompokIds)) return { valid: false, message: 'kelompokIds harus array' }
  if (kelompokIds.some(id => !id || typeof id !== 'string')) {
    return { valid: false, message: 'ID kelompok tidak valid' }
  }
  return { valid: true }
}
```

**TDD — `__tests__/logic.test.ts`:**
```typescript
import { buildKelompokAccessMappings, validateKelompokAccessInput } from '../logic'

describe('buildKelompokAccessMappings', () => {
  it('returns correct mapping shape', () => {
    const result = buildKelompokAccessMappings('teacher-1', ['kelompok-1', 'kelompok-2'])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', kelompok_id: 'kelompok-1' },
      { teacher_id: 'teacher-1', kelompok_id: 'kelompok-2' },
    ])
  })
  it('returns empty array for empty kelompokIds', () => {
    expect(buildKelompokAccessMappings('t-1', [])).toEqual([])
  })
})

describe('validateKelompokAccessInput', () => {
  it('invalid for empty teacherId', () => {
    expect(validateKelompokAccessInput('', ['k1']).valid).toBe(false)
  })
  it('invalid for array with empty string', () => {
    expect(validateKelompokAccessInput('t-1', ['k1', '']).valid).toBe(false)
  })
  it('valid for empty kelompokIds (means full access)', () => {
    expect(validateKelompokAccessInput('t-1', []).valid).toBe(true)
  })
  it('valid for well-formed input', () => {
    expect(validateKelompokAccessInput('t-1', ['k1', 'k2']).valid).toBe(true)
  })
})
```

Run: `npm run test:run` — verify PASS.

---

## Task 4: Layer 3 — `actions/teacher-kelompok-access/actions.ts`

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import {
  fetchTeacherKelompokAccess,
  deleteTeacherKelompokAccess,
  insertTeacherKelompokAccess,
} from './queries'
import { validateKelompokAccessInput, buildKelompokAccessMappings } from './logic'

export async function getTeacherKelompokAccess(
  teacherId: string
): Promise<{ success: boolean; data: string[]; message?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await fetchTeacherKelompokAccess(supabase, teacherId)
    if (error) throw error
    return {
      success: true,
      data: (data || []).map((r: any) => r.kelompok_id),
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      message: handleApiError(error, 'memuat data', 'Gagal memuat akses kelompok').message,
    }
  }
}

export async function updateTeacherKelompokAccess(
  teacherId: string,
  kelompokIds: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const validation = validateKelompokAccessInput(teacherId, kelompokIds)
    if (!validation.valid) return { success: false, message: validation.message }

    const supabase = await createClient()

    // Delete existing then insert new (same pattern as teacher_class_masters)
    const { error: deleteError } = await deleteTeacherKelompokAccess(supabase, teacherId)
    if (deleteError) throw deleteError

    if (kelompokIds.length > 0) {
      const mappings = buildKelompokAccessMappings(teacherId, kelompokIds)
      const { error: insertError } = await insertTeacherKelompokAccess(supabase, mappings)
      if (insertError) throw insertError
    }

    revalidatePath('/users/guru')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_teacher_settings',
        entityType: 'teacher',
        entityId: teacherId,
        entityLabel: 'Update Kelompok Access',
        pagePath: '/users/guru',
        metadata: { kelompokIds, count: kelompokIds.length } as any,
      })
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: handleApiError(error, 'menyimpan data', 'Gagal menyimpan akses kelompok').message,
    }
  }
}
```

---

## Task 5: Export dari `actions/index.ts`

Add after existing exports:
```typescript
// ─── Kelompok Access Restrictions (Guru Desa) ──────────────────────────────────
export {
    getTeacherKelompokAccess,
    updateTeacherKelompokAccess,
} from './teacher-kelompok-access/actions'
```

---

## Task 6: Update `GuruModal.tsx` — Tambah kelompok multi-select untuk guru desa

File: `src/app/(admin)/users/guru/components/GuruModal.tsx`

**6a. Tambah state** (setelah `classMasterIds` di formData, line ~96):
```typescript
// Dalam formData useState:
kelompokAccessIds: [] as string[]
```

**6b. Load existing kelompok access saat edit** — di `useEffect` yang load existing data (cari `useEffect` dengan `guru?.id`):
```typescript
// Setelah load classMasterIds, tambah:
if (teacherLevel === 'desa') {
  const kelompokAccessResult = await getTeacherKelompokAccess(guru.id)
  if (kelompokAccessResult.success) {
    setFormData(prev => ({ ...prev, kelompokAccessIds: kelompokAccessResult.data }))
  }
}
```

**6c. Tambah UI** — setelah blok "Batasan Tingkat Kelas" (line ~875), tambah:
```tsx
{/* Kelompok Access Restriction - ONLY for Guru Desa */}
{teacherLevel === 'desa' && (() => {
  // Filter kelompok options to only the selected desa
  const desaId = dataFilters.desa[0]
  const kelompokOptions = filteredLists.kelompokList
    .filter(k => k.desa_id === desaId)
    .map(k => ({ id: k.id, label: k.name }))
  
  return (
    <div>
      <Label>Batasan Kelompok (Opsional)</Label>
      <div className="mb-3">
        <MultiSelectCheckbox
          label=""
          items={kelompokOptions}
          selectedIds={formData.kelompokAccessIds}
          onChange={(ids) => setFormData(prev => ({ ...prev, kelompokAccessIds: ids }))}
          disabled={isLoading || !desaId}
          maxHeight="8rem"
          hint="Jika dikosongkan, guru ini memiliki akses ke SEMUA kelompok di desanya. Jika diisi, guru HANYA bisa mengakses data dari kelompok yang dipilih."
        />
      </div>
    </div>
  )
})()}
```

**6d. Submit handler** — setelah call `updateTeacherClassMasters` untuk guru desa (line ~531):
```typescript
// Untuk create dan update, tambah setelah masterResult:
if (teacherLevel === 'desa') {
  const kelompokResult = await updateTeacherKelompokAccess(
    guru ? guru.id : result.teacher.id,
    formData.kelompokAccessIds
  )
  if (!kelompokResult.success) {
    setGeneralError(kelompokResult.message || 'Gagal menyimpan akses kelompok')
    return
  }
}
```

**Import** di top of GuruModal.tsx:
```typescript
import { getTeacherKelompokAccess, updateTeacherKelompokAccess } from '../actions'
```

---

## Task 7: Update laporan filtering untuk guru desa dengan restricted kelompok

File: `src/app/(admin)/laporan/actions/reports/queries.ts`

Cari fungsi yang memfilter kelas untuk guru desa (pakai `desa_id`). Tambah secondary filter:

```typescript
// Setelah query berdasarkan desa_id, tambah:
// Check teacher_kelompok_access — jika ada rows, filter ke kelompok itu saja
if (profile.role === 'teacher' && profile.desa_id) {
  const { data: kelompokAccess } = await supabase
    .from('teacher_kelompok_access')
    .select('kelompok_id')
    .eq('teacher_id', profile.id)
  
  if (kelompokAccess && kelompokAccess.length > 0) {
    const allowedKelompokIds = kelompokAccess.map(r => r.kelompok_id)
    query = query.in('kelompok_id', allowedKelompokIds)
  }
  // Jika kosong → akses penuh ke semua kelompok di desa (no additional filter)
}
```

**Note**: Temukan exact line dan fungsi di file tersebut sebelum modifikasi. Pastikan tidak break query chain.

File: `src/app/(admin)/laporan/hooks/useLaporanPage.ts`

Cari `isHierarchicalTeacher` logic (line ~89). Jika kelompok access list perlu di-cache di client untuk DataFilter auto-set, tambah fetch:
```typescript
// Setelah existing teacher profile checks:
const [allowedKelompokIds, setAllowedKelompokIds] = useState<string[]>([])

useEffect(() => {
  if (userProfile?.role === 'teacher' && userProfile.desa_id) {
    getTeacherKelompokAccess(userProfile.id).then(result => {
      if (result.success) setAllowedKelompokIds(result.data)
    })
  }
}, [userProfile?.id, userProfile?.role, userProfile?.desa_id])
```

Kemudian di auto-set filter logic, jika `allowedKelompokIds.length > 0`, auto-set kelompok filter ke allowed IDs.

---

## Verification

```bash
npm run test:run         # All tests pass
npm run type-check       # No TS errors
```

Manual:
1. Buat guru desa baru → pilih 2 kelompok di "Batasan Kelompok" → save
2. Cek DB: `teacher_kelompok_access` punya 2 rows untuk guru tersebut
3. Edit guru desa → checkbox 2 kelompok terpilih (loaded correctly)
4. Login sebagai guru desa tersebut → `/laporan` → hanya data dari 2 kelompok yang muncul
5. Guru desa lama (tanpa rows di junction table) → masih akses semua kelompok (backward compatible)

---

## CLAUDE.md Check

- [ ] Tabel database baru `teacher_kelompok_access` → tambah ke Key Tables di CLAUDE.md
- [ ] Pattern baru: junction table untuk restrict hierarchical teacher scope → tambah ke `docs/claude/architecture-patterns.md` di section Hierarchical Teacher Pattern
- [ ] Route/page baru? — Tidak
- [ ] Permission pattern baru? — Tidak (bukan flag di permissions JSONB, tapi junction table)
