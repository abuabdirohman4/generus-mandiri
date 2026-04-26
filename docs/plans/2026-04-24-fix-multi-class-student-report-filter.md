# Plan: Fix Multi-Class Student Visibility in Reports + Student Detail Class Filter

**Date**: 2026-04-24  
**Priority**: P1 (Bug — data tampil salah di fitur utama)  
**Affects**: Halaman Laporan (`/laporan`) + Halaman Detail Siswa (`/users/siswa/[studentId]`)

---

## Problem Statement

### Bug 1: Siswa multi-kelas tidak muncul di laporan saat pilih satu kelas

Siswa yang terdaftar di 2 kelas (contoh: "Pra Nikah 1" + "Pengajar") hanya muncul di tabel laporan **jika kedua kelas dipilih bersamaan**. Jika hanya satu kelas dipilih, siswa tidak muncul sama sekali.

**Root cause:** `filterAttendanceByClass` di `logic.ts:370-380` menggunakan enrollment check via `enrollmentMap`. Student hanya lolos jika dia terdaftar di `student_classes` untuk kelas yang difilter. Tapi siswa multi-kelas mungkin hanya terdaftar di kelas lain — attendance log-nya tetap valid (dia hadir di meeting kelas itu), tapi enrollment check mem-block dia.

### Bug 2: Persentase kehadiran kelas salah untuk siswa multi-kelas

Karena siswa multi-kelas tidak masuk ke laporan ketika filter satu kelas, persentase kehadiran kelas jadi **under-count** — student tersebut tidak dihitung di denominator maupun numerator.

### Bug 3: Tidak ada filter kelas di halaman detail siswa

Di `/users/siswa/[studentId]`, jika siswa punya 2+ kelas, tidak ada cara untuk melihat attendance per-kelas. Semua attendance dari semua kelas ditampilkan bercampur.

---

## Analysis

### `filterAttendanceByClass` — Current Logic (logic.ts:339-383)

```typescript
// Current: filter attendance logs by enrollment
for (const meetingClassId of matchingClassIds) {
    const kelompokMapForClass = enrollmentMap.get(meetingClassId)
    if (!kelompokMapForClass) continue
    for (const [, enrolledStudents] of kelompokMapForClass.entries()) {
        if (enrolledStudents.has(student.id)) {
            return true  // Only pass if enrolled in this specific class
        }
    }
}
return false  // ← BLOCKS multi-class students who have valid attendance
```

**Problem:** If student A is enrolled in "Pengajar" but also attends "Pra Nikah 1" meetings (possibly because they're in both via `student_classes`), the enrollment check looks only at `enrollmentMap` which is built from `student_classes`. If student A's `student_classes` entry for "Pra Nikah 1" exists but wasn't fetched (or doesn't exist), they get blocked.

**Wait — re-reading the code more carefully:**

`fetchStudentClassesForEnrollment` fetches ALL student_classes where `class_id IN (all class IDs from meetings)`. So if student A is in `student_classes` for BOTH classes, they SHOULD appear in `enrollmentMap` for both. 

**The actual scenario causing the bug:** When a student has 2 classes, their attendance logs exist for BOTH class meetings. When filter = "Pra Nikah 1":
- Log from "Pra Nikah 1" meeting → enrollment check for "Pra Nikah 1" → student A IS in enrollment → **PASS** ✅
- But if for some reason enrollment check fails (student not in student_classes for that class but IS in meeting via multi-class meeting `class_ids`)...

**Most likely root cause:** Some students have their primary `class_id` set but may not have ALL classes in `student_classes`. The system supports both `class_id` (legacy) and `student_classes` (junction). If student A's "Pra Nikah 1" enrollment is via legacy `class_id` only (not in `student_classes`), then `enrollmentMap` won't have them for "Pra Nikah 1".

**Fix:** In `filterAttendanceByClass`, fall back to checking if the student's `class_id` (legacy field) matches the meeting class, in addition to the enrollment map check.

---

## Solution Design

### Fix 1: `filterAttendanceByClass` — Add Legacy class_id Fallback

**File:** `src/app/(admin)/laporan/actions/reports/logic.ts`

Add fallback check: if student is NOT found in enrollmentMap, check if student's `class_id` (from `log.students.class_id`) matches any of the matching class IDs. Also need to pass student data into the check.

The `log.students` object already has `class_id` field (fetched in `fetchStudentDetails`).

```typescript
// After enrollment map check fails, add fallback:
// Check if student's primary class_id matches any matching class
if (student.class_id && matchingClassIds.includes(student.class_id)) {
    return true
}

// Also check student_classes from enriched student data
const studentClassIds = (student.student_classes || [])
    .map((sc: any) => sc.classes?.id || sc.class_id)
    .filter(Boolean)

return matchingClassIds.some(id => studentClassIds.includes(id))
```

### Fix 2: `[studentId]/page.tsx` — Add Class Filter for Multi-Class Students

