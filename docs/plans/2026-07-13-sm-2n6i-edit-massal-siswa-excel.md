# Plan — sm-2n6i — Edit Massal Siswa via Excel (Export → Edit → Upsert)

**Issue:** sm-2n6i · feat: edit massal siswa via Excel (export-edit-upsert)
**Date:** 2026-07-13
**Author:** Claude Code (plan) → Antigravity (impl)
**Depends on:** sm-1kz (reuse parser + template kolom + createStudentsBatch extended)

---

## 1. Context / Goal

Admin butuh edit data siswa massal tanpa input satu-per-satu dan tanpa kehilangan data existing. Alur: download semua data siswa (termasuk kolom `id`) → user edit langsung di Excel → upload kembali. Baris dengan `id` = UPDATE, baris tanpa `id` = INSERT (siswa baru).

Ini melengkapi sm-1kz (insert-only) dengan kemampuan **upsert**.

## 2. Keputusan desain (ketok palu — user)

| Aspek | Keputusan |
|---|---|
| Cell kosong saat UPDATE | **SKIP** — biarkan nilai lama di DB, JANGAN overwrite null. Build UPDATE object HANYA dari kolom non-empty |
| Baris siswa dihapus dari Excel | **ABAIKAN** — tidak auto-delete. Baris absen = tidak diproses. Delete = aksi manual terpisah |
| Org existing (baris ada id) | **Ikut data lama** — tidak diubah (kecuali nanti ada kolom pindah kelas, out of scope) |
| Org siswa baru (baris tanpa id) | Via **Step1Config dropdown** di alur ini |
| Preview | **Ringkas**: "N update, M insert, K error" |

## 3. Alur

1. **Export** — server action `exportStudentsToExcel(filters)`: ambil semua siswa dalam scope admin (respek RLS/permission), termasuk `id`. Generate xlsx: kolom `id` (locked/hint "jangan diubah") + semua kolom data (§ kolom sm-1kz). User download.
2. **User edit** di Excel — ubah data, tambah baris baru (biarkan `id` kosong).
3. **Upload** — parse → pisah: ada `id` = kandidat UPDATE, tanpa `id` = kandidat INSERT.
4. **Preview** — ringkas: "N update, M insert, K error". Error: id tidak ditemukan, id di luar scope, nama kosong (insert).
5. **Commit** — `upsertStudentsBatch`:
   - INSERT: via `createStudentsBatch` extended (dari sm-1kz). Org dari Step1Config.
   - UPDATE: per kolom, cell kosong = skip. Hanya kolom terisi di-UPDATE. Org ikut data lama.

## 4. Guardrail (WAJIB — ini yang bikin upsert bukan trivial)

| Bahaya | Mitigasi |
|---|---|
| Overwrite tak sengaja | Cell kosong = SKIP (build UPDATE object hanya dari kolom non-empty) |
| Row dihapus user | Tidak ada auto-delete. Baris absen diabaikan total |
| Scope/permission | Server validasi tiap `id` masih dalam scope admin (reuse `getDataFilter` + `students/permissions.ts`). id di luar scope → error preview, JANGAN commit |
| id palsu / tidak ada | Validasi id exist di DB sebelum commit; tidak ada → error, skip baris |

## 5. Reuse (dari sm-1kz + existing)

| Need | Reuse | File |
|---|---|---|
| Parser + validasi | `parseStudentSheet` / `validateBatchStudents` (EXTEND: baca kolom `id`) | `siswa/components/batch-import/parseExcel.ts` |
| Template kolom | struktur kolom sm-1kz | same |
| Commit INSERT | `createStudentsBatch` (extended sm-1kz) | `siswa/actions/students/actions.ts` |
| Scope/permission | `getDataFilter` (`@/lib/accessControlServer`), `students/permissions.ts` | — |
| Query siswa (export) | pola scope-aware di `students/queries.ts` | — |
| Config org (insert baru) | `Step1Config.tsx` | `siswa/components/batch-import/` |

## 6. Tasks (TDD per task)

### T1 — Export server action + xlsx generator
`exportStudentsToExcel(filters)`: query siswa scope-aware (respek permission) → xlsx dengan kolom `id` + semua kolom data. Test: scope filtering (admin desa tak dapat siswa desa lain), kolom id ada.

### T2 — Parser extend + splitter (pure, TDD)
- Extend `parseStudentSheet` baca kolom `id`.
- `splitUpsertRows(students): { updates, inserts }` — id ada → updates, id kosong → inserts.
- Test: id ada→update, id kosong→insert, id format invalid→error, empty name pada insert→error.

### T3 — Upsert server action (TDD)
`upsertStudentsBatch(updates, inserts, target)`:
- UPDATE: buildUpdateObject skip-empty-cell + validasi scope id + validasi id exist.
- INSERT: via `createStudentsBatch`.
- TDD: skip empty cell (nilai lama utuh), reject out-of-scope id, reject nonexistent id, insert baris baru sukses.

### T4 — UI: alur Edit Massal
Tombol "Edit Massal (Excel)" di halaman siswa. Modal/alur: Export → Upload → Preview ringkas ("N update, M insert, K error") → Commit. Pakai komponen existing (Button, InputFilter, Step1Config untuk org insert). New-page/nav checklist tidak berlaku (bukan route baru, modal di halaman siswa).

### T5 — Verify
`type-check` 0, `test:run` PASS. Manual: export → edit 3 baris (1 kosongkan Alamat = tetap utuh, 1 ubah Nama, 1 baris baru tanpa id) → upload → preview "1 insert, 2 update" → commit → cek DB: alamat lama utuh, nama berubah, siswa baru masuk kelas Step1Config.

## 7. Out of scope
- Delete siswa via Excel (aksi manual terpisah).
- Pindah kelas siswa existing via Excel (org existing ikut data lama).
- Import org via kolom Excel.

## 8. CLAUDE.md Check
- [ ] `exportStudentsToExcel` + `upsertStudentsBatch` → note `database-operations.md` (bulk upsert + skip-empty-cell rule).
- [ ] Pola export→edit→upsert → 1-line `architecture-patterns.md` kalau reusable.

## 9. Commit message template
```
feat(siswa): edit massal siswa via Excel export-edit-upsert (fixes #XX)

Add export all students (with id) to Excel, edit, re-upload: rows with id
UPDATE (empty cell skipped, no null overwrite), rows without id INSERT.
Scope-validated per id. No auto-delete for missing rows.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
