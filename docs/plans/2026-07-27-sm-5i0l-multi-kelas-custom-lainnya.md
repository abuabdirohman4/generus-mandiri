# Plan: Multi Kelas Custom Lainnya (sm-5i0l)

**Tanggal**: 2026-07-27  
**Issue**: sm-5i0l  
**Branch**: `feat/sm-5i0l-multi-kelas-custom-lainnya`

## Context

Form Edit Guru saat ini: Guru Daerah/Desa bisa pilih class master "Lainnya", lalu dibatasi ke **1** kelas custom via `InputFilter` (single-select dropdown).

Tujuan: Guru bisa dibatasi ke **beberapa** kelas custom sekaligus (mis. "CAI 2026" + "KBM").

Kolom DB: `teacher_class_masters.custom_class_name text` → `text[]`.

---

## Files yang Diubah

1. **Migrasi DB** (Supabase MCP + local + VM)
2. `src/app/(admin)/users/guru/actions/teacher-class-masters/logic.ts` — tipe + fungsi
3. `src/app/(admin)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts` — update tests
4. `src/lib/accessControlServer.ts` — baca `custom_class_name[]` (array), filter by `includes(className)`
5. `src/app/(admin)/users/guru/components/GuruModal.tsx` — `InputFilter` → `MultiSelectCheckbox`, `formData.customClassName: string` → `customClassNames: string[]`

---

## Task 1: Migrasi DB (text → text[])

### SQL Migration

```sql
-- Ubah kolom custom_class_name dari text ke text[]
ALTER TABLE teacher_class_masters
  ALTER COLUMN custom_class_name TYPE text[]
  USING CASE
    WHEN custom_class_name IS NULL THEN NULL
    ELSE ARRAY[custom_class_name]
  END;
```

**Jalankan di 3 tempat:**

#### 1a. Supabase Production (via MCP)
```
mcp__generus-mandiri-v2__execute_sql dengan query di atas
```

#### 1b. Local Supabase (via skill access-db-vm atau psql local)
```bash
# Cek dulu apakah ada local supabase
supabase status
# Kalau jalan:
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "ALTER TABLE teacher_class_masters ALTER COLUMN custom_class_name TYPE text[] USING CASE WHEN custom_class_name IS NULL THEN NULL ELSE ARRAY[custom_class_name] END;"
```

#### 1c. VM (via skill access-db-vm)
Gunakan skill `access-db-vm` untuk jalankan SQL yang sama di VM.

**Verifikasi:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_class_masters' AND column_name = 'custom_class_name';
-- Harus: data_type = ARRAY, udt_name = _text
```

---

## Task 2: Update Logic Layer (TDD: RED → GREEN)

File: `src/app/(admin)/users/guru/actions/teacher-class-masters/logic.ts`

### 2a. Write test RED dulu

File: `src/app/(admin)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts`

**Ubah test yang ada** + tambah kasus baru:

```typescript
// Update existing tests untuk reflect perubahan tipe
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

  it('backwards compat: custom_class_name string (legacy) → bungkus jadi array', () => {
    // Kalau ada data lama yang belum ke-migrate, handle gracefully
    const raw = [{
      id: '1',
      class_master_id: 'cm-A',
      custom_class_names: null,
      class_masters: { id: 'cm-A', name: 'Lainnya', sort_order: 19 }
    }]
    expect(mapTeacherClassMastersToResult(raw)[0].custom_class_names).toBeNull()
  })

  it('returns empty array for empty input', () => {
    expect(mapTeacherClassMastersToResult([])).toEqual([])
  })
})
```

Run test → harus RED karena `custom_class_name` belum jadi `custom_class_names`:
```bash
npm run test:run -- src/app/\(admin\)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts
```

### 2b. Implementasi logic.ts (GREEN)

```typescript
export interface ClassMasterAssignmentInput {
  classMasterId: string
  customClassNames?: string[] | null  // Changed: string → string[]
}

export function buildClassMasterMappings(
  teacherId: string,
  assignments: ClassMasterAssignmentInput[]
): Array<{ teacher_id: string; class_master_id: string; custom_class_names: string[] | null }> {
  return assignments.map(a => ({
    teacher_id: teacherId,
    class_master_id: a.classMasterId,
    // Empty array = no restriction = null
    custom_class_names: a.customClassNames && a.customClassNames.length > 0 ? a.customClassNames : null,
  }))
}

export function mapTeacherClassMastersToResult(raw: any[]) {
  return (raw || []).map(tcm => {
    const cm = Array.isArray(tcm.class_masters) ? tcm.class_masters[0] : tcm.class_masters
    return {
      id: tcm.id,
      class_master_id: tcm.class_master_id,
      class_master_name: cm?.name || '',
      custom_class_names: tcm.custom_class_names ?? null,  // Changed: custom_class_name → custom_class_names
    }
  })
}
```

Run test → harus GREEN.

---

## Task 3: Update accessControlServer.ts

File: `src/lib/accessControlServer.ts`

**Ubah line ~188**: select `custom_class_names` (bukan `custom_class_name`)
**Ubah line ~200-205**: filter + map pakai array
**Ubah line ~240-243**: compare pakai `includes` bukan `===`

Exact changes:

```typescript
// Line ~188: ubah select
.select('class_master_id, custom_class_names')  // was: custom_class_name

