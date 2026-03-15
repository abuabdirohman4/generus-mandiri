# Type Extraction and Documentation Update - Implementation Plan

> **For Claude/Antigravity:** Execute tasks sequentially. Verify each step before proceeding.

**Goal:** Extract inline types from refactored action files to `src/types/` and update architecture documentation.

**Architecture:** Domain-based type organization following existing pattern from `attendance.ts`, `meeting.ts`, `student.ts`. Each type file contains alphabetically sorted types grouped by category (Core Entities, Request/Response, UI/Display, Filters).

**Tech Stack:** TypeScript, Next.js 15 App Router

**Reference Documents:**
- Design: `docs/plans/2026-03-15-type-extraction-and-docs-design.md`
- Pattern: `src/types/attendance.ts`, `src/types/meeting.ts`

---

## Task 1: Inventory - Check Dashboard Types

**Files:**
- Read: `src/app/(admin)/dashboard/actions/types.ts`

**Step 1: Read dashboard types file**

Run:
```bash
cat src/app/\(admin\)/dashboard/actions/types.ts
```

Expected output: File contains ~70 lines with 7 types (TodayMeeting, ClassPerformance, MeetingTypeDistribution, Dashboard, ClassMonitoringData, ClassMonitoringFilters, DashboardFilters)

**Step 2: Count types to extract**

Run:
```bash
grep "^export interface\|^export type" src/app/\(admin\)/dashboard/actions/types.ts | wc -l
```

Expected output: 7 types

**Step 3: List type names**

Run:
```bash
grep "^export interface\|^export type" src/app/\(admin\)/dashboard/actions/types.ts | sed 's/export interface //; s/export type //; s/ {.*//; s/ =.*//'
```

Expected output:
```
DashboardFilters
TodayMeeting
ClassPerformance
MeetingTypeDistribution
Dashboard
ClassMonitoringData
ClassMonitoringFilters
```

**Step 4: Record result**

Record: "Dashboard - 7 types found, EXTRACT to src/types/dashboard.ts"

---

## Task 2: Inventory - Check Laporan Types

**Files:**
- Read: `src/app/(admin)/laporan/actions/reports/actions.ts:33-80`

**Step 1: Search for inline types in laporan**

Run:
```bash
grep -n "^export interface\|^export type" src/app/\(admin\)/laporan/actions/reports/actions.ts
```

Expected output: Lines 33 and 66 (ReportFilters, ReportData)

**Step 2: Check if types are used elsewhere**

Run:
```bash
grep -r "ReportFilters\|ReportData" src/app/\(admin\)/laporan/ --include="*.ts" --include="*.tsx" | grep -v "actions/reports/actions.ts" | wc -l
```

Expected output: 2+ files (used in hooks/page)

**Step 3: Record result**

Record: "Laporan - 2 types found (ReportFilters, ReportData), used in 2+ files, EXTRACT to src/types/report.ts"

---

## Task 3: Inventory - Check Rapot Types

**Files:**
- Search: `src/app/(admin)/rapot/actions/**/*.ts`

**Step 1: Search for inline types in rapot**

Run:
```bash
find src/app/\(admin\)/rapot/actions -name "*.ts" -exec grep -l "^export interface\|^export type" {} \;
```

Expected output: Empty (no inline types) OR file paths if types exist

**Step 2: If types found, count them**

Run (only if Step 1 found files):
```bash
grep "^export interface\|^export type" <file-from-step1> | wc -l
```

**Step 3: Record result**

Record: "Rapot - 0 types found, SKIP" OR "Rapot - N types found, EXTRACT to src/types/rapot.ts"

---

## Task 4: Inventory - Check Materi Types

**Files:**
- Search: `src/app/(admin)/materi/actions/**/*.ts`

**Step 1: Search for inline types in materi**

Run:
```bash
find src/app/\(admin\)/materi/actions -name "*.ts" -exec grep -l "^export interface\|^export type" {} \;
```

Expected output: Empty OR file paths

**Step 2: Record result**

Record: "Materi - 0 types found, SKIP" OR "Materi - N types found, EXTRACT to src/types/material.ts"

