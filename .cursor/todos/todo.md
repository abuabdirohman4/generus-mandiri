## v1.7.0
Meetings
- [ ] Add Pengajian Desa
    - Nama
    - Tipe (Desa)
    - Peserta
        - Kelas (Remaja, Orang Tua dll)
        - Kelompok (Warlob, Junti dll)
- [ ] Add Pengajian Daerah
    - Nama
    - Tipe (Daerah)
    - Peserta
        - Kelas (Remaja, Orang Tua dll)
        - Desa (Soreang, Baleendah dll)

## v1.6.0
Siswa
- [x] Detail Kehadiran Siswa seperti Better Habit
- [x] Bisa masuk lewat laporan
- [x] Tambah 1 action untuk masuk ke detail ini

MultiFIlter
- [ ] Remove seach feature

Laporan
- [x] Bug sorting tingkat kehadiran

Meetings
- [ ] Add Template name
- [ ] Add Tipe Sambung
    - Kelompok
    - Desa
    - Daerah
    - Pusat

## v1.5.0

Filter
- [x] Multi Select Filter

Meetings
- [x] Add Pertemuan Gabungan
- [x] Add Data Filter
- [x] Disable edit/delete for non creator

MeetingId
- [x] Sort By Name/Jenis Kelamain & DataFilter
- [x] Auto Update attendance log saat refresh
- [x] Persentase terpisah

## v1.4.2
- [x] Di Iphone PWA tidak jalan
- [x] Di Laporan Tren Kehadiran & Detail Siswa salah
- [x] Buat guru & admin tidak bisa langsung login

Laporan
- [x] Add DataFilter in Laporan

## v1.4.1
- [x] Fix
- [x] Move button "Tambah" di kelas

## v1.4.0
Kelas
- [x] Buat table kelas & kelompok_kelas
- [x] Dibuat flexibel, satu kelas isinya terdiri dari type apa
- [x] Sambungkan dengan kelompok & guru
- [x] Implementasi SWR + Zustand
- [x] Perbaiki filter kelas yang duplicate

Guru
- [x] Assign satu guru ke beberapa kelas

## v1.3.1
Siswa
- [x] Pindahkan ke dalam folder user

Absensi
- [x] Fix organization hierachy in meeting list

Sign In
- [x] Fix message "Sesi anda telah berakhir"
- [x] Username tidak ditemukan

## Backlog
- [ ] Add Bulk Insert Guru, Admin, Organisasi
- [ ] Add Bulk with CSV, Excel, Text
- [ ] Add Halaman Materi
- [ ] Continue Dashboard Feature
- [ ] Create student_archive, profiles_archive
- [ ] Unit Testing
- [ ] Ubah Siswa -> Jamaah/Generus
- [ ] Ubah Guru -> Penanggung Jawab

Siswa
- [ ] Tambahkan tab di detail siswa
    - Kehadiran
    - Profile Lengkap

Kelas
- [ ] Saat add kelas gabungan
    - Kalau single kelasnya sudah ada datanya, berarti langsung keinsert di gabungan
    - Kalau di gabungan sudah ada, di single nya juga ikut keisi

Meetings
- [ ] Add Jenis Kelamin (Untuk Pengajian Ibu2 / Bapak2, L/P)

Components
- [ ] Change All <button> to <Button>