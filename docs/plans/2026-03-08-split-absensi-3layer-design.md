# Design: Apply 3-Layer Pattern to absensi (Separated Files)

**Date:** 2026-03-08
**Beads Issue:** sm-d15
**Status:** Approved
**Type:** Refactoring (Improvement over sm-vpo)

---

## Overview

Refactor `absensi/actions/` from sm-vpo pilot (2 large files with layers mixed) to modular domain-based structure with **3 layers separated into distinct files per domain**. This improves upon sm-vpo by separating queries, logic, and actions into individual files for better testability, readability, and maintainability.

**Goal:** Establish the gold standard 3-layer pattern that will be replicated in sm-dsw, sm-9o0, and sm-uk4.

**Constraints:**
- Pure refactoring - NO behavior changes
- Backward compatible - existing imports must work via `index.ts`
- Functional style only (no classes/OOP)
- One session execution (Big Bang migration)
- Defer `getMeetingsWithStats` breakdown to future issue (Option C)

---

## Architecture

### Current State (sm-vpo Result)

```
actions/
├── meetings.ts        (2,216 lines - Layer 1+3 mixed, 'use server')
├── attendance.ts      (405 lines - Layer 1+3 mixed, 'use server')
└── index.ts
utils/
├── meetingValidation.ts      (Layer 2 - pure functions)
├── attendanceCalculation.ts  (Layer 2 - pure functions)
├── meetingHelpers.ts         (Server utilities)
├── meetingHelpersClient.ts   (Client utilities)
├── cache.ts                  (Shared SWR cache)
└── __tests__/
    ├── meetingValidation.test.ts
    ├── attendanceCalculation.test.ts
    └── meetingHelpersClient.test.ts
```

**Issues with sm-vpo:**
- Layer 1 (queries) mixed with Layer 3 (actions) in same file with `'use server'`
- Hard to test queries in isolation (need to mock `'use server'` context)
- Large files (2,216 lines for meetings.ts)
- Domain-specific helpers scattered in `utils/` folder

---

### Target State (sm-d15)

```
actions/
├── meetings/
│   ├── queries.ts           ← Layer 1: Database queries (~250 lines)
│   ├── logic.ts             ← Layer 2: Pure business logic (~150 lines)
│   ├── actions.ts           ← Layer 3: Server actions (~1,600 lines)
│   ├── helpers.server.ts    ← Server utilities (~80 lines)
│   ├── helpers.client.ts    ← Client utilities (~45 lines)
│   └── __tests__/
│       ├── queries.test.ts
│       ├── logic.test.ts
│       ├── helpers.server.test.ts
│       └── helpers.client.test.ts
├── attendance/
│   ├── queries.ts           ← Layer 1 (~100 lines)
│   ├── logic.ts             ← Layer 2 (~80 lines)
│   ├── actions.ts           ← Layer 3 (~225 lines)
│   └── __tests__/
│       ├── queries.test.ts
│       └── logic.test.ts
├── index.ts                 ← Re-export all server actions
└── utils/
    └── cache.ts             ← Keep shared utilities only
```

**Improvements:**
- ✅ Each layer in separate file for clarity
- ✅ Queries testable without `'use server'` complications
- ✅ Smaller, focused files (~100-250 lines each)
- ✅ Domain-specific code co-located in domain folders
- ✅ Clear file naming with `.server.ts` / `.client.ts` suffixes

---

## Layer Responsibilities

### **Layer 1: queries.ts** (Database Queries)

**Purpose:** Encapsulate all Supabase database access

**Characteristics:**
- ✅ Exported (for testing and reuse)
- ✅ NO `'use server'` directive
- ✅ Accept `supabase` client as parameter (dependency injection)
- ✅ Return raw data or error
- ❌ Cannot import Layer 2 (logic) or Layer 3 (actions)

**Naming Convention:** `fetch*()`, `insert*()`, `update*()`, `delete*()`, `build*Query()`

**Example:**
```typescript
// queries.ts - NO 'use server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchMeetingById(supabase: SupabaseClient, id: string) {
  return await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()
}

export async function insertMeeting(supabase: SupabaseClient, data: any) {
  return await supabase
    .from('meetings')
    .insert(data)
    .select()
    .single()
}
```

**Testing:**
```typescript
// queries.test.ts
import { vi } from 'vitest'
import { fetchMeetingById } from './queries'

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({ eq: vi.fn(), single: vi.fn() }))
  }))
}

fetchMeetingById(mockSupabase as any, 'test-id')
expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
```

---

### **Layer 2: logic.ts** (Pure Business Logic)

**Purpose:** Pure functions, testable without database

