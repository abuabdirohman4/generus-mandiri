## v1.10.0
- [ ] Add Pengajian Daerah
    - Nama
    - Tipe (Daerah)
    - Peserta
        - Kelas (Remaja, Orang Tua dll)
        - Desa (Soreang, Baleendah dll)
- [ ] Add Halaman Materi

## v1.9.0
- [ ] Add Jenis Kelamin (Untuk Pengajian Ibu2 / Bapak2, L/P)
- [ ] Add Pengajian Desa
    - Nama
    - Tipe (Desa)
    - Peserta
        - Kelas (Remaja, Orang Tua dll)
        - Kelompok (Warlob, Junti dll)

## v1.8.1
- [x] Error Delete siswa
- [x] Guru kelas warlob 1, create absensin warlob 2, error
- [x] Tanggal di kalender salah

## v1.8.0
- [x] Add Filter Gender on Laporan
- [x] Handle multiple class with different kelompok
    [x] Halaman Guru
    [x] Halaman Siswa
        [ ] Di table tampilkan kelompok
    [x] Halaman Absensi
        [x] Filter di detail absensi belum muncul 2 kelompok
        [x] Tampilkan nama kelas (kelompok)
        [x] Untuk yang punya multiple kelas kayak mudamudi juga harusnya
        [x] Di admin warlob 2 tidak muncul
    [x] Halaman Laporan
        [x] Belum jalan utk warlob 2
- [x] Confirm modal pakai [tipe pertemuan/title]
- [x] Handle student to have multiple class
    [x] Halaman Siswa
        [x] Assign student by admin
        [x] Ada filter by kelas
        [x] Muncul di masing2 kelas
        [x] Fitur Edit kelas
    [ ] Halaman Absensi
    [x] Halaman Laporan

Components
- [x] Change All <button> to <Button>

## v1.7.1
- [x] sambung dan kelas kasih br
- [x] kelas di absensi error
- [x] ada filter jenis kelamin di siswa
- [x] di halaman siswa, headernya utk kelas gabungan, antara dinamis kelas yg dipilih atau "Siswa" pas pilih semua kelas
- [x] di home kalau PJ nya gabungan kelas antara gk ditampilkan atau tampilkan semua (tapi kalau panjang sebut aja PJ berapa kelas)
- [x] di mobile L gk keliatan pas batch import
- [x] import step 2 & 3, modal header ketutup
- [z] import step 3, semua katefori nya caberawit
- [x] tabel guru, kolom kelas nya di uat text wrap juga
- [x] kasih loading di multifilter checbox

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
- Pengaturan Opsi data yang bisa di input
    - Jam Pengajian
    - Pemateri
    - Materi


## Backlog
- [ ] Create student_archive, profiles_archive
- [ ] Unit Testing
- [ ] Ubah Siswa -> Jamaah/Generus
- [ ] Ubah Guru -> Penanggung Jawab
- [ ] Kalau login gagal usernmae/password, username jangan hilang

Meetings
- [ ] Add Template name

Siswa
- [ ] Bisa langsung ganti detail siswa dengan memilih nama nya
