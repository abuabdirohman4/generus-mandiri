# Architecture Patterns & Complex Implementations

This document contains detailed implementation patterns for complex features in the Generus Mandiri project. For the core architecture overview (App Router, Database, Access Control, State Management), see [CLAUDE.md](../../CLAUDE.md).

---

## File Naming Convention: .server.ts and .client.ts

**CRITICAL**: Use `.server.ts` and `.client.ts` suffixes to distinguish server-only and client-only code.

**Why This Convention:**
- ✅ Next.js idiom for server/client boundary (established pattern)
- ✅ Files sort alphabetically together in explorer (`helpers.client.ts` next to `helpers.server.ts`)
- ✅ Clear intent without opening file
- ✅ Prevents accidental import errors (server code in client, vice versa)
- ✅ Supported by Next.js ESLint plugin for boundary violations

**Usage:**

```typescript
// helpers.server.ts - Server-only utilities
import { createClient } from '@/lib/supabase/server'

export async function canEditOrDeleteMeeting(meetingId: string, userId: string) {
  const supabase = await createClient()  // Server client
  // ... server-side logic with database access
}

// helpers.client.ts - Client-only utilities
import { createClient } from '@/lib/supabase/client'

export async function getTeacherClassIds(teacherId: string) {
  const supabase = createClient()  // Browser client
  // ... client-side data fetching
}
```

**When to Use:**
- Domain-specific utilities (not core business logic)
- Permission checkers that need DB access
- Data fetchers for client components
- Format helpers specific to server/client

**When NOT to Use:**
- Pure business logic → use `logic.ts` (no suffix, works anywhere)
- Database queries → use `queries.ts` (no suffix, accepts client as param)
- Server actions → use `actions.ts` with `'use server'` directive

**Reference:** See `src/app/(admin)/absensi/actions/meetings/` for real-world example (sm-d15).

---

## Hierarchical Teacher Pattern (Guru Desa/Daerah)

**CRITICAL**: Teachers with organizational hierarchy (`desa_id`/`daerah_id`) behave differently from regular teachers.

**Organizational Teachers** (Guru Desa/Daerah):
- Have `role = 'teacher'` in profiles
- Have `desa_id` (Guru Desa) OR `daerah_id` (Guru Daerah) populated
- Do NOT have entries in `teacher_classes` junction table
- Should see ALL data in their organizational scope (like admins)
- Can ONLY create Sambung Desa/Sambung Daerah meetings

### Detection Pattern

```typescript
// Client-side (components/hooks)
const isHierarchicalTeacher = (userProfile.daerah_id || userProfile.desa_id || userProfile.kelompok_id) &&
                               (!userProfile.classes || userProfile.classes.length === 0)

// Server-side (actions)
if (profile?.role === 'teacher') {
  if (profile.teacher_classes && profile.teacher_classes.length > 0) {
    // Regular teacher: has assigned classes
  } else if (profile.kelompok_id || profile.desa_id || profile.daerah_id) {
    // Hierarchical teacher: has organizational access
  }
}
```

### Implementation Requirements

