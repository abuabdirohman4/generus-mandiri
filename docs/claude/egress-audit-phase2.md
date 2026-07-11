# Egress Audit Fase 2 — Halaman Bertabel Lain + Materi/Monitoring

Setelah biang utama cycle Jul ketutup (presensi, laporan, detail-presensi, list siswa via sm-uxnv), audit ini menyisir **halaman bertabel lain** yang BELUM di-audit, plus dua fitur yang **rilis semester depan & bakal sering dipakai guru**: **Materi** dan **Monitoring**.

**Prinsip audit:** egress = payload bytes × frekuensi. Yang mahal BUKAN "banyak baris" saja — tapi kombinasi: (a) all-rows fetch (`range(0,9999)`, batch-1000 loop), (b) nested join `*` bertingkat (bawa kolom fat: content/description/jsonb), (c) tanpa cache/dedup (raw `useEffect`+server-action refetch tiap mount/navigasi), (d) frekuensi pakai tinggi.

> **Metode sama seperti fase 1:** normalisasi MB/view, fix biang spesifik per halaman (BUKAN pagination global buta). Pagination hanya tepat utk "banyak baris"; utk "kolom fat" fix-nya trim select + lazy-fetch.

## Ringkasan temuan (prioritas by risiko × frekuensi-depan)

| Halaman | Pola boros | Frekuensi | Risiko | Fix tepat |
|---|---|---|---|---|
| **Monitoring** ⚠️ | 7 query `Promise.all` on mount + `getClassProgress` per kelas, semua raw `useEffect`+server-action (TANPA SWR/cache → refetch tiap mount/navigasi). `getStudentProgress`/`getClassProgress` pakai `*, material_item:material_items(*)` — material_items(*) fat & diduplikasi per baris progress. `.in('student_id', ids)` overflow >100. | **TINGGI** (guru pakai tiap update progress, semester depan) | 🔴 **P1** | (1) bungkus fetch pakai SWR (dedup+revalidateOnFocus:false), (2) trim `material_items(*)` → kolom dirender saja, (3) chunk `.in` >100, (4) jangan refetch semua 7 query tiap ganti kelas |
| **Materi** ⚠️ | `fetchAllItemsWithTypes` `.range(0,9999)` = up to 10000 row TRIPLE-nested `*` (`material_items* → material_types* → material_categories*`). `getAllItemsWithClassMappings` batch-1000 loop. `fetchAllItems/Categories/Types` semua `select('*')` all-rows. | **TINGGI** (guru buka materi tiap ngajar, semester depan) | 🔴 **P1** | (1) trim triple-`*` → kolom render, (2) paginasi/lazy `fetchAllItemsWithTypes` (jarang butuh 10000 sekaligus di layar), (3) fetch per-kelas (`fetchItemsForClass`) bukan all-items saat mungkin |
| **Kegiatan** | 3× `select('*')` (activity_logs/types/levels). | Sedang | 🟡 P2 | trim select ke kolom render |
| **Rapot** | 3× `select('*')` (queries 123/425/433) — rapot_data bisa jsonb besar. | Sedang (musiman, akhir semester) | 🟡 P2 | trim select, cek kolom jsonb |
| **Kelas** | `masters select('*')`, mappings 657 row (di bawah 1000, aman). | Rendah | 🟢 P3 | trim select `masters` saja |
| **Guru** | Tak ada all-rows/nested-* mencolok. | Rendah | 🟢 OK | — |
| **Naik-kelas** (rilis besok) | Mutation only (upsert/update/delete/insert). TAK ada fat select / nested `*`. SUDAH chunk `.in()` + `.range()`. List siswa reuse jalur list-siswa (di-fix sm-uxnv). | Musiman (akhir th ajaran) | 🟢 **AMAN RILIS** | — (tak ada aksi) |
| **Onboarding** | `select('id')` saja, mutation-heavy, sekali-pakai per kelompok. | Sangat rendah (1×) | 🟢 OK | — |
| **Notifikasi** | `count head:true` (no payload). Polling sudah dimatikan fase 1. Fan-out narrow. | Rendah (bulanan) | 🟢 OK | — |
| **Dashboard** | `fetchAllRecords` batch-1000, TAPI sudah SWR-cached (`dashboardStore`). | Sedang | 🟢 P3 | opsional: trim kolom batch |
| **Settings/Tahun-ajaran** | `select('*')` tapi tabel kecil (profile 1 row, academic_years sedikit). | Rendah | 🟢 OK | negligible |
| **Home** | Tak ada fetch (QuickActions statis). | — | 🟢 OK | — |
| **Laporan/Presensi/Tracking** | Sudah di-fix fase 1 (sm-5jzd/2fux/euox). | — | ✅ | done |

## Kesimpulan sweep menyeluruh

Semua 18 route (admin) sudah disisir. **Hanya 2 halaman berisiko TINGGI: Monitoring + Materi** (keduanya rilis semester depan, frekuensi guru tinggi, biang = nested-`*` fat + no-cache/all-rows). Sisanya aman atau minor.

