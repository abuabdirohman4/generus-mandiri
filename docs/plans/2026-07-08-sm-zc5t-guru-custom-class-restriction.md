# Plan: Batasi Akses Guru Koordinator ke Kelas Custom "Lainnya" Spesifik

## Issue
sm-zc5t / GH #131

## Background

Guru Desa/Guru Daerah (hierarchical teacher) dibatasi aksesnya lewat `teacher_class_masters` — memilih satu atau lebih `class_masters` (mis. "PAUD", "Caberawit", "Lainnya"). Masalahnya: **"Lainnya" adalah SATU class_master yang dipakai bareng oleh SEMUA kelas custom** (`class_master_mappings` many-to-many — lihat `class_masters.id = 'b26231dd-afb0-4056-8387-3d6bd765d347'`, name `Lainnya`, dipakai oleh kelas custom seperti "CAI 2026", "Tahfidz", dll — dikonfirmasi via `docs/claude/architecture-patterns.md` §Grade Promotion dan `kelas/actions/batch-standard/custom-queries.ts`).

Kalau admin mencentang "Lainnya" di form guru, guru itu otomatis dapat akses ke **SEMUA** kelas custom di scope-nya, bukan cuma satu (mis. "CAI 2026"). Fitur ini menambah kolom `custom_class_name` supaya assignment "Lainnya" bisa dipersempit ke SATU nama kelas custom spesifik.

Pola referensi sudah ada di `AssignStudentsModal.tsx` (`lainnyaClassNames` computed dari `classes[].class_master_mappings[].class_master.name === 'Lainnya'` → collect `classes[].name` unik) dan `InputFilter` dropdown yang muncul kondisional saat "Lainnya" dipilih (line 300-329). Plan ini mereplikasi pola yang sama di `GuruModal.tsx`, tapi untuk SATU class_master_id ("Lainnya") bukan create-time assignment siswa.

## Scope

4 file kode + 1 migration DB + regen types:
1. DB migration: `teacher_class_masters.custom_class_name TEXT NULL`
2. `src/lib/accessControlServer.ts` — `getTeacherAllowedClassIds` filter tambahan
3. `src/app/(admin)/users/guru/actions/teacher-class-masters/{queries,logic,actions}.ts` — payload baru
4. `src/app/(admin)/users/guru/components/GuruModal.tsx` — UI dropdown kondisional

Estimasi: 5 file, ~150 baris → **mode A (Antigravity)**.

---

## Task 1 — DB Migration + Regen Types

**File**: migration via MCP Supabase (`apply_migration`)

```sql
ALTER TABLE teacher_class_masters
  ADD COLUMN custom_class_name TEXT NULL;

COMMENT ON COLUMN teacher_class_masters.custom_class_name IS
  'Saat class_master_id merujuk ke "Lainnya" (kelas custom shared), kolom ini mempersempit akses guru ke SATU nama kelas custom spesifik (match persis dengan classes.name). NULL = akses semua kelas custom di bawah master ini (behavior lama).';
```

Migration name: `add_custom_class_name_to_teacher_class_masters`

Setelah apply sukses, jalankan `generate_typescript_types` (MCP) dan simpan hasilnya ke `src/types/supabase.ts` (cek dulu apakah file itu ada / dipakai project — kalau project tidak generate types Supabase secara otomatis dan tidak ada file `src/types/supabase.ts` yang di-import di manapun, SKIP step regen — project ini pakai manual domain types di `src/types/[domain].ts`, bukan generated Supabase types. Cek `grep -r "types/supabase" src/` dulu sebelum nulis file).

**Verifikasi**: `list_tables` (MCP) → `teacher_class_masters` punya kolom `custom_class_name`.

---

## Task 2 — Update `src/app/(admin)/users/guru/actions/teacher-class-masters/queries.ts`

**File**: `src/app/(admin)/users/guru/actions/teacher-class-masters/queries.ts`

Ubah `fetchTeacherClassMasters` select + `insertTeacherClassMasterAssignments` signature:

