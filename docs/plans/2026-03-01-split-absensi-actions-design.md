# Design: Split absensi/actions.ts into actions/ folder (PILOT)

**Date:** 2026-03-01
**Beads Issue:** sm-vpo
**Status:** Approved
**Type:** Refactoring (Pilot)

---

## Overview

Refactor `src/app/(admin)/absensi/actions.ts` (2,524 lines) into a modular `actions/` folder using a 3-layer functional architecture. This serves as the pilot implementation that will establish the pattern for refactoring other God files in the codebase.

**Goal:** Reduce complexity, improve testability, and establish consistent architecture pattern.

**Constraints:**
- Pure refactoring - NO behavior changes
- Backward compatible - existing imports must work
- Functional style only (no classes/OOP)
- One session execution (Big Bang migration)

---

## Architecture

### Folder Structure

```
src/app/(admin)/absensi/
├── actions/
│   ├── meetings.ts       ← Meeting CRUD + queries (6 server actions)
│   ├── attendance.ts     ← Attendance operations (6 server actions)
│   └── index.ts          ← Re-exports for backward compatibility
├── components/           (unchanged)
├── hooks/                (unchanged)
├── stores/               (unchanged)
├── utils/                (unchanged)
└── page.tsx              (unchanged)
```

### 3-Layer Pattern (Per Domain File)

Each domain file (`meetings.ts`, `attendance.ts`) follows this internal structure:

```typescript
'use server'

// ─── LAYER 1: QUERIES (private, DB access only) ──────────────
// - Prefix: fetch*, insert*, update*, delete*
// - Receive supabase client as parameter
// - Return raw data or throw error
// - NOT exported (internal to file)

async function fetchMeetingById(supabase, id) { ... }
async function insertMeeting(supabase, data) { ... }

// ─── LAYER 2: BUSINESS LOGIC (exported, pure, testable) ──────
// - Pure functions, no DB calls, no side effects
// - Can be tested without mocking
// - Exported for reuse and testing

export function validateMeetingData(data) { ... }
export function buildStudentSnapshot(students, classIds) { ... }

// ─── LAYER 3: SERVER ACTIONS (exported, thin orchestrator) ───
// - Entry points for client components
// - Orchestrate Layer 1 + Layer 2
// - Handle auth, permissions, revalidation

export async function createMeeting(data) {
  const supabase = await createClient()
  const validation = validateMeetingData(data)  // L2
  if (!validation.ok) return { success: false, error: validation.error }
  const result = await insertMeeting(supabase, data)  // L1
  revalidatePath('/absensi')
  return { success: true, data: result }
}
```

**Layer Responsibilities:**
- **Layer 1 (Queries):** Database access only, private functions
- **Layer 2 (Business Logic):** Pure functions, testable, exported
- **Layer 3 (Server Actions):** Thin orchestrators, public API

---

## Type Extraction Strategy

### New Global Types

**File: `src/types/meeting.ts` (NEW)**
```typescript
export interface Meeting {
  id: string
  title: string
  date: string
  topic?: string
  description?: string
  class_ids: string[]
  kelompok_ids?: string[]
  meeting_type_code?: string | null
  student_snapshot?: string[]
  created_at: string
  created_by: string
}

export interface CreateMeetingData {
  classIds: string[]
  kelompokIds?: string[]
  date: string
  title: string
  topic?: string
  description?: string
  meetingTypeCode?: string | null
  studentIds?: string[]
}

export interface UpdateMeetingData extends Partial<CreateMeetingData> {}
```

**File: `src/types/attendance.ts` (NEW)**
```typescript
export interface AttendanceLog {
  id: string
  student_id: string
  date: string
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
  recorded_by: string
  created_at: string
  updated_at: string
}

export interface AttendanceData {
  student_id: string
  date: string
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
}

export interface AttendanceStats {
  total_students: number
  present: number
  sick: number
  permission: number
  absent: number
  percentage: number
}
```

