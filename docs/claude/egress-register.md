# Egress Register — Generus Mandiri

Catatan hidup soal masalah egress Supabase, akar penyebab, fix, dan snapshot aktivitas harian. Supabase Free tier menagih **5GB egress/bulan** (siklus billing **07 → 07**, proyek ini). Egress = ukuran payload PostgREST × frekuensi, BUKAN ukuran DB. Aturan umum: [`egress-cost-optimization.md`](egress-cost-optimization.md). Cara monitoring: [`egress-monitoring-inventory.md`](egress-monitoring-inventory.md).

**Sumber data untuk investigasi:**
- **"Query apa / berapa egress"** → dashboard Supabase (breakdown per-source) + MCP `get_logs` service `api` (URL REST mentah, ~100 entry terakhir, tidak bisa difilter waktu).
- **"Halaman apa / user siapa"** → `activity_logs.page_path` (ditulis `PageViewTracker` → `trackPageView` → `logActivity`). Halaman ada di **kolom `page_path`**, BUKAN `metadata` (metadata `{}` kosong). JANGAN tebak halaman dari signature query api-log — komponen shared (DataFilter org-picker) memicu query org-tree dari banyak halaman. Lihat memory `api-logs-vs-tracking-page-path`.

---

## Register Masalah / Fix