---

## Task 5: Create Dashboard Type File

**Files:**
- Create: `src/types/dashboard.ts`
- Read: `src/app/(admin)/dashboard/actions/types.ts`

**Step 1: Read source types**

Run:
```bash
cat src/app/\(admin\)/dashboard/actions/types.ts
```

**Step 2: Create dashboard.ts with JSDoc header and imports**

Create file `src/types/dashboard.ts`:

```typescript
/**
 * Dashboard types for metrics and monitoring
 */

import type { DashboardFilters as DashboardFiltersBase } from '../app/(admin)/dashboard/dashboardHelpers'

export type { DashboardFiltersBase as DashboardFilters }
```

**Step 3: Add ClassMonitoringData (alphabetically first)**

Add to `src/types/dashboard.ts`:

```typescript
// ─── Core Types ───────────────────────────────────────────────────────────────

export interface ClassMonitoringData {
    class_id: string
    class_name: string
    kelompok_name?: string
    desa_name?: string
    daerah_name?: string
    has_meeting: boolean
    meeting_count: number
    attendance_rate: number
    student_count?: number
    meeting_ids?: string[]
}
```

**Step 4: Add ClassMonitoringFilters**

Add to `src/types/dashboard.ts`:

```typescript
// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ClassMonitoringFilters extends DashboardFilters {
    period: 'today' | 'week' | 'month' | 'custom'
    startDate?: string
    endDate?: string
    classViewMode?: 'separated' | 'combined'
    specificDate?: string
    weekOffset?: number
    monthString?: string
}
```

**Step 5: Add ClassPerformance**

Add to `src/types/dashboard.ts` under Core Types:

```typescript
/** Legacy interface - kept for backward compatibility */
export interface ClassPerformance {
    class_id: string
    class_name: string
    attendance_percentage: number
    total_meetings: number
}
```

**Step 6: Add Dashboard interface**

Add to `src/types/dashboard.ts` under Core Types:

```typescript
export interface Dashboard {
    siswa: number
    kelas: number
    meetingsToday: number
    meetingsWeekly: number
    meetingsMonthly: number
    kehadiranHariIni: number
    kehadiranMingguan: number
    kehadiranBulanan: number
}
```

**Step 7: Add MeetingTypeDistribution**

Add to `src/types/dashboard.ts` under Core Types:

```typescript
/** Legacy interface - kept for backward compatibility */
export interface MeetingTypeDistribution {
    type: string
    label: string
    count: number
}
```

**Step 8: Add TodayMeeting**

Add to `src/types/dashboard.ts` under Core Types:

```typescript
export interface TodayMeeting {
    id: string
    title: string
    date: string
    class_id: string
    class_name: string
    teacher_name: string
    meeting_type_code: string | null
    total_students: number
    present_count: number
    attendance_percentage: number
}
```

**Step 9: Verify file structure**

Run:
```bash
cat src/types/dashboard.ts
```

Expected: File with JSDoc header, alphabetically sorted types, proper grouping

**Step 10: Verify TypeScript syntax**

Run:
```bash
npx tsc --noEmit src/types/dashboard.ts
```

Expected: No errors

---

## Task 6: Create Report Type File

**Files:**
- Create: `src/types/report.ts`
- Read: `src/app/(admin)/laporan/actions/reports/actions.ts:33-80`

**Step 1: Extract ReportData type**

Create file `src/types/report.ts`:

```typescript
/**
 * Report types for laporan feature
 */

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface ReportData {
    summary: {
        total: number
        hadir: number
        izin: number
        sakit: number
        alpha: number
    }
    chartData: Array<{ name: string; value: number }>
    trendChartData: Array<{
        date: string
        fullDate: string
        attendancePercentage: number
        presentCount: number
        totalStudents: number
    }>
}
```

**Step 2: Add ReportFilters type**

Add to `src/types/report.ts` under Filters section:

```typescript
// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ReportFilters {
    // General mode filters
    month?: number
    year?: number
    viewMode?: 'general' | 'detailed'

    // Detailed mode filters - Period-specific
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    classId?: string
    kelompokId?: string
    gender?: string
    meetingType?: string

    // Daily filters
    startDate?: string
    endDate?: string

    // Weekly filters
    weekYear?: number
    weekMonth?: number
    startWeekNumber?: number
    endWeekNumber?: number

    // Monthly filters
    monthYear?: number
    startMonth?: number
    endMonth?: number

    // Yearly filters
    startYear?: number
    endYear?: number
}
```

**Step 3: Verify alphabetical order**

Check: ReportData should come before ReportFilters alphabetically → Swap if needed

**Step 4: Verify file**

Run:
```bash
npx tsc --noEmit src/types/report.ts
```

Expected: No errors

---

## Task 7: Update Dashboard Actions Imports

**Files:**
- Modify: `src/app/(admin)/dashboard/actions/metrics/actions.ts`
- Modify: `src/app/(admin)/dashboard/actions/monitoring/actions.ts`

**Step 1: Find old imports in metrics/actions.ts**

Run:
```bash
grep "from.*types" src/app/\(admin\)/dashboard/actions/metrics/actions.ts
```

**Step 2: Update imports in metrics/actions.ts**

Find lines with:
```typescript
import type { Dashboard, TodayMeeting } from '../types'
```

Replace with:
```typescript
import type { Dashboard, TodayMeeting } from '@/types/dashboard'
```

**Step 3: Find old imports in monitoring/actions.ts**

Run:
```bash
grep "from.*types" src/app/\(admin\)/dashboard/actions/monitoring/actions.ts
```

**Step 4: Update imports in monitoring/actions.ts**

Find lines with:
```typescript
import type { ClassMonitoringData, ClassMonitoringFilters } from '../types'
```

Replace with:
```typescript
import type { ClassMonitoringData, ClassMonitoringFilters } from '@/types/dashboard'
```

**Step 5: Verify no more references to old types file**

Run:
```bash
grep -r "from.*dashboard/actions/types" src/app/\(admin\)/dashboard/actions/
```

Expected: No results

---

## Task 8: Update Dashboard Page Imports

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx`

**Step 1: Find old imports**

Run:
```bash
grep "from.*actions/types" src/app/\(admin\)/dashboard/page.tsx
```

**Step 2: Update imports**

Find lines with:
```typescript
import type { Dashboard, TodayMeeting, ClassPerformance } from './actions/types'
```

Replace with:
```typescript
import type { Dashboard, TodayMeeting, ClassPerformance } from '@/types/dashboard'
```

**Step 3: Verify**

Run:
```bash
grep "from '@/types/dashboard'" src/app/\(admin\)/dashboard/page.tsx
```

Expected: Import line present

---

## Task 9: Find and Update All Dashboard Type Imports

**Files:**
- Search: `src/app/(admin)/dashboard/**/*.{ts,tsx}`

**Step 1: Find all files importing dashboard types**

Run:
```bash
grep -r "from.*'/actions/types'\|from.*\"/actions/types\"\|from.*'../actions/types'\|from.*\"../actions/types\"" src/app/\(admin\)/dashboard/ --include="*.ts" --include="*.tsx"
```

**Step 2: For each file found, update import**

Replace:
```typescript
import type { ... } from '../actions/types'
import type { ... } from './actions/types'
```

With:
```typescript
import type { ... } from '@/types/dashboard'
```

**Step 3: Verify no old imports remain**

Run:
```bash
grep -r "actions/types" src/app/\(admin\)/dashboard/ --include="*.ts" --include="*.tsx"
```

Expected: No results

---

## Task 10: Delete Old Dashboard Types File

**Files:**
- Delete: `src/app/(admin)/dashboard/actions/types.ts`

**Step 1: Verify file is no longer imported**

Run:
```bash
grep -r "dashboard/actions/types" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results

**Step 2: Delete file**

Run:
```bash
rm src/app/\(admin\)/dashboard/actions/types.ts
```

**Step 3: Verify deletion**

Run:
```bash
ls src/app/\(admin\)/dashboard/actions/types.ts
```

