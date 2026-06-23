# Plan — sm-f1nh — Tab Realtime Presensi untuk Infocus

**Issue:** sm-f1nh · feat: tab realtime presensi untuk infocus
**Type:** feature (P3)
**Date:** 2026-06-23

---

## 1. Goal

Tab realtime di meeting detail (`/presensi/[meetingId]`) untuk tampil presensi LIVE saat pengajian (proyeksi infocus). Subscribe Supabase `postgres_changes` ke `attendance_logs` filtered by `meeting_id`. Saat guru lain menandai hadir → layar infocus update tanpa refresh.

## 2. Reuse / context (explored)

- Realtime infra sudah ada: `src/stores/usePresenceStore.ts` + `src/hooks/usePresence.ts` (presence channel). **TAPI** itu untuk presence (online users), bukan postgres_changes. Pola channel-nya bisa ditiru.
- CLAUDE.md: "NEVER create Supabase channel directly — use usePresenceStore". → untuk fitur ini perlu **hook reusable BARU** (`useAttendanceRealtime`) yang follow pola yang sama (centralized, cleanup-safe), JANGAN bikin channel ad-hoc di komponen.
- Meeting detail page: `src/app/(admin)/presensi/[meetingId]/page.tsx`.
- Tracking page punya pola realtime tapi "belum diabstraksi" (per issue notes) — referensi, bukan copy mentah.

## 3. Prasyarat Supabase

- Enable realtime publication untuk `attendance_logs`: `alter publication supabase_realtime add table public.attendance_logs;` (via MCP `apply_migration`). Cek dulu `list` apakah sudah.
- RLS: subscriber tetap kena RLS — pastikan guru/admin scope bisa SELECT `attendance_logs` meeting tsb (kemungkinan sudah, verify).

## 4. Architecture decisions

- **Hook baru** `src/hooks/useAttendanceRealtime.ts`: param `meetingId`, subscribe `postgres_changes` (INSERT/UPDATE/DELETE) on `attendance_logs` where `meeting_id=eq.<id>`. Expose live `attendanceMap` + connection status. Cleanup channel on unmount. Pattern mirror `usePresence.ts`.
- **Tab UI** di meeting detail: tambah tab "Live / Infocus" di samping tab existing. Layout besar (font besar, count hadir/total, grid nama) cocok proyeksi. Read-only.
- Optimistic merge: gabung initial fetch (server) + realtime delta.
- Gate: tampil untuk role yang boleh lihat meeting (reuse guard meeting detail).

## 5. Tasks (TDD untuk logic, bukan channel)

### Task 1 — Supabase realtime enable
- Migration `alter publication ... add table attendance_logs` (cek dulu belum ada). Verify RLS SELECT scope.

### Task 2 — Merge logic (TDD)
- Pure `applyAttendanceEvent(map, event)` → update attendanceMap dari payload realtime (insert/update/delete). Test: insert tambah, update ubah status, delete hapus.
- GREEN.

### Task 3 — useAttendanceRealtime hook
- Subscribe channel, wire `applyAttendanceEvent`, cleanup. Follow `usePresence.ts` pattern. (Hook = sulit unit test; logic sudah di Task 2.)

### Task 4 — Tab UI infocus
- Tab baru di `presensi/[meetingId]/page.tsx`. Komponen `LivePresensiTab.tsx`: big layout, count, grid. Read-only. Pakai komponen existing.

### Task 5 — Verify
- type-check 0. test:run PASS.
- Manual: 2 browser — browser A tandai hadir di tab manual → browser B (tab Live) update tanpa refresh.

## 6. Out of scope
- Edit presensi dari tab live (read-only).
- Abstraksi ulang tracking page realtime (issue terpisah).
- Multi-meeting live dashboard.

## 7. CLAUDE.md Check
- [ ] Realtime presence doc (`docs/technical/realtime-presence.md`) → tambah pola useAttendanceRealtime kalau jadi pola kedua.
- [ ] Note: `attendance_logs` kini di publication realtime (database-operations.md).
- [ ] Tab baru di meeting detail (bukan route baru) → getPageTitle tak berubah.

## 8. Commit message
```
feat(presensi): live realtime attendance tab for infocus (fixes #XX)

Add useAttendanceRealtime hook (postgres_changes on attendance_logs filtered
by meeting_id) and a read-only big-layout Live tab in meeting detail for
projecting attendance during pengajian. Follows centralized channel pattern.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
