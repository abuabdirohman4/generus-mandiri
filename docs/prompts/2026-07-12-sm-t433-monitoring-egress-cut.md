# Prompt Antigravity — sm-t433: Optimasi egress Monitoring (SWR + trim material_items + chunk .in)

**Issue:** sm-t433 (P1) · **Mode:** TDD (jalur A) · **Rilis:** semester depan, frekuensi guru TINGGI
**Konteks:** `docs/claude/egress-audit-phase2.md` (§ Monitoring) + `docs/claude/egress-cost-optimization.md` + register #t433.

## Tujuan

Halaman `/monitoring` bakal jadi salah satu yang paling sering dipakai guru semester depan (input progress hafalan/materi tiap pertemuan). Sekarang polanya boros — perbaiki SEBELUM dipakai massal, kalau tidak egress melonjak begitu guru mulai input rutin.

## Tiga biang (terverifikasi di `monitoring/actions/monitoring.ts`)

1. **`material_items(*)` fat diduplikasi tiap baris progress.**
   - `getStudentProgress` (baris ~100): `*, material_item:material_items(*), teacher:profiles(id, full_name)`.
   - `getClassProgress` (baris ~167): `*, material_item:material_items(*)` `.in('student_id', studentIds)`.
   - `material_items` punya `content` (HTML materi, fat) + `description`. Di grid progress cuma butuh **nama item** (+ mungkin type/kategori). Kelas 30 siswa × N materi = 30N baris, tiap baris bawa `content` penuh → payload meledak saat data ribuan (semester depan).

2. **`.in('student_id', studentIds)` tanpa chunk** (baris ~171) → overflow URL kalau kelas/scope >100 siswa → data null senyap (pola `postgrest-in-url-overflow`, memory). WAJIB chunk 100 (pakai `fetchInBatches`/`batchFetching.ts`).

3. **`page.tsx` (76KB) TANPA SWR** — 7 raw `useEffect` + panggil server action langsung. Tiap mount/ganti-kelas = full refetch semua, tak ada dedup/cache. Beda dari halaman lain yang pakai SWR hook.

## RED → GREEN → REFACTOR

### A. Trim `material_items(*)` (dampak bytes terbesar)
- `getStudentProgress` + `getClassProgress`: `material_item:material_items(*)` → `material_item:material_items(id, name, material_type_id)` (+ `material_type:material_types(id, name)` kalau grid render jenis). **BUANG `content` + `description`** dari progress query.
- `*` di `select('*, ...')` (kolom `student_material_progress`): eksplisitkan ke kolom yang dirender — `id, student_id, material_item_id, nilai, status, semester, academic_year_id, created_at, updated_at, teacher_id` (cek grid). JANGAN `*`.
- Kalau butuh detail materi (content) saat klik item → lazy-fetch `getMaterialItem(id)` (sudah ada di materi actions), JANGAN inline di grid.

### B. Chunk `.in('student_id', ...)`
- `getClassProgress`: bungkus fetch progress pakai chunk-100 (`fetchInBatches` di `src/lib/utils/batchFetching.ts` — lihat pola `fetchAttendanceLogsInBatches`). Merge hasil.
- Test: kelas >100 siswa tetap kembalikan progress lengkap (bukan null/kosong).

### C. Bungkus read pakai SWR (page.tsx)
- Ganti 7 raw `useEffect`+server-action jadi SWR hook(s): key per `(classId, academicYearId, semester)`, `revalidateOnFocus:false`, `dedupingInterval` panjang (2-5min), `keepPreviousData:true` biar ganti kelas mulus.
- Mutasi progress (`updateMaterialProgress`/`bulkUpdateProgress`) → `mutate()` key terkait, JANGAN refetch semua 7.
- SWR key sentralisasi di `@/lib/swr.ts` (ikut pola existing).
- **Hati-hati:** page.tsx besar — refactor bertahap, jangan ubah logic bisnis progress (hanya bungkus data-fetching-nya). Pastikan urutan/loading state tetap.

## Test (WAJIB RED dulu)
- Unit: select string `getStudentProgress`/`getClassProgress` TIDAK mengandung `content`; mengandung `name`. (memory `postgrest-select-not-typechecked` — select string tak ter-typecheck.)
- Unit: `getClassProgress` dgn >100 studentIds → chunk (mock verifikasi ≥2 batch), hasil merge lengkap.
- E2E/smoke: buka `/monitoring`, pilih kelas → grid progress tampil nama materi + nilai; ganti kelas → tak full-refetch semua (SWR dedup); input progress → tersimpan + grid update via mutate (bukan reload semua).

## Acceptance
- [ ] Progress query tak fetch `content`/`description` materi (verify Network: response `student_material_progress` tanpa field content).
- [ ] `.in('student_id')` chunked — kelas >100 siswa tak kehilangan data.
- [ ] Ganti kelas tak refetch 7 query penuh (SWR cache).
- [ ] Input progress tetap jalan + grid update.
- [ ] `npm run test:run` + `type-check` hijau.

## JANGAN
- Jangan ubah logic perhitungan/aturan progress — hanya data-fetching (select trim + chunk + SWR wrap).
- Jangan sentuh materi (issue terpisah sm-wcj2), tapi BOLEH reuse `getMaterialItem` utk lazy content.
- Jangan hapus admin scope guard (getTeacherAllowedClasses) — tetap.