1. **Profile Queries**: MUST include organizational fields
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select(`
       role,
       kelompok_id,
       desa_id,
       daerah_id,
       teacher_classes!left(class_id, classes(id, name))
     `)
   ```
   - Use `left` join for `teacher_classes` (handles both regular and hierarchical)

2. **Data Filtering**: Apply hierarchical filters like admins
   ```typescript
   if (profile.kelompok_id) {
     query = query.eq('kelompok_id', profile.kelompok_id)
   } else if (profile.desa_id) {
     query = query.eq('kelompok.desa_id', profile.desa_id)
   } else if (profile.daerah_id) {
     query = query.eq('kelompok.desa.daerah_id', profile.daerah_id)
   }
   ```

3. **Admin Client Usage**: Bypass RLS for hierarchical access
   ```typescript
   const adminClient = await createAdminClient()
   // Use adminClient for queries, apply organizational filters manually
   ```

4. **UI Display Logic**: Show all classes like admins
   ```typescript
   if (isHierarchicalTeacher) {
     // Show ALL classes in student's records
     displayClasses = student.classes.map(c => c.name).join(', ')
   } else {
     // Regular teacher: filter to only their assigned classes
     displayClasses = student.classes.filter(c => teacherClassIds.includes(c.id))
   }
   ```

5. **Meeting Types & Attendance Access**:
   - Hierarchical teachers with no classes can still access meeting types by relying on organizational level (`daerah_id`, `desa_id`, `kelompok_id`).
   - Use `isHierarchicalTeacher` bypassing logic in `absensi/[meetingId]/page.tsx` class filters (`canUserEditMeetingAttendance` from `meetingHelpersClient`).
   - Ensure the `UserProfile` interfaces correctly type the organizational fields as `string | null` to match Supabase's structure and avoid strict TS assigning issues.

### Files with Hierarchical Teacher Support (sm-3ud)

- `src/app/(admin)/users/siswa/actions/classes.ts` - getAllClasses()
- `src/app/(admin)/users/siswa/actions.ts` - getAllStudents()
- `src/app/(admin)/absensi/actions.ts` - getMeetingsWithStats()
- `src/app/(admin)/laporan/actions.ts` - getAttendanceReport()
- `src/app/(admin)/users/siswa/components/StudentsTable.tsx` - Class display
- `src/app/(admin)/laporan/hooks/useLaporanPage.ts` - Table data mapping + **auto-set filter**

### Auto-Set Filter Pattern for Single Kelompok/Class

For better UX, pages with DataFilter should auto-select filters when user has only 1 option:

```typescript
// Auto-set class filter for teachers with exactly 1 class
useEffect(() => {
  if (userProfile?.role === 'teacher' && userProfile.classes?.length === 1) {
    const teacherClassId = userProfile.classes[0].id
    if (!filters.organisasi?.kelas?.includes(teacherClassId)) {
      setFilter('organisasi', { daerah: [], desa: [], kelompok: [], kelas: [teacherClassId] })
    }
  }
}, [userProfile?.role, userProfile?.classes, filters.organisasi?.kelas, setFilter])

