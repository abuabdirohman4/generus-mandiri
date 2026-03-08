# Design: Apply 3-Layer Pattern to laporan (Separated Files)

**Date:** 2026-03-08
**Related Issues:** sm-9o0
**Status:** Approved
**Type:** Refactoring
**Reference:** sm-d15 (absensi), sm-dsw (siswa)

---

## Overview

Refactor `laporan/actions.ts` from monolithic structure (1,112 lines with 950-line God function) to modular 3-layer pattern with **separated files**. This applies the sm-d15/sm-dsw gold standard to report generation.

**Goal:** Break down massive `getAttendanceReport()` function into testable, maintainable layers.

**Constraints:**
- Pure refactoring - NO behavior changes
- Backward compatible - existing imports work via `index.ts`
- Functional style only (no classes/OOP)
- One session execution (Big Bang migration)
- Consistent with sm-d15 & sm-dsw patterns

---

## Current State (Before Refactoring)

```
laporan/
└── actions.ts                    (1,112 lines - 'use server', mixed layers)
    ├── Helper functions (lines 15-61)
    │   └── getWeekStartDate, getWeekEndDate, getWeekNumberInMonth
    ├── Type definitions (lines 63-145)
    │   └── ReportFilters, ReportData interfaces
    └── getAttendanceReport (lines 150-1107 - 950+ lines!)
        ├── Layer 1: Database queries scattered throughout
        ├── Layer 2: Pure logic mixed with queries
        └── Layer 3: Orchestration + business logic + queries
```

**Issues:**
- 🔴 950-line function - impossible to test or understand
- 🔴 Layers mixed together - tight coupling
- 🔴 `'use server'` prevents testing queries in isolation
- 🔴 No clear separation of concerns
- 🔴 Cannot reuse logic components

---

## Target State (After Refactoring)

```
laporan/actions/
├── reports/
│   ├── queries.ts           (~250 lines, NO 'use server')
│   ├── logic.ts             (~650 lines, NO 'use server')
│   ├── actions.ts           (~150 lines, 'use server')
│   └── __tests__/
│       ├── queries.test.ts  (~8 tests)
│       └── logic.test.ts    (~25 tests)
└── index.ts                 (~20 lines)
    └── Re-export for backward compatibility
```

**Improvements:**
- ✅ Single domain (reports/) - matches single-purpose nature
- ✅ 3-layer separation - queries/logic/actions in distinct files
- ✅ Testable - Layers 1 & 2 testable without 'use server' mocking
- ✅ Smaller files - Each file 150-650 lines (down from 1,112)
- ✅ Consistent - Follows sm-d15 & sm-dsw patterns exactly
- ✅ Backward compatible - index.ts maintains existing imports

---

## Architecture

### Layer 1: queries.ts (Database Queries)

**Purpose:** Encapsulate ALL Supabase database access

**Rules:**
- ✅ Exported (for testing and reuse)
- ✅ NO `'use server'` directive
- ✅ Accept `supabase` client as parameter (dependency injection)
- ✅ Return `{ data, error }` (Supabase format)
- ❌ Cannot import Layer 2 (logic) or Layer 3 (actions)

**Naming Convention:** `fetch*()`, `build*Query()`

**6 Query Functions (~250 lines total):**

1. **fetchUserProfile(supabase, userId)**
   - Extract from lines 155-179
   - Gets profile with teacher_classes and org hierarchy
   - Returns profile data for role-based filtering

2. **fetchMeetingsForDateRange(supabase, dateFilter, meetingTypeFilter)**
   - Extract from lines 304-315
   - Queries meetings table with date range + optional type filter
   - Returns meetings for attendance calculation

3. **fetchClassHierarchyMaps(supabase, classIds)**
   - Extract from lines 328-365
   - Gets class → kelompok → desa → daerah relations
   - Returns classes with nested org data

4. **fetchAttendanceLogs(supabase, meetingIds)**
   - Extract from lines 429-432
   - Wrapper for `fetchAttendanceLogsInBatches` utility
   - Returns attendance logs for specified meetings

5. **fetchStudentDetails(supabase, studentIds)**
   - Extract from lines 451-494
   - Gets students with classes, student_classes, and org hierarchy
   - Returns enriched student data