**Rationale:**
- Meeting and Attendance are shared entities used across features (absensi, laporan, rapot)
- Prevents type fragmentation (follows CLAUDE.md guidelines)
- Matches existing pattern (`src/types/student.ts`)

---

## File-by-File Breakdown

### File 1: `actions/meetings.ts` (~800 lines)

**Layer 3 - Server Actions (6 functions):**
1. `createMeeting(data)` - Create new meeting with student snapshot
2. `updateMeeting(meetingId, data)` - Update existing meeting
3. `deleteMeeting(meetingId)` - Soft delete meeting
4. `getMeetingById(meetingId)` - Get single meeting with full details
5. `getMeetingsByClass(classId?, limit?, cursor?)` - Paginated meeting list
6. `getMeetingsWithStats(classId?, limit?, cursor?)` - Meetings with attendance stats

**Layer 2 - Business Logic (extracted from inline code):**
- `validateMeetingData(data)` - Validation rules
- `canUserAccessMeeting(user, meeting)` - Permission check
- `buildStudentSnapshot(students, classIds)` - Build student list
- `transformMeetingData(rawMeeting)` - Transform DB data to client format

**Layer 1 - Queries (private):**
- `fetchMeetingById(supabase, id)`
- `fetchMeetingsByClass(supabase, classId, limit, cursor)`
- `insertMeeting(supabase, data)`
- `updateMeetingRecord(supabase, id, data)`
- `softDeleteMeeting(supabase, id)`

---

### File 2: `actions/attendance.ts` (~600 lines)

**Layer 3 - Server Actions (6 functions):**
1. `saveAttendance(attendanceData)` - Save attendance for multiple students
2. `saveAttendanceForMeeting(meetingId, attendanceData)` - Save linked to meeting
3. `getAttendanceByDate(date)` - Get attendance by date
4. `getAttendanceByMeeting(meetingId)` - Get attendance for meeting
5. `getAttendanceStats(date)` - Calculate statistics
6. `getStudentsFromSnapshot(studentIds)` - Get student details from IDs

**Layer 2 - Business Logic (extracted):**
- `calculateAttendanceStats(attendanceLogs)` - Aggregate stats (H/I/S/A counts, %)
- `transformAttendanceData(rawData)` - Transform DB to client format
- `validateAttendanceData(data)` - Validation rules

**Layer 1 - Queries (private):**
- `fetchAttendanceByDate(supabase, date)`
- `fetchAttendanceByMeeting(supabase, meetingId)`
- `upsertAttendanceLogs(supabase, records)`
- `fetchStudentsByIds(supabase, ids)`

---

### File 3: `actions/index.ts` (~10 lines)

```typescript
// Re-export all server actions for backward compatibility
export {
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingById,
  getMeetingsByClass,
  getMeetingsWithStats,
} from './meetings'

export {
  saveAttendance,
  saveAttendanceForMeeting,
  getAttendanceByDate,
  getAttendanceByMeeting,
  getAttendanceStats,
  getStudentsFromSnapshot,
} from './attendance'
```

**Purpose:** Existing imports like `import { createMeeting } from '@/app/(admin)/absensi/actions'` automatically resolve to `actions/index.ts` and continue working.

---

## Migration Strategy: Big Bang Approach

**Execution in 1 session:**

1. **Create new files** - Copy-paste code from `actions.ts` to domain files
2. **Apply 3-layer structure** - Reorganize code within each file
3. **Extract types** - Move interfaces to `src/types/`
4. **Create index.ts** - Add re-exports
5. **Delete old file** - Remove `actions.ts`
6. **Verify types** - `npm run type-check`
7. **Manual test** - Test key flows

**Why Big Bang?**
- ✅ Clean cutover, no intermediate state
- ✅ Faster (1 session vs 3)
- ✅ Backward compatible via index.ts re-exports
- ✅ Easy to verify (one test session covers everything)

**Risk:** Low (pure refactoring + re-exports guarantee compatibility)

---

## Testing Strategy

### Phase 1: Test Layer 2 Business Logic (PRIORITY)

Pure functions are easy to test without DB mocking:

