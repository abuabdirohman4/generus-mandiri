## v1.9.0
- [ ] Add Template name
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

## v1.8.0
- [ ] Add Halaman Materi

## v1.7.0
Meetings
- [x] Add Tipe Pertemuan
- [x] Create "Pilih Kelas" hanya muncul untuk kleas > 1

Siswa
- [x] Check use case for 'categories' in students table

Detail Siswa
- [x] Overlay Loading ketika masuk halaman

## v1.6.3
- [x] Fix bug create kelas admin desa, daerah & improve UI

## v1.6.2
- [x] Bug report for 1 teacher
- [x] Kelas tidak muncul di detail siswa

## v1.6.1

- [x] Hide "Reset FIlter"
- [x] No Data in first visit in laporan page
- [x] Improve MultiSelectFilter interaction for non-searchable mode
- [x] Replaced existing action icon with ReportIcon in both DataTable and StudentsTable for consistency and better representation.

## v1.6.0
Siswa
- [x] Detail Kehadiran Siswa seperti Better Habit
- [x] Bisa masuk lewat laporan
- [x] Tambah 1 action untuk masuk ke detail ini

MultiFIlter
- [x] Disable seach feature

Laporan
- [x] Bug sorting tingkat kehadiran

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

## Archive
- Add Bulk Insert Guru, Admin, Organisasi
- Add Bulk with CSV, Excel, Text
- Continue Dashboard Feature
- Kalender kegiatan atau agenda kegiatan

Siswa
- Tambahkan tab di detail siswa
    - Kehadiran
    - Profile Lengkap

Meetings
- Add Jenis Kelamin (Untuk Pengajian Ibu2 / Bapak2, L/P)
- Pengaturan Opsi data yang bisa di input
    - Jam Pengajian
    - Pemateri
    - Materi


## Backlog
- [ ] Add Halaman Materi
- [ ] Create student_archive, profiles_archive
- [ ] Unit Testing
- [ ] Ubah Siswa -> Jamaah/Generus
- [ ] Ubah Guru -> Penanggung Jawab

Components
- [ ] Change All <button> to <Button>

Siswa
- [ ] Bisa langsung ganti detail siswa dengan memilih nama nya