Expected: File not found

---

## Task 11: Update Laporan Actions Imports

**Files:**
- Modify: `src/app/(admin)/laporan/actions/reports/actions.ts`

**Step 1: Find inline type definitions**

Run:
```bash
grep -n "^export interface ReportFilters\|^export interface ReportData" src/app/\(admin\)/laporan/actions/reports/actions.ts
```

Expected: Lines 33 and 66

**Step 2: Add import at top of file**

Add after existing imports:
```typescript
import type { ReportFilters, ReportData } from '@/types/report'
```

**Step 3: Remove inline type definitions**

Delete lines 33-64 (ReportFilters definition) and 66-80 (ReportData definition)

**Step 4: Verify file still exports types (if re-exported)**

Check if file has:
```typescript
export type { ReportFilters, ReportData }
```

If yes, remove these lines (types should only be imported from @/types/)

**Step 5: Verify syntax**

Run:
```bash
npx tsc --noEmit src/app/\(admin\)/laporan/actions/reports/actions.ts
```

Expected: No errors

---

## Task 12: Update Laporan Page and Hooks Imports

**Files:**
- Modify: `src/app/(admin)/laporan/page.tsx`
- Modify: `src/app/(admin)/laporan/hooks/useLaporanPage.ts`

**Step 1: Find files importing report types**

Run:
```bash
grep -r "ReportFilters\|ReportData" src/app/\(admin\)/laporan/ --include="*.ts" --include="*.tsx" -l
```

**Step 2: For each file, check import source**

Run:
```bash
grep "import.*Report" src/app/\(admin\)/laporan/page.tsx
grep "import.*Report" src/app/\(admin\)/laporan/hooks/useLaporanPage.ts
```

**Step 3: Update imports if from actions**

Replace:
```typescript
import type { ReportFilters, ReportData } from '../actions/reports/actions'
import type { ReportFilters } from './actions/reports/actions'
```

With:
```typescript
import type { ReportFilters, ReportData } from '@/types/report'
```

**Step 4: Verify**

Run:
```bash
grep -r "from.*actions.*Report" src/app/\(admin\)/laporan/ --include="*.ts" --include="*.tsx"
```

Expected: No results

---

## Task 13: Verify Type Extraction Complete

**Files:**
- Check: `src/types/`
- Check: All action files

**Step 1: List new type files**

Run:
```bash
ls -la src/types/
```

Expected: dashboard.ts, report.ts present (+ rapot.ts, material.ts if created)

**Step 2: Check for orphaned imports to old type locations**

Run:
```bash
grep -r "from.*actions/types" src/app/ --include="*.ts" --include="*.tsx"
```

Expected: No results

**Step 3: Verify dashboard types exported correctly**

Run:
```bash
grep "^export" src/types/dashboard.ts | wc -l
```

Expected: 7 exports

**Step 4: Verify report types exported correctly**

Run:
```bash
grep "^export" src/types/report.ts | wc -l
```

Expected: 2 exports

---

## Task 14: Run Type Check

**Files:**
- Verify: All TypeScript files

**Step 1: Run TypeScript type checker**

Run:
```bash
npm run type-check
```

Expected output: ✅ No errors

**Step 2: If errors found, read error messages**

Run:
```bash
npm run type-check 2>&1 | head -20
```

**Step 3: Fix import errors (if any)**

Common fixes:
- Missing `@/types/dashboard` import
- Wrong type name (check alphabetical order in type file)
- Circular dependency (move type to different file)

**Step 4: Re-run type-check until clean**

Run:
```bash
npm run type-check
```

Expected: ✅ No errors

---

## Task 15: Run Build Verification

**Files:**
- Build: Entire Next.js app

**Step 1: Run production build**

Run:
```bash
npm run build
```

Expected: ✅ Build succeeds

**Step 2: If build fails, check error messages**

Run:
```bash
npm run build 2>&1 | grep -A 5 "error"
```

**Step 3: Fix any import resolution errors**

Common issues:
- Path alias not working (check tsconfig.json paths)
- Type import from wrong location
- Missing export in type file

