# Egress Register — Generus Mandiri

Catatan hidup soal masalah egress Supabase, akar penyebab, fix, dan snapshot aktivitas harian. Supabase Free tier menagih **5GB egress/bulan** (siklus billing **07 → 07**, proyek ini). Egress = ukuran payload PostgREST × frekuensi, BUKAN ukuran DB. Aturan umum: [`egress-cost-optimization.md`](egress-cost-optimization.md). Cara monitoring: [`egress-monitoring-inventory.md`](egress-monitoring-inventory.md). Rincian per-user per-hari: [`egress-daily-users.md`](egress-daily-users.md).

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
| 5 | `/laporan`: `meetings` di-fetch DUA KALI + `student_snapshot` jsonb ke-egress cuma buat `.length` + `title` tak terpakai | 10 Jul 2026 | double fetch meeting (fetchMeetingsForDateRange + WithFullDetails); jsonb gemuk per row | TINGGI (~100MB per load report full-scope) | RPC `get_report_meetings` (1 call, return `snapshot_count` bukan jsonb); logic pakai `snapshot_count` | ✅ shipped (61ae009 batch) | sm-5jzd (#134) |
| 6 | `/organisasi` tanpa server access guard | 10 Jul 2026 | page `use client`, cuma sidebar yang sembunyikan; akses URL langsung = render + fetch org-tree | RENDAH (ternyata tidak diakses hari ini — lihat snapshot) | server guard di `organisasi/layout.tsx`: non-admin → redirect `/home` | ✅ shipped | sm-2m5n |
| 7 | Detail-presensi (`/users/siswa/<id>/presensi`): `meetings!inner` fetch `topic`+`description` per row (cuma dipakai di modal), `revalidateOnFocus:true`, refetch per-bulan | 10 Jul 2026 | field gemuk tiap row; focus refetch; filter client-side | TINGGI (#1 sumber traffic asli — 35 view detail hari ini) | trim query list (buang topic+description), lazy-fetch `getMeetingDetail` saat modal buka, `revalidateOnFocus:false` | ✅ shipped (61ae009) | sm-euox (#135) |
| 8 | `/presensi` list (`fetchMeetingsByClass`): `student_snapshot` jsonb + `description` di-fetch tiap row list meeting, padahal cuma dipakai saat EDIT pertemuan (modal) | 10 Jul 2026 | field gemuk tiap row list; git konfirmasi sm-kt2j hanya optimasi setting global, query ini tak tersentuh | POTENSI TINGGI (frekuensi TERTINGGI — 215 view/hari, bytes/fetch belum dioptimasi) | trim query list (buang snapshot+description, keep topic), lazy-fetch `getMeetingById` saat modal edit | ✅ shipped (76abd53) | sm-2fux (#136) |
| 10 | Auth flood: tiap navigasi/render page 10+ `auth/v1/user` + `profiles?...permissions` beruntun | 11 Jul 2026 | `getCurrentUserProfile` (accessControlServer) dipanggil 48 consumer; 1 page-load fan-out ke banyak action/guard → tiap satu re-fetch getUser()+profiles tanpa dedup | SEDANG (Auth 11% = 21.8MB/hari 11 Jul) | wrap `getCurrentUserProfile` dgn React `cache()` — dedup dalam 1 request render pass (reset tiap request, auth tetap tervalidasi 1×/request, no stale). Follow-up: `getCurrentUserId` (21 direct getUser caller) | ⏳ open | sm-lm8q |
| 9 | `/presensi/<meetingId>` detail (`useMeetingAttendance`): tiap buka/fokus refetch 3 server-action fat (`getMeetingById` + `getAttendanceByMeeting` nested kelompok/desa/classes/student_classes + `getStudentsFromSnapshot` nested) padahal halaman SUDAH pakai realtime push (`useAttendanceRealtime`) | 11 Jul 2026 | `revalidateOnFocus:true` + `revalidateIfStale:true` di hook DETAIL — redundant vs realtime; nested join gemuk tak dirender; guru fokus keluar-masuk app puluhan kali/sesi input presensi | **TINGGI** (satu guru buka 1 meeting 117 siswa 50×/hari = ~6-9MB dari 1 meeting; biang PostgREST hari ngajar) | `revalidateOnFocus:false` + `revalidateIfStale:false` + dedup 30s→5min (realtime handle live); trim nested `getAttendanceByMeeting`/`getStudentsFromSnapshot` ke kolom yang dirender saja | ⏳ open | sm-TBD |
| — | LIST siswa fetch all-rows (2198 baris, tanpa pagination) | 09 Jul 2026 | `fetchAllStudents` buat render list | SEDANG | pagination server-side `.range()` + narrow select | ⏳ open (deferred) | sm-uxnv |
| — | Traffic dev-session menggelembungkan egress (hot-reload, testing manual pakai akun admin scope lebar) | 22-25 Jun + 07-08 Jul | ngoding langsung ke DB prod live | SEDANG (2 dari 4 hari siklus ini) | Supabase lokal (Docker+CLI) | ⏳ open (P3) | sm-csvk (#133) |

---

## Snapshot Aktivitas Harian — 11 Jul 2026

Egress dashboard (per ~06:00 WIB 12 Jul, hari ke-5 siklus): **1.932 GB / 5 GB (39%)**. Split hari 11 Jul (UTC, bar belum tutup penuh, ~22 dari 24 jam): PostgREST **160.986 MB (80.8%)**, Auth **21.818 MB (11%)**, Realtime **16.285 MB (8.2%)**, Storage 161 KB.

### Verdict: ON-TRACK JEBOL, bukan aman
- 1.932 GB / 5 hari = **~386 MB/hari** rata → proyeksi **~11.6 GB/bulan = 2.3× over 5GB**.
- MB/view **turun** vs 10 Jul (fix fase-1 kerja): 11 Jul 161MB/472view = **0.34 MB/view** vs 10 Jul 327MB/476view = **0.69 MB/view** (**-2×**). Views sebanding → penurunan ASLI dari fix, bukan sekadar Sabtu sepi.
- TAPI 0.34 MB/view × ~470 view/hari-ngajar masih ~160MB/hari, dan hari biasa tetap ratusan MB → **belum cukup masuk budget 167MB/hari**. Butuh potong lagi (biang #9).

### Total (dari `activity_logs`, hari UTC 11 Jul)
- **23 user aktif** (mayoritas `teacher`, 2 `admin`)
- **472 page view**

| Halaman | View | Users | Catatan |
|---------|------|-------|---------|
| `/home` | 115 | 21 | landing, ringan |
| `/presensi` (list) | 114 | 18 | sudah di-trim sm-2fux |
| `/presensi/<meetingId>` (detail) | ~70 | bbrp | **BIANG BARU (#9)** — satu meeting `8deaa725` (117 siswa) di-buka **50× oleh 1 guru** (majalaya). refetch-on-focus 3 query fat |
| `/users/siswa` (list) | 49 | 11 | sudah di-fix sm-uxnv (pagination) |
| `/laporan` | 22 | 11 | sudah di-fix sm-5jzd |
| detail-presensi siswa | 16 | bbrp | sudah di-fix sm-euox |

### User teratas
| User | Role | View | Halaman terberat |
|------|------|------|------------------|
| majalaya_mudamudi | teacher | 73 | **65× /presensi + buka meeting 8deaa725 50×** (input presensi 117 siswa) |
| pongporang_generus | teacher | 57 | 14 detail-presensi + 9 siswa_list |
| brangsong_kelompok | teacher | 44 | 16 presensi |
| kendal_ppg | teacher | 43 | 18 presensi |
| kendal_daerah_admin | admin | 40 | 18 home |

### Baca situasi
- **Fix fase-1 terbukti** (MB/view turun 2×). Tapi **biang bergeser**: setelah list-presensi (sm-2fux) & list-siswa (sm-uxnv) beres, sisa biang PostgREST = **halaman DETAIL meeting** (`useMeetingAttendance`), yang refetch-on-focus 3 query fat tiap guru keluar-masuk app saat input presensi — padahal realtime sudah kasih data live. → issue #9.
- Realtime 16MB (8.2%) = wajar (banyak guru online barengan Sabtu, WS presence + attendance push). BUKAN biang, jangan diutak-atik.
- Auth 21.8MB (11%) sedikit di atas normal — flood `auth/v1/user` + `profiles?...permissions` tiap navigasi (api-logs). Kandidat P2 (request-scoped auth cache, P1.2 plan lama) tapi bukan prioritas vs #9.

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

## Status Optimasi & Baseline Verifikasi — per 11 Jul 2026 (05:25 WIB)

**Semua 6 fix egress sudah di master** (di-push 11 Jul pagi). Rekap:

| Fix | Sasaran | Sifat | Commit |
|-----|---------|-------|--------|
| sm-kt2j/lmi3 | `revalidateOnFocus` global off + notif polling off + middleware prefetch skip | frekuensi ↓ | b2c7e15 |
| sm-hsp7 | `/tracking` N+1 chunk + realtime debounce | frekuensi+bytes ↓ | 43ec14a |
| sm-5jzd | `/laporan` — RPC `get_report_meetings` (return count, bukan jsonb; 1 fetch bukan 2) | bytes/view ↓↓ | 6488093 |
| sm-2m5n | `/organisasi` server guard (blok render+fetch non-admin) | akses tak sah ↓ | 7c84cd0 |
| sm-2fux | `/presensi` list — buang `student_snapshot`+`description`, lazy-fetch saat edit | bytes/view ↓ (× frekuensi tertinggi) | 76abd53 |
| sm-euox | detail-presensi — buang `topic`+`description`, lazy-fetch modal, focus-off | bytes/view ↓↓ (halaman terberat/view) | 61ae009 |

**BASELINE sebelum fix (dari dashboard, PostgREST saja):**
- 07 Jul ~530MB · 08 Jul ~540MB (dua hari **dev-session** — hot-reload + testing akun admin scope lebar, TIDAK representatif)
- 09 Jul kecil · **10 Jul 323MB** (hari user-asli penuh — 22 user, 471 view; ini baseline pembanding sebenarnya)
- Total periode per hari-4: **1.72 GB / 5 GB (34%)**

**PENTING:** fix sm-5jzd/2fux/euox baru di-push 11 Jul — **data 10 Jul (323MB) belum kena efeknya**. Semua bar dashboard s/d 10 Jul = KODE LAMA. Verifikasi hasil = bandingkan **10 Jul (323MB, kode lama, ~471 view) vs hari user-asli PERTAMA setelah 11 Jul** dengan jumlah view sebanding. Target: PostgREST MB/view turun jelas di halaman /laporan + detail-presensi + /presensi.

**Proyeksi:** di rate user-asli ~325MB/hari (kode lama) → ~9.7GB/bln → jebol. Fix menyasar 3 halaman terberat (laporan/detail/presensi) yang menyusun mayoritas bytes/view. Kalau turun ke ~170MB/hari user-asli → ~5.1GB/bln (mepet, tapi 07/08 dev-session tak terulang kalau pindah Supabase lokal — sm-csvk). Butuh 2-3 hari bersih pasca-11 Jul untuk angka pasti.

**Cara baca dashboard (jebakan UTC):** DB `now()` = UTC. 05:25 WIB 11 Jul = 22:25 UTC **10 Jul** — jadi "hari ini" di dashboard masih bar 10 Jul. Hari 11 Jul (UTC) baru mulai 07:00 WIB.

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
