# Bandung Selatan 2 — Status Naik Kelas

> Data per 2026-07-19 (setelah rollback Soreang 1). Tahun ajaran 2026/2027.
> "Belum wizard" = PJ kelompok itu sendiri belum menjalankan wizard naik kelas
> (belum ada `grade_promotion_logs` yang dibuat oleh PJ kelompok tersebut).

**Belum wizard: 9 kelompok** (semua sudah terima notifikasi)

## Belum jalankan naik kelas

| Kelompok | Desa |
|---|---|
| Soreang 1 | Soreang |
| Kertamanah | Baleendah |
| Manggahang | Baleendah |
| Palasari | Baleendah |
| Nambo | Banjaran |
| Burujul | Sayati |
| Cibaduyut | Sayati |
| TKI | Sayati |
| Sukamanah 1 | Majalaya |

### Catatan

- **Soreang 1** — sebelumnya dinaikkan Admin Desa Soreang (bukan PJ-nya), lalu **di-rollback** ke kondisi asal. PJ Soreang 1 perlu jalankan wizard sendiri (modal sudah muncul lagi).
- **Sukamanah 1** — di data ada 1 `grade_promotion_logs`, tapi dibuat **PJ Pongporang** (siswa muda-mudi Keysa yang ikut ngaji lintas-kelompok), BUKAN PJ Sukamanah 1. PJ Sukamanah 1 sendiri belum jalankan wizard untuk 12 siswanya. UI notifikasi "Belum ditindak" untuk kelompok ini **benar**.
- **Cijulang** — TIDAK masuk daftar. PJ Cijulang sudah mulai wizard (naikkan 1 siswa muda-mudi), sisanya sengaja tidak dinaikkan (keputusan PJ — tidak semua siswa wajib naik). Siswa yang tidak naik mayoritas sudah punya enrollment 2026/2027 (tidak ketinggalan tahun ajaran).
- **PPBA & PPMRJ** (Desa Pondok) — dikecualikan: tidak punya siswa (kelompok kosong).

### Catatan metrik

- **UI notifikasi "Selesai / Belum ditindak"** melacak `is_dismissed` (PJ menutup notifikasi), BUKAN apakah wizard selesai. Tidak andal untuk memantau progress naik kelas.
- Listing ini pakai `grade_promotion_logs` yang dibuat PJ kelompok sendiri — lebih akurat untuk "siapa yang belum jalankan wizard".
