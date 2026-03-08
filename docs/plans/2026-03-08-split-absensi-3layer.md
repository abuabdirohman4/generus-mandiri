# Apply 3-Layer Pattern to absensi (Separated Files) - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `absensi/actions/` from sm-vpo pattern (layers mixed in same file) to sm-d15 gold standard (layers in separate files per domain).

**Architecture:** Split each domain (meetings, attendance) into 6 files: queries.ts (Layer 1), logic.ts (Layer 2), actions.ts (Layer 3), helpers.server.ts, helpers.client.ts, and co-located __tests__/. Maintain 100% backward compatibility via index.ts re-exports.

**Tech Stack:** Next.js 15, TypeScript 5, Vitest, Supabase

**Reference Design:** `docs/plans/2026-03-08-split-absensi-3layer-design.md`

---

## Task 1: Create meetings/queries.ts (Layer 1)

**Files:**
- Create: `src/app/(admin)/absensi/actions/meetings/queries.ts`
- Read: `src/app/(admin)/absensi/actions/meetings.ts` (lines 24-250 for Layer 1 queries)

**Step 1: Create meetings folder and queries.ts skeleton**

```bash
mkdir -p src/app/\(admin\)/absensi/actions/meetings
```

Create `src/app/(admin)/absensi/actions/meetings/queries.ts`:

```typescript
// NO 'use server' directive - pure query builders
import type { SupabaseClient } from '@supabase/supabase-js'

// Export all query functions that accept supabase client as parameter
// These will be extracted from meetings.ts Layer 1 private functions
```

**Step 2: Extract fetchMeetingById from meetings.ts**

Read `meetings.ts` lines 24-80 (fetchMeetingById function).

Add to `queries.ts`:

