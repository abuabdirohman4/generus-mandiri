# Egress per Hari — Siapa & Ngapain (7–10 Jul 2026)

Rincian aktivitas user per hari (dari `activity_logs.page_path`, tanggal **UTC**) untuk 4 hari pertama siklus billing (07→07). Tujuan: siapa yang pakai, halaman apa, dan **apa yang bikin egress tinggi**. Sumber & metodologi: [`egress-register.md`](egress-register.md) + skill `egress-analysis`.

> **Halaman diambil dari kolom `page_path`, BUKAN api-log signature.** Egress = bytes/view × frekuensi. `/presensi` menang frekuensi; `/laporan` + detail-presensi menang bytes/view.

## Egress harian (dashboard, PostgREST saja)

| Hari (UTC) | PostgREST | User aktif | Page view | Sifat |
|-----------|-----------|-----------|-----------|-------|
| 07 Jul | ~530MB | 29 | 716 | Volume user asli TINGGI (bukan cuma dev) |
| 08 Jul | ~540MB | 35 | 657 | Volume user asli TERTINGGI |
| 09 Jul | kecil | 24 | 522 | Lebih sepi |
| 10 Jul | ~323MB | 22 | 471 | User asli penuh — baseline pembanding fix |

**Koreksi asumsi lama:** 07/08 tinggi **BUKAN semata dev-session**. Data menunjukkan user asli ber-volume besar (bansel2_mudamudi 209 view, brangsong 148–213 view). Dev-session mungkin menambah, tapi biang utama = **banyak guru × banyak view presensi**.

## Biang egress (kenapa tinggi)

1. **Volume `/presensi` besar** — 07: 393 view, 08: 357, 09: 248, 10: 229 (halaman paling sering dibuka). Sebelum fix, tiap load list bawa `student_snapshot` jsonb + `description` tiap row. Frekuensi × bytes = penyumbang terbesar. → fix **sm-2fux**.
2. **Detail-presensi berat/view** — 10 Jul, `pongporang_generus` buka **26×** dalam sesi (query gemuk `topic`+`description` tiap row tiap bulan). → fix **sm-euox**.
3. **`/laporan` berat/view** — dibuka rutin (07: 33, 08: 34, 10: 48), tiap load dulu fetch meeting 2× + `student_snapshot` jsonb cuma buat `.length`. → fix **sm-5jzd**.
4. **`/home` + `/users/siswa` list** — volume sedang, list siswa all-rows (2198 baris) belum dipaginasi. → **sm-uxnv** (deferred).

## Per-user per-hari (≥15 view/hari)

### 07 Jul — 29 user, 716 view

| User | Role | View | Presensi | Detail | Laporan | Siswa | Home |
|------|------|------|----------|--------|---------|-------|------|
| PJ Muda Mudi Bandung Selatan 2 (`bansel2_mudamudi`) | teacher | **209** | 90 | 0 | 3 | 34 | 30 |
| PJ Kelompok Brangsong (`brangsong_kelompok`) | teacher | 148 | **122** | 0 | 0 | 2 | 24 |
| PJ Muda Mudi Warlob (`warlob_mudamudi`) | teacher | 50 | 36 | 0 | 4 | 1 | 8 |
| PJ Generus Burujul (`burujul_generus`) | teacher | 40 | 30 | 0 | 2 | 5 | 3 |
| PJ Generus Cijulang (`cijulang_generus`) | teacher | 34 | 13 | 1 | 6 | 5 | 5 |
| Admin Daerah Bandung Selatan 2 (`bansel2_admin`) | admin | 28 | 0 | 0 | 2 | 6 | 8 |
| PJ Generus Muara (`muara_generus`) | teacher | 25 | 19 | 0 | 0 | 0 | 6 |
| Guru Kelas 6 (`warlob_kelas6`) | teacher | 24 | 14 | 0 | 4 | 1 | 3 |
| PPK Warlob (`warlob_ppk`) | teacher | 22 | 8 | 0 | 7 | 1 | 6 |
| Guru Kelas 1 (`warlob_kelas1`) | teacher | 19 | 11 | 0 | 2 | 0 | 6 |
| PJ Generus Dayeuhkolot (`dayeuhkolot_generus`) | teacher | 15 | 0 | 0 | 0 | 5 | 6 |

