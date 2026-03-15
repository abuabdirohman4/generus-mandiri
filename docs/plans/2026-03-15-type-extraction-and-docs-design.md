# Type Extraction and Architecture Docs Update - Design Document

**Date:** 2026-03-15
**Related Issues:** sm-s3y (Extract inline types), sm-4tl (Update architecture docs)
**Branch:** refactoring-architecture
**Execution:** Google Antigravity (code creation), Claude Code (review)

---

## Overview

Extract inline types from refactored action files to centralized `src/types/` directory and update architecture documentation with type management patterns.

---

## Goals

1. **Centralize types** - Move inline types from refactored actions to `src/types/`
2. **Domain-based organization** - One type file per feature domain
3. **Documentation** - Add type management section to architecture docs
4. **Consistency** - Follow existing pattern from `attendance.ts`, `meeting.ts`, `student.ts`

---

## Scope

### In Scope
- Extract types from **refactored files only** (3-layer pattern applied):
  - `dashboard/actions/types.ts` → `src/types/dashboard.ts`
  - `laporan/actions/reports/actions.ts` → `src/types/report.ts`
  - `rapot/actions/` (if inline types exist) → `src/types/rapot.ts`
  - `materi/actions/` (if inline types exist) → `src/types/material.ts`
- Update all imports in action files
- Add type management section to `docs/claude/architecture-patterns.md`
- Add pointer in `CLAUDE.md`

### Out of Scope
- Files NOT yet refactored (guru, admin, kelas, organisasi)
- Client-side types (hooks, stores, components)
- Database schema types (handled by Supabase codegen)

---

## Design

### 1. Type Extraction Strategy

#### Target Structure
```
src/types/
├── attendance.ts       ✓ Existing (AttendanceLog, AttendanceData, AttendanceStats, AttendanceSaveResult)
├── meeting.ts          ✓ Existing (Meeting, CreateMeetingData, MeetingWithStats, UpdateMeetingData)
├── student.ts          ✓ Existing (Student, StudentWithClasses, etc.)
├── dashboard.ts        ← NEW (TodayMeeting, ClassPerformance, Dashboard, ClassMonitoringData, ClassMonitoringFilters)
├── report.ts           ← NEW (ReportFilters, ReportData)
├── material.ts         ← NEW (if inline types found in materi/actions/)
├── rapot.ts            ← NEW (if inline types found in rapot/actions/)
└── common.ts           ← NEW (shared types: ApiResponse, Pagination, FilterOptions, etc.)
```

#### Extraction Rules

1. **Export all types** - No internal-only types
2. **Preserve JSDoc comments** - Keep business logic context
3. **Alphabetical order** - Sort interfaces/types by name within file
4. **Group related types** - Use comment sections (e.g., `// ─── Core Types ───`)
5. **Update imports** - Change all import paths from inline to `@/types/[domain]`

#### Type File Template
```typescript
/**
 * [Domain] types for [Feature]
 */

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Entity {
  id: string
  name: string
  // ...
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateEntityData {
  name: string
  // ...
}

export interface EntityResponse {
  success: boolean
  data?: Entity
  error?: string
}

// ─── UI/Display ───────────────────────────────────────────────────────────────

export interface EntityWithStats extends Entity {
  total: number
  percentage: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface EntityFilters {
  search?: string
  status?: string
  // ...
}
```

---

### 2. File-by-File Extraction Plan

#### File 1: dashboard/actions/types.ts → src/types/dashboard.ts

**Current location:** `src/app/(admin)/dashboard/actions/types.ts`

**Types to extract:**
- `TodayMeeting` (interface, line 9-20)
- `ClassPerformance` (interface, line 23-28)
- `MeetingTypeDistribution` (interface, line 31-35)
- `Dashboard` (interface, line 37-46)
- `ClassMonitoringData` (interface, line 48-59)
- `ClassMonitoringFilters` (interface, line 61-69)
- `DashboardFilters` (re-exported type, line 7)