```typescript
export async function fetchMeetingById(supabase: SupabaseClient, meetingId: string) {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      id,
      class_id,
      class_ids,
      kelompok_ids,
      teacher_id,
      title,
      date,
      topic,
      description,
      student_snapshot,
      created_at,
      updated_at,
      meeting_type_code,
      created_by,
      classes (
        id,
        name,
        kelompok_id,
        kelompok:kelompok_id (
          id,
          name,
          desa_id,
          desa:desa_id (
            id,
            name,
            daerah_id,
            daerah:daerah_id (
              id,
              name
            )
          )
        )
      )
    `)
    .eq('id', meetingId)
    .single()

  return { data, error }
}
```

**Step 3: Extract remaining Layer 1 queries**

Extract these functions from `meetings.ts` (change from `async function` to `export async function`, add `supabase: SupabaseClient` as first parameter):
- `fetchMeetingsByClass`
- `fetchMeetingsByKelompok`
- `insertMeeting`
- `updateMeetingRecord`
- `softDeleteMeeting`

All should follow same pattern: accept `supabase` client, return `{ data, error }`.

**Step 4: Type-check**

```bash
npm run type-check
```

Expected: No errors in queries.ts

**Step 5: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/meetings/queries.ts
git commit -m "feat(absensi): create meetings/queries.ts Layer 1

Extract database queries from meetings.ts to separate file.
All queries accept supabase client as parameter for testability.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create meetings/logic.ts (Layer 2)

**Files:**
- Create: `src/app/(admin)/absensi/actions/meetings/logic.ts`
- Migrate from: `src/app/(admin)/absensi/utils/meetingValidation.ts`

**Step 1: Copy meetingValidation.ts to logic.ts**

```bash
cp src/app/\(admin\)/absensi/utils/meetingValidation.ts src/app/\(admin\)/absensi/actions/meetings/logic.ts
```

**Step 2: Remove 'use server' directive if present**

Edit `logic.ts` - ensure NO `'use server'` at top.

Verify it only has:
- Import statements for types
- Pure function exports (validateMeetingData, buildStudentSnapshot, canUserAccessMeeting)
- No Supabase imports
- No database calls

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/meetings/logic.ts
git commit -m "feat(absensi): create meetings/logic.ts Layer 2

Migrate pure business logic from utils/meetingValidation.ts.
No 'use server' directive - testable without mocking.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create meetings/helpers.server.ts

**Files:**
- Create: `src/app/(admin)/absensi/actions/meetings/helpers.server.ts`
- Migrate from: `src/app/(admin)/absensi/utils/meetingHelpers.ts`

**Step 1: Copy meetingHelpers.ts to helpers.server.ts**

```bash
cp src/app/\(admin\)/absensi/utils/meetingHelpers.ts src/app/\(admin\)/absensi/actions/meetings/helpers.server.ts
```

**Step 2: Verify content**

File should have:
- Import from `@/lib/supabase/server` (createClient, createAdminClient)
- Export `canEditOrDeleteMeeting` function
- NO `'use server'` directive (not a server action, just server-side utility)

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/meetings/helpers.server.ts
git commit -m "feat(absensi): create meetings/helpers.server.ts

Migrate server-side utilities from utils/meetingHelpers.ts.
Use .server.ts suffix for clarity (Next.js convention).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create meetings/helpers.client.ts

**Files:**
- Create: `src/app/(admin)/absensi/actions/meetings/helpers.client.ts`
- Migrate from: `src/app/(admin)/absensi/utils/meetingHelpersClient.ts`

**Step 1: Copy meetingHelpersClient.ts to helpers.client.ts**

```bash
cp src/app/\(admin\)/absensi/utils/meetingHelpersClient.ts src/app/\(admin\)/absensi/actions/meetings/helpers.client.ts
```

**Step 2: Verify content**

File should have:
- Import from `@/lib/supabase/client` (createClient)
- Export `getTeacherClassIds`, `getClassNamesForMeeting`, `canUserEditMeetingAttendance`
- NO `'use server'` directive

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/meetings/helpers.client.ts
git commit -m "feat(absensi): create meetings/helpers.client.ts

Migrate client-side utilities from utils/meetingHelpersClient.ts.
Use .client.ts suffix for clarity (Next.js convention).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Create meetings/actions.ts (Layer 3 - Refactored)

**Files:**
- Create: `src/app/(admin)/absensi/actions/meetings/actions.ts`
- Read: `src/app/(admin)/absensi/actions/meetings.ts` (current file)
- Modify imports to use `./queries`, `./logic`, `./helpers.server`

**Step 1: Create actions.ts with 'use server' directive**

Create `src/app/(admin)/absensi/actions/meetings/actions.ts`:

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { canEditOrDeleteMeeting } from './helpers.server'
import { isCaberawitClass, isTeacherClass } from '@/lib/utils/classHelpers'
import { fetchAttendanceLogsInBatches } from '@/lib/utils/batchFetching'
import {
  validateMeetingData,
  buildStudentSnapshot,
  canUserAccessMeeting
} from './logic'
import {
  fetchMeetingById,
  insertMeeting,
  updateMeetingRecord,
  softDeleteMeeting
} from './queries'
import type {
  Meeting,
  CreateMeetingData,
  UpdateMeetingData
} from '@/types/meeting'

// All server action exports will go here
```

**Step 2: Copy all Layer 3 server actions from old meetings.ts**

Copy these functions (keep as-is, just update imports):
- `createMeeting`
- `updateMeeting`
- `deleteMeeting`
- `getMeetingById`
- `getMeetingsByClass`
- `getMeetingsWithStats` (keep entire 986-line function as-is per Option C)

**Step 3: Update internal function calls**

Replace all calls like:
- `fetchMeetingById(supabase, id)` → `fetchMeetingById(supabase, id)` (same, but imported from `./queries`)
- `validateMeetingData(data)` → `validateMeetingData(data)` (same, but imported from `./logic`)
- `canEditOrDeleteMeeting(id, userId)` → `canEditOrDeleteMeeting(id, userId)` (same, but imported from `./helpers.server`)

Remove all Layer 1 private functions (now in queries.ts).

**Step 4: Type-check**

```bash
npm run type-check
```

Expected: May have errors if old meetings.ts still exists (duplicate exports). Will fix in cleanup task.

