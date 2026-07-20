/new-feature-workflow

CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system.
Data plane sudah PINDAH dari Supabase Cloud ke Postgres + PostgREST self-host di VM
(cutover 2026-07-20 07:26 CST). Auth/GoTrue TETAP di Supabase Cloud.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

⚠️ PENTING soal akses database:
Postgres di Supabase Cloud MASIH HIDUP tapi datanya BEKU di 2026-07-20 07:13.
Supabase MCP akan tetap menjawab TANPA error — tapi datanya MENYESATKAN.
JANGAN pakai Supabase MCP untuk query data. Untuk cek data, pakai salinan lokal
(`selfhost/restore-local.sh`) atau SSH tunnel ke VM (DB `generus_local`,
user read-only `abuabdirohman`).

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-20-fix-meetings-rls-performance.md

ISSUE: sm-<TBD> / GH-#<TBD>  (terkait sm-2bx / GH-#27)
BRANCH: fix/meetings-rls-performance

SCOPE SESI INI: **Fix A saja** (pecah embed jadi dua query).
Fix B (tulis ulang helper PL/pgSQL → SQL STABLE) JANGAN dikerjakan dulu —
itu menyentuh database dan wajib diukur di salinan lokal lebih dulu.

REQUIREMENTS:
1. Terapkan TDD ketat: RED → GREEN → REFACTOR
2. Jalankan test setelah perubahan: npm run test:run
3. Jangan lanjut jika ada test FAIL
4. Setelah selesai: npm run type-check
5. JANGAN deviate dari plan tanpa approval user

TARGET UTAMA:
`src/app/(admin)/users/siswa/actions/students/queries.ts:484` — `fetchStudentAttendanceHistory`

Ganti embed `meetings!inner(...)` jadi dua query terpisah:
  1. `attendance_logs` difilter student_id + rentang tanggal (sudah terukur ~23 ms)
  2. `meetings` diambil `.in('id', meetingIds)` — lewat primary key, cepat
  3. Gabungkan di JS

Pola yang ditiru (sudah TERBUKTI cepat di produksi):
`src/app/(admin)/presensi/actions/meetings/queries.ts:14`

PENTING (mudah salah / berisiko):
- Bentuk objek hasil WAJIB identik dengan sekarang. Pemanggil di
  `students/actions.ts:1546` membaca `log.meetings.class_id` dan
  `log.meetings.class_ids`. Kalau bentuknya berubah, filter role guru diam-diam
  jadi salah — TIDAK error, tapi hasilnya keliru. Ini risiko terbesar.
- `meetings!inner` itu INNER JOIN: baris `attendance_logs` yang meeting-nya tidak
  terlihat (kena RLS) IKUT TERBUANG. Setelah dipecah, sifat ini HARUS dipertahankan —
  buang baris yang `meeting_id`-nya tidak ada di hasil query kedua. Kalau lupa,
  guru bisa melihat absensi di luar cakupannya = kebocoran data.
- Embed bertingkat `activity_types` dan `classes` ikut pindah ke query kedua.
- Parameter opsional `classId` (filter per kelas) harus tetap berfungsi.

JANGAN:
- Jangan ubah policy RLS apa pun
- Jangan jalankan DDL ke database produksi
- Jangan naikkan/turunkan `statement_timeout` (sudah di-set 30s sementara di prod;
  akan diturunkan balik ke 8s setelah fix terbukti)

VERIFIKASI (lihat checklist lengkap di plan):
- Tab Profil siswa terbuka < 2 detik — uji ID `690ae5b4-b2bc-4f41-88c8-61fadac07af1`
- Isi tab Profil SAMA PERSIS dengan sebelum fix
- Guru hanya melihat absensi kelasnya sendiri
- Tab Biodata dan halaman Presensi tidak berubah perilakunya
