# sm-6sbz — Offline Presensi Queue + Manual Sync (Tier 3)

## Context

**Depends on sm-vxna** (offline shell). Bagian terberat — presensi offline.

Presensi save terpusat: `saveAttendance(records[])` server action (`src/app/(admin)/presensi/actions/attendance/actions.ts`), dipanggil dari `useAutoSave.ts` (debounce 1.5s) → gagal saat offline (throw / result.error), **data hilang**. `saveAttendance` pakai **upsert idempotent** (by student_id + date via `upsertAttendanceLogs`) → re-submit AMAN, tak ada duplikat.

**Tujuan Tier 3 (sync MANUAL — pilihan user):** guru absen saat offline → tersimpan lokal (queue) → badge "N presensi belum ter-sync" → online → tekan **"Sync sekarang"** → drain queue ke server. BUKAN auto-sync (user pilih manual, kontrol jelas, minim konflik senyap).

## Files

- `src/app/(admin)/presensi/utils/offlineQueue.ts` (BARU) — queue localStorage.
- `src/app/(admin)/presensi/utils/__tests__/offlineQueue.test.ts` (BARU) — TDD.
- `src/app/(admin)/presensi/hooks/useAutoSave.ts` (EDIT) — cegat offline → enqueue.
- `src/app/(admin)/presensi/components/AutoSaveStatus.tsx` (EDIT) — badge + tombol sync.
- (mungkin) hook kecil `useOfflineQueue` untuk reactive count, atau kelola di komponen. Lihat Task 3.

## Task 1 — `offlineQueue.ts` (TDD RED dulu)

### 1a. Tulis test dulu (`__tests__/offlineQueue.test.ts`) — harus FAIL

Reuse pola `attendanceSync.test.ts` existing bila relevan. Test:
- `enqueue(records)` → `getQueue()` mengembalikan record tsb.
- `enqueue` dua kali student+date SAMA → dedup (upsert lokal, tidak dobel) — cocokkan idempotency server.
- `count()` = jumlah record antre.
- `clearSynced(keys)` → hapus yang sudah tersync, sisa tetap.
- Persist lintas "reload": tulis → baca ulang dari localStorage → data tetap.

### 1b. Implementasi (GREEN)

localStorage-backed (BUKAN IndexedDB — payload presensi kecil, konsisten dgn `draftStorage.ts` & `swr-cache` existing). Key mis. `presensi-offline-queue`.

Bentuk record = sama dengan yang dikirim `saveAttendance`:
```ts
interface QueuedAttendance {
  student_id: string
  date: string        // 'YYYY-MM-DD'
  status: 'H' | 'I' | 'S' | 'A'
  reason: string | null
  queued_at: number   // Date.now(), untuk debug/urut
}
```

Dedup key = `${student_id}|${date}` (upsert lokal — absen ulang siswa sama di tanggal sama = timpa, sejalan upsert server).

API:
```ts
export function enqueue(records: Omit<QueuedAttendance, 'queued_at'>[]): void
export function getQueue(): QueuedAttendance[]
export function clearSynced(keys: string[]): void   // keys = `student_id|date`
export function count(): number
export function clearAll(): void
```

Pola baca/tulis localStorage + try/catch (ikuti `draftStorage.ts`). SSR-safe (`typeof window !== 'undefined'`).

**ponytail:** localStorage cukup untuk skala presensi 1 kelompok. Naik IndexedDB hanya bila antrian ratusan record / banyak meeting paralel.

## Task 2 — Cegat offline di `useAutoSave.ts`

Di `autoSave` callback (`src/app/(admin)/presensi/hooks/useAutoSave.ts`), sebelum/sesudah panggil `saveAttendance`:

- Jika `!navigator.onLine` (pakai cek langsung ATAU `useOnline` dari sm-98j2 kalau sudah ada): **jangan panggil server**, langsung `enqueue(attendanceRecords)`, set status "Tersimpan offline". Skip `saveAttendance`.
- Jika online tapi `saveAttendance` throw (network error mendadak): catch → `enqueue(attendanceRecords)` sebagai fallback (jangan hilang).
- Jika sukses online: seperti sekarang (`setLastSaved`).

Ekspos ke UI: tambah return `pendingCount` (dari `count()`) atau flag `hasPending`. Hati-hati reactivity — count localStorage tidak reaktif otomatis; simpan di `useState`, refresh setelah enqueue dan setelah sync.

## Task 3 — Badge + tombol "Sync sekarang" di `AutoSaveStatus.tsx`

Perluas `src/app/(admin)/presensi/components/AutoSaveStatus.tsx`:
- Jika `count() > 0`: tampil "⏳ N presensi belum ter-sync" + tombol **"Sync sekarang"** (pakai `Button` dari `components/ui/button/` — JANGAN raw `<button>`; ikon dari `src/lib/icons.tsx`).
- Tombol hanya aktif saat online (`useOnline`). Offline → disabled + hint "Sambungkan internet untuk sync".
- Klik "Sync sekarang":
  1. `const queue = getQueue()`
  2. `const result = await saveAttendance(queue.map(strip queued_at))`
  3. Sukses → `clearSynced(queue.map(q => `${q.student_id}|${q.date}`))`, refresh count, toast sukses (Sonner existing).
  4. Gagal → toast error, JANGAN clear (biar bisa retry). Record tetap di queue.
- `saveAttendance` idempotent → aman kalau sebagian sudah tersimpan sebelumnya.

**Auto-nudge:** saat `online` event, JANGAN auto-kirim. Cukup pastikan badge + tombol terlihat/enabled (reactivity via `useOnline`).

## TDD (WAJIB — business logic, per CLAUDE.md)

- `offlineQueue.test.ts` (Task 1) — enqueue/dedup/clearSynced/persist.
- Test alur (bisa di test terpisah atau perluas): "offline → enqueue, lalu online + sync → queue kosong". Mock `saveAttendance`. Reuse pola `attendanceSync.test.ts`.

## Konflik

Upsert idempotent = last-write-wins per (student_id, date). Untuk sync manual pasca-offline, cukup — tak ada merge rumit. Kalau 2 device absen siswa sama offline lalu sync, yang sync belakangan menang (dokumentasikan, tak di-handle khusus di MVP).

## Verifikasi

1. `npm run build && npm start` (SW sm-vxna aktif).
2. Buka meeting presensi, aktifkan auto-save.
3. DevTools Network > Offline.
4. Absen beberapa siswa (H/I/S/A) → status "Tersimpan offline", badge "N belum ter-sync".
5. Reload app (queue persist di localStorage) → badge N tetap ada.
6. Network > Online → tombol "Sync sekarang" enabled → klik → toast sukses, badge → 0.
7. Verifikasi DB via skill `access-db-vm`: `attendance_logs` untuk siswa+tanggal tsb terisi status benar, tidak dobel (idempotent).
8. `npm run test:run` (offlineQueue + sync test hijau). `npm run type-check`.

## CLAUDE.md Check
- [ ] Pattern offline mutation queue baru → pointer di CLAUDE.md/docs (offline-first mutation via localStorage queue + manual sync).
- [ ] Business rule presensi offline (last-write-wins, sync manual) → tambah ke `docs/claude/business-rules.md` bagian Attendance.

## Commit (user yang eksekusi)
```
feat(presensi): queue offline attendance with manual sync

Save attendance to localStorage queue when offline; show pending badge
and "Sync sekarang" button to drain queue via idempotent saveAttendance
on reconnect. Manual sync (no auto) to avoid silent conflicts.

fixes #<GH-number>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
