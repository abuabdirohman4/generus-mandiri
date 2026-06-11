# Planned Announcements

Pengumuman yang direncanakan untuk dikirim via fitur broadcast notifikasi.
Claude baca file ini saat `/release` untuk cek apakah ada pengumuman yang perlu dikirim.

## Format

```
### [status] Judul Pengumuman
- **Trigger**: Issue/kondisi yang harus selesai dulu sebelum kirim
- **Target**: Siapa yang menerima (semua / superadmin / admin daerah / dll)
- **Draft**: Isi pengumuman (bisa dibantu Claude saat waktunya)
- **Dikirim**: Tanggal kirim (diisi setelah dikirim)
```

Status: `[ ] belum` | `[~] draft siap` | `[x] sudah dikirim`

---

## Antrian Pengumuman

### [~] Fitur Pengumuman & Broadcast Notifikasi
- **Trigger**: sm-69c selesai + deploy
- **Target**: Semua admin daerah + superadmin
- **Draft**:

  > 🔔 **Fitur Baru: Pengumuman & Broadcast Notifikasi**
  >
  > Kini Anda bisa mengirim pengumuman langsung ke seluruh pengguna dalam lingkup organisasi Anda — per daerah, desa, kelompok, atau berdasarkan peran (guru/siswa/admin).
  >
  > Cara pakai: buka menu **Notifikasi** → klik **Kirim Notifikasi** → pilih penerima → tulis pesan → kirim.
  >
  > Penerima akan melihat notifikasi di aplikasi secara langsung. Fitur ini cocok untuk pengumuman jadwal, informasi kegiatan, atau hal penting lainnya.

- **Dikirim**: -

---

### [~] Fitur Delete & Archive Notifikasi
- **Trigger**: Issue delete/archive notif selesai (belum ada issue — buat dulu)
- **Target**: Semua pengguna
- **Draft**:

  > 🗂️ **Update Notifikasi: Hapus & Arsipkan Pesan**
  >
  > Kotak notifikasi Anda kini bisa dikelola lebih rapi. Pesan yang sudah dibaca bisa dihapus atau diarsipkan agar tidak menumpuk.
  >
  > Cukup buka **Notifikasi** dan geser atau klik ikon pada pesan yang ingin dikelola.

- **Dikirim**: -

---

### [~] Dokumentasi Panduan Penggunaan Tersedia
- **Trigger**: sm-4op selesai + deploy
- **Target**: Semua admin + guru
- **Draft**:

  > 📖 **Panduan Penggunaan Aplikasi Tersedia**
  >
  > Kami telah menyiapkan dokumentasi lengkap cara penggunaan aplikasi Generus Mandiri — mulai dari mengelola siswa, mencatat presensi, hingga mencetak laporan.
  >
  > Dokumentasi bisa diakses langsung dari menu **Bantuan** di aplikasi. Jika ada pertanyaan yang belum terjawab, silakan hubungi admin pusat.

- **Dikirim**: -

---

### [~] Fitur Naik Kelas Tersedia
- **Trigger**: sm-ejs selesai + stable di production
- **Target**: Semua admin daerah + superadmin
- **Draft**:

  > 🎓 **Fitur Baru: Kenaikan Kelas Massal**
  >
  > Proses kenaikan kelas akhir tahun kini bisa dilakukan sekaligus untuk seluruh siswa dalam satu alur wizard yang mudah.
  >
  > Buka menu **Naik Kelas**, pilih kelas yang akan dinaikkan, review daftar siswa, lalu konfirmasi. Sistem akan memindahkan siswa ke kelas berikutnya secara otomatis.
  >
  > Fitur ini aktif saat admin mengaktifkan **Mode Naik Kelas** di pengaturan.

- **Dikirim**: -

---

### [~] Info: Naik Kelas — Paud & Pra Nikah Dikecualikan
- **Trigger**: Bersamaan dengan pengumuman naik kelas (sm-ejs)
- **Target**: Semua admin + guru yang mengampu kelas Paud atau Pra Nikah
- **Draft**:

  > ℹ️ **Informasi Penting: Kenaikan Kelas**
  >
  > Perlu diketahui bahwa kelas **Paud** dan **Pra Nikah** **tidak termasuk** dalam proses kenaikan kelas otomatis.
  >
  > Pengelolaan siswa di kedua kelas tersebut tetap dilakukan secara manual seperti biasa. Jika ada pertanyaan, hubungi admin daerah Anda.

- **Dikirim**: -
