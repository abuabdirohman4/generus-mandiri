# Plan — sm-1kz — Bulk Import Siswa via Excel (kolom lengkap)

**Issue:** sm-1kz · feat: bulk import siswa via Excel
**Date:** 2026-06-23 (revisi 2026-07-13: kolom lengkap + extend createStudentsBatch)
**Author:** Claude Code (plan) → Antigravity (impl)
**Related:** sm-2n6i (edit massal upsert — depends on issue ini)

---

## 1. Context / Goal

Onboarding ratusan siswa lewat input manual (mode batch existing: name + gender per baris) tidak scalable. Fitur: upload Excel → import siswa baru **dengan data lengkap** (bukan cuma nama+gender). Alur: (1) download template Excel kolom lengkap, (2) upload → parse → validasi, (3) preview ringkas sebelum commit, (4) simpan batch ke `students`.

**Scope issue ini = INSERT-only.** Edit/upsert siswa existing = sm-2n6i (issue terpisah).

## 2. KEY: extend existing flow, don't rebuild

Sudah ada batch-import 3-step modal:
- `BatchImportModal` → `Step1Config` (pilih kelas/org via dropdown + DataFilter, sudah handle scope admin) → `Step2Input` (entry manual: name + gender) → `Step3Preview` → `createStudentsBatch(students, target)`.
- Store: `batchImportStore.ts` (`BatchStudent { id, name, gender, error?, kelompok_id?, desa_id? }`).
- **TIDAK ada** xlsx di `package.json`.

**sm-1kz = tambah jalur Excel ke Step2Input** (toggle manual/excel) + template kolom lengkap. Org tetap via Step1Config (JANGAN taruh UUID org di Excel).

## 3. WARNING: Yang BUKAN pure-reuse (harus di-extend)

