# Egress Cycle Sebelumnya — 7 Jun–7 Jul 2026

Breakdown aktivitas siklus billing **sebelumnya** (7 Jun→7 Jul), pelengkap [`egress-daily-users.md`](egress-daily-users.md) (siklus berjalan 7-10 Jul). Sumber: `activity_logs.page_path` (tanggal UTC). Egress = bytes/view × frekuensi. Semua traffic ini jalan di **kode PRA-optimasi** (fix sm-5jzd/2fux/euox baru 11 Jul).

> Grafik dashboard siklus ini puncak **560MB** (24 Jun). Dashboard = MB egress; tabel di sini = page-view (proxy volume). Keduanya sejalan: hari view banyak = hari MB tinggi.

## Egress harian — 30 hari (7 Jun–6 Jul)

| Hari (UTC) | User | View | Presensi | Detail | Laporan | Siswa | Home | Catatan |
|-----------|------|------|----------|--------|---------|-------|------|---------|
| 07 Jun | 28 | 645 | 320 | 2 | 74 | 83 | 145 | tinggi (laporan+siswa banyak) |
| 08 Jun | 33 | 474 | 285 | 1 | 32 | 21 | 109 | |
| 09 Jun | 25 | 355 | 196 | 0 | 30 | 22 | 90 | |
| 10 Jun | 30 | 500 | 265 | 8 | 48 | 27 | 137 | |
| 11 Jun | 24 | 310 | 134 | 0 | 21 | 15 | 131 | |
| 12 Jun | 27 | 381 | 189 | 0 | 33 | 25 | 115 | |
| 13 Jun | 24 | 419 | 213 | 4 | 28 | 33 | 115 | |
| 14 Jun | 11 | 94 | 31 | 1 | 10 | 13 | 27 | sepi (Sabtu/libur?) |
| 15 Jun | 30 | 438 | 284 | 3 | 16 | 26 | 86 | |
| 16 Jun | 21 | 296 | 164 | 2 | 12 | 28 | 73 | |
| **17 Jun** | 29 | **759** | **505** | 3 | 49 | 45 | 143 | **spike presensi** |
| 18 Jun | 20 | 270 | 167 | 1 | 9 | 9 | 79 | |
| 19 Jun | 13 | 174 | 109 | 1 | 11 | 10 | 35 | |
| 20 Jun | 8 | 141 | 76 | 1 | 12 | 10 | 32 | |
| 21 Jun | 5 | 17 | 10 | 0 | 0 | 1 | 6 | hampir kosong |
| **22 Jun** | 27 | 632 | **462** | 0 | 13 | 46 | 105 | **spike** |
| **23 Jun** | 37 | 726 | 443 | 12 | 39 | 61 | 145 | **spike** |
| **24 Jun** | 34 | **962** | **566** | 0 | 72 | 64 | 224 | **PUNCAK cycle (560MB)** |
| **25 Jun** | **40** | 692 | 270 | 10 | **79** | 84 | 199 | **spike, user terbanyak (40)** |
| 26 Jun | 24 | 251 | 103 | 4 | 18 | 41 | 62 | |
| 27 Jun | 17 | 319 | 211 | 1 | 28 | 17 | 60 | |
| 28 Jun | 18 | 203 | 133 | 1 | 8 | 7 | 47 | |
| 29 Jun | 33 | 421 | 211 | 7 | 26 | 27 | 117 | |
| 30 Jun | 29 | 515 | 322 | 6 | 23 | 66 | 78 | |
| 01 Jul | 27 | 369 | 240 | 1 | 18 | 21 | 86 | |
| 02 Jul | 28 | 397 | 236 | 1 | 29 | 37 | 91 | |
| 03 Jul | 19 | 600 | 182 | 7 | 16 | **95** | 187 | siswa-list tinggi |
| 04 Jul | 14 | 144 | 81 | 1 | 5 | 19 | 28 | sepi |
| 05 Jul | 15 | 153 | 74 | 2 | 10 | 14 | 44 | sepi |
| **06 Jul** | 26 | **821** | 345 | 1 | 39 | **93** | 248 | **spike (siswa+home besar)** |

**Pola:** presensi konsisten mesin volume utama (≈50-60% view tiap hari). Spike (17, 22-25 Jun, 06 Jul) = hari-hari banyak guru input presensi barengan (kemungkinan jelang deadline/akhir bulan/awal semester). Puncak **24 Jun (962 view, 566 presensi, 560MB)**.

## Biang egress hari-hari spike (per-user)

### 24 Jun — PUNCAK (962 view, 34 user)
Tersebar **banyak guru**, bukan satu orang:

| User | Role | View | Presensi | Laporan | Home |
|------|------|------|----------|---------|------|
| PJ Generus Haurbuyut (`haurbuyut_generus`) | teacher | 127 | 65 | 9 | 46 |
| PJ Generus Sukamanah 1 (`sukamanah1_generus`) | teacher | 116 | 77 | **31** | 6 |
| Admin Kelompok Brangsong (`brangsong_admin`) | admin | 63 | 31 | 3 | 19 |
| PJ Generus Kertamanah (`kertamanah_generus`) | teacher | 56 | 33 | 1 | 12 |
| PJ Generus Bojong (`bojong_generus`) | teacher | 56 | 21 | 7 | 21 |
| PJ Generus Cidawolong (`cidawolong_generus`) | teacher | 51 | 34 | 1 | 10 |
| *(+ muara 48, ciwidey2 46, brangsong_kelompok 37, tki 36, superadmin 35, burujul 34, junti 30, brangsong2 29 …)* | | | | | |