**Characteristics:**
- ✅ Exported (for reuse and testing)
- ✅ NO `'use server'` directive
- ✅ 100% pure functions (no side effects, no DB, no network)
- ✅ Can import types, constants, utilities
- ❌ Cannot import Supabase, Layer 1, or Layer 3

**Naming Convention:** `validate*()`, `calculate*()`, `build*()`, `transform*()`

**Example:**
```typescript
// logic.ts - NO 'use server'
import type { CreateMeetingData, AttendanceLog, AttendanceStats } from '@/types'

export function validateMeetingData(data: CreateMeetingData): { ok: boolean, error?: string } {
  if (!data.classIds?.length) {
    return { ok: false, error: 'At least one class required' }
  }
  if (!data.date) {
    return { ok: false, error: 'Date required' }
  }
  return { ok: true }
}

export function calculateAttendanceStats(logs: AttendanceLog[]): AttendanceStats {
  const total = logs.length
  const present = logs.filter(l => l.status === 'H').length
  const sick = logs.filter(l => l.status === 'S').length
  const permission = logs.filter(l => l.status === 'I').length
  const absent = logs.filter(l => l.status === 'A').length

  return {
    total_students: total,
    present,
    sick,
    permission,
    absent,
    percentage: total > 0 ? (present / total) * 100 : 0
  }
}
```

**Testing:**
```typescript
// logic.test.ts
import { validateMeetingData, calculateAttendanceStats } from './logic'

describe('validateMeetingData', () => {
  it('should reject empty classIds', () => {
    const result = validateMeetingData({ classIds: [], date: '2026-03-08' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('At least one class required')
  })
})
```

---

### **Layer 3: actions.ts** (Server Actions)

**Purpose:** Thin orchestrators, public API for client components

**Characteristics:**
- ✅ Exported (called by components)
- ✅ HAS `'use server'` directive (all exports become server actions)
- ✅ Can import Layer 1 (queries), Layer 2 (logic), helpers
- ✅ Responsibilities: Auth, permissions, orchestration, revalidation
- ❌ Minimal business logic (delegate to Layer 2)

**Example:**
```typescript
// actions.ts - WITH 'use server'
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchMeetingById, insertMeeting } from './queries'
import { validateMeetingData } from './logic'
import type { CreateMeetingData } from '@/types/meeting'

export async function createMeeting(data: CreateMeetingData) {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // 2. Business logic (Layer 2)
  const validation = validateMeetingData(data)
  if (!validation.ok) {
    return { success: false, error: validation.error }
  }

  // 3. Database query (Layer 1)
  const { data: meeting, error } = await insertMeeting(supabase, data)
  if (error) {
    return { success: false, error: error.message }
  }

  // 4. Revalidation
  revalidatePath('/absensi')

  return { success: true, data: meeting }
}
```

---

### **helpers.server.ts / helpers.client.ts**

**Purpose:** Domain-specific utilities (not core business logic)

**File Naming Convention:**
- ✅ `.server.ts` suffix → Server-only code (uses Supabase server client)
- ✅ `.client.ts` suffix → Browser code (uses Supabase browser client)
- ✅ Alphabetically sorted together in file explorer
- ✅ Clear intent without opening file

**Why This Convention?**
- Next.js idiom for server/client boundary
- Prevents accidental import errors (server code in client)
- Modern Next.js codebases use this pattern
- Supported by Next.js ESLint plugin

**Example:**
```typescript
// helpers.server.ts
import { createClient } from '@/lib/supabase/server'

export async function canEditOrDeleteMeeting(meetingId: string, userId: string): Promise<boolean> {
  // Server-side permission check with database access
  const supabase = await createClient()
  // ... permission logic
}

// helpers.client.ts
import { createClient } from '@/lib/supabase/client'

export async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  // Client-side data fetching
  const supabase = createClient()
  const { data } = await supabase
    .from('teacher_classes')
    .select('class_id')
    .eq('teacher_id', teacherId)

  return data?.map(tc => tc.class_id) || []
}
```

---

## File Breakdown

### **meetings/ Folder** (2,216 lines → 6 files)

#### **queries.ts** (~250 lines)
Extract from `meetings.ts` Layer 1:
- `fetchMeetingById(supabase, id)`
- `fetchMeetingsByClass(supabase, classId)`
- `fetchMeetingsByKelompok(supabase, kelompokId)`
- `insertMeeting(supabase, data)`
- `updateMeetingRecord(supabase, id, data)`
- `softDeleteMeeting(supabase, id)`