**Biang hari ini:** `bansel2_mudamudi` (209 view) + `brangsong_kelompok` (122 presensi) — dua guru volume besar di halaman presensi.

### 08 Jul — 35 user, 657 view

| User | Role | View | Presensi | Detail | Laporan | Siswa | Home |
|------|------|------|----------|--------|---------|-------|------|
| PJ Kelompok Brangsong (`brangsong_kelompok`) | teacher | **213** | **160** | 0 | 2 | 4 | 46 |
| PJ Muda Mudi Warlob 2 (`warlob2_mudamudi`) | teacher | 54 | 30 | 1 | 7 | 3 | 13 |
| Admin Daerah Bandung Selatan 2 (`bansel2_admin`) | admin | 43 | 1 | 0 | 0 | 10 | 15 |
| Guru Kelas 6 (`warlob_kelas6`) | teacher | 34 | 17 | 0 | 2 | 2 | 10 |
| PJ Generus Cijulang (`cijulang_generus`) | teacher | 34 | 12 | 5 | 4 | 5 | 2 |
| PJ Generus Ciwidey 2 (`ciwidey2_generus`) | teacher | 34 | 13 | 0 | 6 | 4 | 11 |
| PJ Generus Burujul (`burujul_generus`) | teacher | 33 | 28 | 0 | 0 | 0 | 5 |
| PJ Acara CAI Bandung Selatan 2 (`bansel2_cai`) | teacher | 25 | 5 | 0 | 0 | 11 | 9 |
| PJ Muda Mudi Bandung Selatan 2 (`bansel2_mudamudi`) | teacher | 24 | 10 | 0 | 0 | 3 | 6 |
| PJ Generus Pongporang (`pongporang_generus`) | teacher | 15 | 10 | 0 | 4 | 0 | 1 |
| PJ Kelompok Warlob (`warlob_kelompok`) | teacher | 15 | 7 | 0 | 1 | 1 | 6 |

**Biang hari ini:** `brangsong_kelompok` sendirian **213 view / 160 presensi** — dominan. Egress harian tertinggi siklus.

### 09 Jul — 24 user, 522 view

| User | Role | View | Presensi | Detail | Laporan | Siswa | Home |
|------|------|------|----------|--------|---------|-------|------|
| PJ Kelompok Brangsong (`brangsong_kelompok`) | teacher | **167** | 95 | 1 | 4 | 13 | 49 |
| Admin Daerah Kendal (`kendal_daerah_admin`) | admin | 80 | 16 | 0 | 3 | 12 | 32 |
| Generus Mandiri (`superadmin`) | superadmin | 38 | 2 | 0 | 1 | 2 | 19 |
| PJ Muda Mudi Warlob 2 (`warlob2_mudamudi`) | teacher | 33 | 21 | 0 | 0 | 0 | 12 |
| PJ Generus Muara (`muara_generus`) | teacher | 27 | 23 | 0 | 0 | 0 | 4 |
| PJ Generus Burujul (`burujul_generus`) | teacher | 27 | 21 | 0 | 2 | 1 | 3 |
| PJ Generus Ciwidey 2 (`ciwidey2_generus`) | teacher | 21 | 15 | 0 | 1 | 0 | 5 |
| PJ Generus Cipicung Barat (`cipbar_generus`) | teacher | 19 | 7 | 0 | 2 | 3 | 7 |
| Admin Kelompok Brangsong (`brangsong_admin`) | admin | 15 | 3 | 0 | 0 | 5 | 3 |

**Biang hari ini:** `brangsong_kelompok` (167) + `kendal_daerah_admin` (80, admin scope lebar).

### 10 Jul — 22 user, 471 view (baseline pembanding fix)

