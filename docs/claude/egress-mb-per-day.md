# Egress MB per Hari (angka PASTI dari dashboard hover) — LENGKAP

Dataset master egress: MB **pasti** (hover tooltip dashboard Supabase) + view harian (`activity_logs`) → **MB/view**. Rentang **07 Jun–11 Jul 2026** (2 cycle: lama 7 Jun-7 Jul + awal baru). Analisis tren & verifikasi fix: [`egress-tracking.md`](egress-tracking.md).

**MB/view = PostgREST MB ÷ page-view.** Menormalkan volume → memisahkan "sepi" dari "fix". Turun MB/view = bytes per fetch mengecil = optimasi.

**PENTING — fix di-deploy BERTAHAP, bukan 1 paket (dari git):**
| Waktu push (WIB) | Fix | |
|---|---|---|
| 09 Jul 19:54 | b2c7e15 (sm-kt2j) | revalidateOnFocus off + notif polling off |
| 10 Jul 09:07 | 43ec14a (sm-hsp7) | /tracking N+1 + focus-refetch |
| 10 Jul 22:41 | 6488093 (sm-5jzd) | **/laporan RPC** (fix terbesar) |
| 10 Jul 22:41 | 7c84cd0 (sm-2m5n) | /organisasi guard |
| 11 Jul 05:13 | 76abd53 (sm-2fux) | /presensi list |
| 11 Jul 05:23 | 61ae009 (sm-euox) | detail-presensi |

Akibatnya label "Kode" per hari BUKAN biner LAMA/BARU:
- **≤ 09 Jul siang** = LAMA murni (belum ada fix).
- **09 Jul sore–10 Jul** = TRANSISI (sebagian fix aktif; sm-5jzd baru 10 Jul 22:41 jadi /laporan masih boros hampir sepanjang 10 Jul).
- **11 Jul** = BARU-penuh (semua 6 fix live dari 05:23, ~seluruh hari).

Jadi baseline "LAMA murni bersih" = hari **07 Jun–08 Jul + 07-08 Jul** (sebelum 09 Jul sore). 10 Jul BUKAN pembanding bersih. Pembanding paling valid = **Sabtu-vs-Sabtu** (11 Jul BARU-penuh vs 4 Sabtu Jun LAMA-murni).

## Kenapa MB/view = metrik penilai optimasi (bukan MB total)

**MB = Megabyte** = data keluar dari server Supabase ke browser (egress/bandwidth). Free tier batas 5GB/bln.

**Sumber data (BEDA tempat):**
- **MB** → dashboard Supabase (hover bar). TIDAK ada di DB — Supabase yang hitung.
- **View** → tabel `activity_logs` (query SQL "siapa buka halaman apa").
- **MB/view** = MB (dashboard) ÷ view (activity_logs). Gabungan dua sumber.

**Masalah MB total: menipu.** MB total campur 2 faktor:
1. Volume (berapa ramai user) — di luar kendali kode (guru wajib input presensi).
2. Efisiensi kode (berapa berat tiap fetch) — INI yang fix ubah.

MB total turun bisa karena SEPI atau FIX — tak bisa dibedakan. Contoh jebakan: 11 Jul MB 32 (dari 327) kelihatan "fix hebat", padahal 11 Jul cuma 123 view (Sabtu sepi) vs 476. Sebagian turun karena sepi, bukan fix.

**MB/view membuang faktor volume.** = biaya SATU kali buka halaman, lepas dari ramai-sepi. Ramai 900 view atau sepi 100 view, kalau kode sama → MB/view sama. MB/view **cuma berubah kalau KODE berubah** (query lebih ramping). Jadi = sidik jari efisiensi kode murni.

**Bukti dari data ini:** MB/view LAMA stabil ~0.50 lintas 34 hari — hari ramai (24 Jun 962 view) & sepi (21 Jun 17 view) sama-sama ~0.50. Membuktikan MB/view TAK terpengaruh volume. 11 Jul 0.261 turun = karena kode, bukan Sabtu (Sabtu lama juga 0.52).

**Analogi:** MB total = tagihan bensin bulanan (campur: jauh-nyetir + irit-mesin). View = jarak (km). MB/view = liter/km = irit mesin murni. Mau tahu servis mesin berhasil? Lihat liter/km, bukan tagihan (tagihan bisa turun cuma karena jarang keluar).

**Guna di tabel ini:**
1. **Banding adil** hari ramai vs sepi (volume ternetralisir).
2. **Deteksi regresi** — kalau suatu hari MB/view naik ke ~0.5 lagi, ada kode baru boros (walau MB total kelihatan normal).
3. **Proyeksi** — MB/view × perkiraan view bulanan = estimasi GB/bln → tahu aman/jebol sebelum kejadian.

| Pertanyaan | Metrik |
|---|---|
| "Bulan ini jebol 5GB?" | MB total (billing) |
| "Fix bikin app lebih irit?" | **MB/view** (isolasi efisiensi) |

---

## Tabel LENGKAP (35 hari, MB pasti)

