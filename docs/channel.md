*Update v1.8.1 - Bug Fixes & Improvements*

Perbaikan:
- Error Delete Siswa - Perbaikan error saat menghapus siswa, sekarang support soft delete dan hard delete
- Validasi Kelas Guru - Perbaikan error saat guru dari satu kelas mencoba create absensi untuk kelas lain
- Tampilan Tanggal Kalender - Perbaikan tampilan tanggal yang salah di kalender absensi
- Filter Soft Delete - Penambahan filter yang benar untuk siswa yang di-soft delete di semua query

Peningkatan:
- Penghapusan Siswa - Peningkatan penghapusan siswa dengan soft delete (default) dan hard delete
  - Soft delete: Menandai siswa sebagai terhapus dengan timestamp deleted_at
  - Hard delete: Menghapus siswa secara permanen dari database
  - Penambahan validasi kontrol akses untuk admin desa/daerah/kelompok
- Manajemen Siswa - Peningkatan create/update siswa dengan handling kelompok_id yang lebih baik
  - Admin desa sekarang bisa specify kelompok_id saat create/update siswa
  - Penambahan validasi untuk memastikan kelompok berada di desa admin
  - Guru hanya bisa update siswa ke kelas yang mereka ajarkan
- Integritas Data - Semua query siswa sekarang filter dengan benar siswa yang di-soft delete

*Update v1.8.0 - Multiple Class Support & Enhanced Features*

Fitur Baru:
- Multiple Class Support - Siswa sekarang bisa diassign ke multiple kelas
- Gender Filter di Laporan - Filter jenis kelamin di halaman laporan
- Student Class Assignment - Admin bisa assign siswa ke multiple kelas via batch assignment
- Class Edit Feature - Fitur edit assignment kelas siswa dari halaman manajemen siswa

Peningkatan:
- Multiple Class Handling - Peningkatan support untuk siswa dengan multiple kelas di different kelompok
  - Halaman Guru: Handling multiple kelas yang lebih baik
  - Halaman Siswa: Tampilan dan filter siswa dengan multiple kelas
  - Halaman Absensi: Filter dan tampilan untuk multiple kelas dengan different kelompok
  - Halaman Laporan: Support untuk siswa dengan multiple kelas
- Confirm Modal - Update confirm modal dengan format [tipe pertemuan/title]
- Component Consistency - Ganti semua <button> dengan <Button> component untuk konsistensi
- Meeting Detail - Tambahan informasi kelas di meeting detail modal

Perbaikan:
- Attendance Filter - Perbaikan filter yang tidak muncul multiple kelompok di detail absensi
- Class Display - Perbaikan tampilan nama kelas (kelompok) di halaman absensi
- Multiple Class Visibility - Perbaikan siswa multiple kelas (seperti mudamudi) yang tidak muncul dengan benar
- Admin Access - Perbaikan admin warlob 2 yang tidak menampilkan siswa dengan benar

*Update v1.7.1 - UI Fixes & Improvements*

Perbaikan:
- Attendance Class Error - Perbaikan error kelas di halaman absensi
- Batch Import Mobile - Perbaikan visibilitas di mobile L saat batch import
- Import Modal Header - Perbaikan header modal yang tertutup di step 2 & 3 import

Peningkatan:
- Class Display - Penambahan line break untuk tampilan sambung dan kelas yang lebih baik
- Student Gender Filter - Filter jenis kelamin di halaman siswa
- Student Header - Header dinamis di halaman siswa untuk kelas gabungan (menampilkan kelas yang dipilih atau "Siswa" saat semua kelas dipilih)
- Home Page PJ - Peningkatan tampilan PJ untuk kelas gabungan di halaman home
- Teacher Table - Text wrap untuk kolom kelas di tabel guru
- MultiFilter Loading - Indikator loading di multifilter checkbox

*Update v1.7.0 - Meeting Types & Enhanced Features*

Fitur Baru:
- Meeting Types - Dukungan tipe pertemuan
- Smart Class Selection - Opsi "Pilih Kelas" hanya muncul jika ada lebih dari 1 kelas
- Student Categories - Peningkatan tabel siswa dengan dukungan kategori

Peningkatan:
- Meeting Management - Organisasi pertemuan yang lebih baik berdasarkan tipe
- User Experience - Proses pemilihan kelas yang lebih efisien
- Student Data - Kategorisasi dan filtering siswa yang lebih baik

*Update v1.6.3 - Class Management Bug Fix & UI Improvement*

Perbaikan:
- Class Creation Bug - Perbaikan bug create kelas untuk admin PAC dan DPD
- Class UI - Peningkatan UI untuk pembuatan dan manajemen kelas

Peningkatan:
- User Experience - Interface yang lebih baik untuk manajemen kelas di admin PAC dan DPD
- Class Modal - Modal pembuatan kelas dengan validasi dan UI yang lebih baik

*Update v1.6.2 - Bug Fixes*

Perbaikan:
- Reports Bug - Perbaikan bug untuk laporan guru tunggal
- Student Detail - Perbaikan kelas yang tidak muncul di detail siswa

*Update v1.6.1 - Reports UI & Bug Fixes*