**Step 5: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/meetings/actions.ts
git commit -m "feat(absensi): create meetings/actions.ts Layer 3

Refactor server actions to use separated layers:
- Import queries from ./queries (Layer 1)
- Import logic from ./logic (Layer 2)
- Import helpers from ./helpers.server

Keep getMeetingsWithStats as-is (986 lines, defer breakdown).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Create attendance/queries.ts (Layer 1)

**Files:**
- Create: `src/app/(admin)/absensi/actions/attendance/queries.ts`
- Read: `src/app/(admin)/absensi/actions/attendance.ts` (Layer 1 functions)

**Step 1: Create attendance folder and queries.ts**

```bash
mkdir -p src/app/\(admin\)/absensi/actions/attendance
```

Create `src/app/(admin)/absensi/actions/attendance/queries.ts`:

```typescript
// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AttendanceData } from '@/types/attendance'
```

**Step 2: Extract Layer 1 queries from attendance.ts**

Extract these functions (change to `export async function`, add `supabase` parameter):
- `upsertAttendanceLogs(supabase, logs)`
- `fetchAttendanceByDate(supabase, date, classId)`
- `fetchAttendanceByMeeting(supabase, meetingId)`
- `fetchStudentsByIds(supabase, studentIds)`

All should accept `supabase: SupabaseClient` as first parameter, return `{ data, error }`.

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: No errors in queries.ts

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/attendance/queries.ts
git commit -m "feat(absensi): create attendance/queries.ts Layer 1

Extract database queries from attendance.ts to separate file.
All queries accept supabase client for testability.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Create attendance/logic.ts (Layer 2)

**Files:**
- Create: `src/app/(admin)/absensi/actions/attendance/logic.ts`
- Migrate from: `src/app/(admin)/absensi/utils/attendanceCalculation.ts`

**Step 1: Copy attendanceCalculation.ts to logic.ts**

```bash
cp src/app/\(admin\)/absensi/utils/attendanceCalculation.ts src/app/\(admin\)/absensi/actions/attendance/logic.ts
```

**Step 2: Verify content**

Ensure NO `'use server'` directive.

File should export:
- `calculateAttendanceStats`
- `validateAttendanceData`

Pure functions only, no database calls.

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/attendance/logic.ts
git commit -m "feat(absensi): create attendance/logic.ts Layer 2

Migrate pure business logic from utils/attendanceCalculation.ts.
No 'use server' directive - testable without mocking.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Create attendance/actions.ts (Layer 3 - Refactored)

**Files:**
- Create: `src/app/(admin)/absensi/actions/attendance/actions.ts`
- Read: `src/app/(admin)/absensi/actions/attendance.ts`

**Step 1: Create actions.ts with imports**

Create `src/app/(admin)/absensi/actions/attendance/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  calculateAttendanceStats,
  validateAttendanceData
} from './logic'
import {
  upsertAttendanceLogs,
  fetchAttendanceByDate,
  fetchAttendanceByMeeting,
  fetchStudentsByIds
} from './queries'
import type {
  AttendanceData,
  AttendanceLog,
  AttendanceStats
} from '@/types/attendance'

// Server actions will go here
```

**Step 2: Copy all server actions from old attendance.ts**

Copy these functions:
- `saveAttendance`
- `saveAttendanceForMeeting`
- `getAttendanceByDate`
- `getAttendanceByMeeting`
- `getAttendanceStats`
- `getStudentsFromSnapshot`

Update internal calls to use imported functions from `./queries` and `./logic`.

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: May have errors if old attendance.ts still exists.

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/attendance/actions.ts
git commit -m "feat(absensi): create attendance/actions.ts Layer 3

Refactor server actions to use separated layers:
- Import queries from ./queries (Layer 1)
- Import logic from ./logic (Layer 2)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Update actions/index.ts (Re-exports)

**Files:**
- Modify: `src/app/(admin)/absensi/actions/index.ts`

**Step 1: Read current index.ts**

Current content imports from `./meetings` and `./attendance` (old files).

**Step 2: Update to use domain folders**

Replace entire file:

