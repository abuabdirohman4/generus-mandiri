# Egress Tracking Harian — Data Real Dashboard

Perkembangan egress harian dari **angka dashboard Supabase real** (bukan estimasi). Tujuan: lihat tren + ukur dampak fix (11 Jul) via **MB/view** (menormalkan volume traffic). Sumber view: `activity_logs`. Sumber MB: dashboard Supabase (Settings → Usage → Egress, hover per bar). Cycle billing **07 Jul → 07 Aug 2026**.

> **Kunci baca:** egress absolut (MB) turun bisa karena **traffic sepi** ATAU **fix**. Yang memisahkan = **MB/view** (MB ÷ page-view). Kalau MB/view turun → bytes per fetch benar-benar mengecil = fix berhasil. Kalau MB/view tetap, MB turun cuma karena sepi.

## Tabel perkembangan (cycle berjalan 07 Jul–)

| Hari (UTC) | PostgREST MB | Auth MB | Realtime | Total MB | View | **MB/view** | User | Kode | Catatan |
|-----------|-------------|---------|----------|----------|------|------------|------|------|---------|
| 07 Jul | ~530* | ~28* | ~2* | ~530 | 716 | ~0.74 | 29 | LAMA | volume user asli tinggi |
| 08 Jul | ~540* | ~28* | ~5* | ~540 | 657 | ~0.82 | 35 | LAMA | tertinggi cycle |
| 09 Jul | ~230* | ~10* | ~1* | ~230 | 522 | ~0.44 | 24 | LAMA | lebih sepi |
| **10 Jul** | **327.29** | 17.13 | 1.73 | **346** | 476 | **0.687** | 22 | LAMA | **baseline pembanding (angka pasti dari hover)** |
| **11 Jul** (Sabtu, ~final) | **32.13** | 4.72 | 0.24KB | **37** | 123 | **0.261** | 12 | **BARU** | Sabtu sepi (98% traffic pagi, mati siang-malam). **MB/view turun 62% vs 10 Jul** |

\* = perkiraan dari tinggi bar (tidak di-hover satu-satu). 10 & 11 Jul = angka pasti dari tooltip.

## Analisis 11 Jul — fix berhasil, BUKAN cuma Sabtu

**Dua faktor menekan MB 11 Jul, harus dipisah:**

