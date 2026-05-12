# Plan: Rename `hafal` → `done` in student_material_progress

## Context

Kolom `hafal` (boolean) di tabel `student_material_progress` terlalu spesifik untuk hafalan saja.
Monitoring materi mencakup berbagai jenis konten (doa, surat, hadis, fiqih, dll) yang tidak semua
berbasis hafalan — ada yang selesai/tidak selesai berdasarkan kriteria lain. Rename ke `done` membuat
kolom ini generik dan reusable untuk semua jenis materi, konsisten dengan intent boolean-nya.

`student_material_progress` saat ini memiliki 53 rows — kolom sudah di-rename via MCP oleh Claude Code pada 2026-05-12. **Task 1 (DB migration) sudah selesai dikerjakan, mulai dari Task 2.**

---

## Scope

**Files yang berubah: 3 files, ~15 baris**

| File | Perubahan |
|------|-----------|
| DB migration | `RENAME COLUMN hafal TO done` |
| `src/app/(admin)/monitoring/actions/monitoring.ts` | Ganti semua `hafal` → `done` di queries & logic |
| `src/app/(admin)/monitoring/types.ts` | Ganti `hafal` → `done` di interfaces & functions |
| `src/app/(admin)/monitoring/page.tsx` | Ganti `hafal` → `done` di state & bulkUpdateProgress call |

**TIDAK berubah:**
- `rapot/templates/types.ts` — `GradingFormat = 'hafal'` adalah label UI rapot, tidak terhubung ke kolom ini
- `rapot/GradeInput.tsx` — sama, format display rapot
- Dummy data JSON files — hanya teks deskripsi, bukan kolom DB

---

## ~~Task 1 — DB Migration~~ ✅ SUDAH SELESAI

**Dikerjakan oleh Claude Code via MCP pada 2026-05-12.**

Migration yang sudah dijalankan:
```sql
ALTER TABLE student_material_progress RENAME COLUMN hafal TO done;
```

Verifikasi konfirmasi:
- Kolom `done`: `boolean`, default `false` ✅
- Kolom `hafal`: sudah tidak ada ✅
- 53 rows data tidak terdampak ✅

**SKIP Task 1 — langsung ke Task 2.**

---

## Task 2 — Update `monitoring/types.ts`

**File**: `src/app/(admin)/monitoring/types.ts`

Perubahan:
```typescript
// BEFORE
hafal?: boolean;  // Quick checkbox mode
// ...
total_hafal: number;
total_belum: number;
// ...
students_hafal: number;
students_belum: number;
// ...
hafal?: boolean;  // For checkbox mode
// ...
// Priority: nilai > hafal
return progress.hafal ? 100 : 0;

// AFTER
done?: boolean;   // Quick checkbox mode
// ...
total_done: number;
total_belum: number;
// ...
students_done: number;
students_belum: number;
// ...
done?: boolean;   // For checkbox mode
// ...
// Priority: nilai > done
return progress.done ? 100 : 0;
```

---

## Task 3 — Update `monitoring/actions/monitoring.ts`

**File**: `src/app/(admin)/monitoring/actions/monitoring.ts`

Perubahan:
1. Query select: `'student_id, material_item_id, nilai, hafal'` → `'student_id, material_item_id, nilai, done'`
2. Logic `p.hafal ? 100 : 0` → `p.done ? 100 : 0` (3 tempat)
3. Kondisi `(!p.hafal && p.nilai === null)` → `(!p.done && p.nilai === null)`
4. Comment `"Belum selesai" = nilai IS NULL AND hafal = false` → `done = false`
5. `revalidatePath('/hafalan')` → biarkan (ini path revalidation, bukan kolom)

---

## Task 4 — Update `monitoring/page.tsx`

**File**: `src/app/(admin)/monitoring/page.tsx`

Perubahan:
1. Interface `Progress`: `hafal?: boolean` → `done?: boolean`
2. `bulkUpdateProgress` call: `hafal: p.hafal` → `done: p.done`
3. Scoring logic: `(p.hafal ? 100 : 0)` → `(p.done ? 100 : 0)`
4. State `hafalanCategories` → **JANGAN diubah** (ini nama state untuk kategori hafalan, bukan kolom DB)
5. Comment `{/* Group materials by hafalan type */}` → biarkan (konteks UI)

---

## Task 5 — Type-check

```bash
npm run type-check
```

Expected: 0 errors

---

## Verification

```sql
-- Pastikan kolom done ada
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'student_material_progress';
-- Expected: kolom 'done' ada, kolom 'hafal' tidak ada

-- Cek tidak ada data yang hilang (masih 0 row = aman)
SELECT COUNT(*) FROM student_material_progress;
```

Manual test:
- Buka `/monitoring` → pilih kelas → pilih siswa
- Verifikasi UI tidak ada error terkait field `hafal`

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU? → Tidak, ini rename kolom
- [ ] Tabel baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Perlu update `docs/claude/business-rules.md`? → Ya, update section student_material_progress: `done` bukan `hafal`

## Commit Message Template
```
refactor: rename hafal to done in student_material_progress

- DB migration: ALTER TABLE student_material_progress RENAME COLUMN hafal TO done
- Update monitoring/types.ts: hafal -> done in interfaces and getDisplayScore()
- Update monitoring/actions/monitoring.ts: query select + scoring logic
- Update monitoring/page.tsx: Progress interface + bulkUpdateProgress call

Generalize boolean completion field from hafalan-specific to any material type.
student_material_progress had 0 rows — safe migration with no data impact.

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