```typescript
// Re-export all server actions for backward compatibility
// Components continue to use: import { createMeeting } from '@/app/(admin)/absensi/actions'

export {
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingById,
  getMeetingsByClass,
  getMeetingsWithStats
} from './meetings/actions'

export {
  saveAttendance,
  saveAttendanceForMeeting,
  getAttendanceByDate,
  getAttendanceByMeeting,
  getAttendanceStats,
  getStudentsFromSnapshot
} from './attendance/actions'
```

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: Should pass (re-exports from new locations)

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/index.ts
git commit -m "refactor(absensi): update index.ts to use domain folders

Change imports from ./meetings.ts to ./meetings/actions.ts
Change imports from ./attendance.ts to ./attendance/actions.ts

Maintains 100% backward compatibility for components.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Delete old action files

**Files:**
- Delete: `src/app/(admin)/absensi/actions/meetings.ts`
- Delete: `src/app/(admin)/absensi/actions/attendance.ts`

**Step 1: Verify new structure works**

```bash
npm run type-check
```

Expected: No errors (index.ts should re-export from new locations)

**Step 2: Delete old files**

```bash
git rm src/app/\(admin\)/absensi/actions/meetings.ts
git rm src/app/\(admin\)/absensi/actions/attendance.ts
```

**Step 3: Type-check again**

```bash
npm run type-check
```

Expected: Should still pass

**Step 4: Commit**

```bash
git commit -m "refactor(absensi): delete old action files

Remove meetings.ts and attendance.ts (layers now separated).
All functionality preserved in domain folders.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Migrate tests to meetings/__tests__/

**Files:**
- Create: `src/app/(admin)/absensi/actions/meetings/__tests__/logic.test.ts`
- Create: `src/app/(admin)/absensi/actions/meetings/__tests__/helpers.client.test.ts`
- Migrate from: `src/app/(admin)/absensi/utils/__tests__/meetingValidation.test.ts`
- Migrate from: `src/app/(admin)/absensi/utils/__tests__/meetingHelpersClient.test.ts`

**Step 1: Create __tests__ folder**

```bash
mkdir -p src/app/\(admin\)/absensi/actions/meetings/__tests__
```

**Step 2: Migrate meetingValidation.test.ts to logic.test.ts**

```bash
cp src/app/\(admin\)/absensi/utils/__tests__/meetingValidation.test.ts src/app/\(admin\)/absensi/actions/meetings/__tests__/logic.test.ts
```

Update import in `logic.test.ts`:

```typescript
// Old:
import { validateMeetingData, buildStudentSnapshot, canUserAccessMeeting } from '../meetingValidation'

// New:
import { validateMeetingData, buildStudentSnapshot, canUserAccessMeeting } from '../logic'
```

**Step 3: Migrate meetingHelpersClient.test.ts**

```bash
cp src/app/\(admin\)/absensi/utils/__tests__/meetingHelpersClient.test.ts src/app/\(admin\)/absensi/actions/meetings/__tests__/helpers.client.test.ts
```

Update import in `helpers.client.test.ts`:

```typescript
// Old:
import { getTeacherClassIds, getClassNamesForMeeting, canUserEditMeetingAttendance } from '../meetingHelpersClient'

// New:
import { getTeacherClassIds, getClassNamesForMeeting, canUserEditMeetingAttendance } from '../helpers.client'
```

**Step 4: Run migrated tests**

```bash
npm run test actions/meetings/__tests__
```

Expected: All tests pass (same tests, new location)

**Step 5: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/meetings/__tests__/
git commit -m "test(absensi): migrate meetings tests to __tests__ folder

Move logic tests from utils/__tests__/meetingValidation.test.ts
Move client helpers tests from utils/__tests__/meetingHelpersClient.test.ts

Co-located with domain code for better organization.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Migrate tests to attendance/__tests__/

**Files:**
- Create: `src/app/(admin)/absensi/actions/attendance/__tests__/logic.test.ts`
- Migrate from: `src/app/(admin)/absensi/utils/__tests__/attendanceCalculation.test.ts`

**Step 1: Create __tests__ folder**

```bash
mkdir -p src/app/\(admin\)/absensi/actions/attendance/__tests__
```

**Step 2: Migrate attendanceCalculation.test.ts**

```bash
cp src/app/\(admin\)/absensi/utils/__tests__/attendanceCalculation.test.ts src/app/\(admin\)/absensi/actions/attendance/__tests__/logic.test.ts
```

Update import in `logic.test.ts`:

```typescript
// Old:
import { calculateAttendanceStats, validateAttendanceData } from '../attendanceCalculation'