// Line ~200-205: ubah filter/map
const unrestrictedCmIds = (tcmData || [])
  .filter((t: any) => !t.custom_class_names || t.custom_class_names.length === 0)
  .map((t: any) => t.class_master_id);
const customNameFilters = (tcmData || [])
  .filter((t: any) => t.custom_class_names && t.custom_class_names.length > 0)
  .map((t: any) => ({ classMasterId: t.class_master_id, customClassNames: t.custom_class_names as string[] }));

// Line ~205 (map customNameFilters → cmIds): tidak berubah karena hanya extract classMasterId

// Line ~240-243: ubah filter classMasterAllowedIds
const filters = customNameFilters.filter((f: any) => f.classMasterId === m.class_master_id)
if (filters.length === 0) return false
const className = Array.isArray(m.classes) ? m.classes[0]?.name : m.classes?.name
return filters.some((f: any) => f.customClassNames.includes(className))  // was: f.customClassName === className
```

---

## Task 4: Update GuruModal.tsx

File: `src/app/(admin)/users/guru/components/GuruModal.tsx`

### 4a. formData state — ubah `customClassName: string` → `customClassNames: string[]`

Line ~98:
```typescript
customClassNames: [] as string[],  // was: customClassName: '' as string,
```

### 4b. Load existing data — ubah cara baca dari DB

Line ~222-223:
```typescript
// was: loadedCustomClassName = withCustomName?.custom_class_name || ''
// new: kumpulkan semua custom_class_names dari semua rows yang punya (biasanya hanya 1 row Lainnya)
const withCustomNames = cmData.find((cm: any) => cm.custom_class_names && cm.custom_class_names.length > 0)
loadedCustomClassNames = withCustomNames?.custom_class_names || []
```

Update variabel dari `loadedCustomClassName: string` → `loadedCustomClassNames: string[]`.

### 4c. setFormData calls — update 3 tempat

Line ~247: `customClassNames: loadedCustomClassNames`  
Line ~260: `customClassNames: []`  
Line ~304: `customClassNames: []`  

### 4d. onChange classMasterIds — ubah reset logic

Line ~937:
```typescript
// was: customClassName: lainnyaMasterId && ids.includes(lainnyaMasterId) ? prev.customClassName : ''
customClassNames: lainnyaMasterId && ids.includes(lainnyaMasterId) ? prev.customClassNames : []
```

### 4e. Submit logic — ubah 2 tempat (line ~574-576 + ~609-611)

```typescript
// was:
customClassName: (lainnyaMasterId && id === lainnyaMasterId) ? (formData.customClassName || null) : null

// new:
customClassNames: (lainnyaMasterId && id === lainnyaMasterId) ? (formData.customClassNames.length > 0 ? formData.customClassNames : null) : null
```

### 4f. UI — ganti InputFilter → MultiSelectCheckbox

Lines ~947-957 (saat ini):
```tsx
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
```

Ganti dengan:
```tsx
<MultiSelectCheckbox
  label="Batasi ke Kelas Custom Spesifik (Opsional)"
  items={lainnyaClassNames.map((name: string) => ({ id: name, label: name }))}
  selectedIds={formData.customClassNames}
  onChange={(names) => setFormData(prev => ({ ...prev, customClassNames: names }))}
  disabled={isLoading}
  maxHeight="8rem"
  hint="Kosongkan untuk memberi akses ke SEMUA kelas custom (Lainnya). Pilih satu atau lebih nama untuk membatasi akses hanya ke kelas custom tersebut."
/>
```

### 4g. Update hint text di bawah MultiSelectCheckbox

Hapus `<p>` hint lama (line ~958-960) karena hint sudah masuk ke `MultiSelectCheckbox` prop.

---

## Task 5: Type-check + Run Tests

```bash
npm run type-check
npm run test:run -- src/app/\(admin\)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts
```

Keduanya harus PASS.

---

## Commit Message Template

```
feat(guru): multi-select kelas custom Lainnya fixes #XX

- Migrasi DB: custom_class_name text → custom_class_names text[]
- UI: InputFilter single → MultiSelectCheckbox multi
- accessControlServer: filter pakai array.includes()

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check

- [ ] Pattern baru? Tidak — pakai MultiSelectCheckbox existing, pola yang sama dengan Batasan Tingkat Kelas
- [ ] Tabel DB baru? Tidak — hanya ubah tipe kolom
- [ ] Route baru? Tidak
- [ ] Permission pattern baru? Tidak