6. **fetchKelompokNames(supabase)**
   - Extract from lines 959-967
   - Gets all kelompok for class name formatting
   - Returns id → name mapping

**Example:**
```typescript
// queries.ts - NO 'use server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
) {
  return await supabase
    .from('profiles')
    .select(`
      id, role, daerah_id, desa_id, kelompok_id,
      teacher_classes!teacher_classes_teacher_id_fkey(
        class_id,
        classes:class_id(id, name, kelompok_id)
      )
    `)
    .eq('id', userId)
    .single()
}
```

---

### Layer 2: logic.ts (Pure Business Logic)

**Purpose:** Pure functions, testable without database

**Rules:**
- ✅ Exported (for reuse and testing)
- ✅ NO `'use server'` directive
- ✅ 100% pure functions (no side effects, no DB, no network)
- ✅ Can import types, constants, utilities
- ❌ Cannot import Supabase, Layer 1, or Layer 3

**Naming Convention:** `filter*()`, `build*()`, `aggregate*()`, `format*()`

**Functions (~650 lines total, grouped by concern):**

**Date/Filter Helpers:**
- `getWeekStartDate(year, month, weekNumber)` - Move from lines 15-26
- `getWeekEndDate(year, month, weekNumber)` - Move from lines 31-45
- `getWeekNumberInMonth(date)` - Move from lines 50-61
- `buildDateFilter(filters, now)` - Extract from lines 187-292

**Permission/Filtering Logic:**
- `filterMeetingsByRole(meetings, profile, maps)` - Extract from lines 367-425
  - Handles teacher/admin/superadmin scoping
  - Uses hierarchical maps for access control
- `filterAttendanceByClass(logs, classId, enrollmentMap, meetingMap)` - Extract from lines 649-691
  - Strict enrollment validation
  - Checks both meeting class and student enrollment
- `filterAttendanceByKelompok(logs, kelompokId, maps, meetingMap)` - Extract from lines 696-734
  - Meeting location validation
  - Allows cross-kelompok students
- `filterAttendanceByGender(logs, gender)` - Extract from lines 737-741

**Data Transformation:**
- `buildClassHierarchyMaps(classesData)` - Extract from lines 344-365
  - Creates class → kelompok/desa/daerah lookup maps
- `buildEnrollmentMap(studentClassesData)` - Extract from lines 587-609
  - Creates class+kelompok → enrolled students mapping
  - Handles null kelompok_id
- `enrichAttendanceLogs(logsData, studentMap, meetingMap)` - Extract from lines 505-516
  - Adds student and date data to logs
  - Filters out incomplete records
- `aggregateStudentSummary(logs, kelompokMap)` - Extract from lines 971-1081
  - Groups by student for detailed view
  - Calculates attendance rates
  - Formats multi-class names with kelompok
- `aggregateTrendData(meetings, logs, filters)` - Extract from lines 799-955
  - Time-series aggregation (daily/weekly/monthly/yearly)
  - Counts unique meetings per period
  - Calculates attendance percentages
- `formatChartData(summary)` - Extract from lines 748-753
  - Pie chart data preparation

**Example:**
```typescript
// logic.ts - NO 'use server'

export function buildDateFilter(
  filters: ReportFilters,
  now: Date
): { date?: { eq?: string; gte?: string; lte?: string } } {
  if (filters.viewMode === 'general' && filters.month && filters.year) {
    const startDate = new Date(filters.year, filters.month - 1, 1)
    const endDate = new Date(filters.year, filters.month, 0)
    return {
      date: {
        gte: startDate.toISOString().split('T')[0],
        lte: endDate.toISOString().split('T')[0]
      }
    }
  }

  // Detailed mode: period-specific filtering
  switch (filters.period) {
    case 'daily':
      // ... daily logic
    case 'weekly':
      // ... weekly logic using getWeekStartDate/getWeekEndDate
    case 'monthly':
      // ... monthly logic
    case 'yearly':
      // ... yearly logic
  }
}

export function filterMeetingsByRole(
  meetings: any[],
  profile: any,
  maps: { classKelompok: Map, classDesa: Map, classDaerah: Map }
): string[] {
  if (profile.role === 'teacher') {
    // Filter by teacher's assigned classes + hierarchical access
  } else if (profile.role === 'admin') {
    // Filter by admin's org scope (kelompok/desa/daerah)
  }
  // Superadmin sees all
  return meetings.map(m => m.id)
}
```

