
Absensi
[x] Ubah konsep jadi saat masuk ke halaman ini, user perlu tambah pertemuan
[x] Jadi saat buka halaman ini, langsung menampilkan pertemuannya ada di hari apa saja dan persentase kehadirannya
[x] User bisa edit pertemuan yang sudah berlalu
[x] Di dalam absensi jadi tidak perlu biarkan user bisa ganti ganti hari karena harinya sudah fix saat masuk ke table input absensi nya
[x] Beresin Meeting cretion page
[x] absensi page 
[x] optimasi

[x] + button di pojok kanan bawah
[x] setelah update isi absensi data di list, card nya tidak langsung terupdate
[x] delete pakai confirm modal

Siswa
[x] Tambah siswa masih sangat lama
[x] Setelah CRUD siswa data di absensi dan laporan tidak langsung terudpate
[x] Berikan filter atau searching di table nya
[x] Buat loading skeleton

Laporan
[x] Buat loading skeleton
[x] Dummy nya ubah lebih variatif
[x] Tampilkan kalau 100%
[x] Axis Y di mobile
[x] Data di laporan dan di absensi beda tanggal yang muncul
[x] Kalau bulanan pakai bulan ke bulan
[] minggu juga dan tahunan juga
[x] Rentang Tanggal disesuain

Components
[x] Input select with arrow (laporan, modal pertemuan)
[x] Button & Loading
[x] Icon sidebar & bottom samain dengan di home

Role Access
[x] Gabungin User Management dari satu halaman bukan 3 folder terpisah
[x] Buat seperti ClassFilter untuk Daerah, Desa, Kelompok
[x] DataTable gk usah dibuat khusus di components/superadmin, cukup pakai di components/table
[x] Review component di folder src/components/superadmin
[x] Filter di modal guru, admin & organisasi belum pakai components
[x] Nama Halaman tiap halaman belum bener
[x] 4 Halaman baru belum pakai layout.tsx
[x] Buat akun admin daerah & desa Bansel 2
[x] Data di table beberapa belum muncul
[] Perbaiki CRUD Data
    [] Guru
    [] Admin
    [] Organisasi
[] Update semua pakai accessControl.ts
[] Minta penjelasan kenapa accessControl ada 2

Organisasi
[] CRUD

Admin
[x] Admin desa masih menampilkan admin daerah

Guru
[x] Admin daerah tidak melihat semua guru (Barujati) -> di db nya tidak ada
[x] Kolom "Jumlah Kelas" di hilangkan saja
[x] Data kelompok, desa, daerah masih pada kosong
[x] Admin Desa Soreang & Admin Kelompok Warlob 1 masih bisa melihat guru dari kelompok Barujati yang mana beda desa

Siswa
[] Merge main
[] Update tampilan table siswa

Kelas
[] Buat table kelas & kelompok_kelas
[] Dibuat flexibel, satu kelas isinya terdiri dari type apa

Testing
[] Unit Test?