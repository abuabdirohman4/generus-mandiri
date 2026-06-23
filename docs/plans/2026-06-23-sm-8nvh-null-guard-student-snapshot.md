# Plan — sm-8nvh — Null-guard student_snapshot di getMeetingsWithStats

**Issue:** sm-8nvh · bug: null-guard student_snapshot
**Type:** bug (P3, tiny but real crash)
**Date:** 2026-06-23

---

## 1. Goal

`getMeetingsWithStats` memanggil `meeting.student_snapshot.forEach()` tanpa null-check. Meeting dengan `student_snapshot = NULL` (dari sumber manapun, bukan cuma seed demo) → crash SELURUH daftar presensi teacher. Fix defensif.

## 2. Bug location

`src/app/(admin)/presensi/actions/meetings/actions.ts:1028` (verify exact line — file mungkin sudah bergeser). Cari `student_snapshot.forEach`.

⚠️ Verify path: deskripsi bilang `presensi/actions/meetings/actions.ts`. Kalbau sudah refactor 3-layer (sm-d15), forEach mungkin pindah ke `queries.ts`/`logic.ts`. Grep `student_snapshot` di seluruh `presensi/actions/`.

## 3. Fix

```ts
// BEFORE
meeting.student_snapshot.forEach(...)
// AFTER
(meeting.student_snapshot || []).forEach(...)
```

Cek juga akses `.length` / `.map` / `.filter` lain pada `student_snapshot` di file yang sama — null-guard semua.

## 4. Tasks (TDD — bug = RED reproduksi dulu)

### Task 1 — RED: reproduksi crash
- Cari fungsi yang olah `student_snapshot`. Kalau ada pure logic layer → unit test feed meeting dengan `student_snapshot: null` → assert TIDAK throw (saat ini akan throw / nanti return aman).
- Kalau forEach masih di action (sulit unit test) → extract iterasi ke pure helper di `logic.ts` (mis. `computeMeetingStats(meeting)`), lalu test helper.
- RED: test gagal (TypeError: Cannot read forEach of null).

### Task 2 — GREEN: null-guard
- Terapkan `(... || [])`. Test PASS.
- Grep semua akses lain ke `student_snapshot` di scope → guard.

### Task 3 — Verify
- `npm run test:run` PASS. `npm run type-check` 0.
- Manual (opsional): buat meeting tanpa snapshot → daftar presensi tetap render.

## 5. Out of scope
- Backfill data snapshot NULL (data fix terpisah).
- Refactor stats besar.

## 6. CLAUDE.md Check
- [ ] Tidak ada pattern baru. Cuma defensive guard.

## 7. Commit message
```
fix(presensi): null-guard student_snapshot in getMeetingsWithStats (fixes #XX)

Meeting with NULL student_snapshot crashed the entire teacher presensi list.
Guard with (snapshot || []). Add regression test.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
