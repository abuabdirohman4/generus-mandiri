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

  > **🔔 Fitur Notifikasi**
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
- **Tipe**: info
- **Urgensi**: low
- **Draft**:

  > **Update Aplikasi**
  >
  > Ada beberapa update di aplikasi:
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

  > Fitur Hapus & Archive Siswa
  >
  >
  > Sekarang semua bisa menghapus atau mengarsipkan data siswa yang sudah tidak lagi terdaftar di kelompoknya.
  > 
  > Gunakan fitur Hapus Siswa hanya untuk data yang salah, jika ada siswa yang tidak aktif karena pindah tempat tinggal atau alasan lainnya, bisa pakai fitur Arsip Siswa dengan begitu data siswa tersebut tetap ada dan dapat dipakai lagi nantinya, tapi siswa tersebut sudah tidak termasuk siswa yang wajib hadir di suatu pertemuan.
  > 
  > Data yang diarsipkan tidak hilang permanen dan masih bisa dikembalikan jika diperlukan. Silahkan buka halaman Siswa untuk menggunakan fitur ini.

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

### [~] Masa Kenaikan Kelas Dibuka
- **Trigger**: sm-ejs selesai + stable di production
- **Target**: Semua guru
- **Tipe**: action
- **Urgensi**: high
- **Draft**:

  > 🎓 Proses Kenaikan Kelas Telah Dibuka
  > 
  > Untuk memulai tahun ajaran baru yaitu tahun ajaran 2026/2027 disediakan fitur baru yaitu *Naik Kelas*.
  > 
  > Kepada seluruh PJ Kelompok, mohon untuk segera memeriksa dan memproses siswa-siswinya yang perlu dinaikkan tingkatannya.
  > 
  > ⚠️ Perhatian: Untuk kelas reguler (PAUD s.d. SMA), mohon diproses sebelum batas waktu yang telah ditentukan yaitu 31 Juli 2026. Setelah batas waktu berakhir, akses kenaikan kelas reguler akan ditutup dan perlu bantuan PJ Desa untuk memprosesnya.
  > 
  > Khusus untuk kelas Pra Nikah, kenaikan tingkatnya dapat diproses kapan saja tanpa terikat batas waktu.
  > 
  > Tutorial dalam bentuk video bisa dilihat dengan klik link berikut : Generus Mandiri - Naik Kelas
  > 
  > Silakan buka menu Naik Kelas sekarang untuk memulai prosesnya!

- **Dikirim**: -

---

### [~] Fitur Materi & Monitoring
- **Trigger**: Deploy fitur Materi, Monitoring, dan Laporan Materi Pencapaian
- **Target**: Semua guru
- **Tipe**: info
- **Urgensi**: medium
- **Draft**:

  > **📚 Fitur Materi & Monitoring**
  >
  > Ada beberapa fitur baru yang bisa digunakan:
  >
  > 1. **Materi** — lihat kurikulum dan target materi per kelas dan semester.
  > 2. **Monitoring** — catat dan pantau progress pencapaian materi setiap siswa per bulan.
  > 3. **Laporan Materi Pencapaian** — lihat ringkasan pencapaian seluruh siswa di halaman Laporan, tab Materi.
  >
  > Tutorial dalam bentuk video bisa dilihat dengan klik link berikut: [Generus Mandiri - Materi & Monitoring]
  >
  > Silakan buka menu Materi atau Monitoring untuk memulai!

- **Dikirim**: -
