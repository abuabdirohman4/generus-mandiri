# Planned Announcements

Pengumuman yang direncanakan untuk dikirim via fitur broadcast notifikasi.
Claude baca file ini saat `/release` untuk cek apakah ada pengumuman yang perlu dikirim.

## Format

```
### [status] Judul Pengumuman
- **Trigger**: Issue/kondisi yang harus selesai dulu sebelum kirim
- **Target**: Siapa yang menerima (semua / superadmin / admin daerah / dll)
- **Tipe**: info | success | warning | action
- **Urgensi**: low | medium | high
- **Draft**: Isi pengumuman
- **Dikirim**: Tanggal kirim (diisi setelah dikirim)
```

Status: `[ ] belum` | `[~] draft siap` | `[x] sudah dikirim`
Tipe: `info` (informasi) | `success` (fitur baru berhasil) | `warning` (perhatian/perubahan) | `action` (butuh tindakan user)
Urgensi: `low` (info opsional) | `medium` (perlu dibaca) | `high` (segera dibaca/ditindaki)

---

## Antrian Pengumuman

### [x] Fitur Pengumuman & Broadcast Notifikasi
- **Trigger**: sm-69c selesai + deploy
- **Target**: Semua guru + siswa (penerima notifikasi, bukan pengirim)
- **Tipe**: info
- **Urgensi**: medium
- **Draft**:

  > 🔔 **🔔 Fitur Notifikasi**
  >
  > Assalammualaikum Wr. Wb.
  >
  > Mulai sekarang, admin atau pengurus bisa mengirim pengumuman langsung ke user melalui aplikasi.
  >
  > Pengumuman akan muncul otomatis saat user membuka aplikasi. Sebagai penguat informasi selain melalui WhatsApp atau media lain, semua info penting juga akan disampaikan lewat fitur notifikasi ini.
  >
  > Semoga Allah Paring Aman Selamat Lancar dan Barokah. 
  >
  > Aamiin

- **Dikirim**: 12 Juni 2026

---

### [~] Update Aplikasi (Sort Absensi + Remember Me + Column Toggle)
- **Trigger**: sm-16x + sm-7ca + sm-0v3 merged + deploy + verifikasi live
- **Target**: Semua guru + siswa (semua user)
- **Tipe**: success
- **Urgensi**: low
- **Draft**:

  > ✨ **Update Aplikasi**
  >
  > Ada beberapa update terbaru:
  >
  > 1. **Tabel Absensi Bisa Diurutkan** — tabel presensi sekarang bisa diurutkan berdasarkan nama atau status kehadiran (Hadir/Izin/Sakit/Alpa).
  > 2. **Login Lebih Praktis** — username tidak hilang saat login gagal, dan tersedia opsi "Ingat Saya".
  > 3. **Pilih Kolom di Laporan** — tampilan tabel laporan presensi bisa dikustomisasi, pilih kolom mana yang ingin ditampilkan.

- **Dikirim**: -

---

### [~] Fitur Hapus & Archive Siswa
- **Trigger**: Issue hapus/archive siswa aktif selesai (belum ada issue — buat dulu)
- **Target**: Admin daerah + admin desa + admin kelompok
- **Tipe**: action
- **Urgensi**: medium
- **Draft**:

  > 🗂️ **Fitur Kelola Status Siswa**
  >
  > Sekarang Anda bisa menghapus atau mengarsipkan data siswa yang sudah tidak lagi terdaftar di kelompok Anda.
  >
  > Gunakan fitur **Hapus Siswa** hanya untuk data yang salah, jika ada siswa yang tidak aktif karena pindah tempat tinggal atau alasan lainnya, bisa pakai fitur **Arsip Siswa** dengan begitu data siswa tersebut tetap ada dan dapat dipakai lagi nantinya, tapi siswa tersebut sudah tidak termasuk siswa yang wajib hadir di suatu pertemuan.
  >
  > Data yang diarsipkan tidak hilang permanen dan masih bisa dikembalikan jika diperlukan. Buka halaman **Siswa** untuk menggunakan fitur ini.

- **Dikirim**: -

---

### [~] Dokumentasi Panduan Penggunaan Tersedia
- **Trigger**: sm-4op selesai + deploy
- **Target**: Semua admin + guru
- **Tipe**: info
- **Urgensi**: low
- **Draft**:

  > 📖 **Panduan Penggunaan Aplikasi Tersedia**
  >
  > Kami telah menyiapkan dokumentasi lengkap cara penggunaan aplikasi **Generus Mandiri** — mulai dari mengelola siswa, mencatat presensi, hingga mencetak laporan.
  >
  > Dokumentasi bisa diakses langsung dari menu **Dokumentasi** di aplikasi.

- **Dikirim**: -

---

### [~] Fitur Naik Kelas Tersedia
- **Trigger**: sm-ejs selesai + stable di production
- **Target**: Semua guru + siswa (yang terdampak proses kenaikan kelas)
- **Tipe**: action
- **Urgensi**: high
- **Draft**:

  > 🎓 **Info: Proses Kenaikan Kelas Akan Segera Dilaksanakan**
  >
  > Pengurus sedang mempersiapkan proses kenaikan kelas akhir tahun ajaran 2025/2026.
  >
  > Semua siswa dari Kelas 1 - 6, SMP 1 - 3 dan SMA 1 - 3 akan otomatis dinaikkan semua ke kelas di atasnya.
  >
  > Untuk kelas PAUD karena ada beberapa siswa yang masih akan termasuk ke dalam kelas PAUD lagi, maka tidak akan otomatis dinaikkan semua.
  > 
  > Dan juga Kelas Pra Nikah tida akan otomatis dinaikkan semua karena kenaikkan kelasnya yang berbeda antar kampus nya.
  > 
  > Sehingga kami akan meminta para pengajar atau penganggung jawab kelompoknya masing-masing untuk menaikkan siswa yang perlu di naikkan ke Kelas 1 atau kelas Pra Nikah berikutnya secara manual, melalui fitur **Bulk Edit Siswa** yang akan di tambahkan di aplikasi beserta Tutorial singkat cara pakainya.

- **Dikirim**: -

---

### [~] Info: Paud & Pra Nikah Tidak Ikut Naik Kelas
- **Trigger**: Bersamaan dengan pengumuman naik kelas (sm-ejs)
- **Target**: Guru + siswa kelas Paud dan Pra Nikah
- **Tipe**: info
- **Urgensi**: medium
- **Draft**:

  > ℹ️ **Informasi untuk Kelas Paud & Pra Nikah**
  >
  > Proses kenaikan kelas otomatis **tidak berlaku** untuk kelas Paud dan Pra Nikah.
  >
  > Pengelolaan siswa di kedua kelas ini tetap berjalan seperti biasa. Tidak ada perubahan yang perlu dilakukan. Jika ada pertanyaan, silakan hubungi admin kelompok Anda.

- **Dikirim**: -
