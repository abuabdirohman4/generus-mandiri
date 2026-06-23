# Plan — sm-1kz — Bulk Import Siswa via Excel

**Issue:** sm-1kz · feat: bulk import siswa via Excel
**Date:** 2026-06-23
**Author:** Claude Code (plan) → Antigravity (impl)

---

## 1. Goal

Upload Excel → import siswa massal. Fitur: (1) download template Excel, (2) upload → parse → validasi, (3) preview sebelum commit, (4) simpan batch ke `students`. Target: onboarding ratusan siswa tanpa input manual.

## 2. KEY: extend existing flow, don't rebuild

Sudah ada batch-import 3-step modal yang melakukan manual entry:
- `BatchImportModal.tsx` → `Step1Config` (pilih kelas/org) → `Step2Input` (entry baris-per-baris: name + gender) → `Step3Preview` → `createStudentsBatch(students, classId)`.
- Store: `batchImportStore.ts` (`BatchStudent { id, name, gender, error? }`, `currentStep`, `students`).
- **TIDAK ada** xlsx/exceljs di `package.json` — Step2Input murni manual.

**sm-1kz = tambah jalur Excel ke Step2Input** (toggle: "Input Manual" vs "Upload Excel"), lalu reuse Step3Preview + `createStudentsBatch` apa adanya. JANGAN bikin modal/preview/commit baru.

## 3. Reuse Map

| Need | Reuse | File |
|---|---|---|
| Commit batch ke DB | `createStudentsBatch(students, classId)` | `siswa/actions/students/actions.ts` |
| Preview + validasi tampilan | `Step3Preview.tsx` (sudah handle `error?` per row) | `siswa/components/batch-import/` |
| Config kelas/org | `Step1Config.tsx` | same |
| State | `batchImportStore` (`BatchStudent[]`) | `siswa/stores/batchImportStore.ts` |
| Modal shell | `BatchImportModal.tsx` | same |
| Button/Input | existing components | `components/form/input`, `components/ui/button` |

## 4. New dependency

Tambah **`xlsx`** (SheetJS) — read `.xlsx`/`.xls`/`.csv`. (`exceljs` lebih berat; `xlsx` cukup untuk parse + template write.) Client-side parse (no server upload needed — file → ArrayBuffer → rows). Konfirmasi ke user kalau prefer exceljs.

⚠️ PostgREST/validation: parsed rows tetap lewat `createStudentsBatch` (server) → permission + scope check tetap jalan. Excel parse hanya di client untuk UX preview.

## 5. Architecture decisions

- **Logic dipisah ke pure module** `siswa/utils/excelImport.ts` (atau `batch-import/parseExcel.ts`):
  - `parseStudentSheet(rows: any[][]): BatchStudent[]` — map kolom (Nama, Gender/JK) → BatchStudent, generate id, normalize gender (L/P, Laki/Perempuan → canonical).
  - `validateBatchStudents(students): BatchStudent[]` — set `error` per row (nama kosong, gender invalid, duplikat dalam file). Reuse validasi yang mungkin sudah ada di Step3Preview/store; jangan duplikasi — extract kalau perlu.
  - PURE → unit-testable tanpa file nyata (feed array).
- **Template generator** `buildStudentTemplate(): Blob` — xlsx dengan header row (Nama, Jenis Kelamin) + 1 contoh baris + sheet note. Download via `URL.createObjectURL`.
- Step2Input dapat mode switch (manual / excel). Mode excel: tombol "Download Template" + file input (`accept=.xlsx,.xls,.csv`) → parse → set `students` di store → lanjut Step3Preview (flow lama).
- Tidak ada server action baru (commit pakai `createStudentsBatch`). Kalau ratusan baris → pertimbangkan chunk insert; cek apakah `createStudentsBatch` sudah batch-safe untuk N besar (lihat impl, mungkin perlu chunking — flag).

## 6. Tasks (TDD per task)

### Task 1 — Install xlsx
- `npm i xlsx`. Verify build. (User jalankan kalau perlu — Claude tidak install.)

### Task 2 — Parse + validate logic (TDD)
- `batch-import/parseExcel.ts`: `parseStudentSheet`, `validateBatchStudents`, gender normalizer.
- RED: `__tests__/parseExcel.test.ts` — header mapping, gender normalize (L/P/Laki-laki/Perempuan), empty name → error, dup in file → error, trim whitespace.
- GREEN. `npm run test:run` → PASS.

### Task 3 — Template generator
- `buildStudentTemplate()` → xlsx Blob (header + contoh). Unit test: assert sheet has header row "Nama"/"Jenis Kelamin" (parse back with xlsx).

### Task 4 — Step2Input mode switch + upload UI
- Add toggle manual/excel di `Step2Input.tsx`. Excel mode: Download Template button + file input → `parseStudentSheet` → `validateBatchStudents` → `setStudents` (store) → auto-advance ke Step3 atau tetap di Step2 dengan jumlah ke-detect. Show parse errors count.
- Pakai komponen existing; file input boleh raw `<input type=file>` (tidak ada komponen file existing — tapi cek dulu `components/form/input/` ada FileInput atau tidak).

### Task 5 — Chunk commit (kalau perlu)
- Cek `createStudentsBatch` handle N besar (ratusan). Kalau single insert → tambah chunking (mis. 100/batch) di action atau caller. Test kalau logic chunk ditambah.

### Task 6 — Verify
- `npm run type-check` → 0. `npm run test:run` → PASS.
- Manual: download template → isi 5 baris (1 sengaja gender salah, 1 nama kosong) → upload → preview tunjukkan 2 error, 3 valid → commit → 3 siswa masuk DB di kelas terpilih.

## 7. Out of scope
- Import field selain name + gender (NIS, ortu, dll) — follow-up.
- Update/upsert siswa existing (hanya create baru).
- Server-side file storage (parse client-side).

## 8. CLAUDE.md Check
- [ ] New dep `xlsx` → tambah ke Key Technologies list di CLAUDE.md.
- [ ] No new table/route (extend existing batch import).
- [ ] Kalau chunking ditambah ke `createStudentsBatch` → note di database-operations.md (bulk create).
- [ ] Excel parse pattern baru → pertimbangkan 1-line di architecture-patterns.md kalau reusable (mis. import guru nanti).

## 9. Commit message template
```
feat(siswa): bulk import students via Excel (fixes #XX)

Add Excel upload path to batch import: downloadable template, client-side
xlsx parse + validation, preview, commit via existing createStudentsBatch.
Extends existing 3-step batch import modal (manual + excel modes).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