| User | Role | View | Presensi | Detail | Laporan | Siswa | Home |
|------|------|------|----------|--------|---------|-------|------|
| PJ Kelompok Brangsong (`brangsong_kelompok`) | teacher | **84** | 57 | 0 | 0 | 2 | 22 |
| PJ Generus Pongporang (`pongporang_generus`) | teacher | 58 | 10 | **26** | 3 | 8 | 5 |
| PJ Generus Soreang 2 (`soreang2_generus`) | teacher | 53 | 41 | 0 | 4 | 2 | 6 |
| PJ Generus Margahayu Permai (`maper_generus`) | teacher | 50 | 39 | 0 | 7 | 1 | 3 |
| PPG Daerah Kendal (`kendal_ppg`) | teacher | 40 | 5 | 2 | 5 | 5 | 11 |
| Admin Daerah Kendal (`kendal_daerah_admin`) | admin | 32 | 22 | 0 | 1 | 0 | 7 |
| PJ Generus Muara (`muara_generus`) | teacher | 21 | 10 | 0 | 3 | 0 | 8 |
| PJ Muda Mudi Warlob 2 (`warlob2_mudamudi`) | teacher | 20 | 13 | 0 | 0 | 0 | 7 |
| PJ Generus Ciwidey 2 (`ciwidey2_generus`) | teacher | 18 | 8 | 0 | 0 | 2 | 8 |
| Guru Kelas 4 & 5 (`warlob_kelas5`) | teacher | 18 | 2 | 7 | 8 | 0 | 1 |
| PJ Generus Sukamanah 1 (`sukamanah1_generus`) | teacher | 15 | 2 | 0 | 6 | 2 | 5 |

**Biang hari ini:** `brangsong_kelompok` (84 presensi lagi) + `pongporang_generus` (**26 detail-presensi** — query paling gemuk, target sm-euox).

## Ringkasan — siapa yang paling boros

| User | Pola | Halaman berat | Kena fix |
|------|------|---------------|----------|
| `brangsong_kelompok` | **Konsisten #1 tiap hari** (148/213/167/84 view), mayoritas presensi | `/presensi` list | sm-2fux |
| `bansel2_mudamudi` | Spike 07 Jul (209 view) | `/presensi` + siswa list | sm-2fux + sm-uxnv |
| `pongporang_generus` | 10 Jul buka detail-presensi 26× | detail-presensi | sm-euox |
| `kendal_daerah_admin` | Admin scope lebar (80 view 09 Jul) | mix presensi+home | — (scope wajar) |

**Inti:** egress didorong **beberapa guru super-aktif** (terutama `brangsong_kelompok`) yang buka `/presensi` puluhan–ratusan kali/hari, plus lonjakan detail-presensi (`pongporang`) dan laporan. Bukan penyalahguna tunggal — pemakaian intensif normal. Fix menyerang **bytes/view** halaman-halaman itu supaya volume tinggi tak lagi mahal.

## Cara refresh tabel ini

Query per-user per-hari (sesuaikan rentang tanggal UTC), threshold `>= 15` view:

```sql
select date_trunc('day', al.created_at)::date as hari,
  p.full_name, p.username, p.role,
  count(*) filter (where al.action='open_page') as views,
  count(*) filter (where al.page_path like '/presensi%') as presensi,
  count(*) filter (where al.page_path like '/users/siswa/%/presensi') as detail_pres,
  count(*) filter (where al.page_path = '/laporan') as laporan,
  count(*) filter (where al.page_path = '/users/siswa') as siswa_list,
  count(*) filter (where al.page_path = '/home') as home
from activity_logs al left join profiles p on p.id = al.user_id
where al.created_at >= 'YYYY-MM-DD 00:00:00+00' and al.created_at < 'YYYY-MM-DD 00:00:00+00'
  and al.action='open_page'
group by 1,2,3,4 having count(*) filter (where al.action='open_page') >= 15
order by 1, views desc;
```