**Actions:**
1. Create `src/types/dashboard.ts`
2. Copy all types from `dashboard/actions/types.ts`
3. Add JSDoc header: `/** Dashboard types for metrics and monitoring */`
4. Sort alphabetically: ClassMonitoringData, ClassMonitoringFilters, ClassPerformance, Dashboard, DashboardFilters, MeetingTypeDistribution, TodayMeeting
5. Update imports in:
   - `src/app/(admin)/dashboard/actions/metrics/actions.ts`
   - `src/app/(admin)/dashboard/actions/monitoring/actions.ts`
   - `src/app/(admin)/dashboard/page.tsx`
   - Any hooks/components using these types
6. Delete `src/app/(admin)/dashboard/actions/types.ts`

**Import update pattern:**
```typescript
// OLD:
import type { Dashboard, TodayMeeting } from '../actions/types'

// NEW:
import type { Dashboard, TodayMeeting } from '@/types/dashboard'
```

---

#### File 2: laporan/actions/reports/actions.ts → src/types/report.ts

**Current location:** `src/app/(admin)/laporan/actions/reports/actions.ts` (inline, lines 33-64)

**Types to extract:**
- `ReportFilters` (interface, line 33-64)
- `ReportData` (interface, line 66-80+)

**Actions:**
1. Create `src/types/report.ts`
2. Extract `ReportFilters` and `ReportData` from `actions.ts`
3. Add JSDoc header: `/** Report types for laporan feature */`
4. Keep inline in actions.ts, just import from types (or fully extract - decide based on usage)
5. Update imports in:
   - `src/app/(admin)/laporan/actions/reports/actions.ts`
   - `src/app/(admin)/laporan/hooks/useLaporanPage.ts`
   - `src/app/(admin)/laporan/page.tsx`

**Decision needed:** Should we extract or keep inline? If only used in one file, KEEP INLINE. If used in 2+ files, EXTRACT.

**Action:** Check usage first with grep before extraction.

---

#### File 3: rapot/actions/ (TBD - Check for inline types)

**Check:**
```bash
grep -n "^export interface\|^export type" src/app/\(admin\)/rapot/actions/**/*.ts
```

**If types found:**
1. Create `src/types/rapot.ts`
2. Extract types
3. Update imports

**If NO types found:** Skip (rapot may already use `src/types/` or have minimal types)

---

#### File 4: materi/actions/ (TBD - Check for inline types)

**Check:**
```bash
grep -n "^export interface\|^export type" src/app/\(admin\)/materi/actions/**/*.ts
```

**If types found:**
1. Create `src/types/material.ts`
2. Extract types
3. Update imports

**If NO types found:** Skip

---

#### File 5: common.ts (Shared types - if needed)

**Create only if:** We find types used across 3+ domains (e.g., `ApiResponse`, `Pagination`, `SortOrder`)

**Potential types:**
```typescript
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface SortParams {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}
```

**Decision:** Extract only if pattern appears 3+ times in different domains.

---

### 3. Architecture Documentation Update

#### Add Section to docs/claude/architecture-patterns.md

**Location:** After "3-Layer Functional Architecture" section (~line 413)

**Content:**
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

#### Update CLAUDE.md

**Location:** Type/Interface Management section (~line 91)

**Change from:**
```markdown
## 📐 Type/Interface Management

**CRITICAL**: Avoid type fragmentation. For complete rules on centralizing types, checking before creating, and type hierarchy, READ [`docs/claude/type-management.md`](docs/claude/type-management.md)
```

