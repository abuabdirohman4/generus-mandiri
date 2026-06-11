# Plan: sm-8pv — Filter Siswa Tidak Aktif di Laporan Presensi

**Date:** 2026-06-12  
**Issue:** sm-8pv  
**Priority:** P1 (bug)

---

## Problem

Halaman laporan presensi menampilkan siswa yang tidak aktif (`status = 'graduated'` atau `status = 'inactive'`). Seharusnya hanya siswa aktif (`status = 'active'`) yang muncul.

### Root Cause

`fetchStudentDetails` di `queries.ts` tidak meng-include kolom `status` pada select query. Akibatnya `enrichAttendanceLogs` di `logic.ts` tidak punya data status untuk filter, dan filter `.filter((log) => log.students && log.date)` tidak cek `status`.

Flow: `attendance_logs` tetap ada di DB untuk siswa archived → logs di-fetch → student di-fetch tanpa filter status → laporan menampilkan semua siswa.

---

## Files Affected

| File | Change |
|------|--------|
| `src/app/(admin)/laporan/actions/reports/queries.ts` | Tambah `status` ke select di `fetchStudentDetails` |
| `src/app/(admin)/laporan/actions/reports/logic.ts` | Filter `status !== 'active'` di `enrichAttendanceLogs` |
| `src/app/(admin)/laporan/actions/reports/__tests__/logic.test.ts` | Tambah test case inactive/graduated students |

Total: ~3 files, ~20 lines changed.

---

## Implementation

### Task 1: Update `fetchStudentDetails` — tambah `status` ke select

**File:** `src/app/(admin)/laporan/actions/reports/queries.ts`  
**Location:** Function `fetchStudentDetails`, line ~130

**Current select query (partial):**
```typescript
return fetchStudentsInBatches(supabase, studentIds, `
  id,
  name,
  gender,
  class_id,
  kelompok_id,
  desa_id,
  daerah_id,
  classes:class_id (
```

**Change:** Tambah `status` setelah `id`:
```typescript
return fetchStudentsInBatches(supabase, studentIds, `
  id,
  name,
  gender,
  status,
  class_id,
  kelompok_id,
  desa_id,
  daerah_id,
  classes:class_id (
```

### Task 2: Filter siswa tidak aktif di `enrichAttendanceLogs`

**File:** `src/app/(admin)/laporan/actions/reports/logic.ts`  
**Location:** Function `enrichAttendanceLogs`, line ~236

**Current filter:**
```typescript
.filter((log: any) => log.students && log.date)
```

**Change:**
```typescript
.filter((log: any) => log.students && log.date && log.students.status === 'active')
```

**Why here (not in queries):** `enrichAttendanceLogs` sudah jadi choke-point filter, pure function, mudah di-test. Konsisten dengan pattern "filter di logic layer".

### Task 3: TDD — Tulis test dulu (RED), lalu verify fix (GREEN)

**File:** `src/app/(admin)/laporan/actions/reports/__tests__/logic.test.ts`  
**Location:** Setelah existing `enrichAttendanceLogs` tests (~line 175)

**Test cases to add:**

```typescript
it('filters out logs for inactive students', () => {
    const studentMapWithInactive = new Map([
        ['s1', { id: 's1', name: 'Budi', status: 'active' }],
        ['s2', { id: 's2', name: 'Siti', status: 'inactive' }],
    ])
    const result = enrichAttendanceLogs(
        [
            { meeting_id: 'm1', student_id: 's1', status: 'H' },
            { meeting_id: 'm1', student_id: 's2', status: 'H' },
        ],
        studentMapWithInactive, meetingMap
    )
    expect(result).toHaveLength(1)
    expect(result[0].students.name).toBe('Budi')
})

it('filters out logs for graduated students', () => {
    const studentMapWithGraduated = new Map([
        ['s1', { id: 's1', name: 'Budi', status: 'active' }],
        ['s3', { id: 's3', name: 'Ahmad', status: 'graduated' }],
    ])
    const result = enrichAttendanceLogs(
        [
            { meeting_id: 'm1', student_id: 's1', status: 'H' },
            { meeting_id: 'm1', student_id: 's3', status: 'H' },
        ],
        studentMapWithGraduated, meetingMap
    )
    expect(result).toHaveLength(1)
    expect(result[0].students.name).toBe('Budi')
})

it('includes active students', () => {
    const studentMapAllActive = new Map([
        ['s1', { id: 's1', name: 'Budi', status: 'active' }],
        ['s4', { id: 's4', name: 'Dewi', status: 'active' }],
    ])
    const result = enrichAttendanceLogs(
        [
            { meeting_id: 'm1', student_id: 's1', status: 'H' },
            { meeting_id: 'm1', student_id: 's4', status: 'A' },
        ],
        studentMapAllActive, meetingMap
    )
    expect(result).toHaveLength(2)
})
```

**Note:** Test pakai `studentMap` dengan `status` field — sesuai dengan perubahan Task 1 (status di-fetch dari DB). Test existing (`enriches logs with student and date`) masih valid — student tanpa `status` field akan di-filter (status `undefined !== 'active'`). Tapi ini berarti kita perlu backward-compat: update existing test fixture untuk add `status: 'active'`.

**Update existing test fixtures** di `describe('logic.ts – enrichAttendanceLogs', ...)`:
```typescript
// BEFORE:
const studentMap = new Map([['s1', { id: 's1', name: 'Budi' }]])

// AFTER:
const studentMap = new Map([['s1', { id: 's1', name: 'Budi', status: 'active' }]])
```

---

## TDD Sequence

```
1. Update existing test fixture (add status: 'active')
2. Add 3 new test cases (RED — akan fail karena logic belum filter status)
3. npm run test:run -- --reporter=verbose src/.../laporan/.../logic.test.ts
   → Verify 3 new tests FAIL
4. Implement Task 1 (queries.ts: add status to select)
5. Implement Task 2 (logic.ts: add status filter)
6. npm run test:run -- --reporter=verbose src/.../laporan/.../logic.test.ts
   → Verify ALL tests PASS
7. npm run test:run (full suite)
   → Verify no regressions
8. npm run type-check
```

---

## Verification

Setelah implementasi:
- `npm run test:run` — semua test pass
- `npm run type-check` — no TS errors
- Manual: buka halaman laporan, pilih periode — siswa inactive/graduated tidak muncul

---

## Commit Message

```
fix: filter inactive/graduated students from laporan presensi

Students with status 'graduated' or 'inactive' were appearing in
attendance reports because fetchStudentDetails didn't select the
status field and enrichAttendanceLogs didn't filter by it.

Fixes #<GH-number>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU? → Tidak. Filter status sudah umum, bukan pattern baru.
- [ ] Apakah ada tabel database baru? → Tidak. Hanya tambah kolom `status` ke existing query.
- [ ] Apakah ada route/page baru? → Tidak.
- [ ] Apakah ada permission pattern baru? → Tidak.