#### **logic.ts** (~150 lines)
Migrate from `utils/meetingValidation.ts`:
- `validateMeetingData(data)`
- `buildStudentSnapshot(students, classIds)`
- `canUserAccessMeeting(userClassIds, meetingClassIds)`

**Note:** `getMeetingsWithStats` breakdown (filtering, deduplication, stats) deferred to future issue per Option C.

#### **actions.ts** (~1,600 lines)
All current server actions (refactored to use queries.ts + logic.ts):
- `createMeeting(data)`
- `updateMeeting(id, data)`
- `deleteMeeting(id)`
- `getMeetingById(id)`
- `getMeetingsByClass(classId)`
- `getMeetingsWithStats(classId?, limit?, cursor?)` - Keep as-is (~986 lines)

#### **helpers.server.ts** (~80 lines)
Migrate from `utils/meetingHelpers.ts`:
- `canEditOrDeleteMeeting(meetingId, userId)`

#### **helpers.client.ts** (~45 lines)
Migrate from `utils/meetingHelpersClient.ts`:
- `getTeacherClassIds(teacherId)`
- `getClassNamesForMeeting(classIds)`
- `canUserEditMeetingAttendance(userRole, isMeetingCreator, ...)`

---

### **attendance/ Folder** (405 lines → 3 files)

#### **queries.ts** (~100 lines)
Extract from `attendance.ts` Layer 1:
- `upsertAttendanceLogs(supabase, logs)`
- `fetchAttendanceByDate(supabase, date, classId)`
- `fetchAttendanceByMeeting(supabase, meetingId)`
- `fetchStudentsByIds(supabase, studentIds)`

#### **logic.ts** (~80 lines)
Migrate from `utils/attendanceCalculation.ts`:
- `calculateAttendanceStats(logs)`
- `validateAttendanceData(data)`

#### **actions.ts** (~225 lines)
All current server actions (refactored):
- `saveAttendance(data)`
- `saveAttendanceForMeeting(meetingId, data)`
- `getAttendanceByDate(date, classId)`
- `getAttendanceByMeeting(meetingId)`
- `getAttendanceStats(date, classId)`
- `getStudentsFromSnapshot(snapshot)`

---

### **index.ts** (Re-exports)

```typescript
// Re-export all server actions for backward compatibility
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

**Consumer Code (Unchanged):**
```typescript
// Components continue to use same imports
import { createMeeting, getMeetingsWithStats } from '@/app/(admin)/absensi/actions'
// ✅ Still works! index.ts re-exports from meetings/actions.ts
```

---

## Migration Strategy

### **Phase 1: meetings/ Domain**

1. Create `actions/meetings/` folder
2. Create `meetings/queries.ts` - extract Layer 1 from `meetings.ts`
3. Create `meetings/logic.ts` - migrate from `utils/meetingValidation.ts`
4. Create `meetings/helpers.server.ts` - migrate from `utils/meetingHelpers.ts`
5. Create `meetings/helpers.client.ts` - migrate from `utils/meetingHelpersClient.ts`
6. Create `meetings/actions.ts` - refactor from old `meetings.ts`:
   - Add `'use server'` directive
   - Update imports to use `./queries`, `./logic`, `./helpers.server`
   - Remove Layer 1 code (moved to queries.ts)
   - Keep all Layer 3 server actions
7. Delete old `actions/meetings.ts`

### **Phase 2: attendance/ Domain**

1. Create `actions/attendance/` folder
2. Create `attendance/queries.ts` - extract Layer 1
3. Create `attendance/logic.ts` - migrate from `utils/attendanceCalculation.ts`
4. Create `attendance/actions.ts` - refactor from old `attendance.ts`
5. Delete old `actions/attendance.ts`

### **Phase 3: Cleanup**

1. Update `actions/index.ts` - change imports to use domain folders
2. Delete `utils/meetingValidation.ts`
3. Delete `utils/attendanceCalculation.ts`
4. Delete `utils/meetingHelpers.ts`
5. Delete `utils/meetingHelpersClient.ts`
6. Keep `utils/cache.ts` (shared utility)

### **Phase 4: Tests**

1. Create `meetings/__tests__/` folder
2. Migrate `utils/__tests__/meetingValidation.test.ts` → `meetings/__tests__/logic.test.ts`
3. Migrate `utils/__tests__/meetingHelpersClient.test.ts` → `meetings/__tests__/helpers.client.test.ts`
4. Create `meetings/__tests__/queries.test.ts` (new - test query builders)
5. Create `meetings/__tests__/helpers.server.test.ts` (new - test permissions)
6. Create `attendance/__tests__/` folder
7. Migrate `utils/__tests__/attendanceCalculation.test.ts` → `attendance/__tests__/logic.test.ts`
8. Create `attendance/__tests__/queries.test.ts` (new)

### **Phase 5: Verification**

1. Run `npm run test` - all tests must pass (20 existing + new tests)
2. Run `npm run build` - production build must succeed
3. Run `npm run type-check` - no TypeScript errors
4. Manual smoke test:
   - Create meeting
   - Edit meeting
   - Delete meeting
   - Save attendance
   - View attendance stats

---

## Backward Compatibility

**Zero breaking changes** for component consumers.

**Old imports (still work):**
```typescript
import { createMeeting } from '@/app/(admin)/absensi/actions'
```

**Internal imports (updated):**
```typescript
// Before (sm-vpo):
import { validateMeetingData } from '../utils/meetingValidation'