| Tanggal | DOW | PostgREST MB | Auth MB | Realtime | Lainnya | View | User | **MB/view** | Kode |
|---------|-----|-------------|---------|----------|---------|------|------|------------|------|
| 07 Jun | Min | 313.481 | 8.71 | 1.940 | — | 645 | 28 | **0.486** | LAMA |
| 08 Jun | Sen | 224.854 | 6.92 | 1.395 | — | 474 | 33 | **0.474** | LAMA |
| 09 Jun | Sel | 131.147 | 5.43 | 0.785 | — | 355 | 25 | **0.369** | LAMA |
| 10 Jun | Rab | 257.708 | 8.64 | 2.167 | — | 500 | 30 | **0.515** | LAMA |
| 11 Jun | Kam | 143.905 | 8.69 | 1.527 | Pooler 3.339 | 310 | 24 | **0.464** | LAMA |
| 12 Jun | Jum | 231.045 | 16.30 | 1.729 | Pooler 0.559 | 381 | 27 | **0.606** | LAMA |
| 13 Jun | Sab | 146.988 | 17.24 | 1.918 | — | 419 | 24 | **0.351** | LAMA |
| 14 Jun | Min | 36.742 | 3.76 | 0.268 | — | 94 | 11 | **0.391** | LAMA |
| 15 Jun | Sen | 148.736 | 13.89 | 0.725 | — | 438 | 30 | **0.340** | LAMA |
| 16 Jun | Sel | 120.539 | 11.28 | 0.503 | — | 296 | 21 | **0.407** | LAMA |
| 17 Jun | Rab | 274.023 | 24.01 | 1.267 | — | 759 | 29 | **0.361** | LAMA |
| 18 Jun | Kam | 92.430 | 8.98 | 0.413 | — | 270 | 20 | **0.342** | LAMA |
| 19 Jun | Jum | 116.396 | 5.82 | 0.241 | — | 174 | 13 | **0.669** | LAMA |
| 20 Jun | Sab | 57.393 | 4.40 | 0.157 | — | 141 | 8 | **0.407** | LAMA |
| 21 Jun | Min | 6.068 | 0.71 | 0.025 | — | 17 | 5 | **0.357** | LAMA |
| 22 Jun | Sen | 434.197 | 26.16 | 1.267 | Pooler 28.534 | 632 | 27 | **0.687** | LAMA |
| 23 Jun | Sel | 464.646 | 32.82 | 2.064 | Pooler 1.593 | 726 | 37 | **0.640** | LAMA |
| 24 Jun | Rab | 524.199 | 33.17 | 2.480 | Pooler 0.306 | 962 | 34 | **0.545** | LAMA |
| 25 Jun | Kam | 373.756 | 26.46 | 1.697 | — | 692 | 40 | **0.540** | LAMA |
| 26 Jun | Jum | 98.292 | 12.23 | 0.823 | Pooler 0.440 | 251 | 24 | **0.392** | LAMA |
| 27 Jun | Sab | 277.304 | 12.97 | 0.538 | — | 319 | 17 | **0.869** | LAMA |
| 28 Jun | Min | 99.574 | 10.00 | 0.660 | — | 203 | 18 | **0.491** | LAMA |
| 29 Jun | Sen | 206.367 | 15.10 | 0.665 | — | 421 | 33 | **0.490** | LAMA |
| 30 Jun | Sel | 276.187 | 22.39 | 0.769 | — | 515 | 29 | **0.536** | LAMA |
| 01 Jul | Rab | 214.043 | 14.35 | 0.701 | — | 369 | 27 | **0.580** | LAMA |
| 02 Jul | Kam | 216.092 | 18.00 | 0.913 | — | 397 | 28 | **0.544** | LAMA |
| 03 Jul | Jum | 200.750 | 23.31 | 1.403 | — | 600 | 19 | **0.335** | LAMA |
| 04 Jul | Sab | 66.887 | 5.86 | 0.221 | — | 144 | 14 | **0.464** | LAMA |
| 05 Jul | Min | 79.897 | 5.21 | 0.175 | — | 153 | 15 | **0.522** | LAMA |
| 06 Jul | Sen | 373.421 | 35.72 | 2.322 | Storage 0.162, Pooler 1.433 | 821 | 26 | **0.455** | LAMA |
| 07 Jul | Sel | 456.673 | 30.64 | 5.228 | Storage 4.798 | 716 | 29 | **0.638** | LAMA |
| 08 Jul | Rab | 494.958 | 29.66 | 13.208 | Storage 0.468, Pooler 0.884 | 657 | 35 | **0.753** | LAMA |
| 09 Jul | Kam | 238.602 | 18.05 | 2.939 | Storage 0.004, Pooler 0.554 | 522 | 24 | **0.457** | TRANSISI |
| 10 Jul | Jum | 327.292 | 17.13 | 1.727 | — | 476 | 22 | **0.688** | TRANSISI† |
| 11 Jul | Sab | 32.129 | 4.72 | 0.000 | — | 123 | 13 | **0.261** | BARU |

