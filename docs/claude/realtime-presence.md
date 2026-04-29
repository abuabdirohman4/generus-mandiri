# Realtime Presence Maintenance (Claude Guidelines)

This document provides specific instructions for Claude when working with the Supabase Realtime Presence system.

## 🔴 CRITICAL RULES

### 1. Singleton Client Preservation
ALWAYS use `createClient()` from `@/lib/supabase/client` for client-side operations. NEVER instantiate a new client using `createBrowserClient` directly, as it will break the singleton pattern and cause connection instability (CLOSED/TIMED_OUT errors).

### 2. Cleanup & Unsubscribe Protocol
- **DILARANG KERAS** menggunakan `channel.unsubscribe()` atau `supabase.removeChannel(channel)` di dalam komponen UI lokal (seperti `OnlinePresence.tsx`) untuk channel yang bersifat global.
- Karena menggunakan Singleton Client, memutus koneksi di satu tempat akan memutus koneksi untuk Tracker (background) secara keseluruhan.
- Biarkan channel tetap aktif selama sesi admin berlangsung. Cleanup di level komponen cukup dengan membiarkan listener tetap menempel atau mengandalkan garbage collection jika benar-benar diperlukan.

### 3. Tracking Robustness
When adding tracking to a new component or modifying `usePresence.ts`:
- Always check `profile?.id` and `profile?.full_name` are available before calling `track()`.
- Check `channel.state === 'joined'` or wait for the `SUBSCRIBED` status before sending the first payload.

## Troubleshooting Common Issues

### "TIDAK ADA USER ONLINE"
If the UI shows no online users but logs show you are subscribed:
1. Check `console.log("Raw Presence State:", state)` in `OnlinePresence.tsx`.
2. Verify if the `track()` payload in `usePresence.ts` is actually being sent (check logs).
3. Ensure the channel name is exactly `'online-users'`.

### Status `CLOSED` or `TIMED_OUT`
This usually means a singleton conflict:
1. Check if any component is calling `removeChannel()`.
2. Check if multiple channels with the same name are being created with conflicting `config`.

## Extending the Schema
If you need to track more data (e.g., specific action being performed):
1. Update the payload in `usePresence.ts`.
2. Ensure you add a timestamp (`online_at`) if you need deduplication in the UI.
3. Update the UI components to handle the new data.