// New:
import { calculateAttendanceStats, validateAttendanceData } from '../logic'
```

**Step 3: Run migrated tests**

```bash
npm run test actions/attendance/__tests__
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/attendance/__tests__/
git commit -m "test(absensi): migrate attendance tests to __tests__ folder

Move logic tests from utils/__tests__/attendanceCalculation.test.ts

Co-located with domain code.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Create new query tests

**Files:**
- Create: `src/app/(admin)/absensi/actions/meetings/__tests__/queries.test.ts`
- Create: `src/app/(admin)/absensi/actions/attendance/__tests__/queries.test.ts`

**Step 1: Write meetings queries test**

Create `src/app/(admin)/absensi/actions/meetings/__tests__/queries.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchMeetingById, insertMeeting } from '../queries'

describe('Meeting Queries', () => {
  describe('fetchMeetingById', () => {
    it('should query meetings table with correct id', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect
        })
      } as any

      await fetchMeetingById(mockSupabase, 'test-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  describe('insertMeeting', () => {
    it('should insert meeting and return data', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: mockInsert
        })
      } as any

      const result = await insertMeeting(mockSupabase, { title: 'Test Meeting' })

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(mockInsert).toHaveBeenCalledWith({ title: 'Test Meeting' })
      expect(result.data).toEqual({ id: 'new-id' })
    })
  })
})
```

**Step 2: Write attendance queries test**

Create `src/app/(admin)/absensi/actions/attendance/__tests__/queries.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { upsertAttendanceLogs, fetchAttendanceByDate } from '../queries'

describe('Attendance Queries', () => {
  describe('upsertAttendanceLogs', () => {
    it('should upsert attendance logs', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: [], error: null })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          upsert: mockUpsert
        })
      } as any

      await upsertAttendanceLogs(mockSupabase, [{ student_id: '123', status: 'H' }])

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_logs')
      expect(mockUpsert).toHaveBeenCalled()
    })
  })

  describe('fetchAttendanceByDate', () => {
    it('should query attendance_logs with date filter', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect
        })
      } as any

      await fetchAttendanceByDate(mockSupabase, '2026-03-08', 'class-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('attendance_logs')
      expect(mockSelect).toHaveBeenCalled()
    })
  })
})
```

**Step 3: Run new tests**

```bash
npm run test actions/meetings/__tests__/queries.test.ts
npm run test actions/attendance/__tests__/queries.test.ts
```

Expected: All new tests pass

**Step 4: Commit**

