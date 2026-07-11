# Cerita Egress dari Awal — Ringkasan

Narasi lengkap perjalanan investigasi & optimasi egress Supabase (Jul 2026). Detail data: [`egress-register.md`](egress-register.md), [`egress-daily-users.md`](egress-daily-users.md), [`egress-previous-cycle.md`](egress-previous-cycle.md). Aturan fix: [`egress-cost-optimization.md`](egress-cost-optimization.md).

## Titik nol — kenapa mulai

Supabase Free tier = **5GB egress/bulan**. Proyek kena **grace period** (pernah lewat 5GB cycle sebelumnya → ancaman throttle 402 setelah 2 Agu 2026). Pemicu: hari ke-4 cycle sudah 34% (1.72GB). Pertanyaan awal: **normal atau jebol?**

## Investigasi — bukan yang disangka

Tersangka umum, semua **BUKAN** biang:
- ❌ Ukuran DB (91MB/500MB, aman)
- ❌ Advisor RLS/index (isu security/perf terpisah, bukan egress)
- ❌ `pg_timezone_names` 2jt row (traffic Supabase Studio, bukan app)

**Biang asli: PostgREST payload** — 94.6% egress (Auth 4.9%, Realtime 0.5%). Egress = **bytes baris data × frekuensi fetch.**

## Dari presensi? — Ya, tapi lebih tepat: dari POLA request

Egress = **bytes/view × frekuensi**. Dua dimensi:

- **Frekuensi → `/presensi` juara.** Guru buka puluhan-ratusan kali/hari (input presensi = kerjaan harian inti). 40-60% semua page-view. Ini akarnya: app presensi, dipakai tiap hari, banyak guru.
- **Bytes/view → halaman berat.** `/laporan`, detail-presensi, list `/presensi` bawa data gemuk tak perlu (`student_snapshot` jsonb, `topic`, `description` tiap baris) padahal cuma dipakai saat klik.

**Biang = presensi (volume) × query gemuk (bytes).** Volume tinggi ketemu payload boros → egress meledak.

## Biang spesifik + fix (6 total)

| # | Masalah | Halaman | Fix | Commit |
|---|---------|---------|-----|--------|
| 1 | `revalidateOnFocus` global — pindah tab refetch semua hook | global | sm-kt2j | b2c7e15 |
| 2 | Notif polling tiap 60s/tab | global | sm-kt2j | b2c7e15 |
| 3 | `/tracking` N+1 + realtime badai | `/tracking` | sm-hsp7 | 43ec14a |
| 4 | Meeting di-fetch 2× + jsonb cuma buat `.length` | `/laporan` | sm-5jzd | 6488093 |
| 5 | `/organisasi` bisa diakses non-admin (render+fetch) | `/organisasi` | sm-2m5n | 7c84cd0 |
| 6 | `student_snapshot` jsonb + `description` tiap row list | `/presensi` | sm-2fux | 76abd53 |
| 7 | `topic`+`description` tiap row per bulan | detail-presensi | sm-euox | 61ae009 |

## Koreksi di jalan (kesalahan + perbaikan)

1. **Salah vonis halaman** — diklaim "user buka /organisasi" dari signature api-log. Salah: itu komponen shared (DataFilter org-picker), bukan halaman /organisasi. Ketahuan karena /tracking kosong. → **Page ambil dari `activity_logs.page_path`, JANGAN tebak dari query signature.**
2. **Salah asumsi "1 penyalahguna"** — nyatanya 22 guru aktif, tersebar.
3. **Salah asumsi "07/08 Jul = dev-session doang"** — data nunjuk user asli volume besar (bansel2 209 view, brangsong 213).

## Data historis (cycle lama 7 Jun–7 Jul)

- Puncak **24 Jun: 560MB, 962 view, 566 presensi** — tersebar belasan guru, bukan satu orang.
- **Sudah mepet jebol murni dari volume presensi, semua kode pra-optimasi.**
- **Spike MUSIMAN** — puncak di akhir bulan/deadline input presensi (17, 22-25 Jun, 06 Jul). Predictable.
- **Profil egress bergeser** — detail-presensi ~0 di Jun → meledak Jul (pongporang 26×). Biang bulan ini ≠ bulan depan.

## Kesimpulan besar

**Akarnya = sukses produk, bukan bug.** App presensi makin dipakai (user & fitur nambah) → volume fetch naik → egress naik. Volume tak bisa dikurangi (guru wajib input presensi). Solusi = **tekan bytes/view** biar volume tinggi tak mahal. Itu yang 6 fix lakukan.

## Status (per 11 Jul 2026)

- ✅ 6 fix di master (push 11 Jul)
- ✅ Data terdokumentasi lengkap (register + daily-users + previous-cycle + skill analisa)
- ⏳ Verifikasi: butuh 2-3 hari user-asli pasca-11 Jul, banding MB÷view vs baseline 10 Jul (323MB)
- 🟡 sm-uxnv — paginasi list siswa (all-rows 2198 baris) — **dikerjakan**
- 🔴 sm-2bx — RLS 3 tabel mati (`teacher_classes`, `student_classes`, `report_template_classes`) — security, deferred
- 🔴 sm-csvk — pindah dev ke Supabase lokal (stop dev-session gelembungkan egress prod)

**Satu kalimat:** takut egress jebol → bukan DB/auth tapi PostgREST → akarnya presensi (volume harian) × query gemuk (bytes) → 6 fix potong bytes/view → tinggal verifikasi.
