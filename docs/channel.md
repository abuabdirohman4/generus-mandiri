*Update v1.6.0 - Student Attendance Detail & Reports Enhancement*

Fitur Baru:
- Detail Kehadiran Siswa - Tampilan detail kehadiran siswa seperti Better Habit
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