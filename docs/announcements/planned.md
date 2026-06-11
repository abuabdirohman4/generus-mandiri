# Planned Announcements

Pengumuman yang direncanakan untuk dikirim via fitur broadcast notifikasi.
Claude baca file ini saat `/release` untuk cek apakah ada pengumuman yang perlu dikirim.

## Format

```
### [status] Judul Pengumuman
- **Trigger**: Issue/kondisi yang harus selesai dulu sebelum kirim
- **Target**: Siapa yang menerima (semua / superadmin / admin daerah / dll)
- **Draft**: Isi pengumuman
- **Dikirim**: Tanggal kirim (diisi setelah dikirim)
```

Status: `[ ] belum` | `[~] draft siap` | `[x] sudah dikirim`

---

## Antrian Pengumuman

### [~] Fitur Pengumuman & Broadcast Notifikasi
- **Trigger**: sm-69c selesai + deploy
- **Target**: Semua guru + siswa (penerima notifikasi, bukan pengirim)
- **Draft**:

  > 🔔 **Info: Fitur Pengumuman**
  >
  > Assalammualaikum Wr. Wb.
  >
  > Mulai sekarang, admin atau pengurus bisa mengirim pengumuman langsung ke user melalui aplikasi.
  >
  > Pengumuman akan muncul otomatis saat user membuka aplikasi. Sebagai penguat selain informasi melalui WhatsApp atau media lain — semua info penting juga akan disampaikan lewat fitur notifikasi atau pengumuman ini.
  >
  > Semoga Allah Paring Aman Selamat Lancar dan Barokah. 
  >
  > Aamiin

- **Dikirim**: -

---

### [~] Fitur Hapus & Archive Siswa
- **Trigger**: Issue hapus/archive siswa aktif selesai (belum ada issue — buat dulu)
- **Target**: Admin daerah + admin desa + admin kelompok
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
- **Draft**:

  > ℹ️ **Informasi untuk Kelas Paud & Pra Nikah**
  >
  > Proses kenaikan kelas otomatis **tidak berlaku** untuk kelas Paud dan Pra Nikah.
  >
  > Pengelolaan siswa di kedua kelas ini tetap berjalan seperti biasa. Tidak ada perubahan yang perlu dilakukan. Jika ada pertanyaan, silakan hubungi admin kelompok Anda.

- **Dikirim**: -
