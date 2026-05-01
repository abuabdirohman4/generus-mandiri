# Plan: Flexible Scoring Mode per Material Category

## Context

Monitoring materi saat ini hanya mendukung input nilai (0-100). Namun berbagai jenis materi
punya cara penilaian yang berbeda:
- **Hafalan** (surat, doa, hadis) → cukup checklist selesai/belum (`done: boolean`)
- **Tajwid, Fiqih, Pemahaman** → perlu nilai angka (`nilai: 0-100`) untuk gradasi kualitas

Goal: Admin bisa setting per **kategori** materi mana yang pakai mode `done` (checklist)
dan mana yang pakai mode `nilai` (angka). Setting ini disimpan di `material_categories.scoring_type`.
Monitoring UI akan render input yang sesuai per kategori yang dipilih guru.

---

## Prerequisite

- [ ] sm-1zg selesai (rename `hafal` → `done` di DB dan kode)

---

## Database Schema

### Hierarchy saat ini
```
material_categories (id, name, display_order)
    ↓ 1:N
material_types (id, category_id, name, display_order)
    ↓ 1:N
material_items (id, material_type_id, name)
    ↓ progress tracked in:
student_material_progress (student_id, material_item_id, done, nilai, notes)
```

### Perubahan: tambah `scoring_type` ke `material_categories`

```sql
ALTER TABLE material_categories
ADD COLUMN scoring_type TEXT NOT NULL DEFAULT 'nilai'
CHECK (scoring_type IN ('done', 'nilai'));
```

Default `'nilai'` → backward compatible, semua kategori existing tetap pakai nilai.

---

## Task 1 — DB Migration

Via `mcp__generus-mandiri-v2__apply_migration`:

```sql
ALTER TABLE material_categories
ADD COLUMN scoring_type TEXT NOT NULL DEFAULT 'nilai'
CHECK (scoring_type IN ('done', 'nilai'));
```

Verifikasi:
```sql
SELECT id, name, scoring_type FROM material_categories ORDER BY display_order;
-- Expected: semua row ada kolom scoring_type = 'nilai'
```

---

## Task 2 — Update Type di `src/types/material.ts`

**File**: `src/types/material.ts`

```typescript
// Tambah scoring_type ke MaterialCategory interface
export interface MaterialCategory {
  id: string
  name: string
  description: string | null
  display_order: number
  scoring_type: 'done' | 'nilai'  // ADD THIS
  created_at: string
  updated_at: string
}
```

---

## Task 3 — Update `getHafalanCategories()` di monitoring actions

**File**: `src/app/(admin)/monitoring/actions/monitoring.ts`

Update query untuk include `scoring_type`:
```typescript
// BEFORE
.select('id, name')

// AFTER
.select('id, name, scoring_type')
```

Update return type + interface `HafalanCategory` di monitoring page:
```typescript
// monitoring/page.tsx
interface HafalanCategory {
  id: string
  name: string
  scoring_type: 'done' | 'nilai'  // ADD THIS
}
```

---

## Task 4 — Update Monitoring UI: input sesuai scoring_type

**File**: `src/app/(admin)/monitoring/page.tsx`

### 4a — Derive current scoring mode dari selected category

```typescript
const selectedCategoryScoringType = useMemo(() => {
  const cat = hafalanCategories.find(c => c.id === selectedCategoryId)
  return cat?.scoring_type ?? 'nilai'
}, [hafalanCategories, selectedCategoryId])
```

### 4b — Update `handleProgressChange` untuk support `done`

```typescript
const handleProgressChange = (
  materialId: string,
  field: 'nilai' | 'notes' | 'done',  // ADD 'done'
  value: number | string | boolean
) => { ... }
```

### 4c — Update material input rendering

Di bagian render material items, ganti input nilai dengan conditional:

```typescript
{selectedCategoryScoringType === 'done' ? (
  // Checklist mode
  <input
    type="checkbox"
    checked={progressMap.get(`${currentStudent.id}-${material.id}`)?.done ?? false}
    onChange={(e) => handleProgressChange(material.id, 'done', e.target.checked)}
  />
) : (
  // Nilai mode (existing)
  <input
    type="number"
    min={0} max={100}
    value={progressMap.get(`${currentStudent.id}-${currentStudent.id}-${material.id}`)?.nilai ?? ''}
    onChange={(e) => handleProgressChange(material.id, 'nilai', Number(e.target.value))}
  />
)}
```