**Step 4: Re-run build until clean**

Run:
```bash
npm run build
```

Expected: ✅ Build succeeds with "Compiled successfully"

---

## Task 16: Add Type Management Section to Architecture Docs

**Files:**
- Modify: `docs/claude/architecture-patterns.md:413` (after 3-Layer section)

**Step 1: Find insertion point**

Run:
```bash
grep -n "^## 3-Layer Functional Architecture" docs/claude/architecture-patterns.md
```

Expected: Line number ~258

**Step 2: Find end of 3-Layer section**

Run:
```bash
grep -n "^---$" docs/claude/architecture-patterns.md | tail -5
```

Expected: Line ~413

**Step 3: Insert new section after line 413**

Add this content:

```markdown
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

**File organization within type files:**
```typescript
/**
 * [Domain] types for [Feature]
 */

// ─── Core Entities ────────────────────────────────────────────────────────────
export interface Entity { ... }

// ─── Request/Response ─────────────────────────────────────────────────────────
export interface CreateEntityData { ... }

// ─── UI/Display ───────────────────────────────────────────────────────────────
export interface EntityWithStats { ... }

// ─── Filters ──────────────────────────────────────────────────────────────────
export interface EntityFilters { ... }
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

---
```

**Step 4: Verify insertion**

Run:
```bash
grep -A 3 "^## Type Management & Organization" docs/claude/architecture-patterns.md
```

Expected: Section heading + first few lines visible

---

## Task 17: Update CLAUDE.md Type Management Pointer

**Files:**
- Modify: `CLAUDE.md:91` (Type/Interface Management section)

**Step 1: Find Type Management section in CLAUDE.md**

Run:
```bash
grep -n "^## 📐 Type/Interface Management" CLAUDE.md
```

Expected: Line ~91

**Step 2: Read current content**

Run:
```bash
sed -n '/^## 📐 Type\/Interface Management/,/^## /p' CLAUDE.md | head -10
```

**Step 3: Replace section content**

Replace:
```markdown
## 📐 Type/Interface Management

**CRITICAL**: Avoid type fragmentation. For complete rules on centralizing types, checking before creating, and type hierarchy, READ [`docs/claude/type-management.md`](docs/claude/type-management.md)
```

With:
```markdown
## 📐 Type/Interface Management