**Penting utuk 2 rilis dekat:**
- **Naik-kelas (rilis BESOK): AMAN** — sudah egress-aware (chunk `.in`, `.range`, mutation-only, tak ada fat select). Tak perlu ditahan.
- **Materi + Monitoring (rilis semester depan): PERLU FIX P1 dulu** (sm-wcj2, sm-t433) sebelum dipakai massal, kalau tidak egress bakal melonjak begitu guru mulai input progress/buka materi rutin.

## Detail — Monitoring (paling berisiko semester depan)

`src/app/(admin)/monitoring/actions/monitoring.ts` + `page.tsx` (76KB).

**Masalah kritis:**
1. **Tanpa SWR sama sekali.** `page.tsx` pakai raw `useEffect` (7 buah) + panggil server action langsung. Tak ada dedup, tak ada cache, `revalidateOnFocus` default off tapi tiap mount/navigasi = full refetch. Beda dari halaman lain yang pakai SWR hook. Ganti kelas → `getClassProgress` refetch penuh.
2. **`getClassProgress`** (line 100-186): `student_material_progress` `.select('*, material_item:material_items(*))` `.in('student_id', studentIds)`. `material_items(*)` (punya kolom content/deskripsi materi) **di-inline & diduplikasi tiap baris progress**. Kelas 30 siswa × N materi = 30N baris, tiap baris bawa material_items lengkap → payload meledak.
3. **`getStudentProgress`** (line 89-116): `*, material_item:material_items(*), teacher:profiles(id,full_name)` — dua `*` nested.
4. **`.in('student_id', studentIds)`** — overflow URL kalau kelas/scope >100 siswa (pola `postgrest-in-url-overflow`).
5. **`.select('*')`** line 443 (belum ditelusuri kolomnya — cek).

**Fix diusulkan (jadikan bd P1, sebelum rilis semester depan):**
- Bungkus semua read monitoring pakai SWR hook (key per kelas/tahun/semester, `revalidateOnFocus:false`, `dedupingInterval` panjang). Mutasi progress pakai `mutate()`.
- Trim `material_items(*)` → hanya `id, name` (nama materi utk render); JANGAN bawa content/deskripsi ke grid progress. Kalau butuh detail materi, lazy-fetch on-click.
- Materi metadata (nama item) di-fetch SEKALI (reference cache), progress query cuma bawa `student_id, material_item_id, nilai, done` (line 584 sudah pola bagus — jadikan standar).
- Chunk `.in('student_id', ...)` >100 (pakai batchFetching).

## Detail — Materi

`src/app/(admin)/materi/actions/items/queries.ts`.

**Masalah:**
- `fetchAllItemsWithTypes` `.range(0, 9999)` triple-nested `*` — dipakai utk grid materi. Bawa 10000 row × (item* + type* + category*) sekali load.
- `getAllItemsWithClassMappings` batch-1000 loop = sengaja bypass limit → tarik SEMUA mapping.
- `fetchItemsForClass` (line 130): juga triple-nested `*` tapi per-kelas (lebih baik) — pastikan halaman pakai INI, bukan all-items, saat konteksnya satu kelas.

**Fix diusulkan (bd P1):**
- Trim `select('*')` bertingkat → kolom yang MateriTable/MateriContentView render saja. `material_types(*)`/`material_categories(*)` biasanya cuma butuh `id, name`.
- `fetchAllItemsWithTypes`: kalau grid materi tampil per-kelas/per-kategori, ganti ke fetch ter-scope (`fetchItemsForClass`), bukan 10000-row global. Kalau memang butuh semua utk admin, paginasi/virtualize.
- Audit apakah `getAllItemsWithClassMappings` (batch-1000) benar-benar dipakai on-mount atau hanya utk aksi tertentu (export/bulk-mapping) — kalau on-mount, lazy-kan.

## Kenapa BUKAN pagination global

Tiap halaman biangnya beda (lihat tabel). Monitoring & materi biangnya **nested-`*` fat + no-cache**, bukan "banyak baris polos" → pagination saja tak cukup. Big-bang refactor semua DataTable = risiko regresi tinggi (search/filter/scope beda tiap halaman) tanpa jaminan hemat. Pendekatan benar: **per halaman, fix biang spesifiknya** (trim select / lazy-fetch / SWR cache / chunk `.in`), ukur MB/view.

## Urutan kerja disarankan
1. **Monitoring** (P1) — SEBELUM rilis semester depan; frekuensi pakai bakal tinggi.
2. **Materi** (P1) — sama, rilis semester depan.
3. Kegiatan/Rapot (P2) — trim select, tak mendesak.
4. Kelas (P3) — kosmetik.

## Terkait
- `egress-cost-optimization.md` — aturan fix.
- `egress-mb-per-day.md` — data MB/view fase 1.
- `egress-register.md` — tabel masalah/fix.
- Fase 1 done: sm-5jzd (laporan), sm-2fux (presensi), sm-euox (detail-presensi), sm-uxnv (list siswa).
