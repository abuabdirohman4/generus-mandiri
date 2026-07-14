# Prompt: Fix HeadersOverflow — batch `.in()` di materiQueries.ts

Hand this to **Claude Code on the developer laptop** (local repo, normal PR flow).
Do NOT run this on the production VM. This is a code change; it reaches the VM later via the
normal `git push master` → CI → rsync → `pm2 reload` pipeline.

Full design + rationale: `docs/plans/2026-07-15-materiqueries-batch-in-headers-overflow.md`.
Read it first.

## Goal

Hilangkan `.in()` mentah berukuran besar yang bikin `UND_ERR_HEADERS_OVERFLOW` (URL
`?student_id=in.(...)` ~28KB untuk daerah 773 siswa). Ganti dengan util batch chunk-100.
Ini blocker Phase 2 self-host cutover — self-hosted PostgREST pakai URL filter yang sama dan
punya batas request-line/header sendiri.

## Read first

1. `docs/plans/2026-07-15-materiqueries-batch-in-headers-overflow.md` — plan (tabel per-baris,
   nuance compound-filter, helper baru).
2. `src/lib/utils/batchFetching.ts` — util yang sudah ada (`fetchInBatches`,
   `fetchStudentsInBatches`, `fetchAttendanceLogsInBatches`). Contoh pemakaian di
   `src/app/(admin)/laporan/actions/reports/queries.ts`.
3. `src/app/(admin)/laporan/actions/reports/materiQueries.ts` — target (16 `.in()` mentah).

## Steps

1. **Tambah helper `fetchInBatchesWithFilter()`** ke `batchFetching.ts` (kode lengkap ada di
   plan). Perlu karena 4 query `student_material_progress` memfilter DUA kolom sekaligus
   (`student_id` + `material_item_id`); `fetchInBatches` yang ada cuma chunk satu kolom.

2. **Konversi `.in()` di `materiQueries.ts`** sesuai tabel prioritas di plan:
   - 🔴 Wajib: 4× `.in('student_id', studentIds)` (L143, 325, 413, 506) — ini compound
     (bareng `.in('material_item_id', ...)`) → pakai `fetchInBatchesWithFilter`, chunk
     `student_id`, extra filter `material_item_id`.
   - 🟠 `.in('material_items.id', ...)` tunggal (L113, 133, 272) → `fetchInBatches`.
   - 🟢 `.in('class_master_id', ...)` (L98, 245, 311, 387, 483) — bounded kecil (jumlah kelas);
     lewati KECUALI kamu verifikasi bisa besar.

3. **Jaga semantik.** Hasil gabungan chunk harus == satu query besar (union baris). Tidak ada
   `LIMIT`/`ORDER BY` per-query yang rusak saat di-chunk (progress query tidak pakai limit).

## Guardrails

- **JANGAN hapus band-aid** `NODE_OPTIONS=--max-http-header-size=65536` di `ecosystem.config.js`
  (belt-and-suspenders, tetap dipertahankan).
- **JANGAN bypass RLS** — pakai `supabaseClient` yang sama; tiap chunk tetap kena policy.
- Sentuh hanya: `batchFetching.ts`, `materiQueries.ts`, (opsional) `queries.ts` L62/L154 kalau
  `classIds` terbukti besar. Tidak ada file lain.
- Alur normal PR. Jangan push dari VM.

## Verify (jalankan, jangan diklaim tanpa output)

1. `npm run type-check` — hijau.
2. `npm run test` — laporan materi (`reports/__tests__`) hijau; tambah test: gabungan chunk
   untuk array > chunkSize == hasil non-chunk.
3. E2E: Laporan → tab Materi untuk daerah ≥700 siswa aktif; semua sub-tab (bulanan, kumulatif,
   per-semester) render tanpa error.
4. DevTools/server log: nol `UND_ERR_HEADERS_OVERFLOW`; request terpecah jadi beberapa call
   `student_id=in.(...)` ≤100 id.

## Report back

- Helper baru + daftar call-site yang dikonversi (baris).
- `.in()` yang sengaja dilewat + alasan (bounded).
- Hasil type-check / test / e2e (output nyata).
- Konfirmasi band-aid header masih ada.

## Out of scope

- Tidak menyentuh alur self-host/PostgREST (itu Phase 2, prompt `sm-91yt-cutover-vm-phase2.md`).
- Tidak ubah skema DB atau query di luar file di atas.