```bash
git add src/app/\(admin\)/absensi/actions/meetings/__tests__/queries.test.ts
git add src/app/\(admin\)/absensi/actions/attendance/__tests__/queries.test.ts
git commit -m "test(absensi): add query layer tests

Add basic structure tests for query builders with mock Supabase.
Validates query construction without database dependency.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Delete old utils files

**Files:**
- Delete: `src/app/(admin)/absensi/utils/meetingValidation.ts`
- Delete: `src/app/(admin)/absensi/utils/attendanceCalculation.ts`
- Delete: `src/app/(admin)/absensi/utils/meetingHelpers.ts`
- Delete: `src/app/(admin)/absensi/utils/meetingHelpersClient.ts`
- Delete: `src/app/(admin)/absensi/utils/__tests__/meetingValidation.test.ts`
- Delete: `src/app/(admin)/absensi/utils/__tests__/attendanceCalculation.test.ts`
- Delete: `src/app/(admin)/absensi/utils/__tests__/meetingHelpersClient.test.ts`
- Keep: `src/app/(admin)/absensi/utils/cache.ts` (shared utility)
- Keep: `src/app/(admin)/absensi/utils/meetingHelpersClient.ts` if used elsewhere (check first)

**Step 1: Verify no imports from old utils files**

```bash
grep -r "from.*absensi/utils/meetingValidation" src/
grep -r "from.*absensi/utils/attendanceCalculation" src/
grep -r "from.*absensi/utils/meetingHelpers" src/
grep -r "from.*absensi/utils/meetingHelpersClient" src/
```

Expected: Only find imports in files we're about to delete (in utils/__tests__/)

If found elsewhere, update those imports to new locations first.

**Step 2: Delete old utils files**

```bash
git rm src/app/\(admin\)/absensi/utils/meetingValidation.ts
git rm src/app/\(admin\)/absensi/utils/attendanceCalculation.ts
git rm src/app/\(admin\)/absensi/utils/meetingHelpers.ts
git rm src/app/\(admin\)/absensi/utils/meetingHelpersClient.ts
git rm src/app/\(admin\)/absensi/utils/__tests__/meetingValidation.test.ts
git rm src/app/\(admin\)/absensi/utils/__tests__/attendanceCalculation.test.ts
git rm src/app/\(admin\)/absensi/utils/__tests__/meetingHelpersClient.test.ts
```

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: No errors (all code migrated to domain folders)

**Step 4: Commit**

```bash
git commit -m "refactor(absensi): delete old utils files

Remove migrated files (now in domain folders):
- meetingValidation.ts → meetings/logic.ts
- attendanceCalculation.ts → attendance/logic.ts
- meetingHelpers.ts → meetings/helpers.server.ts
- meetingHelpersClient.ts → meetings/helpers.client.ts

Keep utils/cache.ts (shared SWR cache utility).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Run full test suite

**Files:**
- Verify: All tests pass

**Step 1: Run all tests**

```bash
npm run test
```

Expected: All tests pass (20+ existing tests + 2 new query tests)

**Step 2: Check test coverage**

```bash
npm run test:coverage
```

Expected:
- Layer 2 (logic.ts files): High coverage (pure functions, well tested)
- Layer 1 (queries.ts files): Basic coverage (structure tests)
- Layer 3 (actions.ts files): Low coverage (integration tests optional)

**Step 3: If any failures, debug and fix**

Common issues:
- Import paths wrong (should use relative paths like `./logic`, not `../utils/...`)
- Missing type imports
- Mock Supabase client not matching query structure

Fix issues and re-run tests.

**Step 4: Document results**

Note test results in commit message or progress file.

---

## Task 16: Production build verification ✅

**Status: COMPLETED** (2026-03-08)

**Files:**
- Verify: Production build succeeds

**Step 1: Run production build**

```bash
npm run build
```

**Result:** ✅ **SUCCESS**
- Build completed in 12.6s
- All 28 routes compiled successfully
- No errors or warnings
- Production bundle sizes:
  - Largest route: /rapot (720 kB first load JS)
  - Middleware: 81.5 kB
  - Shared chunks: 102 kB

**Step 2: Type-check**

```bash
npm run type-check
```

**Result:** ✅ **SUCCESS**
- No TypeScript errors
- All types valid across refactored code

**Verification Summary:**

✅ **Production build: PASS**
✅ **Type-check: PASS**
✅ **All tests: PASS (193/193)**
✅ **Zero breaking changes**
✅ **Zero build warnings**

Common issues checked:
- ✅ No circular dependencies
- ✅ All 'use server' directives present
- ✅ All import paths correct
- ✅ No type errors

**Next:** Task 17 (Documentation update) - SKIP commit as per instructions

---

## Task 17: Update documentation

**Files:**
- Already created: `docs/plans/2026-03-08-split-absensi-3layer-design.md` (in brainstorming)
- Already updated: `docs/claude/architecture-patterns.md` (in brainstorming)

**Step 1: Verify design doc exists**

```bash
cat docs/plans/2026-03-08-split-absensi-3layer-design.md
```