```typescript
// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchTeacherClassMasters(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_class_masters')
    .select('id, class_master_id, custom_class_name, class_masters:class_master_id(id, name, sort_order)')
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
  mappings: Array<{ teacher_id: string; class_master_id: string; custom_class_name?: string | null }>
) {
  return await supabase
    .from('teacher_class_masters')
    .insert(mappings)
}
```

**Test** (`__tests__/queries.test.ts` — cek file existing dulu, kalau belum ada skip, kalau ada tambah case): pastikan mock select string masih match (test biasanya assert `mockSupabase.from` dipanggil dengan `'teacher_class_masters'`, bukan assert exact select string — cek pattern existing).

---

## Task 3 — Update `src/app/(admin)/users/guru/actions/teacher-class-masters/logic.ts`

**File**: `src/app/(admin)/users/guru/actions/teacher-class-masters/logic.ts`

```typescript
export interface ClassMasterAssignmentInput {
  classMasterId: string
  customClassName?: string | null
}

export function buildClassMasterMappings(
  teacherId: string,
  assignments: ClassMasterAssignmentInput[]
): Array<{ teacher_id: string; class_master_id: string; custom_class_name: string | null }> {
  return assignments.map(a => ({
    teacher_id: teacherId,
    class_master_id: a.classMasterId,
    custom_class_name: a.customClassName?.trim() || null,
  }))
}

export function mapTeacherClassMastersToResult(raw: any[]) {
  return (raw || []).map(tcm => {
    const cm = Array.isArray(tcm.class_masters) ? tcm.class_masters[0] : tcm.class_masters
    return {
      id: tcm.id,
      class_master_id: tcm.class_master_id,
      class_master_name: cm?.name || '',
      custom_class_name: tcm.custom_class_name ?? null,
    }
  })
}
```

**BREAKING CHANGE**: `buildClassMasterMappings` signature berubah dari `classMasterIds: string[]` jadi `assignments: ClassMasterAssignmentInput[]`. Ini backward-incompatible secara sengaja (bukan optional param) karena satu-satunya caller (`actions.ts` Task 4) diupdate bersamaan di plan ini — bukan public API luar.

### TDD (RED → GREEN)

`src/app/(admin)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts` — baca file existing dulu (kemungkinan sudah ada test untuk `buildClassMasterMappings` versi lama), lalu update:

```typescript
import { describe, it, expect } from 'vitest'
import { buildClassMasterMappings, mapTeacherClassMastersToResult } from '../logic'

describe('buildClassMasterMappings', () => {
  it('maps assignments to insert rows with custom_class_name null by default', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-1' },
    ])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', class_master_id: 'cm-1', custom_class_name: null },
    ])
  })

  it('includes custom_class_name when provided', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-lainnya', customClassName: 'CAI 2026' },
    ])
    expect(result).toEqual([
      { teacher_id: 'teacher-1', class_master_id: 'cm-lainnya', custom_class_name: 'CAI 2026' },
    ])
  })

  it('trims whitespace and treats empty string as null', () => {
    const result = buildClassMasterMappings('teacher-1', [
      { classMasterId: 'cm-lainnya', customClassName: '  ' },
    ])
    expect(result[0].custom_class_name).toBeNull()
  })
})

describe('mapTeacherClassMastersToResult', () => {
  it('includes custom_class_name in mapped result', () => {
    const raw = [{ id: '1', class_master_id: 'cm-1', custom_class_name: 'CAI 2026', class_masters: { id: 'cm-1', name: 'Lainnya' } }]
    expect(mapTeacherClassMastersToResult(raw)).toEqual([
      { id: '1', class_master_id: 'cm-1', class_master_name: 'Lainnya', custom_class_name: 'CAI 2026' },
    ])
  })
})
```

Jalankan `npm run test:run -- teacher-class-masters/__tests__/logic.test.ts` → RED dulu (fungsi lama belum terima object), lalu implement, lalu GREEN.

---