**File:** `src/app/(admin)/users/siswa/[studentId]/page.tsx`

Add:
- `selectedClassId` state (default: `null` = all classes)
- Class filter tabs/buttons UI (only shown if student has 2+ classes)
- Pass `selectedClassId` to `useStudentDetail` hook
- Filter `attendanceLogs` by class when `selectedClassId` is set

**File:** `src/app/(admin)/users/siswa/[studentId]/hooks/useStudentDetail.ts`

Pass `classId` to `getStudentAttendanceHistory`:
```typescript
const { data: attendanceData } = useSWR(
    studentId ? `attendance-${studentId}-${year}-${month}-${classId || 'all'}` : null,
    () => getStudentAttendanceHistory(studentId, year, month, classId || undefined),
)
```

**File:** `src/app/(admin)/users/siswa/actions/students/actions.ts` — `getStudentAttendanceHistory`

Add optional `classId` param. Filter attendance logs by class if provided.

**File:** `src/app/(admin)/users/siswa/actions/students/queries.ts` — `fetchStudentAttendanceHistory`

Add optional class filter to attendance log query.

---

## Tasks

### Task 1: Fix `filterAttendanceByClass` in logic.ts (Bug 1 & 2)

**File:** `src/app/(admin)/laporan/actions/reports/logic.ts`

**Current code (lines 370-380):**
```typescript
// STRICT enrollment check: student must be enrolled in ANY of the matching classes
for (const meetingClassId of matchingClassIds) {
    const kelompokMapForClass = enrollmentMap.get(meetingClassId)
    if (!kelompokMapForClass) continue

    for (const [, enrolledStudents] of kelompokMapForClass.entries()) {
        if (enrolledStudents.has(student.id)) {
            return true
        }
    }
}

return false
```

**New code:**
```typescript
// Check enrollment map (junction table)
for (const meetingClassId of matchingClassIds) {
    const kelompokMapForClass = enrollmentMap.get(meetingClassId)
    if (!kelompokMapForClass) continue

    for (const [, enrolledStudents] of kelompokMapForClass.entries()) {
        if (enrolledStudents.has(student.id)) {
            return true
        }
    }
}

// Fallback: Check student's primary class_id (legacy support)
if (student.class_id && matchingClassIds.includes(student.class_id)) {
    return true
}

// Fallback: Check student's student_classes data (if enriched)
const studentClassIds = (student.student_classes || [])
    .map((sc: any) => sc.classes?.id || sc.class_id)
    .filter(Boolean)

return matchingClassIds.some((id: string) => studentClassIds.includes(id))
```

**TDD:**
- Write test: student with 2 classes, filter by class 1 → should appear
- Write test: student with 2 classes, filter by class 2 → should appear
- Write test: student with only class 1, filter by class 2 → should NOT appear
- Write test: student with class_id (legacy) matching filter class → should appear
- Run test RED, implement fix, run test GREEN

**Files changed:** 1 file, ~10 lines

---

### Task 2: Check if `fetchStudentDetails` query returns enough data for fallback

**File:** `src/app/(admin)/laporan/actions/reports/queries.ts`

The `fetchStudentDetails` query already includes:
```sql
class_id,  -- ← primary class (legacy)
student_classes (
    class_id,
    classes:class_id (id, name, kelompok_id, ...)
)
```

This is sufficient for the fallback check. ✅ No change needed.

But verify the enriched log's `students` field has `class_id` and `student_classes` after `enrichAttendanceLogs`. The function at `logic.ts:239` maps `students: studentMap.get(log.student_id)` — which is the full student object from `studentsData`. ✅ Confirmed sufficient.

---

### Task 3: Add class filter to student detail page (Bug 3)

**File:** `src/app/(admin)/users/siswa/[studentId]/page.tsx`

Add class filter state and UI:

```typescript
// Add state
const [selectedClassId, setSelectedClassId] = useState<string | null>(null)

// Pass to hook
const { student, attendanceLogs, stats, isLoading, error } = useStudentDetail(
    studentId, 
    currentDate,
    selectedClassId  // NEW
)

// Add UI (after student name header, only if student has 2+ classes)
{student && student.classes && student.classes.length > 1 && (
    <div className="flex justify-center gap-2 mb-4">
        <button
            className={`px-3 py-1 rounded-full text-sm ${!selectedClassId ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            onClick={() => setSelectedClassId(null)}
        >
            Semua Kelas
        </button>
        {student.classes.map(cls => (
            <button
                key={cls.id}
                className={`px-3 py-1 rounded-full text-sm ${selectedClassId === cls.id ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                onClick={() => setSelectedClassId(cls.id)}
            >
                {cls.name}
            </button>
        ))}
    </div>
)}
```

Also reset `selectedClassId` when navigating months (don't reset — actually keep it, user probably wants to stay on same class while browsing months).

---

### Task 4: Update `useStudentDetail` hook to accept classId

**File:** `src/app/(admin)/users/siswa/[studentId]/hooks/useStudentDetail.ts`

```typescript
export function useStudentDetail(
    studentId: string, 
    currentDate: dayjs.Dayjs,
    classId?: string | null   // NEW
) {
    // ...
    const { data: attendanceData } = useSWR<AttendanceHistoryResponse>(
        studentId ? `attendance-${studentId}-${year}-${month}-${classId || 'all'}` : null,
        () => getStudentAttendanceHistory(studentId, year, month, classId || undefined),
        // ...
    )
```

---

### Task 5: Update `getStudentAttendanceHistory` action

**File:** `src/app/(admin)/users/siswa/actions/students/actions.ts`

Add optional `classId` param. If provided, filter attendance logs to only those from meetings of that class.

```typescript
export async function getStudentAttendanceHistory(
    studentId: string,
    year: number,
    month: number,
    classId?: string   // NEW
): Promise<AttendanceHistoryResponse> {
    // ...
    const { data: attendanceLogs, error } = await fetchStudentAttendanceHistory(
        supabase,
        studentId,
        startDate,
        endDate,
        classId  // NEW
    )
    // ...
}
```

---

### Task 6: Update `fetchStudentAttendanceHistory` query

**File:** `src/app/(admin)/users/siswa/actions/students/queries.ts`

Find `fetchStudentAttendanceHistory` function and add class filter. Need to check what the current query looks like first.

The query fetches `attendance_logs` joined with `meetings`. To filter by class, we need to filter where `meetings.class_id = classId` OR `meetings.class_ids @> ARRAY[classId]`.

In Supabase/PostgREST, filtering on joined table:
```typescript
// Filter meetings by class
if (classId) {
    // This filters attendance logs where the meeting's class_id matches
    query = query.eq('meetings.class_id', classId)
    // BUT this doesn't handle class_ids array...
    // Better: fetch all logs and filter client-side
}
```

Since PostgREST doesn't support OR conditions easily across joined tables + arrays, filter client-side in the action instead:

In `getStudentAttendanceHistory`, after fetching, filter if classId provided:
```typescript
let filteredLogs = attendanceLogs || []
if (classId) {
    filteredLogs = filteredLogs.filter((log: any) => {
        const meeting = log.meetings
        if (!meeting) return false
        if (meeting.class_id === classId) return true
        if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
            return meeting.class_ids.includes(classId)
        }
        return false
    })
}
```

For this to work, the attendance log query must also fetch `meetings.class_id` and `meetings.class_ids`. Need to verify `fetchStudentAttendanceHistory` in queries.ts.

---

### Task 7: Write tests for logic changes

**File:** `src/app/(admin)/laporan/actions/reports/__tests__/logic.test.ts`

Add test cases:
```typescript
describe('filterAttendanceByClass - multi-class students', () => {
    it('should include student enrolled in filtered class via student_classes', () => { ... })
    it('should include student with matching legacy class_id', () => { ... })
    it('should include student enrolled in OTHER class but attending filtered class meeting', () => { ... })
    it('should exclude student not enrolled in filtered class at all', () => { ... })
    it('should include student with class_id in student_classes array', () => { ... })
})
```

---

## Test Plan

### Unit Tests
1. `logic.test.ts` — Add multi-class filter tests (Task 7)
2. Run: `npm run test:run -- --grep "filterAttendanceByClass"`

### Manual Verification
1. Create/find a student enrolled in 2 classes
2. Create meetings for each class with that student attending
3. Go to Laporan → filter by class 1 only → student should appear
4. Go to Laporan → filter by class 2 only → student should appear
5. Attendance rate should reflect only the filtered class's meetings

### Student Detail Page
1. Find student with 2+ classes
2. Visit `/users/siswa/[id]`
3. Should see class filter buttons
4. Select class 1 → only class 1 meetings shown
5. Select "Semua Kelas" → all meetings shown

---

## Commit Message Template

```
fix: multi-class student visibility in laporan and student detail filter

- Fix filterAttendanceByClass to include multi-class students via legacy
  class_id fallback and student_classes data check
- Add class filter UI to student detail page for students with 2+ classes
- Update getStudentAttendanceHistory to accept optional classId filter
- Fix attendance rate calculation for classes with multi-class students

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/app/(admin)/laporan/actions/reports/logic.ts` | Add fallback checks in `filterAttendanceByClass` |
| `src/app/(admin)/laporan/actions/reports/__tests__/logic.test.ts` | Add multi-class filter tests |
| `src/app/(admin)/users/siswa/[studentId]/page.tsx` | Add class filter state + UI |
| `src/app/(admin)/users/siswa/[studentId]/hooks/useStudentDetail.ts` | Add classId param |
| `src/app/(admin)/users/siswa/actions/students/actions.ts` | Add classId param to history |
| `src/app/(admin)/users/siswa/actions/students/queries.ts` | Check if class filter needed |

**Total: 6 files, ~100 lines** → Antigravity recommended