Expected: Full design document with architecture, layer responsibilities, migration strategy

**Step 2: Verify architecture-patterns.md updated**

```bash
grep -A 20 "File Naming Convention" docs/claude/architecture-patterns.md
```

Expected: Section on `.server.ts` / `.client.ts` convention exists

**Step 3: No additional doc updates needed**

Design and architecture docs created during brainstorming phase.

**Step 4: Commit documentation (if any changes)**

```bash
git add docs/
git commit -m "docs(absensi): finalize refactoring documentation

Design and architecture patterns documented during brainstorming.
Reference for future God file refactorings (sm-dsw, sm-9o0, sm-uk4).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 18: Manual smoke test (Optional)

**Files:**
- Test: Create/edit/delete meeting functionality
- Test: Save attendance functionality

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Navigate to /absensi**

Open browser: http://localhost:3000/absensi

**Step 3: Test meeting creation**

1. Click "Buat Pertemuan" button
2. Fill form (select class, date, title)
3. Submit
4. Verify meeting appears in list

Expected: Meeting created successfully

**Step 4: Test attendance save**

1. Click on a meeting
2. Mark attendance for students
3. Save
4. Verify attendance saved

Expected: Attendance persisted

**Step 5: Test meeting edit/delete**

1. Edit meeting title
2. Delete meeting
3. Verify changes reflected

Expected: Edit and delete work

**Step 6: Document smoke test results**

If all manual tests pass, note in progress file or commit message.

---

## Task 19: Close beads issue

**Files:**
- Update: `.beads/issues.jsonl` via `bd close sm-d15`

**Step 1: Show final git status**

```bash
git status
```

Expected: Working tree clean (all changes committed)

**Step 2: Show final file structure**

```bash
tree src/app/\(admin\)/absensi/actions/ -I node_modules
```

Expected:
```
actions/
├── meetings/
│   ├── queries.ts
│   ├── logic.ts
│   ├── actions.ts
│   ├── helpers.server.ts
│   ├── helpers.client.ts
│   └── __tests__/
│       ├── queries.test.ts
│       ├── logic.test.ts
│       └── helpers.client.test.ts
├── attendance/
│   ├── queries.ts
│   ├── logic.ts
│   ├── actions.ts
│   └── __tests__/
│       ├── queries.test.ts
│       └── logic.test.ts
└── index.ts
```

**Step 3: Close beads issue**

```bash
bd close sm-d15 --reason="Refactoring complete. 3-layer pattern applied with separated files. All tests pass, production build succeeds. Pattern documented for sm-dsw, sm-9o0, sm-uk4."
```

Expected: Issue closed successfully

**Step 4: Sync beads**

```bash
bd sync --from-main
```

---

## Success Criteria

**Verification Checklist:**
- ✅ All 20+ tests passing (existing + new query tests)
- ✅ Production build succeeds (`npm run build`)
- ✅ Type-check passes (`npm run type-check`)
- ✅ Zero breaking changes (components still import from `actions/`)
- ✅ Each file <300 lines (except actions.ts with getMeetingsWithStats)
- ✅ Layer separation clear (queries/logic/actions in separate files)
- ✅ Domain code co-located (meetings/, attendance/ folders)
- ✅ File naming follows .server.ts / .client.ts convention
- ✅ Documentation updated (design + architecture patterns)
- ✅ Beads issue sm-d15 closed

**File Count:**
- Created: 15 files (6 meetings + 3 attendance + 6 tests)
- Deleted: 9 files (2 old actions + 4 utils + 3 old tests)
- Net: +6 files

---

## Future Work (Out of Scope)

**Next Issues:**
- **sm-xxx:** Refactor getMeetingsWithStats (break down 986-line function)
- **sm-dsw:** Apply pattern to users/siswa/actions.ts (1,682 lines)
- **sm-9o0:** Apply pattern to laporan/actions.ts (1,111 lines)
- **sm-uk4:** Apply pattern to remaining God files (materi, rapot, guru, etc.)

All future refactorings should follow this sm-d15 gold standard pattern.
