# Claude Guidelines: Realtime Presence (Zustand Store)

Panduan khusus bagi AI Assistant untuk menjaga stabilitas fitur Realtime Presence.

## PRINSIP UTAMA: JANGAN SENTUH CHANNEL LANGSUNG

Seluruh logika Realtime Presence harus melalui **`usePresenceStore`**.

### 1. Modifikasi State Presence
- Jika ingin menambah metadata baru (misal: status sibuk, dll), tambahkan di payload `.track()` di dalam `src/stores/usePresenceStore.ts`.
- Pastikan menambah properti tersebut di interface `OnlineUser`.

### 2. Penanganan Navigasi
- Update lokasi halaman user dikelola oleh hook `usePresence.ts`.
- Jangan memanggil `track()` manual di komponen UI baru; cukup panggil hook `usePresence` jika komponen tersebut adalah halaman utama.

### 3. Debugging & Logs
- Gunakan `if (isDebug)` sebelum melakukan `console.log` di dalam store.
- Jangan menghapus logging `RAW Presence State` karena sangat krusial untuk debugging saat user hilang.

### 4. Pencegahan Bug "CLOSED/TIMED_OUT"
- Jangan pernah memanggil `supabase.channel('online-users')` di file selain `usePresenceStore.ts`.
- Pastikan variabel `realtimeChannel` di tingkat modul tetap sinkron dengan state koneksi.
- Gunakan `lastTrackedPath` untuk membatasi frekuensi update ke server.

## Struktur File Terkait
- `src/stores/usePresenceStore.ts`: Otak utama (Networking & State).
- `src/hooks/usePresence.ts`: Jembatan Navigasi (Event Trigger).
- `src/app/(admin)/tracking/components/OnlinePresence.tsx`: Komponen Penampil (UI).