**For meetings.ts:**
```typescript
// Test file: src/app/(admin)/absensi/utils/__tests__/meetingValidation.test.ts

describe('validateMeetingData', () => {
  test('returns error when classIds is empty', () => {
    const result = validateMeetingData({ classIds: [], date: '2026-03-01', title: 'Test' })
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Class')
  })

  test('returns ok when all required fields present', () => {
    const result = validateMeetingData({
      classIds: ['123'],
      date: '2026-03-01',
      title: 'Test Meeting'
    })
    expect(result.ok).toBe(true)
  })
})

describe('buildStudentSnapshot', () => {
  test('filters students by class IDs', () => {
    const students = [
      { id: '1', classes: [{ id: 'c1' }] },
      { id: '2', classes: [{ id: 'c2' }] }
    ]
    const result = buildStudentSnapshot(students, ['c1'])
    expect(result).toEqual(['1'])
  })
})
```

**For attendance.ts:**
```typescript
// Extend existing: src/app/(admin)/absensi/utils/__tests__/attendanceCalculation.test.ts

describe('calculateAttendanceStats', () => {
  test('calculates correct percentages', () => {
    const logs = [
      { status: 'H' }, { status: 'H' }, { status: 'I' }, { status: 'A' }
    ]
    const stats = calculateAttendanceStats(logs)
    expect(stats.total_students).toBe(4)
    expect(stats.present).toBe(2)
    expect(stats.percentage).toBe(50)
  })
})
```

**Pattern:** Follow existing tests in `src/lib/utils/__tests__/classHelpers.test.ts`

---

### Phase 2: Manual Testing (REQUIRED)

Test these flows after refactoring:

1. **Create Meeting Flow**
   - Navigate to `/absensi`
   - Click "Buat Pertemuan"
   - Fill form, submit
   - Verify meeting appears in list

2. **Save Attendance Flow**
   - Open existing meeting
   - Mark attendance (H/I/S/A)
   - Save
   - Verify attendance saved

3. **View Meetings with Stats**
   - Check paginated list loads
   - Verify attendance stats display correctly

---

### Phase 3: Skip for Pilot

- **Server Actions (Layer 3)** - Requires Supabase mock (out of scope)
- **Database Queries (Layer 1)** - Requires integration test setup

Focus on Layer 2 because:
- ✅ High value (catches business logic bugs)
- ✅ Easy to test (no mocking)
- ✅ Fast to run
- ✅ Establishes pattern for future refactorings

---

## Verification Checklist

After implementation:

- [ ] `npm run type-check` - No TypeScript errors
- [ ] `npm run test:run` - All existing tests pass
- [ ] `npm run build` - Production build succeeds
- [ ] Manual test: Create meeting works
- [ ] Manual test: Save attendance works
- [ ] Manual test: View meetings list works
- [ ] `git diff --stat` - Verify no logic changes (file moves + re-exports only)
- [ ] All new Layer 2 functions have unit tests

---

## Success Criteria

✅ `actions.ts` (2,524 lines) split into 2 domain files (~800 + ~600 lines)
✅ All 12 server actions re-exported via `index.ts`
✅ Types extracted to `src/types/meeting.ts` and `src/types/attendance.ts`
✅ Backward compatible - existing imports work without changes
✅ Layer 2 business logic functions have unit tests
✅ Manual testing confirms no regressions
✅ Pattern established for future refactorings (sm-dsw, sm-9o0, etc.)

---

## Next Steps

After this pilot succeeds:
1. Apply same pattern to `users/siswa/actions.ts` (sm-dsw)
2. Apply to `laporan/actions.ts` (sm-9o0)
3. Update `docs/claude/architecture-patterns.md` with this pattern
4. Document in CLAUDE.md

---

## Related Issues

- **Blocks:** sm-9o0, sm-dsw, sm-s3y, sm-uk4, sm-4tl
- **Reference:** `docs/plan/refactoring-god-file-decomposition.md`

---

**Design Approved:** 2026-03-01
**Ready for Implementation:** Yes