**Change to:**
```markdown
## 📐 Type/Interface Management

**CRITICAL**: All domain types centralized in `src/types/`. For extraction rules, organization patterns, and import guidelines, READ [`docs/claude/architecture-patterns.md#type-management--organization`](docs/claude/architecture-patterns.md#type-management--organization)
```

**Optional:** Delete `docs/claude/type-management.md` if it's redundant (check content first).

---

## Execution Plan (For Antigravity)

### Phase 1: Inventory & Verification (10 min)

**Goal:** Confirm which files have inline types to extract.

**Steps:**
1. Check dashboard types:
   ```bash
   cat src/app/\(admin\)/dashboard/actions/types.ts
   ```
2. Check laporan types:
   ```bash
   grep -A 5 "^export interface\|^export type" src/app/\(admin\)/laporan/actions/reports/actions.ts
   ```
3. Check rapot types:
   ```bash
   grep -n "^export interface\|^export type" src/app/\(admin\)/rapot/actions/**/*.ts
   ```
4. Check materi types:
   ```bash
   grep -n "^export interface\|^export type" src/app/\(admin\)/materi/actions/**/*.ts
   ```
5. List files to extract (output for Phase 2)

**Deliverable:** List of files with types to extract (e.g., "dashboard, report, rapot (3 types), skip materi")

---

### Phase 2: Type Extraction (30 min)

**Goal:** Create new type files and extract types.

**For each domain (dashboard, report, rapot, materi if applicable):**

1. **Create type file:**
   ```bash
   # Example for dashboard
   touch src/types/dashboard.ts
   ```

2. **Extract types:**
   - Copy types from source file
   - Add JSDoc header
   - Sort alphabetically
   - Group by category (Core, Request/Response, UI, Filters)

3. **Verify structure:**
   - Check exports are all `export interface` or `export type`
   - No imports of Supabase client or server utilities
   - No business logic (pure type definitions)

**Deliverable:**
- `src/types/dashboard.ts` (created)
- `src/types/report.ts` (created)
- `src/types/rapot.ts` (created if types found)
- `src/types/material.ts` (created if types found)
- `src/types/common.ts` (created only if shared types found)

---

### Phase 3: Update Imports (20 min)

**Goal:** Replace inline type imports with centralized imports.

**For each domain:**

1. **Find all files importing types:**
   ```bash
   # Example for dashboard
   grep -r "from.*dashboard/actions/types" src/app/\(admin\)/dashboard/
   grep -r "from.*'../actions/types'" src/app/\(admin\)/dashboard/
   ```

2. **Update imports:**
   ```typescript
   // Before:
   import type { Dashboard, TodayMeeting } from '../actions/types'

   // After:
   import type { Dashboard, TodayMeeting } from '@/types/dashboard'
   ```

3. **Delete old type files** (if standalone, like `dashboard/actions/types.ts`):
   ```bash
   rm src/app/\(admin\)/dashboard/actions/types.ts
   ```

4. **Update re-exports in actions/index.ts** (if types were re-exported):
   - Remove type re-exports from `actions/index.ts`
   - Types should ONLY be imported from `@/types/`

**Deliverable:**
- All action files updated to import from `@/types/[domain]`
- Old inline type files deleted
- No orphaned type definitions

---

### Phase 4: Verification (10 min)

**Goal:** Ensure no type errors and all imports resolved.

**Steps:**
1. Run type-check:
   ```bash
   npm run type-check
   ```
   Expected: ✅ No errors

2. Run build (to catch import errors):
   ```bash
   npm run build
   ```
   Expected: ✅ Build succeeds

3. Check for orphaned imports:
   ```bash
   # Should return ZERO results
   grep -r "from.*actions/types" src/app/
   ```

4. Verify type files structure:
   ```bash
   ls -la src/types/
   ```
   Expected: dashboard.ts, report.ts, (rapot.ts), (material.ts) present

**Deliverable:** Confirmation that all verifications pass.

---

### Phase 5: Documentation Update (15 min)

**Goal:** Add type management section to architecture docs.

**Steps:**

1. **Add section to architecture-patterns.md:**
   - Open `docs/claude/architecture-patterns.md`
   - Find line ~413 (after "3-Layer Functional Architecture")
   - Insert "Type Management & Organization" section (see content above)

2. **Update CLAUDE.md:**
   - Open `CLAUDE.md`
   - Find line ~91 (Type/Interface Management section)
   - Update pointer to new architecture-patterns section
   - Remove reference to `type-management.md` if redundant

3. **Optional - Check type-management.md:**
   ```bash
   cat docs/claude/type-management.md
   ```
   - If content is now covered in architecture-patterns.md, delete it
   - If has unique content, keep it and update CLAUDE.md to reference both

**Deliverable:**
- `docs/claude/architecture-patterns.md` updated with Type Management section
- `CLAUDE.md` updated with new pointer
- (Optional) `docs/claude/type-management.md` deleted if redundant

---

## Success Criteria

**Code:**
- [ ] All inline types from refactored files extracted to `src/types/`
- [ ] Type files follow domain-based naming (`dashboard.ts`, `report.ts`, etc.)
- [ ] All imports updated from inline to `@/types/[domain]`
- [ ] Old inline type files deleted (e.g., `dashboard/actions/types.ts`)
- [ ] `npm run type-check` passes ✅
- [ ] `npm run build` succeeds ✅
- [ ] No orphaned imports to old type locations

**Documentation:**
- [ ] `docs/claude/architecture-patterns.md` has "Type Management & Organization" section
- [ ] `CLAUDE.md` updated with pointer to new section
- [ ] (Optional) `docs/claude/type-management.md` cleaned up or deleted

**Quality:**
- [ ] Types alphabetically sorted within files
- [ ] JSDoc comments preserved
- [ ] Consistent grouping (Core, Request/Response, UI, Filters)
- [ ] No business logic in type files (pure definitions only)

---

## Review Checklist (For Claude Code)

When reviewing Antigravity's work:

1. **File structure:**
   - [ ] Check `src/types/` has expected files
   - [ ] Open each new type file, verify JSDoc header
   - [ ] Verify alphabetical sorting within sections

2. **Type completeness:**
   - [ ] Compare new type files with original sources
   - [ ] Ensure no types were missed
   - [ ] Check comments preserved

3. **Import updates:**
   - [ ] Grep for old import paths, should be ZERO results:
     ```bash
     grep -r "from.*actions/types" src/app/\(admin\)/dashboard/
     grep -r "from.*'../actions/types'" src/app/\(admin\)/laporan/
     ```
   - [ ] Spot-check a few files for correct new imports

4. **Build verification:**
   - [ ] Run `npm run type-check` locally
   - [ ] Run `npm run build` locally
   - [ ] Check terminal output for errors

5. **Documentation:**
   - [ ] Read new architecture-patterns.md section
   - [ ] Verify CLAUDE.md pointer updated
   - [ ] Check if type-management.md needs deletion

6. **Clean-up:**
   - [ ] Verify old type files deleted (e.g., `dashboard/actions/types.ts`)
   - [ ] No dead code or commented-out types
   - [ ] No duplicate type definitions

---

## Notes for Antigravity Execution

**Context to provide:**
- This design document (full content)
- Link to `docs/plans/REFACTORING-QUICK-GUIDE.md` for reference pattern
- Existing type files: `src/types/attendance.ts`, `meeting.ts`, `student.ts`

**Execution mode:**
- Sequential execution (Phase 1 → 2 → 3 → 4 → 5)
- Verify after each phase before proceeding
- Output file list after Phase 2 for review

**Key principles:**
- YAGNI - Only extract if used in 2+ files (check first)
- No duplication - If type exists in `src/types/`, use it (don't recreate)
- Preserve context - Keep JSDoc comments intact
- Alphabetical order - Sort for easy scanning

---

## Rollback Plan (If needed)

If issues found during review:

1. **Partial rollback** (specific domain):
   ```bash
   git checkout HEAD -- src/types/dashboard.ts
   git checkout HEAD -- src/app/\(admin\)/dashboard/
   ```

2. **Full rollback** (all changes):
   ```bash
   git checkout HEAD -- src/types/
   git checkout HEAD -- src/app/\(admin\)/
   git checkout HEAD -- docs/
   ```

3. **Re-apply with fixes** - Provide feedback to Antigravity for corrections.

---

## Related Issues

- **sm-s3y** - Extract inline types to src/types/
- **sm-4tl** - Update architecture docs with new pattern
- **sm-d15** - 3-layer refactoring pattern (reference)
- **sm-vpo** - Initial absensi refactoring pilot (has type examples)

---

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Phase 1: Inventory | 10 min | Check 4 files for types |
| Phase 2: Extraction | 30 min | Create 3-5 type files |
| Phase 3: Update Imports | 20 min | Update ~10-15 files |
| Phase 4: Verification | 10 min | type-check + build |
| Phase 5: Documentation | 15 min | Update 2 doc files |
| **Total** | **~85 min** | **1.5 hours in Antigravity** |

Review time in Claude Code: ~30 min

---

**End of Design Document**
