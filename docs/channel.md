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