---

### Layer 3: actions.ts (Server Actions)

**Purpose:** Thin orchestrator, public API for client components

**Rules:**
- ✅ Exported (called by components)
- ✅ HAS `'use server'` directive
- ✅ Can import Layer 1 (queries), Layer 2 (logic)
- ✅ Responsibilities: Auth, orchestration, error handling
- ❌ Minimal business logic (delegate to Layer 2)

**Single Server Action (~150 lines):**

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calculateAttendanceStats } from '@/lib/utils/attendanceCalculation'
import {
  fetchUserProfile,
  fetchMeetingsForDateRange,
  fetchClassHierarchyMaps,
  fetchAttendanceLogs,
  fetchStudentDetails,
  fetchKelompokNames
} from './queries'
import {
  buildDateFilter,
  filterMeetingsByRole,
  filterAttendanceByClass,
  filterAttendanceByKelompok,
  buildClassHierarchyMaps,
  buildEnrollmentMap,
  enrichAttendanceLogs,
  aggregateStudentSummary,
  aggregateTrendData,
  formatChartData
} from './logic'

export async function getAttendanceReport(
  filters: ReportFilters
): Promise<ReportData> {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // 2. Fetch user profile (Layer 1)
    const { data: profile } = await fetchUserProfile(supabase, user.id)
    if (!profile) throw new Error('User profile not found')

    // 3. Build date filter (Layer 2)
    const dateFilter = buildDateFilter(filters, new Date())

    // 4. Fetch meetings (Layer 1)
    const adminClient = await createAdminClient()
    const { data: meetings } = await fetchMeetingsForDateRange(
      adminClient,
      dateFilter,
      filters.meetingType
    )

    // 5. Fetch class hierarchy (Layer 1)
    const classIds = [...new Set(meetings.flatMap(m =>
      [m.class_id, ...(m.class_ids || [])]
    ))]
    const { data: classesData } = await fetchClassHierarchyMaps(
      adminClient,
      classIds
    )

    // 6. Build maps (Layer 2)
    const maps = buildClassHierarchyMaps(classesData)

    // 7. Filter meetings by role (Layer 2)
    const meetingIds = filterMeetingsByRole(meetings, profile, maps)

    // 8. Fetch attendance & students (Layer 1)
    const { data: logsData } = await fetchAttendanceLogs(adminClient, meetingIds)
    const studentIds = [...new Set(logsData.map(log => log.student_id))]
    const { data: studentsData } = await fetchStudentDetails(adminClient, studentIds)

    // 9. Build maps for enrichment (Layer 2)
    const studentMap = new Map(studentsData.map(s => [s.id, s]))
    const meetingMap = new Map(meetings.map(m => [m.id, m]))

    // 10. Enrich & filter logs (Layer 2)
    let enrichedLogs = enrichAttendanceLogs(logsData, studentMap, meetingMap)

    if (filters.classId) {
      const enrollmentMap = buildEnrollmentMap(/* ... */)
      enrichedLogs = filterAttendanceByClass(
        enrichedLogs, filters.classId, enrollmentMap, meetingMap
      )
    }

    if (filters.kelompokId) {
      enrichedLogs = filterAttendanceByKelompok(
        enrichedLogs, filters.kelompokId, maps, meetingMap
      )
    }

    if (filters.gender) {
      enrichedLogs = enrichedLogs.filter(log => log.students.gender === filters.gender)
    }

    // 11. Aggregate data (Layer 2)
    const summary = calculateAttendanceStats(enrichedLogs)
    const chartData = formatChartData(summary)

    const { data: kelompokData } = await fetchKelompokNames(adminClient)
    const kelompokMap = new Map(kelompokData.map(k => [k.id, k.name]))

    const trendChartData = aggregateTrendData(meetings, enrichedLogs, filters)
    const detailedRecords = aggregateStudentSummary(enrichedLogs, kelompokMap)

    return {
      summary,
      chartData,
      trendChartData,
      detailedRecords,
      period: filters.period,
      dateRange: {
        start: dateFilter.date?.gte || null,
        end: dateFilter.date?.lte || dateFilter.date?.eq || null
      }
    }
  } catch (error) {
    console.error('[MEMUAT DATA] Error:', {
      message: 'Gagal memuat laporan kehadiran',
      originalError: error,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}
```

---

## File Breakdown

### Domain: reports/ (from actions.ts - 1,112 lines)

#### **queries.ts** (~250 lines)

**Extract from actions.ts:**
- Lines 155-179: `fetchUserProfile(supabase, userId)`
- Lines 304-315: `fetchMeetingsForDateRange(supabase, dateFilter, meetingTypeFilter)`
- Lines 328-365: `fetchClassHierarchyMaps(supabase, classIds)`
- Lines 429-432: `fetchAttendanceLogs(supabase, meetingIds)` - wrapper for batchFetching
- Lines 451-494: `fetchStudentDetails(supabase, studentIds)`
- Lines 959-967: `fetchKelompokNames(supabase)`

#### **logic.ts** (~650 lines)

**Extract from actions.ts:**
- Lines 15-26: `getWeekStartDate(year, month, weekNumber)`
- Lines 31-45: `getWeekEndDate(year, month, weekNumber)`
- Lines 50-61: `getWeekNumberInMonth(date)`
- Lines 187-292: `buildDateFilter(filters, now)`
- Lines 344-365: `buildClassHierarchyMaps(classesData)`
- Lines 367-425: `filterMeetingsByRole(meetings, profile, maps)`
- Lines 587-609: `buildEnrollmentMap(studentClassesData)`
- Lines 505-516: `enrichAttendanceLogs(logsData, studentMap, meetingMap)`
- Lines 649-691: `filterAttendanceByClass(logs, classId, enrollmentMap, meetingMap)`
- Lines 696-734: `filterAttendanceByKelompok(logs, kelompokId, maps, meetingMap)`
- Lines 748-753: `formatChartData(summary)`
- Lines 799-955: `aggregateTrendData(meetings, logs, filters)`
- Lines 971-1081: `aggregateStudentSummary(logs, kelompokMap)`

#### **actions.ts** (~150 lines)

**Refactor getAttendanceReport:**
- Keep `'use server'` directive
- Import from `./queries` and `./logic`
- Thin orchestration only
- Preserve error handling exactly

---

### Backward Compatibility: index.ts (~20 lines)

```typescript
// laporan/actions/index.ts

// Re-export server action
export { getAttendanceReport } from './reports/actions'

// Re-export types
export type { ReportFilters, ReportData } from './reports/actions'
```

**Consumer code (unchanged):**
```typescript
// Components continue to use:
import { getAttendanceReport } from '@/app/(admin)/laporan/actions'
// ✅ Still works! index.ts re-exports from reports/actions.ts
```

---

## Migration Strategy

### Phase 1: Preparation (~5 mins)

```bash
mkdir -p src/app/\(admin\)/laporan/actions/reports/__tests__
```

### Phase 2: Layer 1 - queries.ts (~30 mins)

1. Create `reports/queries.ts` with header
2. Extract 6 query functions
3. Add `supabase: SupabaseClient` parameter
4. Remove `await createClient()` calls
5. Export all functions
6. NO `'use server'` directive

### Phase 3: Layer 2 - logic.ts (~45 mins)

1. Create `reports/logic.ts` with header
2. Move existing helpers (getWeekStartDate, etc.)
3. Extract `buildDateFilter` with all period logic
4. Extract filtering functions (role/class/kelompok/gender)
5. Extract transformation functions (maps/enrichment/aggregation)
6. All pure functions, fully testable

### Phase 4: Layer 3 - actions.ts (~30 mins)

1. Create `reports/actions.ts` with `'use server'`
2. Import from `./queries` and `./logic`
3. Refactor `getAttendanceReport` to thin orchestrator
4. Preserve error handling exactly
5. Move type definitions to actions.ts

### Phase 5: Integration (~15 mins)

1. Create `index.ts` with re-exports
2. Delete `laporan/actions.ts`
3. Verify component imports work

### Phase 6: Testing (~25 mins)

1. Create test files
2. Write ~33 tests (8 queries + 25 logic)
3. Run type-check, tests, build
4. Manual smoke test (12 items)

---

## Testing Strategy

### Test Structure

```
laporan/actions/reports/__tests__/
├── queries.test.ts     (~8 tests)
│   ├── fetchUserProfile - validates structure
│   ├── fetchMeetingsForDateRange - date filters
│   ├── fetchClassHierarchyMaps - nested relations
│   ├── fetchStudentDetails - multi-class support
│   └── ... (4 more)
│
└── logic.test.ts       (~25 tests)
    ├── buildDateFilter
    │   ├── general mode (month/year)
    │   ├── daily period
    │   ├── weekly period (custom + default)
    │   ├── monthly period (custom + default)
    │   └── yearly period (custom + default)
    ├── filterMeetingsByRole
    │   ├── superadmin (sees all)
    │   ├── admin daerah/desa/kelompok
    │   └── teacher (assigned + hierarchical)
    ├── filterAttendanceByClass
    │   ├── strict enrollment check
    │   └── multi-class meetings
    ├── buildEnrollmentMap
    │   └── null kelompok_id handling
    ├── aggregateStudentSummary
    │   ├── multi-class students
    │   └── kelompok name formatting
    └── aggregateTrendData
        ├── weekly grouping
        ├── monthly grouping
        └── yearly grouping
```

### Coverage Goals

| Layer | Target | Rationale |
|-------|--------|-----------|
| queries.ts | 60-70% | Structure validation with mocked Supabase |
| logic.ts | 95-100% | Pure functions - comprehensive edge cases |
| actions.ts | 0-30% | Defer to E2E/manual (complex mocking) |

### Manual Smoke Test Checklist

```
✅ Load /laporan page (displays)
✅ Switch view modes (general ↔ detailed)
✅ Change period filters (daily/weekly/monthly/yearly)
✅ Filter by class (single & multiple)
✅ Filter by kelompok (validates meeting location)
✅ Filter by gender (Laki-laki/Perempuan)
✅ Filter by meeting type (Hadir/Remaja/etc)
✅ Trend chart displays correctly
✅ Detailed records table shows correct data
✅ Teacher sees only their classes
✅ Admin sees scoped data (daerah/desa/kelompok)
✅ No console errors
```

---

## Success Criteria

**Must pass before completion:**

- [ ] All automated tests pass (`npm run test`)
- [ ] Type-check passes (`npm run type-check`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Zero breaking changes (components import unchanged)
- [ ] Each file <700 lines (queries ~250, logic ~650, actions ~150)
- [ ] Layer separation enforced (no 'use server' in queries/logic)
- [ ] Manual smoke tests pass (12 checklist items)
- [ ] No console errors in browser
- [ ] Report data matches production (compare before/after)

---

## Timeline

**Total Estimated Time:** ~2.5 hours

| Phase | Duration |
|-------|----------|
| Preparation | 5 mins |
| queries.ts | 30 mins |
| logic.ts | 45 mins |
| actions.ts | 30 mins |
| Integration | 15 mins |
| Testing | 25 mins |

---

## File Count Summary

| Action | Count |
|--------|-------|
| **Created** | 5 files (queries.ts, logic.ts, actions.ts, index.ts, 2 test files) |
| **Deleted** | 1 file (actions.ts monolith) |
| **Updated** | ~2 files (components if needed) |
| **Net** | +4 files |

---

## Future Work (Out of Scope)

**Apply pattern to remaining God files:**
- `rapot/actions.ts` (~800 lines estimated)
- `materi/actions.ts` (~600 lines estimated)
- `guru/actions.ts` (~400 lines estimated)
- `dashboard/actions.ts` (~300 lines estimated)

All should follow this design + sm-d15/sm-dsw as blueprint.

---

## References

- **sm-d15:** absensi 3-layer pattern (gold standard)
- **sm-dsw:** siswa 3-layer pattern (completed)
- **sm-9o0:** This issue (laporan refactoring)
- **CLAUDE.md:** Architecture section
- **docs/claude/architecture-patterns.md:** Conventions