### 4d — Update `bulkUpdateProgress` call

```typescript
const updates: ProgressInput[] = Array.from(progressMap.values())
  .filter(p => p.student_id === selectedStudentId)
  .map(p => ({
    student_id: p.student_id,
    material_item_id: p.material_item_id,
    academic_year_id: selectedYearId,
    semester: selectedSemester,
    done: p.done,      // ADD
    nilai: p.nilai,
    notes: p.notes
  }))
```

---

## Task 5 — Update `ProgressInput` type di monitoring types

**File**: `src/app/(admin)/monitoring/types.ts`

```typescript
export interface ProgressInput {
  student_id: string
  material_item_id: string
  academic_year_id: string
  semester: 1 | 2
  done?: boolean    // ADD (was hafal, now done after sm-1zg)
  nilai?: number
  notes?: string
}
```

---

## Task 6 — Settings UI: CategoryModal untuk set scoring_type

**File**: `src/app/(admin)/materi/components/CategoryModal.tsx`

Tambah field `scoring_type` di form create/edit kategori:

```tsx
<div>
  <Label>Mode Penilaian</Label>
  <select
    value={formData.scoring_type ?? 'nilai'}
    onChange={(e) => setFormData({ ...formData, scoring_type: e.target.value as 'done' | 'nilai' })}
  >
    <option value="nilai">Nilai (0-100)</option>
    <option value="done">Selesai/Belum (Checklist)</option>
  </select>
  <p className="text-sm text-gray-500 mt-1">
    Pilih "Checklist" untuk materi hafalan. Pilih "Nilai" untuk materi yang butuh gradasi kualitas.
  </p>
</div>
```

Update action `createCategory()` dan `updateCategory()` di materi actions untuk include `scoring_type`.

---

## Task 7 — Type-check

```bash
npm run type-check
```

Expected: 0 errors

---

## Files Changed (7 files, ~80 lines)

| File | Perubahan |
|------|-----------|
| DB migration | ADD COLUMN scoring_type |
| `src/types/material.ts` | `MaterialCategory.scoring_type` |
| `src/app/(admin)/monitoring/actions/monitoring.ts` | fetch scoring_type di getHafalanCategories |
| `src/app/(admin)/monitoring/types.ts` | ProgressInput.done, HafalanCategory.scoring_type |
| `src/app/(admin)/monitoring/page.tsx` | UI conditional render + handleProgressChange |
| `src/app/(admin)/materi/components/CategoryModal.tsx` | Tambah scoring_type field |
| `src/app/(admin)/materi/actions/` | include scoring_type di create/update |

---

## Verification

```sql
-- Set satu kategori ke done untuk test
UPDATE material_categories SET scoring_type = 'done' WHERE name ILIKE '%Hafalan%' LIMIT 1;
```

Manual test:
1. Buka `/monitoring` → pilih kelas → pilih kategori hafalan
2. Material items harus tampil sebagai checkbox (bukan input angka)
3. Centang beberapa → save → refresh → state terpertahankan
4. Pilih kategori non-hafalan → harus tampil input angka

Admin test:
1. Buka `/materi` → edit kategori → ada field "Mode Penilaian"
2. Ubah ke "Checklist" → save → monitoring ikut berubah

---

## CLAUDE.md Check
- [ ] Update `docs/claude/business-rules.md` — tambahkan section "Material Scoring Mode"
- [ ] `material_categories` perlu ditambahkan ke Key Tables di CLAUDE.md dengan mention `scoring_type`

## Commit Message Template
```
feat: flexible scoring mode per material category (done/nilai)

- Add scoring_type column to material_categories (default: 'nilai')
- Monitoring UI renders checkbox or number input based on category setting
- CategoryModal in /materi allows admin to set scoring mode per category
- Update ProgressInput type to support both done and nilai fields

Prerequisite: sm-1zg (rename hafal → done) must be completed first.

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