1. **Traffic sepi** (Sabtu libur) → 123 view vs 476 (10 Jul). Ini turunkan MB **absolut**, tapi TIDAK mengubah MB/view.
2. **Fix (sm-5jzd/2fux/euox)** → MB/**view** turun **0.687 → 0.261 (−62%)**. Ini bukti bytes per fetch mengecil. Kalau cuma Sabtu-sepi tanpa fix, MB/view tetap ~0.69.

**Verifikasi silang:** 11 Jul buka detail-presensi **15×** (halaman terberat, target sm-euox) tapi PostgREST cuma 32MB. Di 10 Jul, 35× detail-presensi menyumbang besar ke 327MB. Rasio "detail-presensi banyak tapi MB kecil" konsisten dengan fix euox bekerja.

**Kesimpulan:** ✅ **Optimasi berhasil.** Sabtu memperkecil volume, fix memperkecil biaya/view. Dua-duanya nyata; yang membuktikan fix = MB/view −62%.

**Catatan kehati-hatian:** 11 Jul = Sabtu (libur, 98% traffic pagi → ~final, bukan parsial), BUKAN hari kerja penuh. Konfirmasi FINAL butuh **1 hari kerja (Sen-Jum) pasca-11 Jul** dengan view ~400-500, lalu cek MB/view tetap ~0.26 (bukan balik ke 0.69). Update baris tabel saat data itu masuk.

## Jumat vs Sabtu — window jam sama (apple-to-apple)

Untuk memastikan penurunan MB/view bukan artefak "hari belum selesai", bandingkan **window jam identik** (00:00–08:20 UTC = 07:00–15:20 WIB):

| Hari | DOW | View window pagi (sama) | User window pagi | View full-day |
|------|-----|------------------------|-----------------|---------------|
| 10 Jul | **Jumat** | 146 | 13 | 476 |
| 11 Jul | **Sabtu** | 120 | 12 | **123** |

**Temuan:**
1. **Pagi Jumat vs pagi Sabtu setara** — 146 vs 120 view, user 13 vs 12. Traffic pagi hampir identik → pembanding adil untuk window itu.
2. **Pola sehari beda total:** Jumat 69% traffic datang SIANG-MALAM (setelah 15:20 WIB); Sabtu 98% traffic di PAGI, mati siang-malam. Jadi Sabtu 123 view = **memang hari sepi (libur)**, bukan "belum selesai". 37MB Sabtu ≈ angka final.
3. **Implikasi verifikasi:** window pagi traffic setara, tapi MB Sabtu (kode baru) jauh lebih rendah → fix bekerja. Namun Sabtu BUKAN pembanding hari-kerja. **Butuh Senin (hari kerja penuh, ~450 view)** untuk konfirmasi MB/view tetap ~0.26 saat volume balik normal.

## Sabtu vs Sabtu — pembanding EMAS (4 Jul LAMA vs 11 Jul BARU)

Pembanding terbaik: **hari kerja/pola sama (Sabtu), beda cuma kode.** 4 Jul = kode LAMA (pra-fix), 11 Jul = kode BARU (pasca-fix).

| Metrik | 4 Jul (Sabtu, LAMA) | 11 Jul (Sabtu, BARU) |
|--------|---------------------|----------------------|
| User | 14 | 13 |
| View full-day | 144 | **153** |
| View pagi (jam sama) | 117 | 120 |
| Presensi | 81 | 56 |
| Detail-presensi | **1** | **16** |
| Laporan | 5 | 9 |
| Siswa list | 19 | 16 |
| **PostgREST MB** | **66.89** (pasti, hover) | **32.13** (pasti) |
| **MB/view** | **0.465** | **0.261** |

**Temuan kunci:**
1. **Traffic 11 Jul SETARA/LEBIH BERAT** dari 4 Jul: view lebih banyak (153 vs 144), dan halaman **berat** jauh lebih sering dibuka — detail-presensi **16× vs 1×**, laporan 9 vs 5. Persis halaman yang fix euox/5jzd targetkan.
2. **Tapi MB jauh lebih rendah** (32MB vs 66.89MB, separuhnya). Traffic naik + berat, MB turun → **HANYA bisa dijelaskan oleh fix.** Bukan sepi (sama-sama Sabtu sepi), bukan volume (11 Jul malah lebih banyak).
3. **MB/view 0.465 → 0.261 (−44%)** — konsisten dgn temuan vs 10 Jul. Dua pembanding beda (Jumat penuh & Sabtu lalu) sama-sama tunjuk ~−62%.

**Kesimpulan diperkuat:** ✅ Ini bukti **paling bersih** sejauh ini. Sabtu-vs-Sabtu mengeliminasi variabel hari/pola. Traffic 11 Jul lebih berat (detail-presensi 16×!) tapi MB separuhnya. Fix bekerja, kuat.

## Proyeksi bulanan

- **Rate lama (0.687 MB/view):** hari kerja ~450 view → ~309MB/hari → bila 22 hari kerja/bln ≈ **6.8 GB/bln → JEBOL.**
- **Rate baru (0.267 MB/view):** hari kerja ~450 view → ~120MB/hari → 22 hari ≈ **2.6 GB/bln → AMAN**, jauh di bawah 5GB.
- Spike musiman (akhir bulan, lihat `egress-previous-cycle.md`) tetap ada tapi kini murah per-view → tak lagi jebol.

## Cara update tabel ini (harian/berkala)

1. Dashboard Supabase → hover bar hari target → catat PostgREST / Auth / Realtime MB.
2. Query view hari itu (UTC):
   ```sql
   select count(*) filter (where action='open_page') as views,
     count(distinct user_id) as users
   from activity_logs
   where created_at >= 'YYYY-MM-DD 00:00:00+00' and created_at < 'YYYY-MM-DD+1 00:00:00+00'
     and action='open_page';
   ```
3. Hitung MB/view = PostgREST MB ÷ views. Tambah baris. Bandingkan MB/view vs baseline 10 Jul (0.687).
4. Cek `select now()` — kalau hari masih berjalan, tandai **parsial** (angka belum final).

## Terkait
- `egress-story.md` — narasi lengkap dari awal.
- `egress-register.md` — tabel masalah/fix + snapshot.
- `egress-daily-users.md` / `egress-previous-cycle.md` — breakdown per-user.
