# Egress Tracking Harian — Generus Mandiri

Perkembangan egress harian dari **data dashboard Supabase real** (bukan estimasi). Tujuan: lihat tren MB/hari + MB/view untuk menilai apakah fix berhasil dan memproyeksi apakah bakal jebol 5GB/bulan.

**Aturan baca:**
- Cycle billing **07 → 07**. Cycle berjalan: **7 Jul → 7 Agu 2026**.
- Dashboard bucket per hari **UTC**. Bar "hari ini" belum tutup sampai 07:00 WIB besok. Angka hari berjalan = parsial.
- Metrik kunci = **MB/view** (MB PostgREST ÷ jumlah page-view hari itu), BUKAN MB absolut. Hari sepi otomatis rendah tanpa fix apa pun. Fix nyata = MB/view turun di trafik sebanding.
- **Budget:** 5GB / 30 hari ≈ **167 MB/hari** rata. Di atas itu konsisten = jebol.

---

## Tabel Harian (cycle 7 Jul → 7 Agu 2026)

| Hari (UTC) | Total dashboard | PostgREST MB | Auth MB | Realtime MB | Page views | **MB/view** | Catatan |
|---|---|---|---|---|---|---|---|
| 10 Jul | — | ~327 | ~17 | <1 | 476 | **0.69** | pra-fix fase-1 (kode lama); detail-presensi 35× |
| 11 Jul* | 1.932GB (39%, kumulatif hari-5) | 160.99 | 21.82 | 16.29 | 472 | **0.34** | fix fase-1 aktif (sm-2fux/euox/5jzd/uxnv). MB/view **-2×** vs 10 Jul. Bar parsial (~22 jam). Biang sisa: detail meeting (#9) |

\* Angka 11 Jul = split per-source hari itu; kolom "Total dashboard" 1.932GB adalah **kumulatif cycle** (hari-1 s/d 5), bukan harian.

---

## Proyeksi cycle berjalan

- **Per hari-5 (11 Jul):** 1.932 GB terpakai. Rata **~386 MB/hari**.
- **Proyeksi 30 hari** kalau pola tahan: 386 × 30 = **~11.6 GB = 2.3× over** budget 5GB. **JEBOL.**
- Penyebab: hari ngajar (Sabtu-Minggu, presensi massal) = 300-400MB. Fix fase-1 sudah potong MB/view 2×, tapi belum cukup — sisa biang = halaman **detail meeting** (`useMeetingAttendance`, issue #9 di register).
- **Target setelah fix #9:** potong MB/view detail presensi 50-70% (buang refetch-on-focus + trim nested join). Kalau 386 → ~180 MB/hari → ~5.4GB/bulan (mepet, tapi hampir masuk). Butuh #9 + monitor cycle depan.

---

## Cara update tabel ini (tiap cek dashboard)

1. Baca angka dashboard: total GB kumulatif + (kalau ada) split per-source hari itu (PostgREST/Auth/Realtime MB). Screenshot dari user.
2. Ambil page-view hari itu (UTC) via SQL:
   ```sql
   select count(*) filter (where action='open_page') as views,
          count(distinct user_id) as users
   from activity_logs
   where created_at >= 'YYYY-MM-DD 00:00:00+00'
     and created_at <  'YYYY-MM-DD 00:00:00+00'::timestamptz + interval '1 day'
     and action='open_page';
   ```
3. Hitung **MB/view = PostgREST MB ÷ views**. Tambah baris ke tabel.
4. Bandingkan MB/view dengan hari sebelumnya di trafik sebanding — turun = fix kerja, naik/tetap = biang baru (audit via api-logs + register).
5. Update proyeksi kalau tren berubah.

## Terkait
- `egress-register.md` — tabel masalah/fix + snapshot per-hari detail (per-user, per-halaman).
- `egress-cost-optimization.md` — aturan fix.
- `egress-mb-per-day.md` — data MB/view fase-1 (baseline lama).