## Task 4 — Update `src/app/(admin)/users/guru/actions/teacher-class-masters/actions.ts`

**File**: `src/app/(admin)/users/guru/actions/teacher-class-masters/actions.ts`

Ubah signature `updateTeacherClassMasters`:

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { getCurrentUserProfile, canAccessFeature } from '@/lib/accessControlServer'
import { logActivity } from '@/lib/activityLogger'
import {
  fetchTeacherClassMasters,
  deleteTeacherClassMasterAssignments,
  insertTeacherClassMasterAssignments,
} from './queries'
import { buildClassMasterMappings, mapTeacherClassMastersToResult, type ClassMasterAssignmentInput } from './logic'

export async function getTeacherClassMasters(teacherId: string): Promise<{ success: boolean; data: any[]; message?: string }> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await fetchTeacherClassMasters(supabase, teacherId)
    if (error) throw error
    return { success: true, data: mapTeacherClassMastersToResult(data || []) }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat tingkatan kelas guru')
    return { success: false, message: errorInfo.message, data: [] }
  }
}

export async function updateTeacherClassMasters(teacherId: string, assignments: ClassMasterAssignmentInput[]) {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile || !canAccessFeature(profile, 'users')) {
      throw new Error('Anda tidak memiliki akses untuk mengubah tingkatan kelas guru')
    }

    const adminClient = await createAdminClient()
    const { error: deleteError } = await deleteTeacherClassMasterAssignments(adminClient, teacherId)
    if (deleteError) throw deleteError

    if (assignments.length > 0) {
      const mappings = buildClassMasterMappings(teacherId, assignments)
      const { error: insertError } = await insertTeacherClassMasterAssignments(adminClient, mappings)
      if (insertError) throw insertError
    }

    revalidatePath('/users/guru')

    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_teacher_settings',
        entityType: 'teacher',
        entityId: teacherId,
        entityLabel: 'Update Class Master Assignments',
        pagePath: '/users/guru',
        metadata: { assignments }
      })
    }

    return { success: true }
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal mengupdate tingkatan kelas guru')
    return { success: false, message: errorInfo.message }
  }
}
```

**CRITICAL**: Semua caller `updateTeacherClassMasters(id, string[])` di `GuruModal.tsx` (Task 6) HARUS diupdate ke `ClassMasterAssignmentInput[]` di task yang sama — jangan biarkan mismatch antar task.

---

## Task 5 — Update `src/lib/accessControlServer.ts` — `getTeacherAllowedClassIds`

**File**: `src/lib/accessControlServer.ts`, function mulai line 138.

Ubah step 2-3 (line 153-180) untuk fetch `custom_class_name` juga, lalu split cmIds jadi "unrestricted" (custom_class_name NULL) vs "restricted to specific custom name":

```typescript
export async function getTeacherAllowedClassIds(
  userId: string,
  profile?: { daerah_id?: string | null; desa_id?: string | null; kelompok_id?: string | null } | null
): Promise<Set<string> | null> {
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = await createAdminClient();

  // 1. Get classes from teacher_classes (direct assignments)
  const { data: tcData } = await adminClient
    .from('teacher_classes')
    .select('class_id')
    .eq('teacher_id', userId);

  const assignedClassIds = (tcData || []).map((t: any) => t.class_id);

  // 2. Check if this teacher has any class master restrictions (hierarchical assignments)
  const { data: tcmData } = await adminClient
    .from('teacher_class_masters')
    .select('class_master_id, custom_class_name')
    .eq('teacher_id', userId);

  if ((!tcData || tcData.length === 0) && (!tcmData || tcmData.length === 0)) return null;

  // Split: class masters with NO custom name restriction (grant all classes under that master)
  // vs. class masters WITH a custom_class_name (grant only the one matching class by exact name).
  const unrestrictedCmIds = (tcmData || [])
    .filter((t: any) => !t.custom_class_name)
    .map((t: any) => t.class_master_id);
  const customNameFilters = (tcmData || [])
    .filter((t: any) => !!t.custom_class_name)
    .map((t: any) => ({ classMasterId: t.class_master_id, customClassName: t.custom_class_name as string }));

  const cmIds = [...new Set([...unrestrictedCmIds, ...customNameFilters.map(f => f.classMasterId)])];

  // 3. Get class IDs that map to these class masters
  let classMasterAllowedIds: string[] = [];
  if (cmIds.length > 0) {
    const { data: mappingData, error: mappingError } = await adminClient
      .from('class_master_mappings')
      .select('class_id, class_master_id, classes:class_id(name)')
      .in('class_master_id', cmIds);

    if (mappingError) {
      console.error('[getTeacherAllowedClassIds] Error fetching mappingData:', mappingError);
    } else {
      classMasterAllowedIds = (mappingData || [])
        .filter((m: any) => {
          // Unrestricted master → allow this class
          if (unrestrictedCmIds.includes(m.class_master_id)) return true
          // Restricted master → only allow if class name matches the custom_class_name
          const filter = customNameFilters.find(f => f.classMasterId === m.class_master_id)
          if (!filter) return false
          const className = Array.isArray(m.classes) ? m.classes[0]?.name : m.classes?.name
          return className === filter.customClassName
        })
        .map((m: any) => m.class_id);
    }
  }

  const allAllowedClassIds = [...new Set([...assignedClassIds, ...classMasterAllowedIds])];
  // ... rest of function UNCHANGED (line 183 onward)
```

**CRITICAL**: satu `class_master_id` bisa punya BEBERAPA row `teacher_class_masters` dengan `custom_class_name` berbeda (mis. admin assign guru ke "Lainnya" dua kali: sekali dengan `custom_class_name='CAI 2026'`, sekali dengan `custom_class_name='Tahfidz'` → guru itu akses KEDUA kelas custom). Filter logic di atas sudah handle ini karena `customNameFilters` array bisa punya multiple entries untuk `class_master_id` yang sama — TAPI `.find()` cuma ambil entry PERTAMA yang match `classMasterId`, bukan cek SEMUA entries untuk `class_master_id` itu. **FIX**: ganti `customNameFilters.find(...)` jadi `customNameFilters.filter(f => f.classMasterId === m.class_master_id)` lalu cek apakah ADA salah satu yang `.customClassName === className`:

```typescript
        .filter((m: any) => {
          if (unrestrictedCmIds.includes(m.class_master_id)) return true
          const filters = customNameFilters.filter(f => f.classMasterId === m.class_master_id)
          if (filters.length === 0) return false
          const className = Array.isArray(m.classes) ? m.classes[0]?.name : m.classes?.name
          return filters.some(f => f.customClassName === className)
        })
```

Pakai versi FIX ini di implementasi (bukan versi `.find()` di atas — itu cuma penjelasan step-by-step kenapa perlu `.filter()`).

### Verifikasi (manual/E2E, bukan unit test)

Fungsi ini query Supabase langsung (`postgrest-select-not-typechecked` — lihat memory project), jadi tidak ada unit test existing. **Verifikasi via E2E manual**:
1. Buat 2 kelas custom di kelompok yang sama: "CAI 2026" dan "Tahfidz" (keduanya mapped ke master "Lainnya").
2. Buat Guru Desa, assign `teacher_class_masters` dengan `class_master_id = <Lainnya id>`, `custom_class_name = 'CAI 2026'`.
3. Login sebagai guru itu → cek halaman yang pakai `getTeacherAllowedClassIds` (mis. `/absensi`, `/laporan`) → HARUS hanya lihat kelas "CAI 2026", TIDAK lihat "Tahfidz".
4. Ulangi tanpa `custom_class_name` (NULL) → guru harus lihat KEDUA kelas custom (behavior lama, regression check).

---

## Task 6 — Update `src/app/(admin)/users/guru/components/GuruModal.tsx`

### 6a. State — tambah `classMasterCustomNames` map

Ubah `formData.classMasterIds: string[]` — **JANGAN ubah tipe ini** (biar UI checkbox tetap simple: array of selected class_master IDs). Tambah state BARU terpisah untuk custom name per class_master, karena satu guru bisa assign "Lainnya" untuk beberapa custom name sekaligus (lihat Task 5 CRITICAL note) — tapi untuk MVP ini, **batasi ke SATU custom_class_name per guru** (sesuai request user: "satu Kelas Custom spesifik"). Kalau butuh multi-custom-name nanti, buat issue follow-up.

Tambah di state block (dekat line 89-98):

```typescript
const [formData, setFormData] = useState({
  username: '',
  full_name: '',
  password: '',
  daerah_id: '',
  kelompok_id: '',
  classIds: [] as string[],
  classMasterIds: [] as string[],
  customClassName: '' as string,   // NEW — hanya relevan kalau "Lainnya" ada di classMasterIds
  kelompokAccessIds: [] as string[]
});
```

### 6b. Compute `lainnyaClassNames` — reuse pola dari `AssignStudentsModal.tsx`

Tambah `useMemo` baru dekat `allClassesInScope` (setelah line 367):

```typescript
// Get unique "Lainnya" class names available in scope (same pattern as AssignStudentsModal.tsx)
const lainnyaClassNames = useMemo(() => {
  if (!allClasses) return []
  const names = new Set<string>()
  allClasses.forEach((c: any) => {
    const hasLainnyaMaster = c.class_master_mappings?.some(
      (m: any) => m.class_master?.name === 'Lainnya'
    )
    if (hasLainnyaMaster) {
      names.add(c.name)
    }
  })
  return Array.from(names).sort()
}, [allClasses]);

// Cari ID class_master "Lainnya" supaya tahu kapan checkbox itu dipilih
const lainnyaMasterId = useMemo(() => {
  return allClassMasters.find((m: any) => m.name === 'Lainnya')?.id ?? null
}, [allClassMasters]);
```

### 6c. Load existing `customClassName` saat edit mode

Di `useEffect` load data (dekat line 213-221), setelah `getTeacherClassMasters`:

```typescript
let classMasterIds: string[] = [];
let customClassName = '';
if (detectedLevel === 'desa' || detectedLevel === 'daerah') {
  try {
    const result = await getTeacherClassMasters(guru.id);
    const data = result.success ? result.data : [];
    classMasterIds = data.map((cm: any) => cm.class_master_id);
    const withCustomName = data.find((cm: any) => cm.custom_class_name);
    customClassName = withCustomName?.custom_class_name || '';
  } catch (cmError) {
    console.error('Error loading class masters:', cmError);
  }
}
```

Lalu tambahkan `customClassName` ke kedua `setFormData(...)` calls di block ini (line 233-242 dan error-catch fallback 245-254) — set `customClassName: customClassName` di yang sukses, `customClassName: ''` di fallback.

Juga tambah `customClassName: ''` ke create-mode `setFormData` (line 288-297).

### 6d. UI — dropdown kondisional setelah MultiSelectCheckbox

Ubah blok "Class Master Restriction" (line 887-905):

```tsx
{/* Class Master Restriction - ONLY for Guru Desa/Daerah */}
{(teacherLevel === 'desa' || teacherLevel === 'daerah') && (() => {
  return (
    <div>
      <Label>Batasan Tingkat Kelas (Opsional)</Label>
      <div className="mb-3">
        <MultiSelectCheckbox
          label=""
          items={allClassMasters.map((m: any) => ({ id: m.id, label: m.name }))}
          selectedIds={formData.classMasterIds}
          onChange={(ids) => setFormData(prev => ({
            ...prev,
            classMasterIds: ids,
            // Reset customClassName kalau "Lainnya" di-uncheck
            customClassName: lainnyaMasterId && ids.includes(lainnyaMasterId) ? prev.customClassName : ''
          }))}
          disabled={isLoading}
          maxHeight="8rem"
          hint="Jika dikosongkan, guru ini memiliki akses ke SEMUA kelas di wilayahnya. Jika diisi, guru HANYA bisa mengakses data kelas dari tingkat yang dipilih (misal: hanya melihat PAUD)."
        />
      </div>

      {lainnyaMasterId && formData.classMasterIds.includes(lainnyaMasterId) && (
        <div className="mb-3">
          <InputFilter
            id="customClassName"
            label="Batasi ke Kelas Custom Spesifik (Opsional)"
            value={formData.customClassName}
            onChange={(value) => setFormData(prev => ({ ...prev, customClassName: value }))}
            options={lainnyaClassNames.map((name: string) => ({ value: name, label: name }))}
            allOptionLabel="Semua kelas custom (Lainnya)"
            widthClassName="!max-w-full"
            variant="modal"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kosongkan untuk memberi akses ke SEMUA kelas custom (Lainnya). Pilih satu nama untuk membatasi akses hanya ke kelas custom tersebut (mis. hanya "CAI 2026").
          </p>
        </div>
      )}
    </div>
  );
})()}
```

Tambah import di top file (dekat line 10):
```typescript
import InputFilter from '@/components/form/input/InputFilter'
```

**Cek dulu props `InputFilter`** (`src/components/form/input/InputFilter.tsx`) sebelum implement — pastikan `onChange` signature `(value: string) => void` (bukan event), dan `disabled` prop didukung. Kalau tidak didukung `disabled`, hapus prop itu.

### 6e. Submit handler — kirim `assignments` bukan `classMasterIds` mentah

Ubah SEMUA 3 pemanggilan `updateTeacherClassMasters` (line 545, 551, 576) dari:
```typescript
await updateTeacherClassMasters(guru.id, formData.classMasterIds)
```
jadi:
```typescript
const assignments = formData.classMasterIds.map(id => ({
  classMasterId: id,
  customClassName: (lainnyaMasterId && id === lainnyaMasterId) ? (formData.customClassName || null) : null
}))
await updateTeacherClassMasters(guru.id, assignments)
```

Terapkan ke ketiga call site:
- Line ~545 (edit mode, ada classMasterIds)
- Line ~551 (edit mode, empty array — tetap `[]`, tidak perlu ubah)
- Line ~575-576 (create mode)

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? → Tidak, reuse pola `lainnyaClassNames` + `InputFilter` yang sudah ada di `AssignStudentsModal.tsx`. Tidak perlu dokumentasi baru.
- [ ] Apakah ada tabel database baru yang perlu ditambahkan ke Key Tables? → Tidak, cuma tambah kolom ke tabel existing `teacher_class_masters` (sudah tercantum di Key Tables CLAUDE.md).
- [ ] Apakah ada route/page baru yang perlu ditambahkan ke App Router Structure? → Tidak.
- [ ] Apakah ada permission pattern baru yang perlu didokumentasikan? → Tidak langsung baru, tapi PERTIMBANGKAN update `docs/claude/architecture-patterns.md` §Hierarchical Teacher Pattern dengan sub-section "Custom Class Name Restriction" setelah implementasi selesai — supaya AI masa depan tahu `teacher_class_masters.custom_class_name` exists dan kenapa (masalah shared "Lainnya" master).
- [ ] Jika ada yang perlu diupdate → tambahkan section singkat di `docs/claude/architecture-patterns.md` setelah implementasi, link ke issue ini.

## Known Limitation (dicatat untuk follow-up issue kalau perlu)
- MVP ini hanya support SATU `custom_class_name` per guru (state `formData.customClassName` singular). Kalau nanti butuh guru akses multi kelas-custom spesifik (mis. "CAI 2026" DAN "Tahfidz" tapi TIDAK "Lomba Cerdas"), perlu redesign UI jadi multi-select + kemungkinan multiple `teacher_class_masters` rows dengan `class_master_id` sama tapi `custom_class_name` beda. Backend (`getTeacherAllowedClassIds`, Task 5) SUDAH support case ini by design (pakai `.filter()` bukan `.find()`) — cuma UI GuruModal yang dibatasi ke satu.