| # | Masalah | Ditemukan | Akar penyebab | Dampak egress | Fix | Status | Issue |
|---|---------|-----------|---------------|---------------|-----|--------|-------|
| 1 | Global `revalidateOnFocus: true` — tiap window focus refetch full payload semua hook yang mounted | 09 Jul 2026 | default SWR + opt-in per-hook di hook yang sering mount | TINGGI (dominan di hari spike) | `swr.ts` → `revalidateOnFocus: false`; opt-in per-hook dihapus | ✅ shipped (sm-lmi3, commit b2c7e15) | sm-kt2j |
| 2 | Notifikasi SWR polling tiap 60s per tab | 09 Jul 2026 | `refreshInterval: 60000` untuk fitur cadence ~bulanan | SEDANG (2 fetch/menit/tab) | `useNotifications.ts` → `refreshInterval: 0`, `revalidateOnFocus:false` | ✅ shipped (sm-lmi3) | sm-kt2j |
| 3 | Middleware `getUser()` jalan saat Next.js `<Link>` prefetch | 09 Jul 2026 | matcher terlalu lebar; prefetch memicu validasi auth | RENDAH-SEDANG (Auth ~5%) | middleware skip prefetch/`_next/data` | ✅ shipped (sm-lmi3) | sm-kt2j |
| 4 | `/tracking` N+1 + badai refetch realtime | ~09 Jul 2026 | `.in()` per-user tanpa chunk + realtime tanpa debounce | SEDANG | chunk-100 `.in()`, split 2-effect, debounce 3s | ✅ shipped | sm-hsp7 |
| 5 | `/laporan`: `meetings` di-fetch DUA KALI + `student_snapshot` jsonb ke-egress cuma buat `.length` + `title` tak terpakai | 10 Jul 2026 | double fetch meeting (fetchMeetingsForDateRange + WithFullDetails); jsonb gemuk per row | TINGGI (~100MB per load report full-scope) | RPC `get_report_meetings` (1 call, return `snapshot_count` bukan jsonb); logic pakai `snapshot_count` | ✅ kode selesai, nunggu verify | sm-5jzd (#134) |
| 6 | `/organisasi` tanpa server access guard | 10 Jul 2026 | page `use client`, cuma sidebar yang sembunyikan; akses URL langsung = render + fetch org-tree | RENDAH (ternyata tidak diakses hari ini — lihat snapshot) | server guard di `organisasi/layout.tsx`: non-admin → redirect `/home` | ✅ shipped | sm-2m5n |
| 7 | Detail-presensi (`/users/siswa/<id>/presensi`): `meetings!inner` fetch `topic`+`description` per row (cuma dipakai di modal), `revalidateOnFocus:true`, refetch per-bulan | 10 Jul 2026 | field gemuk tiap row; focus refetch; filter client-side | TINGGI (#1 sumber traffic asli — 35 view detail hari ini) | trim query list (buang topic+description), lazy-fetch `getMeetingDetail` saat modal buka, `revalidateOnFocus:false` | ✅ kode selesai, nunggu verify | sm-euox (#135) |
| 8 | `/presensi` list (`fetchMeetingsByClass`): `student_snapshot` jsonb + `description` di-fetch tiap row list meeting, padahal cuma dipakai saat EDIT pertemuan (modal) | 10 Jul 2026 | field gemuk tiap row list; git konfirmasi sm-kt2j hanya optimasi setting global, query ini tak tersentuh | POTENSI TINGGI (frekuensi TERTINGGI — 215 view/hari, bytes/fetch belum dioptimasi) | trim query list (buang snapshot+description, keep topic), lazy-fetch `getMeetingById` saat modal edit | ✅ kode selesai, nunggu verify | sm-2fux (#136) |
| — | LIST siswa fetch all-rows (2198 baris, tanpa pagination) | 09 Jul 2026 | `fetchAllStudents` buat render list | SEDANG | pagination server-side `.range()` + narrow select | ⏳ open (deferred) | sm-uxnv |
| — | Traffic dev-session menggelembungkan egress (hot-reload, testing manual pakai akun admin scope lebar) | 22-25 Jun + 07-08 Jul | ngoding langsung ke DB prod live | SEDANG (2 dari 4 hari siklus ini) | Supabase lokal (Docker+CLI) | ⏳ open (P3) | sm-csvk (#133) |

---

## Snapshot Aktivitas Harian — 10 Jul 2026

Egress (per ~20:54 WIB, hari ke-4 siklus): **1.71 GB / 5 GB (34%)**. PostgREST ~95%, Auth ~5%, Realtime <1%.

**Ini traffic user ASLI, bukan satu orang** — asumsi awal ("1 user") ternyata salah.

### Total (dari `activity_logs`, hari UTC)
- **22 user aktif** (semua `teacher` kecuali 2 `admin`)
- **445 page view**
- Breakdown per jenis halaman:

> **Catatan penting:** kolom "Bobot egress" di bawah adalah **estimasi kualitatif**, BUKAN MB terukur. Egress total = view × bytes/view. `/presensi` (215 view) menang di **frekuensi**, `/laporan`/detail menang di **bytes/view**. Untuk ranking pasti perlu ukur bytes/view via api-logs. `/presensi` tinggi karena frekuensi, DAN query-nya belum dioptimasi (sm-2fux).

| Halaman | View | Bobot egress (estimasi) | Catatan |
|---------|------|--------------|---------|
| `/presensi*` | 215 | SEDANG-TINGGI (frekuensi tertinggi) | list meeting fetch student_snapshot+description tiap row — BELUM dioptimasi (sm-2fux). Batch attendance chunk 3. |
| `/home` | 95 | RENDAH | landing |
| `/laporan` | 48 | **TINGGI per view** | report berat (fix sm-5jzd nunggu verify) |
| `/users/siswa/<id>/presensi` (detail) | 35 | **TINGGI per view** | query paling gemuk (sm-euox direncanakan) |
| `/users/siswa` (list) | 31 | SEDANG | all-rows (sm-uxnv) |
| `/users/siswa/<id>/biodata` | 8 | RENDAH | |
| `/organisasi` | **0** | — | konfirmasi tak ada yang buka hari ini |
| `/dashboard` | 0 | — | |

### User teratas berdasarkan aktivitas
| User | Role | Event | Detail-presensi | Laporan | Presensi | Window (WIB) |
|------|------|-------|-----------------|---------|----------|--------------|
| PJ Kelompok Brangsong (`brangsong_kelompok`) | teacher | 82 | 0 | 0 | 61 | 14:14–18:51 |
| PJ Generus Margahayu Permai (`maper_generus`) | teacher | 69 | 0 | 7 | 58 | 18:47–19:41 |
| PJ Generus Soreang 2 (`soreang2_generus`) | teacher | 68 | 0 | 4 | 56 | 16:19–21:35 |
| PJ Generus Pongporang (`pongporang_generus`) | teacher | 60 | **26** | 3 | 13 | 15:08–22:50 |
| PPG Daerah Kendal (`kendal_ppg`) | teacher | 43 | 2 | 5 | 7 | 14:13–15:14 |
| Admin Daerah Kendal (`kendal_daerah_admin`) | admin | 37 | 0 | 1 | 25 | 10:51–22:34 |
| Guru Kelas 4 & 5 (`warlob_kelas5`) | teacher | 18 | 7 | 8 | 2 | 19:57–20:30 |

*(+15 user lain, masing-masing <30 event)*

### Baca situasi hari ini
- **Egress didorong oleh luasnya pemakaian, bukan satu penyalahguna.** 22 guru kerja presensi harian (215 view `/presensi`) + lookup report/detail.
- **`/presensi` pemimpin volume** (215 view) — layak audit egress lanjutan walau per-view lebih ringan dari laporan/detail.
- **`/laporan` (48) + detail-presensi (35)** halaman berat per-view — persis dua fix yang sedang jalan (sm-5jzd, sm-euox). Target tepat.
- **Proyeksi:** di rate pemakaian asli (~245MB/hari di hari non-dev), ~7.4GB/bln → **akan lewat 5GB**. Setelah sm-5jzd + sm-euox landing, dua halaman terberat per-view menyusut → proyeksi balik ke bawah 5GB. Verifikasi 2-3 hari bersih setelah keduanya shipped.

---

## Cara refresh snapshot ini

Jalankan (sesuaikan tanggal ke hari UTC target):

```sql
-- Breakdown per-user + per-jenis-halaman
select al.user_id, p.full_name, p.username, p.role,
  count(*) as total_events,
  count(*) filter (where al.page_path like '/users/siswa/%/presensi') as detail_presensi,
  count(*) filter (where al.page_path = '/laporan') as laporan,
  count(*) filter (where al.page_path like '/presensi%') as presensi,
  min(al.created_at) as first_seen, max(al.created_at) as last_seen
from activity_logs al left join profiles p on p.id = al.user_id
where al.created_at >= '2026-07-10 00:00:00+00' and al.action='open_page'
group by 1,2,3,4 order by total_events desc;
```

Lalu baca angka egress GB dari dashboard Supabase (Settings → Usage → Egress) dan tambahkan section snapshot bertanggal baru di atas.