Perbaikan:
- UI Reports - Sembunyikan button "Reset Filter" untuk interface yang lebih clean
- No Data Display - Perbaikan tampilan "No Data" pada kunjungan pertama di halaman laporan
- MultiSelectFilter Interaction - Peningkatan interaksi untuk mode non-searchable
- Icon Consistency - Ganti icon action dengan ReportIcon untuk konsistensi

Peningkatan:
- User Experience - Handling state awal yang lebih baik di halaman laporan
- Component Consistency - Penggunaan icon yang unified di semua table

*Update v1.6.0 - Student Attendance Detail & Reports Enhancement*

Fitur Baru:
- Detail Kehadiran Siswa - Tampilan detail kehadiran siswa
- Akses dari Laporan - Akses langsung ke detail kehadiran dari halaman laporan
- Navigation Actions - Tombol action untuk navigasi ke detail siswa

Perbaikan:
- Multi Filter - Nonaktifkan fitur search di multi-select filter
- Sorting Laporan - Perbaikan bug sorting tingkat kehadiran di laporan

Peningkatan:
- User Experience - Flow navigasi antara laporan dan detail siswa lebih baik
- Akurasi Laporan - Peningkatan akurasi sorting dan filtering di laporan

*Update v1.5.1 - Multi Select UI Fix*

Perbaikan:
- Multi Select UI - Perbaikan behavior checkbox multi-select untuk menghilangkan status indeterminate
- iOS Compatibility - Peningkatan komponen multi-select untuk pengalaman iOS yang lebih baik
- Checkbox Logic - Penyederhanaan checkbox "Pilih Semua" hanya menampilkan checked/unchecked

*Update v1.5.0 - Enhanced Filtering & Meeting Management*

Fitur Baru:
- Multi Select Filter - Sistem filtering dengan kemampuan multi-select
- Pertemuan Gabungan - Fitur pertemuan gabungan untuk multiple kelas
- DataFilter di Meetings - Tambahan komponen DataFilter di halaman meetings
- Auto Update Attendance - Update otomatis log kehadiran saat refresh
- Separate Percentage - Perhitungan persentase terpisah untuk akurasi lebih baik

Perbaikan:
- Meeting Security - Disable edit/delete untuk non-creator
- Sorting Options - Sorting berdasarkan kelas dan jenis kelamin
- Filter Performance - Optimasi performa sistem filtering

*Update v1.4.2 - Bug Fixes & Improvements*

Perbaikan:
- PWA Support - Perbaikan fungsi PWA di perangkat iPhone
- Laporan - Perbaikan data "Tren Kehadiran" dan "Detail Siswa" di laporan
- Authentication - Perbaikan masalah login langsung untuk guru dan admin

Fitur Baru:
- DataFilter di Laporan - Tambahan komponen DataFilter untuk filtering yang lebih baik

*Update v1.4.1 - Bug Fixes*

Perbaikan:
- UI/UX - Perbaikan masalah UI minor dan peningkatan user experience
- UI/UX - Memindahkan button "Tambah" pada halaman Kelas keluar dari "tab"

*Update v1.4.0 - Class Management System*

Fitur Baru:
- Sistem Manajemen Kelas - Struktur kelas yang fleksibel dan dinamis
- Manajemen Kelompok Kelas - Satu kelas dapat berisi berbagai jenis kelompok
- Integrasi Guru & Kelas - Satu guru dapat mengajar di beberapa kelas
- Filter Kelas - Sistem filtering yang lebih baik tanpa duplikasi
- Performance - Implementasi SWR + Zustand untuk performa optimal
- Database Structure - Tabel kelas dan kelompok_kelas yang lebih fleksibel


*Update v1.3.1 - Fix Bug*

Perbaikan:
- Perbaikan hierarki organisasi di daftar meeting
- Perbaikan pesan sign in ("Sesi anda telah berakhir" & "Username tidak ditemukan")
- Pindahkan manajemen siswa ke struktur folder user


*Update v1.3.0 - Organisasi, Guru & Admin Management*

Fitur Baru:
- Halaman Organisasi - Manajemen data organisasi dengan role-based filtering
- Halaman Admin & Guru - Manajemen user admin dan guru dengan validasi yang lebih baik
- DataFilter Component - Komponen filtering data yang dapat digunakan di berbagai halaman
- Meeting Management - Enhancement pada manajemen meeting dan student data handling
- Attendance Logs - Update struktur data attendance logs dengan UUIDs dan field tambahan

Perbaikan:
- Role Management - Update sistem role checks dan access control yang lebih robust
- User Management - Enhancement pada manajemen user dengan kolom organisasi
- UI/UX Improvements - Perbaikan tampilan dan user experience di berbagai halaman
- Default Gender - Set default jenis kelamin "Laki-laki" untuk kemudahan input siswa
- Input Validation - Perbaikan validasi input dalam berbagai form


*Update v1.2.0*

Penambahan Fitur Batch Import Siswa, Kegunaan:
- Efisiensi - Import hingga 20 siswa sekaligus dalam 1 operasi
- Akun Baru - Import siswa baru kelas dengan cepat
- Bulk Operations - Update data massal siswa
- User Experience - Wizard 3 langkah yang mudah diikuti


*Update v1.1.0*

Penambahan Fitur Reset Cookies & Cache, Kegunaan: 
- Troubleshooting - Ketika ada masalah dengan data tersimpan
- Security - Membersihkan data sensitif
- Fresh Start - Memulai ulang dengan data bersih
- Testing - Reset state untuk testing