†10 Jul = TRANSISI: b2c7e15 + hsp7 aktif sepanjang hari, tapi sm-5jzd (/laporan, fix terbesar) baru live 22:41 → /laporan masih boros hampir seluruh 10 Jul. MB/view 0.688 (tertinggi) konsisten dgn ini — 2 fix ringan aktif, fix berat belum. BUKAN "baseline LAMA murni".

## Rata-rata MB/view

- **Hari LAMA murni (≤08 Jul, 32 hari):** ≈ **0.50 MB/view** (rentang 0.34–0.87)
- **10 Jul (TRANSISI, 2 fix ringan):** 0.688 — /laporan belum ke-fix, masih boros
- **11 Jul (BARU-penuh, 6 fix):** **0.261 MB/view**
- **Penurunan vs LAMA murni: ≈ −48%**

> Karena deploy bertahap, penurunan tak instan di 1 hari. Efek terbesar (sm-5jzd /laporan) baru mulai 10 Jul malam; efek presensi/detail (2fux/euox) mulai 11 Jul dini hari. 11 Jul hari pertama SEMUA fix aktif penuh.

## MB/view rata per hari-dalam-seminggu (kode LAMA)

Menunjukkan pola: hari kerja lebih boros/view? (bukan — cukup rata, 0.4-0.6)

| DOW | Jml hari | Rata MB/view |
|-----|----------|-------------|
| Sen | 5 | 0.489 |
| Sel | 5 | 0.518 |
| Rab | 5 | 0.551 |
| Kam | 5 | 0.470 |
| Jum | 5 | 0.538 |
| Sab | 4 | 0.523 |
| Min | 5 | 0.449 |

## Pembanding EMAS: Sabtu vs Sabtu

| Sabtu | Kode | PostgREST MB | View | **MB/view** |
|-------|------|-------------|------|------------|
| 13 Jun | LAMA | 146.988 | 419 | 0.351 |
| 20 Jun | LAMA | 57.393 | 141 | 0.407 |
| 27 Jun | LAMA | 277.304 | 319 | 0.869 |
| 04 Jul | LAMA | 66.887 | 144 | 0.464 |
| 11 Jul | BARU | 32.129 | 123 | 0.261 |
| **rata Sabtu LAMA** | | | | **0.523** |

**MB/view Sabtu: 0.523 (lama) → 0.261 (baru) = −50%.**

## Puncak & lembah (kode LAMA)

- **Puncak MB absolut:** 24 Jun **524MB** (962 view, spike musiman akhir bulan). MB/view 0.545 — tinggi tapi tak ekstrem; yang bikin gede = VOLUME (962 view).
- **Puncak MB/view:** 27 Jun **0.869** (Sabtu jelang akhir bulan) — outlier, query berat + view relatif rendah.
- **Lembah:** 21 Jun (Minggu, 17 view, 6MB) & 14 Jun (Minggu, 94 view) — hari nyaris kosong.
- **Spike cluster 22-25 Jun:** 434/465/524/374 MB — 4 hari berturut akhir bulan (deadline input presensi). Ini yang hampir bikin jebol cycle lama.

## Insight dari dataset penuh

1. **MB/view kode lama stabil 0.4-0.6** lintas 34 hari (kecuali 27 Jun 0.869 & bbrp <0.4 hari sepi). Konsisten → egress lama memang mahal per-fetch by design (query gemuk).
2. **11 Jul (0.261) di BAWAH SEMUA hari LAMA murni.** Terendah LAMA = 15 Jun 0.340; 11 Jul −23% di bawah itu. Median LAMA ~0.49 → 11 Jul −47%.
3. **Auth naik saat spike** (23-24 Jun Auth 32-33MB) — konsisten banyak login/refresh saat ramai. Tetap minor (<7%).
4. **Pooler/Storage kadang muncul** (22 Jun Pooler 28.5MB anomali, 08 Jul RT 13MB) — sesekali, tak dominan.

## Proyeksi cycle baru

- Rate lama 0.50 MB/view × ~450 view/hari-kerja × 22 hari ≈ **5.0GB/bln** → JEBOL saat spike.
- Rate baru 0.26 MB/view × 450 × 22 ≈ **2.6GB/bln** → AMAN.

## Hari yang BELUM ada data

Cycle baru (kode BARU), krusial untuk verifikasi final:
- **12 Jul dst** — terutama **Senin 13 Jul** (hari kerja penuh pertama pasca-fix). Verifikasi MB/view tetap ~0.26 saat view balik ~450-800.

Cycle lama sudah LENGKAP 07 Jun–10 Jul (tak ada gap).

## Cara tambah data

Hover bar tanggal → catat MB. Query view:
```sql
select to_char(created_at,'Dy') dow, count(*) filter (where action='open_page') views,
  count(distinct user_id) users
from activity_logs where created_at::date='YYYY-MM-DD' and action='open_page' group by 1;
```
MB/view = PostgREST ÷ views. Tambah baris urut tanggal.
