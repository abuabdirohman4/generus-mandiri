# Bandung Selatan 2 — Status Naik Kelas

> Data per 2026-07-21 (dari DB self-host VM). Tahun ajaran 2026/2027.
> "Belum wizard" = PJ kelompok itu sendiri belum menjalankan wizard naik kelas
> (belum ada `grade_promotion_logs` yang dibuat oleh PJ kelompok tersebut).

**Belum wizard: 1 kelompok** (semua sudah terima notifikasi)

## Belum jalankan naik kelas

| Kelompok | Desa | Total Siswa |
|---|---|---|
| TKI | Sayati | 26 |

## Update hari ini (2026-07-21)

Kelompok yang **baru selesai** hari ini:

| Kelompok | Desa | Sudah naik | Waktu |
|---|---|---|---|
| Palasari | Baleendah | 13 siswa | 03:54 UTC |
| Manggahang | Baleendah | 7 siswa | 04:58–05:00 UTC |
| Cibaduyut | Sayati | 31 siswa | rekonstruksi DB (manual) |

## Catatan kelompok dengan anomali

- **Cibaduyut** — PJ edit kelas manual satu-satu (via `/users/siswa`) sebelum fitur naik kelas rilis. Kelas sudah benar. Diperbaiki via DB: insert 29 enrollment 2026/2027 + 31 `grade_promotion_logs` (from = kelas satu level di bawah, promoted_at = 2026-06-27). Modal blocking PJ sudah di-dismiss.
- **TKI** — 26 siswa, belum ada satu pun yang dinaikkan.
- **Cijulang** — TIDAK masuk daftar belum. PJ Cijulang sudah jalankan wizard (1 siswa muda-mudi), sisanya sengaja tidak dinaikkan (keputusan PJ).
- **PPBA & PPMRJ** (Desa Pondok) — dikecualikan: kelompok kosong (0 siswa aktif).

## Status seluruh BS2 (snapshot)

| Kelompok | Desa | Total | Naik | Status |
|---|---|---|---|---|
| Cipicung Barat | Baleendah | 39 | 41 | ✅ |
| Cipicung Timur | Baleendah | 73 | 40 | ✅ |
| Dayeuhkolot | Baleendah | 83 | 21 | ✅ |
| Kertamanah | Baleendah | 60 | 38 | ✅ |
| Manggahang | Baleendah | 15 | 7 | ✅ |
| Munjul | Baleendah | 47 | 35 | ✅ |
| Palasari | Baleendah | 20 | 13 | ✅ |
| Cijulang | Banjaran | 14 | 1 | ✅ |
| Cimaung | Banjaran | 23 | 5 | ✅ |
| Nambo | Banjaran | 46 | 23 | ✅ |
| Pangalengan | Banjaran | 21 | 8 | ✅ |
| Barujati | Ciparay | 49 | 37 | ✅ |
| Cidawolong | Ciparay | 51 | 28 | ✅ |
| Cipaku | Ciparay | 68 | 34 | ✅ |
| KBSI | Ciparay | 49 | 33 | ✅ |
| Bojong | Majalaya | 37 | 24 | ✅ |
| Haurbuyut | Majalaya | 40 | 25 | ✅ |
| Muara | Majalaya | 61 | 47 | ✅ |
| Pongporang | Majalaya | 49 | 42 | ✅ |
| Sukamanah 1 | Majalaya | 10 | 7 | ✅ |
| Sukamanah 2 | Majalaya | 46 | 45 | ✅ |
| Sukamanah 3 | Majalaya | 58 | 43 | ✅ |
| Burujul | Sayati | 69 | 7 | ✅ |
| Cibaduyut | Sayati | 95 | 31 | ✅ |
| Kopo Permai | Sayati | 28 | 17 | ✅ |
| Margahayu Kencana | Sayati | 39 | 32 | ✅ |
| Margahayu Permai | Sayati | 29 | 13 | ✅ |
| Permata Kopo | Sayati | 36 | 18 | ✅ |
| **TKI** | **Sayati** | **26** | **0** | **⏳** |
| Ciwidey 1 | Soreang | 19 | 9 | ✅ |
| Ciwidey 2 | Soreang | 53 | 47 | ✅ |
| Junti | Soreang | 28 | 15 | ✅ |
| Soreang 1 | Soreang | 35 | 22 | ✅ |
| Soreang 2 | Soreang | 44 | 37 | ✅ |
| Warlob 1 | Soreang | 190 | 41 | ✅ |
| Warlob 2 | Soreang | 60 | 20 | ✅ |

> Catatan: Beberapa kelompok kolom "Naik" melebihi "Total" karena total dihitung siswa aktif sekarang,
> sedangkan log naik bisa termasuk siswa yang sudah diarsip/pindah setelah proses naik kelas.

### Catatan metrik

- **UI notifikasi "Selesai / Belum ditindak"** melacak `is_dismissed` (PJ menutup notifikasi), BUKAN apakah wizard selesai. Tidak andal untuk memantau progress naik kelas.
- Listing ini pakai `grade_promotion_logs` yang dibuat PJ kelompok sendiri — lebih akurat.
- Data dari DB self-host VM (ubuntu@43.133.130.123), bukan Supabase cloud.
