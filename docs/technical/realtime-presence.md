# Supabase Realtime Presence Implementation

This document describes the technical implementation of the Realtime Presence feature used for tracking and displaying online users in the Generus Mandiri system.

## Overview

The system uses Supabase Realtime Presence to track user activity across the admin dashboard. It is designed to be lightweight, efficient, and resilient to page navigations.

## Architecture

The implementation follows a Pub/Sub pattern with three main parts:

### 1. Singleton Supabase Client
**File**: `src/lib/supabase/client.ts`

To ensure connection stability and prevent multiple WebSocket connections, the browser-side Supabase client is implemented as a singleton.

```typescript
let supabase: SupabaseClient | null = null

export function createClient() {
  if (supabase) return supabase
  // ... initialization
  return supabase
}
```

### 2. The Tracker (Producer)
**File**: `src/hooks/usePresence.ts`
**Hook**: `usePresence()`

This hook is responsible for broadcasting the user's presence.
- **Mount Point**: `PreloadProvider.tsx` (Global).
- **Behavior**:
    - Subscribes to the `online-users` channel.
    - Uses `channel.track()` to broadcast metadata: `user_id`, `full_name`, `role`, `page_path`, and `online_at`.
    - **Navigation Tracking**: Monitors `pathname` changes and sends an updated `track()` payload without re-subscribing.
    - **Stability**: Checks `channel.state === 'joined'` before tracking to avoid race conditions.

### 3. The Observer (Listener)
**File**: `src/app/(admin)/audit/components/OnlinePresence.tsx`

This component displays the real-time list of online users.
- **Behavior**:
    - Acts as a **Listener**. It joins the existing `online-users` channel.
    - **PENTING**: Menggunakan pola **Master/Listener**. Karena menggunakan Singleton Client, komponen ini **TIDAK BOLEH** memanggil `channel.unsubscribe()` atau `removeChannel()` saat unmount.
    - Melakukan sinkronisasi manual di awal jika channel sudah dalam status `joined` oleh Tracker.

## Crucial Implementation Details

### Shared Channel Management
Dalam lingkungan Singleton Client, satu objek channel dibagikan ke seluruh komponen. 
- **Master** (Global Hook/Provider) bertanggung jawab atas `subscribe()` dan `unsubscribe()` (saat logout).
- **Listener** (UI Component) hanya menempelkan event handler (`.on()`) dan tidak boleh memutus koneksi channel secara sepihak.

### Unsubscribe vs RemoveChannel
- `unsubscribe()`: Memutus koneksi socket untuk channel tersebut. Dalam singleton, ini akan memutus koneksi bagi SEMUA komponen.
- `removeChannel()`: Menghapus channel dari daftar internal client. Lebih destruktif dari `unsubscribe()`.
- **Aturan**: Hindari keduanya untuk channel global di dalam komponen UI.

### Presence Key
- The Tracker uses `{ config: { presence: { key: profile.id } } }`.
- The Observer subscribes without a specific key to act as a pure listener.

## Metadata Schema

The tracked payload follows this structure:

```typescript
{
  user_id: string;
  full_name: string;
  role: string;
  page_path: string;
  online_at: string; // ISO Timestamp for deduplication
}
```