`createStudentsBatch` saat ini HANYA terima `{ name, gender, kelompok_id?, desa_id? }` dan map ke `studentsToInsert` cuma 6 field. Untuk kolom lengkap:
1. **Extend param type** `createStudentsBatch` — tambah semua kolom opsional (lihat #4). Berlaku untuk kedua path `target.type === 'class'` DAN `'master'` (bulk assign).
2. **Extend `studentsToInsert` map** — sertakan kolom opsional; yang tak diisi → JANGAN set (biar default DB, hindari overwrite null).
3. **Extend `BatchStudent`** di `batchImportStore.ts` — tambah field opsional lengkap.

File: `src/app/(admin)/users/siswa/actions/students/actions.ts` (`createStudentsBatch`), `siswa/stores/batchImportStore.ts`.

## 4. Kolom template (dari skema `students`)

| Kategori | Kolom Excel (header) | DB col | Aturan |
|---|---|---|---|
| Wajib | Nama | `name` | tidak boleh kosong |
| Wajib | Jenis Kelamin | `gender` | normalize L/P/Laki-laki/Perempuan |
| Opsional | Nomor Induk | `nomor_induk` | string |
| Opsional | Tempat Lahir | `tempat_lahir` | string |
| Opsional | Tanggal Lahir | `tanggal_lahir` | DATE — parse DD/MM/YYYY atau Excel serial → ISO |
| Opsional | Anak Ke | `anak_ke` | integer |
| Opsional | Alamat | `alamat` | string |
| Opsional | No. Telepon | `nomor_telepon` | string |
| Opsional | Nama Ayah | `nama_ayah` | string |
| Opsional | Nama Ibu | `nama_ibu` | string |
| Opsional | Alamat Orang Tua | `alamat_orangtua` | string |
| Opsional | Telepon Orang Tua | `telepon_orangtua` | string |
| Opsional | Pekerjaan Ayah | `pekerjaan_ayah` | string |
| Opsional | Pekerjaan Ibu | `pekerjaan_ibu` | string |
| Opsional | Nama Wali | `nama_wali` | string |
| Opsional | Alamat Wali | `alamat_wali` | string |
| Opsional | Pekerjaan Wali | `pekerjaan_wali` | string |

**JANGAN di template**: `id`, `class_id`/`kelompok_id`/`desa_id`/`daerah_id` (org via Step1Config), `status`, `created_at`, `updated_at`, `deleted_*`, `archived_*`, `transfer_history`.

## 5. Reuse Map

| Need | Reuse | File |
|---|---|---|
| Config org/kelas + scope | `Step1Config.tsx` (dropdown + DataFilter) | `siswa/components/batch-import/` |
| Preview + error/row | `Step3Preview.tsx` | same |
| State | `batchImportStore` | `siswa/stores/batchImportStore.ts` |
| Commit + org hierarchy | `createStudentsBatch` (EXTEND) + `buildStudentHierarchy` + `insertStudentsBatch` | `siswa/actions/students/actions.ts` |
| Dropdown/Input/Button | `InputFilter`, `Input`, `Button` | `components/form/input`, `components/ui/button` |

## 6. Tasks (TDD per task)

### T1 — Install xlsx
`npm i xlsx` (SheetJS). User jalankan (Claude tidak install). Verify build. Tambah ke Key Technologies di CLAUDE.md.

### T2 — Parser + validasi (pure, TDD)
File baru `siswa/components/batch-import/parseExcel.ts`:
- `parseStudentSheet(rows: any[][]): BatchStudent[]` — map header (#4) → BatchStudent, generate id, normalize gender, parse tanggal (DD/MM/YYYY + Excel serial → ISO), parse anak_ke → int, trim semua.
- `validateBatchStudents(students): BatchStudent[]` — set `error` per row: nama kosong, gender invalid, tanggal invalid, anak_ke non-numeric, duplikat nama dalam file. Kolom opsional kosong bukan error.
- Test `__tests__/parseExcel.test.ts`: header mapping lengkap, gender normalize, date parse (2 format), empty name error, invalid date error, trim, opsional kosong tetap valid, dup dalam file.

### T3 — Template generator (TDD)
`buildStudentTemplate(): Blob` di `parseExcel.ts` — xlsx header semua kolom (#4) + 1 baris contoh + baris catatan format tanggal. Download via `URL.createObjectURL`. Test: parse-back, assert header "Nama"/"Jenis Kelamin"/"Tanggal Lahir" ada.

### T4 — Step2Input mode switch + upload UI
`Step2Input.tsx`: toggle "Input Manual" vs "Upload Excel". Mode Excel:
- Tombol "Download Template" → `buildStudentTemplate()`.
- File input (`accept=.xlsx,.xls,.csv`) → ArrayBuffer → `xlsx.read` → `parseStudentSheet` → `validateBatchStudents` → `setStudents` → tampil jumlah detect + jumlah error → lanjut Step3.
- Cek `components/form/input/` untuk FileInput dulu; kalau tak ada, raw `<input type=file>` (styled) OK.

### T5 — Chunk commit (kalau perlu)
Cek `insertStudentsBatch` handle N ratusan. Kalau single insert overflow payload → chunk 100/batch di actions. Test kalau logic chunk ditambah.

### T6 — Verify
`npm run type-check` → 0. `npm run test:run` → PASS. Manual: download template → isi 5 baris (1 gender salah, 1 nama kosong, 1 data lengkap) → upload → preview 2 error 3 valid → commit → cek DB kolom lengkap terisi + org benar sesuai Step1Config.

## 7. Out of scope
- Edit/upsert siswa existing → sm-2n6i.
- Org via kolom Excel (pakai Step1Config).
- Import field custom di luar #4.

## 8. CLAUDE.md Check
- [ ] `xlsx` → Key Technologies list.
- [ ] `createStudentsBatch` extended (kolom lengkap + chunking) → note `database-operations.md`.
- [ ] Pola Excel import → 1-line `architecture-patterns.md` kalau reusable (import guru nanti).

## 9. Commit message template
```
feat(siswa): bulk import students via Excel with full columns (fixes #112)

Add Excel upload path to batch import: downloadable template with all
student columns, client-side xlsx parse + validation, ringkas preview,
commit via extended createStudentsBatch. Org via Step1Config (not Excel).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