// Auto-set kelompok filter for teachers with exactly 1 kelompok (no classes)
useEffect(() => {
  if (userProfile?.role === 'teacher' && userProfile.kelompok_id && (!userProfile.classes || userProfile.classes.length === 0)) {
    if (!filters.organisasi?.kelompok?.includes(userProfile.kelompok_id)) {
      setFilter('organisasi', { daerah: [], desa: [], kelompok: [userProfile.kelompok_id], kelas: [] })
    }
  }
}, [userProfile?.role, userProfile?.kelompok_id, userProfile?.classes, filters.organisasi?.kelompok, setFilter])
```

- **When to use**: Pages that require filters to show data (Laporan, Absensi list, Student list)
- **Benefit**: Prevents "no data" state when user has only 1 valid option
- **Reference**: `src/app/(admin)/laporan/hooks/useLaporanPage.ts` line 166-194

### Common Pitfalls

- Checking only `teacher_classes` length (hierarchical teachers have 0)
- Using regular user client instead of admin client
- Forgetting to include organizational fields in profile query
- Not handling both `class_id` and `class_ids` in meeting filtering
- Not auto-setting filters for single-option users (causes "no data" bugs)

**Reference Implementation**: See `.beads/progress/sm-3ud.md` for complete hierarchical teacher implementation.

---

## Class Filter Display Format (sm-de3)

Unified format for multi-kelompok selection:

- **All users** (Guru with 2+ kelompok, Admin Desa, Guru Desa, Guru Daerah, Admin Daerah) show **consistent format**
- When 2+ kelompok selected: Show `"Class Name (X kelompok)"` format (deduplicated with count)
- When single/no kelompok: Show `"Class Name"` only (no suffix)
- Implementation: `DataFilter.tsx` uses unified Path 2 deduplication logic

### CRITICAL: Comma-separated Class IDs

Class values may be comma-separated (`"id1,id2,id3"`) for multi-kelompok classes:
- Always split comma-separated IDs before processing: `classId.includes(',') ? classId.split(',') : [classId]`
- See: `useLaporanPage.ts` auto-extract kelompok logic for reference implementation

**Related Issues**: sm-de3 (auto-clear bug fix), sm-hov (duplicate issue)

---

## Dashboard Metrics Pattern

Dual metrics for attendance calculation:

### Primary Metric (Simple Average)
Displayed in main stat card.
- Formula: `(sum of entity_attendance_rate) / entity_count`
- Use case: "Bagaimana performa rata-rata desa/kelompok/kelas?"
- Example: `(81% + 100% + 73% + 75% + 68% + 47%) / 6 = 74%`
- User-friendly, intuitif, consistent with table display

### Secondary Metric (Weighted Average)
Displayed in tooltip.
- Formula: `(sum of total_students_present) / (sum of total_potential_attendance) x 100`
- Use case: "Berapa persen siswa yang benar-benar hadir?"
- Example: `12,500 / 25,000 x 100 = 50%`
- Accurate for resource planning, reflects scale/impact

### Supporting Data
Table shows "Pertemuan" and "Siswa" columns:
- Helps user understand why simple != weighted
- Enables manual verification and deeper analysis

### Files
- **Implementation**: `src/app/(admin)/dashboard/page.tsx` - `attendanceMetrics` useMemo
- **Detailed Documentation**: READ [`docs/claude/dashboard-attendance-calculation-id.md`](dashboard-attendance-calculation-id.md)
- **Related Issues**: sm-nol (dashboard comparison charts)

---

## Meeting Count Deduplication

CRITICAL for multi-class meetings aggregation.

### Problem
Multi-class meetings (SAMBUNG_KELOMPOK, SAMBUNG_DESA, SAMBUNG_DAERAH) were counted multiple times when aggregating by kelompok/desa/daerah.
- Example: 1 meeting for 7 classes in Kelompok "Nambo" showed as **2 meetings**
- Root cause: Aggregation summed `meeting_count` per class without deduplication

### Solution
Use `meeting_ids` array + Set for deduplication:
- `ClassMonitoringData` includes `meeting_ids?: string[]` field
- `aggregateMonitoringData()` uses `Set<string>()` to track unique meeting IDs
- Final `meeting_count` = `meetingIds.size` (deduplicated)

### Files
- `src/app/(admin)/dashboard/actions.ts` - Returns `meeting_ids` in monitoring data
- `src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts` - Deduplication logic
- `src/app/(admin)/dashboard/page.tsx` - Tracks `meetingIds` in aggregation

### Impact
- Per Kelompok: Multi-class meetings counted once (was N times)
- Per Desa: Cross-kelompok meetings counted once (was N times)
- Per Daerah: Cross-desa meetings counted once (was N times)

**Verification**: Kelompok "Nambo" now shows **1 pertemuan** (was 2).

---

## 3-Layer Functional Architecture for Server Actions

**Pattern evolution:**
- **sm-vpo** (pilot): 3 layers in same file (`meetings.ts` with mixed Layer 1+3)
- **sm-d15** (gold standard): 3 layers in separate files per domain

**Current pattern (sm-d15):** All feature `actions/` folders follow this structure:

### Folder Structure
```
src/app/(admin)/<feature>/
├── actions/
│   ├── <domain>/
│   │   ├── queries.ts         ← Layer 1: Database queries (exported)
│   │   ├── logic.ts           ← Layer 2: Pure business logic (exported)
│   │   ├── actions.ts         ← Layer 3: Server actions ('use server')
│   │   ├── helpers.server.ts  ← Server utilities (optional)
│   │   ├── helpers.client.ts  ← Client utilities (optional)
│   │   └── __tests__/         ← Co-located tests
│   │       ├── queries.test.ts
│   │       ├── logic.test.ts
│   │       ├── helpers.server.test.ts
│   │       └── helpers.client.test.ts
│   └── index.ts               ← Re-exports all server actions
```

**Example:** `src/app/(admin)/absensi/actions/meetings/` (sm-d15)

### Layer Responsibilities

**Layer 1: queries.ts (Database Queries)**
- Prefix: `fetch*`, `insert*`, `update*`, `delete*`, `build*Query`
- Receive `supabase` client as parameter (dependency injection)
- Return raw data or error
- Exported (for testing and reuse)
- NO `'use server'` directive

**Layer 2: logic.ts (Pure Business Logic)**
- Prefix: `validate*`, `calculate*`, `build*`, `transform*`
- Pure functions, no DB calls, no side effects
- Exported for reuse and testing
- NO `'use server'` directive
- Easy to test without mocking

**Layer 3: actions.ts (Server Actions)**
- Entry points for client components
- Orchestrate Layer 1 (queries) + Layer 2 (logic)
- Handle auth, permissions, revalidation
- HAS `'use server'` directive (all exports become server actions)

### Example (sm-d15 Separated Files)

**queries.ts** (Layer 1):
```typescript
// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchMeetingById(supabase: SupabaseClient, id: string) {
  return await supabase.from('meetings').select('*').eq('id', id).single()
}

