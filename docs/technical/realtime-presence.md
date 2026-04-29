# Realtime Presence Architecture (Zustand Version)

Dokumen ini menjelaskan implementasi fitur Realtime Presence di Generus Mandiri menggunakan Supabase Realtime dan Zustand.

## Arsitektur Utama: "Single Source of Truth"

Untuk menghindari konflik koneksi WebSocket dan masalah sinkronisasi (seperti status `CLOSED` atau `TIMED_OUT`), seluruh logika Realtime dipusatkan di dalam **Zustand Store**.

### 1. Zustand Store (`src/stores/usePresenceStore.ts`)
Store ini adalah satu-satunya tempat yang mengelola lifecycle channel Supabase.
- **Module-scoped Channel**: Objek `realtimeChannel` disimpan sebagai variabel di luar state store untuk menjamin stabilitas total (tidak terpengaruh oleh re-render React).
- **Deduplikasi Metadata**: Menggunakan `lastTrackedPath` untuk mencegah *socket overflow* akibat pemanggilan `.track()` yang terlalu sering.
- **Auto-Sync**: Mengelola pembersihan data dan deduplikasi user berdasarkan `user_id`.

### 2. Tracker Hook (`src/hooks/usePresence.ts`)
Hook ringan yang dipasang secara global (via `PreloadProvider`).
- Tugasnya hanya memicu `initializePresence` saat login dan `updatePath` saat navigasi halaman.

### 3. Observer Component (`OnlinePresence.tsx`)
Komponen UI yang murni bertugas menampilkan data.
- Mengambil data `onlineUsers` langsung dari store.
- Mengaktifkan `isDebug` mode secara otomatis untuk membantu debugging Admin.

## Aturan Penting Realtime

1.  **Dilarang membuat channel baru di komponen UI**: Selalu gunakan `usePresenceStore`.
2.  **Jangan gunakan custom presence key**: Biarkan Supabase menggunakan UUID default per sesi agar tabrakan sesi tidak terjadi, namun tetap sertakan `user_id` di payload.
3.  **Urutan Registrasi**: Selalu daftarkan event listener (`.on()`) **sebelum** memanggil `.subscribe()`.
4.  **Singleton Client**: Pastikan selalu menggunakan `createClient()` singleton dari `@/lib/supabase/client`.

## Debugging
Admin dapat melihat log sinkronisasi di console browser saat membuka halaman Audit. Log ini dikontrol oleh state `isDebug` di dalam store.
