# Plan: fix radio balik Alfa setelah save (sm-40pi)

**Date**: 2026-07-13  
**Issue**: sm-40pi  
**File**: `src/app/(admin)/presensi/[meetingId]/page.tsx`

---

## Root Cause

Line 221: `hasInitialized.current = false` dipanggil setelah save berhasil.

Flow yang terjadi:
1. User pilih Hadir, klik Save → `saveAttendanceForMeeting()` berhasil
2. `hasInitialized.current = false` → reset flag sync
3. `mutate()` dipanggil → async, bisa return data LAMA dari cache (belum settle ke DB)
4. SWR resolve → `attendance` prop terupdate dengan data stale
5. Effect line 98-119: `if (!hasInitialized.current) setLocalAttendance(attendance)` → overwrite `localAttendance` dengan Alfa (data stale)
6. UI: radio balik ke Alfa
7. User refresh → SWR fetch ulang → dapat data benar

**Fix**: Hapus `hasInitialized.current = false`. `localAttendance` yang baru disimpan = source of truth. `mutate()` tetap dipanggil untuk revalidate SWR di background (untuk `isDirty` dan sinkronisasi cross-device), tapi tidak boleh clobber `localAttendance`.

Merge effect (line 103-116) sudah aman — hanya menambah siswa baru yang belum ada di `localAttendance`, tidak overwrite yang sudah ada.

---

## Task 1 — Remove hasInitialized reset after save

**File**: `src/app/(admin)/presensi/[meetingId]/page.tsx` line 221

**Before**:
```typescript
      if (result.success) {
        sessionStorage.setItem('presensi_needs_refresh', meetingId)
        toast.success('Data presensi berhasil disimpan!')
        hasInitialized.current = false  // ← HAPUS BARIS INI
        mutate() // Refresh current page data
```

**After**:
```typescript
      if (result.success) {
        sessionStorage.setItem('presensi_needs_refresh', meetingId)
        toast.success('Data presensi berhasil disimpan!')
        mutate() // Refresh SWR baseline (for isDirty + cross-device sync)
```

**Reasoning**: `localAttendance` sudah berisi data yang baru disimpan. `mutate()` hanya perlu memperbarui baseline SWR (`attendance`) untuk keperluan `isDirty` check dan realtime sync — bukan untuk meng-overwrite tampilan.

---

## Task 2 — TDD: tulis test untuk sync logic

Bug ada di React component — tidak bisa diunit-test langsung. Tapi kita bisa verifikasi perilaku merge effect via logic test.

**File baru**: `src/app/(admin)/presensi/[meetingId]/__tests__/attendanceSync.test.ts`

Test case yang perlu ditulis:
1. `mergeAttendance`: siswa baru dari server ditambahkan, siswa existing tidak di-overwrite
2. `mergeAttendance`: jika `hasInitialized=false` (belum init), overwrite penuh
3. Verifikasi: setelah save, jika server return data stale (Alfa), local state (Hadir) tidak ter-overwrite

Karena merge logic ada inline di effect (bukan extracted function), test ini mendokumentasikan perilaku yang diharapkan sebagai regression guard.

Tulis helper function `mergeNewStudents(prev, incoming)` di `logic.ts` lalu test. Extract dari effect line 106-116.

**File**: `src/app/(admin)/presensi/[meetingId]/logic.ts`

Tambah:
```typescript
/**
 * Merge server attendance into local state.
 * Only adds students missing from local — never overwrites existing entries.
 */
export function mergeNewStudents<T>(
  prev: Record<string, T>,
  incoming: Record<string, T>
): Record<string, T> {
  let hasChanges = false
  const merged = { ...prev }
  Object.keys(incoming).forEach(studentId => {
    if (!merged[studentId]) {
      merged[studentId] = incoming[studentId]
      hasChanges = true
    }
  })
  return hasChanges ? merged : prev
}
```

**Test**:
```typescript
// attendanceSync.test.ts
import { describe, it, expect } from 'vitest'
import { mergeNewStudents } from '../logic'

describe('mergeNewStudents', () => {
  it('adds new students from server', () => {
    const prev = { 'a': { status: 'H' } }
    const incoming = { 'a': { status: 'A' }, 'b': { status: 'H' } }
    const result = mergeNewStudents(prev, incoming)
    expect(result['a'].status).toBe('H')   // local preserved
    expect(result['b'].status).toBe('H')   // new student added
  })

  it('returns same reference when no new students', () => {
    const prev = { 'a': { status: 'H' } }
    const incoming = { 'a': { status: 'A' } }
    const result = mergeNewStudents(prev, incoming)
    expect(result).toBe(prev)  // referential equality — no re-render
  })

  it('handles empty prev', () => {
    const prev = {}
    const incoming = { 'a': { status: 'H' } }
    const result = mergeNewStudents(prev, incoming)
    expect(result['a'].status).toBe('H')
  })
})
```

**Update effect di page.tsx** — ganti inline merge dengan `mergeNewStudents`:
```typescript
import { mergeNewStudents } from './logic'

// Before (inline):
setLocalAttendance(prev => {
  let hasChanges = false
  const merged = { ...prev }
  Object.keys(attendance).forEach(studentId => {
    if (!merged[studentId]) {
      merged[studentId] = attendance[studentId]
      hasChanges = true
    }
  })
  return hasChanges ? merged : prev
})

// After (extracted):
setLocalAttendance(prev => mergeNewStudents(prev, attendance))
```

---

## Task 3 — Type-check

```bash
npm run type-check
# Expected: 0 errors
```

---

## Expected Behavior After Fix

1. User pilih Hadir, klik Save
2. Toast "berhasil disimpan" muncul
3. Radio **tetap Hadir** (tidak balik ke Alfa)
4. `mutate()` revalidate SWR di background
5. `isDirty` menjadi `false` setelah server data settle
6. Cross-device sync tetap bekerja (realtime effect tidak terpengaruh)

---

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan? Tidak — ini bugfix, extract helper.
- [ ] Apakah ada tabel database baru? Tidak.
- [ ] Apakah ada route/page baru? Tidak.
- [ ] Apakah ada permission pattern baru? Tidak.
- [ ] Update docs jika perlu → tidak perlu untuk bugfix ini.

---

## Commit Message Template

```
fix(presensi): preserve local attendance after save (sm-40pi)

- Remove hasInitialized.current=false reset after save — local state
  is already correct; mutate() only needs to revalidate SWR baseline
- Extract mergeNewStudents() helper from inline effect for testability
- Add regression test: stale server data must not clobber saved local state

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