// After (sm-d15):
import { validateMeetingData } from './logic'
```

---

## Testing Strategy

### **Existing Tests (Must Pass After Migration)**

- 20 existing tests from `utils/__tests__/`:
  - `meetingValidation.test.ts` (10 tests) → `meetings/__tests__/logic.test.ts`
  - `attendanceCalculation.test.ts` (10 tests) → `attendance/__tests__/logic.test.ts`
  - `meetingHelpersClient.test.ts` (varies) → `meetings/__tests__/helpers.client.test.ts`

### **New Tests (Create During Refactoring)**

**meetings/__tests__/queries.test.ts:**
```typescript
import { vi } from 'vitest'
import { fetchMeetingById, insertMeeting } from '../queries'

describe('fetchMeetingById', () => {
  it('should query meetings table with correct id', () => {
    const mockSupabase = { from: vi.fn(() => ({ select: vi.fn(), eq: vi.fn(), single: vi.fn() })) }
    fetchMeetingById(mockSupabase as any, 'test-id')
    expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
  })
})
```

**meetings/__tests__/helpers.server.test.ts:**
- Test `canEditOrDeleteMeeting()` with mock data
- Cover permission scenarios: superadmin, creator, admin hierarchy, teacher

**attendance/__tests__/queries.test.ts:**
- Similar pattern to meetings queries

### **Test Coverage Goals**

- Layer 1 (queries): Basic structure validation (mock Supabase client)
- Layer 2 (logic): 100% coverage (pure functions, easy to test)
- Layer 3 (actions): Integration tests optional (can defer)

### **Verification Commands**

```bash
npm run test           # All tests pass
npm run test:coverage  # Coverage report
npm run build          # Production build
npm run type-check     # No TypeScript errors
```

---

## File Count Summary

**Created:** 15 files
- 6 meetings files (queries, logic, actions, helpers.server, helpers.client, __tests__ folder)
- 3 attendance files (queries, logic, actions)
- 6 test files (4 migrated, 2 new)

**Deleted:** 4 files
- 2 old action files (meetings.ts, attendance.ts)
- 4 utils files (meetingValidation.ts, attendanceCalculation.ts, meetingHelpers.ts, meetingHelpersClient.ts)

**Net Change:** +11 files

---

## Documentation Updates

1. **Update `docs/claude/architecture-patterns.md`:**
   - Add section: "File Naming Convention: .server.ts and .client.ts"
   - Update 3-layer pattern to reflect separated files
   - Add example: absensi refactoring (sm-d15)

2. **Update CLAUDE.md:**
   - Add pointer to file naming convention in architecture-patterns.md

3. **This design doc:**
   - Save to `docs/plans/2026-03-08-split-absensi-3layer-design.md`
   - Reference for sm-dsw, sm-9o0, sm-uk4 (future God file refactorings)

---

## Success Criteria

- ✅ All 20+ tests passing
- ✅ Production build succeeds
- ✅ Type-check passes (no errors)
- ✅ Zero breaking changes for components
- ✅ Each file <300 lines (except actions.ts with getMeetingsWithStats)
- ✅ Clear layer separation (queries/logic/actions in distinct files)
- ✅ Domain-specific code co-located (meetings/, attendance/)
- ✅ File naming follows .server.ts / .client.ts convention

---

## Future Work (Out of Scope)

**sm-xxx: Refactor getMeetingsWithStats** (defer per Option C)
- Break down 986-line function into smaller composable functions
- Extract filtering logic to `logic.ts`
- Extract deduplication to `logic.ts`
- Extract stats calculation to `logic.ts`
- Reduce `actions.ts` getMeetingsWithStats to ~100-150 line orchestrator

**sm-dsw, sm-9o0, sm-uk4:** Apply this pattern to other God files
- Follow this design as blueprint
- Adapt domain structure to each feature area
- Maintain consistency with absensi pattern