export async function insertMeeting(supabase: SupabaseClient, data: any) {
  return await supabase.from('meetings').insert(data).select().single()
}
```

**logic.ts** (Layer 2):
```typescript
// NO 'use server' directive
export function validateMeetingData(data: CreateMeetingData) {
  if (!data.classIds?.length) return { ok: false, error: 'At least one class required' }
  if (!data.date) return { ok: false, error: 'Date required' }
  return { ok: true }
}
```

**actions.ts** (Layer 3):
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchMeetingById, insertMeeting } from './queries'
import { validateMeetingData } from './logic'

export async function createMeeting(data: CreateMeetingData) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Business logic (Layer 2)
  const validation = validateMeetingData(data)
  if (!validation.ok) return { success: false, error: validation.error }

  // Database query (Layer 1)
  const { data: meeting, error } = await insertMeeting(supabase, data)
  if (error) return { success: false, error: error.message }

  // Revalidation
  revalidatePath('/absensi')
  return { success: true, data: meeting }
}
```

### Testing Strategy

**Layer 1 (queries.ts):** Basic structure tests with mock Supabase client
```typescript
// queries.test.ts
import { vi } from 'vitest'
import { fetchMeetingById } from './queries'

const mockSupabase = { from: vi.fn(() => ({ select: vi.fn(), eq: vi.fn(), single: vi.fn() })) }
fetchMeetingById(mockSupabase as any, 'test-id')
expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
```

**Layer 2 (logic.ts):** Comprehensive unit tests (pure functions, no mocks)
```typescript
// logic.test.ts
import { validateMeetingData } from './logic'

it('should reject empty classIds', () => {
  const result = validateMeetingData({ classIds: [], date: '2026-03-08' })
  expect(result.ok).toBe(false)
  expect(result.error).toBe('At least one class required')
})
```

**Layer 3 (actions.ts):** Integration tests (optional, can defer)

### Why Separated Files (sm-d15) > Mixed Layers (sm-vpo)

**sm-vpo Issues:**
- Layer 1+3 in same file with `'use server'` → hard to test queries
- Large files (2,216 lines for meetings.ts)
- `'use server'` applies to ALL exports (even pure functions)

**sm-d15 Benefits:**
- ✅ Queries testable without `'use server'` complications
- ✅ Smaller focused files (~100-250 lines each)
- ✅ Clear layer boundaries
- ✅ Easy to navigate (queries, logic, actions in separate files)

**Reference:** `docs/plans/2026-03-08-split-absensi-3layer-design.md` for detailed migration guide

### Migration Strategy
- Use Big Bang approach for clean cutover
- Create `actions/index.ts` with re-exports for backward compatibility
- Extract shared types to `src/types/`
- One feature per session

**Reference:** `docs/plans/2026-03-01-split-absensi-actions-design.md`

---

## Type Management & Organization

**Pattern:** Centralized domain-based type files in `src/types/`

### Directory Structure

```
src/types/
├── attendance.ts       # Attendance domain (AttendanceLog, AttendanceData, AttendanceStats)
├── meeting.ts          # Meeting domain (Meeting, CreateMeetingData, MeetingWithStats)
├── student.ts          # Student domain (Student, StudentWithClasses)
├── dashboard.ts        # Dashboard domain (Dashboard, TodayMeeting, ClassMonitoringData)
├── report.ts           # Report domain (ReportFilters, ReportData)
├── material.ts         # Material domain (if applicable)
├── rapot.ts            # Report card domain (if applicable)
└── common.ts           # Shared types (ApiResponse, Pagination, etc.)
```

### Extraction Rules

**When to create a new type file:**
1. Domain has **3+ related types**
2. Types are used across **2+ action files**
3. Types represent **core domain entities** (not just local helpers)

**When to keep types inline:**
1. Used in **single file only**
2. Simple request/response wrappers
3. Component-specific UI state

**File organization within type files (Hierarchy Pattern):**
All type definitions MUST follow the **Base → Extended → Full** hierarchy:

```typescript
/**
 * [Domain] types for [Feature]
 */

// ─── Base Types ───────────────────────────────────────────────────────────────
// Minimal fields, core ID + name. Use for: Dropdowns, basic references, IDs.
export interface EntityBase { ... }

// ─── Extended Types ───────────────────────────────────────────────────────────
// Base + relational data/nested objects. Use for: Main listings, table rows.
export interface Entity extends EntityBase { ... }

// ─── Full Types ───────────────────────────────────────────────────────────────
// Extended + audit fields (created_at). Use for: Master records, full details.
export interface EntityFull extends Entity { ... }

// ─── Request/Response ─────────────────────────────────────────────────────────
// Payloads for API/Actions
export interface CreateEntityData { ... }
```

### Import Patterns

**✅ Correct:**
```typescript
import type { Meeting, CreateMeetingData } from '@/types/meeting'
import type { Student } from '@/types/student'
import type { Dashboard } from '@/types/dashboard'
```

**❌ Incorrect:**
```typescript
import type { Meeting } from '@/app/(admin)/absensi/actions/meetings/actions'
import type { Student } from '../actions/students/actions'
```