**CRITICAL**: All domain types centralized in `src/types/`. For extraction rules, organization patterns, and import guidelines, READ [`docs/claude/architecture-patterns.md#type-management--organization`](docs/claude/architecture-patterns.md#type-management--organization)
```

**Step 4: Verify update**

Run:
```bash
grep -A 2 "^## 📐 Type/Interface Management" CLAUDE.md
```

Expected: New pointer to architecture-patterns.md visible

---

## Task 18: Check if type-management.md is Redundant

**Files:**
- Read: `docs/claude/type-management.md` (if exists)

**Step 1: Check if file exists**

Run:
```bash
ls docs/claude/type-management.md
```

Expected: File exists OR "No such file"

**Step 2: If exists, read content**

Run:
```bash
cat docs/claude/type-management.md
```

**Step 3: Compare with new architecture-patterns.md section**

Decision:
- If content is now covered in architecture-patterns.md → DELETE
- If has unique content (e.g., advanced type patterns) → KEEP and update CLAUDE.md to reference both

**Step 4: If deleting, remove file**

Run (only if redundant):
```bash
rm docs/claude/type-management.md
```

**Step 5: If keeping, update CLAUDE.md to reference both**

Update CLAUDE.md section to:
```markdown
**CRITICAL**: All domain types centralized in `src/types/`. For extraction rules and organization, READ [`docs/claude/architecture-patterns.md#type-management--organization`](docs/claude/architecture-patterns.md#type-management--organization). For advanced type patterns, READ [`docs/claude/type-management.md`](docs/claude/type-management.md)
```

---

## Task 19: Final Verification - Type Check

**Files:**
- Verify: All files

**Step 1: Run full type check**

Run:
```bash
npm run type-check
```

Expected: ✅ No errors

**Step 2: Run build**

Run:
```bash
npm run build
```

Expected: ✅ Build succeeds

**Step 3: Verify no orphaned imports**

Run:
```bash
grep -r "from.*actions/types" src/app/ --include="*.ts" --include="*.tsx"
```

Expected: No results

**Step 4: Verify type files structure**

Run:
```bash
ls -la src/types/ | grep "dashboard\|report"
```

Expected: dashboard.ts and report.ts present

---

## Task 20: Final Verification - Documentation

**Files:**
- Verify: `docs/claude/architecture-patterns.md`
- Verify: `CLAUDE.md`

**Step 1: Verify architecture-patterns.md has new section**

Run:
```bash
grep "^## Type Management & Organization" docs/claude/architecture-patterns.md
```

Expected: Section heading found

**Step 2: Verify CLAUDE.md updated**

Run:
```bash
grep "architecture-patterns.md#type-management" CLAUDE.md
```

Expected: Link found

**Step 3: Count lines in architecture-patterns.md**

Run:
```bash
wc -l docs/claude/architecture-patterns.md
```

Expected: ~500-550 lines (was ~413, added ~100 lines)

**Step 4: Verify markdown syntax**

Run:
```bash
npx markdownlint docs/claude/architecture-patterns.md
```

Expected: No critical errors (warnings OK)

---

## Success Criteria Checklist

**Code Changes:**
- [ ] `src/types/dashboard.ts` created with 7 types
- [ ] `src/types/report.ts` created with 2 types
- [ ] All dashboard imports updated to `@/types/dashboard`
- [ ] All laporan imports updated to `@/types/report`
- [ ] `src/app/(admin)/dashboard/actions/types.ts` deleted
- [ ] Inline types removed from `laporan/actions/reports/actions.ts`
- [ ] `npm run type-check` passes ✅
- [ ] `npm run build` succeeds ✅
- [ ] No orphaned imports to old type locations

**Documentation:**
- [ ] `docs/claude/architecture-patterns.md` has "Type Management & Organization" section (~100 lines)
- [ ] `CLAUDE.md` Type/Interface Management section updated with new pointer
- [ ] `docs/claude/type-management.md` deleted (if redundant) OR kept with updated CLAUDE.md reference

**Quality:**
- [ ] Types alphabetically sorted within files (dashboard: ClassMonitoring*, ClassPerformance, Dashboard, MeetingType*, TodayMeeting)
- [ ] JSDoc comments preserved (`/** Dashboard types for metrics and monitoring */`)
- [ ] Consistent grouping (Core Entities, Filters sections used)
- [ ] No business logic in type files (pure type definitions only)

---

## Rollback Instructions

If errors found:

**Rollback specific domain:**
```bash
git checkout HEAD -- src/types/dashboard.ts
git checkout HEAD -- src/app/\(admin\)/dashboard/
```

**Rollback all changes:**
```bash
git checkout HEAD -- src/types/
git checkout HEAD -- src/app/\(admin\)/
git checkout HEAD -- docs/claude/architecture-patterns.md
git checkout HEAD -- CLAUDE.md
```

---

## Notes for Execution

**Key Principles:**
- YAGNI: Only extract if types used in 2+ files (dashboard ✅, report ✅)
- Preserve comments: Keep JSDoc and inline comments intact
- Alphabetical order: Sort types for easy scanning
- Verify often: Run type-check after each major change

**Common Pitfalls:**
- Forgetting to update imports in page.tsx
- Not deleting old type files after extraction
- Import path typos (`@/types/dashboards` vs `@/types/dashboard`)
- Circular dependencies (if type imports another type from actions)

**Timeline:**
- Tasks 1-4: Inventory (10 min)
- Tasks 5-6: Type file creation (15 min)
- Tasks 7-12: Import updates (20 min)
- Tasks 13-15: Verification (10 min)
- Tasks 16-18: Documentation (15 min)
- Tasks 19-20: Final verification (5 min)
- **Total: ~75 minutes**

---

**End of Implementation Plan**