### 25 Jun — user terbanyak (40 user, laporan 79)
| User | Role | View | Presensi | Laporan |
|------|------|------|----------|---------|
| PJ Generus Cimaung (`cimaung_generus`) | teacher | 60 | 19 | 7 |
| PJ Generus Cipicung Barat (`cipbar_generus`) | teacher | 50 | 15 | 6 |
| PJ Generus Dayeuhkolot (`dayeuhkolot_generus`) | teacher | 47 | 17 | 6 |
| PJ Generus Pongporang (`pongporang_generus`) | teacher | 45 | 26 | 1 |
| PJ Generus Soreang 2 (`soreang2_generus`) | teacher | 37 | 9 | **11** |

### 23 Jun (726 view, 37 user) & 22 Jun (632 view)
Puncak **sebaran**: 22 Jun `bansel2_mudamudi` 117 view (86 presensi) dominan; 23 Jun rata (burujul 50, ciwidey2 47, warlob_mudamudi 46, munjul 44 …) — belasan guru 30-50 view.

### 06 Jul (821 view) — dua akun brangsong dominan
| User | Role | View | Presensi | Siswa | Home |
|------|------|------|----------|-------|------|
| PJ Kelompok Brangsong (`brangsong_kelompok`) | teacher | **190** | 109 | 16 | 52 |
| Admin Kelompok Brangsong (`brangsong_admin`) | admin | 107 | 42 | 17 | 36 |
| PJ Muda Mudi Bandung Selatan 2 (`bansel2_mudamudi`) | teacher | 99 | 31 | 16 | 17 |
| Admin Daerah Kendal (`kendal_daerah_admin`) | admin | 92 | 12 | 17 | 26 |

## User TERATAS se-cycle (7 Jun–7 Jul)

| # | User | Role | Total view | Presensi | Detail | Laporan | Hari aktif |
|---|------|------|-----------|----------|--------|---------|-----------|
| 1 | PJ Generus Ciwidey 2 (`ciwidey2_generus`) | teacher | **763** | 423 | 0 | 44 | 21 |
| 2 | PJ Kelompok Brangsong (`brangsong_kelompok`) | teacher | 623 | 338 | 0 | 30 | 13 |
| 3 | Admin Kelompok Brangsong (`brangsong_admin`) | admin | 552 | 293 | 0 | 11 | 18 |
| 4 | PJ Generus Junti (`junti_generus`) | teacher | 525 | 384 | 0 | **69** | 15 |
| 5 | PJ Generus Burujul (`burujul_generus`) | teacher | 495 | 348 | 0 | 28 | 22 |
| 6 | PJ Muda Mudi Warlob (`warlob_mudamudi`) | teacher | 438 | 234 | **19** | 26 | 21 |
| 7 | PJ Generus Dayeuhkolot (`dayeuhkolot_generus`) | teacher | 397 | 132 | 3 | 29 | 16 |
| 8 | PJ Muda Mudi Bandung Selatan 2 (`bansel2_mudamudi`) | teacher | 392 | 255 | 0 | 8 | 12 |
| 9 | PJ Generus Soreang 2 (`soreang2_generus`) | teacher | 367 | 237 | 2 | 43 | 18 |
| 10 | PJ Generus Cipicung Timur (`ciptim_generus`) | teacher | 366 | 194 | 0 | 30 | 18 |

*(11-15: haurbuyut 341, cipbar 323, pongporang 308, warlob2_mudamudi 252, bojong 245)*

## Kesimpulan cycle 7 Jun–7 Jul

1. **Bukan penyalahguna tunggal.** Puncak 24 Jun (560MB) tersebar ke belasan guru 30-127 view. Egress = **banyak guru × presensi harian**, bukan satu akun.
2. **`/presensi` mesin utama** — 40-60% view tiap hari. Persis halaman yang fix **sm-2fux** targetkan (buang `student_snapshot`+`description`/row).
3. **`/laporan` penyumbang bytes/view** — lonjak di 25 Jun (79), 07 Jun (74), 24 Jun (72). Target **sm-5jzd**.
4. **Spike = musiman** (jelang deadline/akhir bulan). 24-25 Jun & 06 Jul = hari input massal. Egress bakal spike lagi tiap siklus di tanggal serupa → fix bytes/view makin penting biar spike tak mahal.
5. **Detail-presensi masih kecil di cycle ini** (mayoritas 0-12/hari) — beban detail-presensi baru naik di 10 Jul (pongporang 26×). Fitur makin dipakai → sm-euox tepat waktu.

**Implikasi:** siklus lama sudah **mepet pola jebol** murni dari volume presensi (puncak 560MB/hari). Tanpa fix bytes/view, siklus berikut dengan pola sama = risiko lewat 5GB. Fix menyerang **biaya per-view** supaya volume tinggi (yang tak bisa/tak mau dikurangi — guru wajib input presensi) tak lagi mahal.

## Cara refresh

Query harian + per-user: sama seperti [`egress-daily-users.md`](egress-daily-users.md), ganti rentang tanggal ke `2026-06-07` s/d `2026-07-07`. Total per-user se-cycle: group by user tanpa `date_trunc`, order `total_views desc`.