### Benefits

1. **Single source of truth** - Types defined once, imported everywhere
2. **Easier refactoring** - Change type in one place
3. **Better IDE support** - Auto-import from centralized location
4. **Clearer boundaries** - Types separated from implementation
5. **Testability** - Types can be imported in tests without circular dependencies

### Migration Checklist

When extracting types from actions to `src/types/`:

- [ ] Create `src/types/[domain].ts` with JSDoc header
- [ ] Copy types from action files (preserve comments)
- [ ] Sort alphabetically within sections
- [ ] Update all imports in action files
- [ ] Update imports in components/hooks/stores
- [ ] Delete inline type definitions
- [ ] Run `npm run type-check`
- [ ] Verify no import errors

**Reference Implementation:**
- `src/types/attendance.ts` - Complete example with all sections
- `src/types/meeting.ts` - Complex domain with nested types
- `src/types/student.ts` - Entity with relationships

### Type Consolidation Process

When centralizing duplicate types:

**1. Discovery**
```bash
# Find all definitions
grep -r "^export interface EntityName\|^interface EntityName" src/ --include="*.ts"
```

**2. Identify Canonical**
- Most complete version
- Has JSDoc comments
- Strict types (not `any` or loose unions)
- Most usage across codebase

**3. Build Hierarchy**
```typescript
// Minimal
export interface EntityBase { id, name }

// Add context
export interface EntityWithFeature extends EntityBase { feature_fields }

// Full (canonical)
export interface Entity extends EntityWithFeature { all_fields }
```

**4. Migrate Imports**
```bash
# Find all usages
grep -r "EntityName" src/ --include="*.ts" --include="*.tsx" -l

# Update each file:
# OLD: interface EntityName { ... }
# NEW: import type { EntityName } from '@/types/entity'
```

**5. Delete Duplicates**
- Remove all inline definitions
- Keep canonical in `src/types/[domain].ts`
- No re-exports for backward compatibility (clean break)

**6. Verify**
```bash
npm run type-check  # Must pass
npm run build       # Must succeed

# Check no orphaned definitions
grep -r "^interface EntityName" src/ --include="*.ts"
# Should return ONLY src/types/entity.ts
```

### Common Anti-Patterns

**❌ Don't:**
```typescript
// Duplicate definition
interface UserProfile { ... }  // Already exists in src/types/user.ts!

// Numbered versions
interface Student1 { ... }
interface Student2 { ... }

// Copy-paste instead of extends
interface MyStudent {
  id: string
  name: string  // Copy-pasted from StudentBase
  myField: string
}
```

**✅ Do:**
```typescript
// Import canonical
import type { UserProfile } from '@/types/user'

// Extend when needed
import type { StudentBase } from '@/types/student'
export interface MyStudent extends StudentBase {
  myField: string
}
```

### Pre-Flight Checklist

Before creating ANY type:

- [ ] Search codebase for existing definition
- [ ] If exists → import from `@/types/`
- [ ] If needs modification → use `extends`
- [ ] If truly new → check if 2+ files will use it
- [ ] If shared → create in `src/types/[domain].ts`
- [ ] If single-use → keep inline (component props, helpers)

### Type Consolidation Examples

**Example 1: UserProfile (17 duplicates → 1 canonical)**
```typescript
// BEFORE: 17 different files with different definitions
// src/stores/userProfileStore.ts
interface UserProfile { id, role, classes }

// src/lib/accessControl.ts
interface UserProfile { id, role, daerah_id, desa_id }

// ... 15 more variations

// AFTER: Single source of truth
// src/types/user.ts
export interface UserProfileBase { id, role }
export interface UserProfileWithOrg extends UserProfileBase { daerah_id, desa_id, kelompok_id }
export interface UserProfile extends UserProfileWithOrg { classes, permissions, ... }

// All other files:
import type { UserProfile } from '@/types/user'
```

**Example 2: Class types (8 duplicates → 1 hierarchy)**
```typescript
// BEFORE: Scattered across multiple files
// siswa/actions/classes/actions.ts
interface Class { id, name, kelompok_id }

// kelas/actions/classes.ts
interface ClassWithMaster { ...all fields + class_master_mappings }

// AFTER: Clean hierarchy
// src/types/class.ts
export interface ClassBase { id, name }
export interface Class extends ClassBase { kelompok_id, kelompok, created_at }
export interface ClassWithMaster extends Class { class_master_mappings }
export interface ClassMaster { id, name, sort_order, ... }
```

---
