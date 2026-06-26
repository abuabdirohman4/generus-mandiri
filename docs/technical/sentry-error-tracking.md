# Sentry Error Tracking & Monitoring

Dokumen ini menjelaskan implementasi Sentry pada project Generus Mandiri, apa saja yang telah dikonfigurasi, dan panduan untuk melakukan *deployment* (setup di VPS / Server Production).

## 1. Apa yang Telah Kita Lakukan?

Sentry adalah sistem pencatatan error (Error Tracking) yang memantau aplikasi secara *real-time*. Jika terjadi *crash* atau *bug* di sisi pengguna, Sentry akan langsung mengirimkan laporan mendetail ke Dashboard Anda tanpa perlu menunggu laporan manual dari pengguna.

Berikut adalah hal-hal yang sudah kita atur:

*   **Instalasi Sentry SDK (`@sentry/nextjs`)**: Melalui Sentry Wizard, kita telah menanamkan SDK untuk 3 lingkungan sekaligus: Server, Edge, dan Client/Browser.
*   **Identifikasi Pengguna (User Context)**: Kita memodifikasi `src/stores/userProfileStore.ts`. Setiap kali ada user yang login (misalnya guru atau admin), Sentry akan mencatat ID, Email, Nama, dan Role mereka. Jika terjadi error, kita akan tahu persis *siapa* yang mengalami error tersebut.
*   **Halaman Error Ramah Pengguna (`error.tsx`)**: Alih-alih menampilkan layar Next.js yang membingungkan atau layar putih, kita membuat UI khusus dengan ikon peringatan dan tombol untuk me-refresh halaman, sementara secara diam-diam kode `Sentry.captureException()` mengirimkan laporan kerusakannya ke server Sentry.
*   **Bypass Ad-Blocker (`tunnelRoute`)**: Browser yang menggunakan Ad-Blocker (seperti uBlock atau Brave) biasanya memblokir pengiriman data ke Sentry. Kita mengakalinya dengan mengatur `tunnelRoute: "/sentry-tunnel"` pada `next.config.ts`. Sentry seolah-olah mengirim error ke `/sentry-tunnel` (server kita sendiri), lalu server kitalah yang meneruskannya ke dashboard Sentry. Ini juga menghindari konflik dengan middleware keamanan kita.
*   **Optimalisasi Kuota (Tracing Rate)**: Sentry memiliki kuota bulanan gratis. Agar tidak boros, fitur pemantauan performa (Trace) dibatasi hanya `10%` dari total traffic (`tracesSampleRate: 0.1`), sementara pemantauan *Error/Crash* tetap `100%`.

---

## 2. File-file yang Terlibat

Sentry menambahkan dan mengubah beberapa file di dalam project:
*   `sentry.server.config.ts`: Konfigurasi Sentry untuk kode yang berjalan di Server (Node.js).
*   `sentry.edge.config.ts`: Konfigurasi Sentry untuk Edge Runtime.
*   `src/instrumentation-client.ts`: Konfigurasi Sentry untuk sisi Frontend (Browser / Client).
*   `src/instrumentation.ts`: Jembatan yang memuat Sentry ke dalam sistem Next.js.
*   `next.config.ts`: Memasukkan Sentry Webpack Plugin yang bertugas mengunggah *Source Maps* agar Sentry bisa menunjukkan baris kode asli saat terjadi error.
*   `.env.local` & `.env.sentry-build-plugin`: Menyimpan token rahasia (Auth Token) dan alamat tujuan pengiriman (DSN).

---

## 3. Panduan Setup di VPS / Production Server

Agar Sentry bisa berjalan dengan baik saat di-deploy ke VPS atau Vercel, ada hal-hal krusial yang **WAJIB** Anda lakukan di server.

### A. Menyiapkan Environment Variables (Env)
Sama seperti Anda mengatur Supabase URL di server, Anda juga wajib menambahkan 2 variabel baru ini ke dalam environment VPS / Platform Deployment Anda (atau di GitHub Secrets jika menggunakan GitHub Actions untuk proses build):

```env
# Alamat tujuan pengiriman error (Public, aman jika terlihat)
NEXT_PUBLIC_SENTRY_DSN=https://32f21f60f89a90951f863749c2eb50a8@o4511529673949184.ingest.us.sentry.io/4511625652404224

# Token rahasia agar Sentry Webpack Plugin bisa mengunggah Source Maps saat proses Build
SENTRY_AUTH_TOKEN=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
```

**Penting saat Proses Build (`npm run build`)**
Variabel `NEXT_PUBLIC_SENTRY_DSN` dan `SENTRY_AUTH_TOKEN` **WAJIB ADA** saat proses `npm run build` dijalankan. Jika build dilakukan di GitHub Actions, pastikan variabel ini dimasukkan ke **GitHub Repository Secrets**.

### B. Mengelola Source Maps (Keamanan)
Secara bawaan, Sentry akan mengunggah *Source Maps* (peta kode sumber asli) ke server mereka saat `npm run build` dijalankan agar laporan error mudah dibaca.
Pastikan *Source Maps* tersebut tidak bocor ke publik dengan memastikan server web VPS Anda (Nginx/Apache) tidak mengekspos folder `.next/` kepada publik. (Ini adalah praktik keamanan standar Next.js yang otomatis terpenuhi jika Anda menjalankan `npm run start`).

### C. Menghapus File Contoh (Opsional)
Sebelum mendeploy ke production, Anda sangat disarankan untuk menghapus file contoh Sentry agar tidak menuh-menuhin kode:
- Hapus file: `src/app/sentry-example-page/page.tsx`
- Hapus folder: `src/app/api/sentry-example-api`

---

## 4. Cara Mengetes Sentry Secara Manual di Production
Setelah aplikasi Anda online di VPS/Production:
1. Buka halaman aplikasi Anda.
2. Login sebagai pengguna manapun (agar nama pengguna ikut tercatat).
3. Anda bisa memicu error bohongan dengan memanggil fungsi yang tidak ada melalui Developer Tools (Inspect Element -> Console), lalu ketikkan:
   `bikinErrorDong();`
4. Tekan Enter. Karena fungsi tersebut tidak ada, aplikasi akan *crash* dan menembakkan error ke Sentry.
5. Buka dashboard Sentry dan pastikan error `ReferenceError: bikinErrorDong is not defined` muncul beserta nama pengguna Anda.
