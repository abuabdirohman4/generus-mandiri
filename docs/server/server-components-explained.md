# Komponen Server VM: Nginx, PM2, dan Certbot

Dokumen ini menjelaskan fungsi dari tiga komponen utama yang diinstal pada Virtual Machine (VM) saat melakukan migrasi aplikasi Next.js dari Vercel ke VM mandiri.

## 1. Nginx (Reverse Proxy)
**Nginx** (dibaca: "Engine-X") adalah sebuah *web server* yang sangat cepat dan ringan. Dalam arsitektur server kita, Nginx bertindak sebagai **Reverse Proxy** (penerima tamu).

**Fungsi Utama:**
- **Meneruskan Trafik (Routing):** Aplikasi Next.js Anda (yang dikelola oleh PM2) berjalan di *port* internal `3000`. Nginx akan "berjaga" di pintu gerbang utama server (port `80` untuk HTTP dan port `443` untuk HTTPS). Nginx menerima permintaan dari pengguna (misalnya saat user mengakses domain), lalu secara otomatis meneruskan permintaan tersebut ke aplikasi di port `3000`.
- **Keamanan & Performa:** Nginx menyembunyikan port asli aplikasi dari akses langsung luar, dan sangat handal dalam menangani koneksi yang banyak secara bersamaan tanpa membebani aplikasi Node.js.

## 2. PM2 (Process Manager)
**PM2** (Process Manager 2) adalah program pengelola proses khusus untuk aplikasi Node.js/JavaScript.

**Fungsi Utama:**
- **Menjaga Aplikasi Tetap Hidup (*Keep Alive*):** Jika aplikasi dijalankan secara manual (`node server.js`), aplikasi akan mati ketika terminal/SSH ditutup, atau berhenti jika terjadi *error/crash*. PM2 menjalankan aplikasi di latar belakang (seperti *service*) dan akan langsung me-*restart* aplikasi secara otomatis jika terjadi *crash*.
- **Auto-Boot (Startup):** PM2 memastikan aplikasi Anda otomatis menyala ketika server VM di-*restart* atau baru dinyalakan, tanpa perlu login ke server dan menjalankannya manual secara manual.
- **Monitoring:** Menyediakan kemudahan untuk melihat status aplikasi, penggunaan RAM/CPU, dan *logs* (`pm2 status`, `pm2 logs`).

## 3. Certbot (Pengelola SSL/HTTPS)
**Certbot** adalah *tool* otomatis buatan *Electronic Frontier Foundation* (EFF) untuk mengelola sertifikat keamanan (SSL/TLS) dari Let's Encrypt.

**Fungsi Utama:**
- **Mengenkripsi Koneksi (HTTPS):** Certbot bertugas memberi ikon "Gembok Hijau" pada domain Anda. Ia meminta sertifikat SSL secara gratis ke Let's Encrypt dan memasangkannya langsung ke dalam konfigurasi Nginx secara otomatis.
- **Auto-Renewal:** Sertifikat dari Let's Encrypt hanya berlaku selama 90 hari. Certbot bertugas untuk memperbarui (*renew*) sertifikat tersebut secara otomatis sebelum masa berlakunya habis, sehingga koneksi website Anda selalu aman tanpa perlu intervensi manual.

---

### Ringkasan Alur Koneksi

1. Pengguna internet meminta akses ke domain Anda.
2. Koneksi dienkripsi menjadi HTTPS oleh sertifikat dari **Certbot**.
3. Permintaan diterima oleh **Nginx** di port 443.
4. **Nginx** meneruskan lalu lintas permintaan ke dalam server secara lokal menuju **PM2**.
5. **PM2** (yang bertugas menjaga Next.js tetap hidup di port 3000) menerima *request* tersebut.
6. Aplikasi Next.js Anda memproses data dan mengirim kembali responsnya melalui jalur yang sama.
