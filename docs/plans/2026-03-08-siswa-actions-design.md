# Design: Apply 3-Layer Pattern to users/siswa (Separated Files)

**Date:** 2026-03-08
**Related Issues:** TBD (to be created in beads)
**Status:** Approved
**Type:** Refactoring
**Reference:** sm-d15 (absensi 3-layer pattern gold standard)

---

## Overview

Refactor `users/siswa/actions/` from monolithic structure (3,038 lines across 3 files with mixed layers) to modular domain-based structure with **3 layers separated into distinct files per domain**. This applies the sm-d15 gold standard pattern to student management.

**Goal:** Establish consistent 3-layer architecture across student CRUD, class queries, and lifecycle management.

**Constraints:**
- Pure refactoring - NO behavior changes
- Backward compatible - existing imports must work via `index.ts`
- Functional style only (no classes/OOP)
- One session execution (Big Bang migration)
- Move `@/lib/studentPermissions.ts` to domain folder (only used by siswa)

---

## Current State (Before Refactoring)

```
users/siswa/
├── actions.ts                    (1,682 lines - 'use server', mixed layers)
│   ├── Layer 1: getAllStudents, getUserProfile queries
│   ├── Layer 2: transformStudentsData helper
│   ├── Layer 3: createStudent, updateStudent, deleteStudent, etc.
│   └── Exports: 20+ server actions
│
└── actions/
    ├── classes.ts                (245 lines - 'use server', mixed layers)
    │   ├── Layer 1: getAllClasses query
    │   ├── Layer 2: sortClassesByMasterOrder, fetchClassMasterMappings
    │   └── Layer 3: getAllClasses, getAllClassesByKelompok
    │
    └── management.ts             (1,111 lines - 'use server', mixed layers)
        ├── Layer 1: Archive/transfer queries
        ├── Layer 2: Validation, permission checks
        └── Layer 3: archiveStudent, requestTransfer, approveTransfer, etc.

@/lib/studentPermissions.ts      (398 lines - only used by siswa domain)
```

**Issues:**
- 🔴 Layers mixed in same file → hard to test
- 🔴 Large files (1,682 lines) → hard to navigate
- 🔴 `'use server'` prevents testing queries in isolation
- 🔴 Permissions in `@/lib/` but only used in siswa domain
- 🔴 No clear domain boundaries

**Total Lines:** 3,038 lines (actions.ts + classes.ts + management.ts)

---

## Target State (After Refactoring)

```
users/siswa/actions/
├── students/
│   ├── queries.ts           (~400 lines, NO 'use server')
│   ├── logic.ts             (~200 lines, NO 'use server')
│   ├── permissions.ts       (~400 lines, NO 'use server', moved from @/lib/)
│   ├── actions.ts           (~900 lines, 'use server')
│   └── __tests__/
│       ├── queries.test.ts
│       ├── logic.test.ts
│       └── permissions.test.ts
│
├── classes/
│   ├── queries.ts           (~150 lines, NO 'use server')
│   ├── logic.ts             (~100 lines, NO 'use server')
│   ├── actions.ts           (~50 lines, 'use server')
│   └── __tests__/
│       ├── queries.test.ts
│       └── logic.test.ts
│
├── management/
│   ├── queries.ts           (~250 lines, NO 'use server')
│   ├── logic.ts             (~150 lines, NO 'use server')
│   ├── actions.ts           (~650 lines, 'use server')
│   └── __tests__/
│       ├── queries.test.ts
│       └── logic.test.ts
│
└── index.ts                 (~50 lines)
    └── Re-export all server actions for backward compatibility
```

**Improvements:**
- ✅ 3-layer separation - queries/logic/actions in distinct files
- ✅ Testable - Layer 1 & 2 testable without 'use server' mocking
- ✅ Smaller files - Each file 50-400 lines (down from 1,682)
- ✅ Co-located - Permissions moved to domain folder
- ✅ Domain-based - Clear boundaries (students/classes/management)
- ✅ Backward compatible - index.ts re-exports maintain existing imports

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

**Naming Convention:** `fetch*()`, `insert*()`, `update*()`, `delete*()`, `build*Query()`

**Example:**
```typescript
// queries.ts - NO 'use server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchAllStudents(
  supabase: SupabaseClient,
  classId?: string
) {
  let query = supabase
    .from('students')
    .select(`
      id, name, gender, class_id,
      student_classes(classes:class_id(id, name)),
      daerah:daerah_id(name),
      desa:desa_id(name),
      kelompok:kelompok_id(name)
    `)
    .is('deleted_at', null)
    .order('name')

  if (classId) {
    // Filter logic...
  }

  return await query
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

**Naming Convention:** `validate*()`, `calculate*()`, `transform*()`, `build*()`

**Example:**
```typescript
// logic.ts - NO 'use server'
import type { StudentWithClasses } from '@/types/student'

export function validateStudentData(data: any): { ok: boolean, error?: string } {
  if (!data.name || !data.gender || !data.classId) {
    return { ok: false, error: 'Semua field harus diisi' }
  }

  if (!['Laki-laki', 'Perempuan'].includes(data.gender)) {
    return { ok: false, error: 'Jenis kelamin tidak valid' }
  }

  return { ok: true }
}

export function transformStudentsData(students: any[]): StudentWithClasses[] {
  return students.map(student => {
    // Transformation logic...
  })
}
```

---

### Layer 3: actions.ts (Server Actions)

**Purpose:** Thin orchestrators, public API for client components

**Rules:**
- ✅ Exported (called by components)
- ✅ HAS `'use server'` directive
- ✅ Can import Layer 1 (queries), Layer 2 (logic), permissions
- ✅ Responsibilities: Auth, permissions, orchestration, revalidation
- ❌ Minimal business logic (delegate to Layer 2)

**Example:**
```typescript
// actions.ts - WITH 'use server'
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchAllStudents, insertStudent } from './queries'
import { validateStudentData, transformStudentsData } from './logic'
import { canSoftDeleteStudent } from './permissions'

export async function createStudent(formData: FormData) {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // 2. Extract data
  const data = { /* extract from formData */ }

  // 3. Business logic (Layer 2)
  const validation = validateStudentData(data)
  if (!validation.ok) throw new Error(validation.error)

  // 4. Database operation (Layer 1)
  const adminClient = await createAdminClient()
  const { data: newStudent, error } = await insertStudent(adminClient, data)
  if (error) throw error

  // 5. Revalidation
  revalidatePath('/users/siswa')

  return { success: true, student: newStudent }
}
```

---

### Special File: permissions.ts

**Purpose:** Student-specific permission logic (moved from `@/lib/studentPermissions.ts`)

**Rationale for moving:**
- Only used by siswa domain (actions + components)
- Co-location improves maintainability
- Follows sm-d15 principle (domain-specific code in domain folder)

**Location:** `users/siswa/actions/students/permissions.ts`

**Rules:**
- ✅ Exported (used by actions + components)
- ✅ NO `'use server'` directive (pure functions)
- ✅ Can import from `@/lib/accessControl` (shared helpers like `canTeacherAccessStudent`)

**Functions (moved as-is):**
- `canArchiveStudent(user, student)`
- `canTransferStudent(user, student)`
- `canSoftDeleteStudent(user, student)`
- `canHardDeleteStudent(user, student)`
- `canRequestTransfer(user, student)`
- `canReviewTransferRequest(user, request)`
- `needsApproval(requester, request)`
- `getTransferableDaerahIds(user, allDaerahIds)`
- `getTransferableDesaIds(user, targetDaerahId, allDesaIds)`
- `getTransferableKelompokIds(user, targetDesaId, allKelompokIds)`
- Helper functions and types

---

## File Breakdown

### Domain 1: students/ (from actions.ts - 1,682 lines)

#### **queries.ts** (~400 lines)

**Extract from actions.ts Layer 1:**
- `fetchAllStudents(supabase, classId?)` - Lines 70-467
- `fetchStudentById(supabase, id)` - Lines 1409-1479
- `fetchStudentBiodata(supabase, id)` - Lines 1577-1629
- `fetchStudentAttendanceHistory(supabase, id, year, month)` - Lines 1484-1572
- `insertStudent(supabase, data)` - Lines 713-730
- `insertStudentClass(supabase, studentId, classId)` - Lines 733-755
- `updateStudentRecord(supabase, id, data)` - Lines 887-913
- `syncStudentClasses(supabase, studentId, classIds)` - Lines 919-965
- `softDeleteStudent(supabase, id, userId)` - Lines 1111-1118
- `hardDeleteStudent(supabase, id)` - Lines 1069-1100

#### **logic.ts** (~200 lines)

**Extract from actions.ts Layer 2:**
- `transformStudentsData(students, adminClient?)` - Lines 470-613
- `validateStudentData(data)` - New (extract inline validation)
- `buildStudentHierarchy(userProfile, kelompokId?)` - Lines 656-698
- `extractFormData(formData)` - New (centralize form extraction)

#### **permissions.ts** (~400 lines)

**Migrate entire file:** `@/lib/studentPermissions.ts` → `students/permissions.ts`

**No changes to logic** - just move file and update import paths.

#### **actions.ts** (~900 lines)

**All server actions from actions.ts:**
- `getUserProfile()` - Lines 21-65
- `getAllStudents(classId?)` - Lines 70-467
- `createStudent(formData)` - Lines 619-764
- `updateStudent(id, formData)` - Lines 769-973
- `deleteStudent(id, permanent)` - Lines 1001-1141
- `checkStudentHasAttendance(id)` - Lines 978-993
- `getStudentClasses(id)` - Lines 1146-1172
- `assignStudentsToClass(studentIds, classId)` - Lines 1178-1242
- `createStudentsBatch(students, classId)` - Lines 1247-1329
- `getCurrentUserRole()` - Lines 1334-1354
- `getStudentInfo(id)` - Lines 1409-1479
- `getStudentAttendanceHistory(id, year, month)` - Lines 1484-1572
- `getStudentBiodata(id)` - Lines 1577-1629
- `updateStudentBiodata(id, biodata)` - Lines 1634-1683

**Refactor to use queries + logic imports.**

---

### Domain 2: classes/ (from actions/classes.ts - 245 lines)

#### **queries.ts** (~150 lines)

- `fetchAllClasses(supabase)` - Lines 96-165
- `fetchClassesByKelompok(supabase, kelompokId)` - Lines 167-219
- `fetchClassMasterMappings(supabase, classIds)` - Lines 26-58

#### **logic.ts** (~100 lines)

- `sortClassesByMasterOrder(classes)` - Lines 64-91

#### **actions.ts** (~50 lines)

- `getAllClasses()` - Thin wrapper
- `getAllClassesByKelompok(kelompokId)` - Thin wrapper

---

### Domain 3: management/ (from actions/management.ts - 1,111 lines)

#### **queries.ts** (~250 lines)

- `fetchStudentForArchive(supabase, id)`
- `updateStudentArchive(supabase, id, data)`
- `updateStudentUnarchive(supabase, id)`
- `insertTransferRequest(supabase, data)`
- `fetchTransferRequestById(supabase, id)`
- `updateTransferRequestStatus(supabase, id, status, notes)`
- `fetchTransferRequests(supabase, filters)`
- `executeTransferUpdate(supabase, studentId, orgData)`

#### **logic.ts** (~150 lines)

- `needsApproval(requester, request)` - Import from permissions.ts OR keep here
- `validateArchiveData(data)`
- `validateTransferRequest(data)`
- `buildTransferRequestData(input, userProfile)`

#### **actions.ts** (~650 lines)

- `archiveStudent(input)`
- `unarchiveStudent(studentId)`
- `requestTransfer(input)`
- `approveTransfer(requestId, notes)`
- `rejectTransfer(requestId, notes)`
- `cancelTransferRequest(requestId)`
- `getTransferRequests(filters)`
- `getTransferRequestById(id)`

---

### Backward Compatibility: index.ts (~50 lines)

```typescript
// users/siswa/actions/index.ts

// Students domain
export {
  getUserProfile,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  checkStudentHasAttendance,
  getStudentClasses,
  assignStudentsToClass,
  createStudentsBatch,
  getCurrentUserRole,
  getStudentInfo,
  getStudentAttendanceHistory,
  getStudentBiodata,
  updateStudentBiodata
} from './students/actions'

// Classes domain
export {
  getAllClasses,
  getAllClassesByKelompok
} from './classes/actions'

// Management domain
export {
  archiveStudent,
  unarchiveStudent,
  requestTransfer,
  approveTransfer,
  rejectTransfer,
  cancelTransferRequest,
  getTransferRequests,
  getTransferRequestById
} from './management/actions'

// Re-export types
export type { Student } from './students/actions'
export type { Class } from './classes/actions'
export type { TransferRequest } from './management/actions'
```

**Consumer code (unchanged):**
```typescript
// Components continue to use same imports
import { getAllStudents, createStudent } from '@/app/(admin)/users/siswa/actions'
// ✅ Still works! index.ts re-exports from students/actions.ts
```

---

## Migration Strategy

### Phase 1: Preparation (~10 mins)

```bash
# Create folder structure
mkdir -p src/app/\(admin\)/users/siswa/actions/{students,classes,management}
mkdir -p src/app/\(admin\)/users/siswa/actions/{students,classes,management}/__tests__
```

---

### Phase 2: students/ Domain (~45 mins)

**Order (dependency chain):**

1. **permissions.ts** (15 mins)
   - Move `@/lib/studentPermissions.ts` to `students/permissions.ts`
   - Update imports (change `@/lib/accessControl` imports to relative if needed)
   - Keep external imports: `canTeacherAccessStudent` from `@/lib/accessControl`

2. **queries.ts** (15 mins)
   - Extract all Layer 1 functions from actions.ts
   - Add `supabase: SupabaseClient` as first parameter
   - Export all functions
   - Remove `'use server'` directive

3. **logic.ts** (10 mins)
   - Extract `transformStudentsData`
   - Extract inline validations to `validateStudentData`
   - Extract hierarchy logic to `buildStudentHierarchy`
   - Pure functions only

4. **actions.ts** (20 mins)
   - Copy all server actions
   - Add `'use server'` directive at top
   - Update imports: `import { fetchAllStudents } from './queries'`
   - Update imports: `import { validateStudentData } from './logic'`
   - Update imports: `import { canSoftDeleteStudent } from './permissions'`
   - Remove old Layer 1/2 code (now in separate files)

5. **__tests__/** (15 mins)
   - Migrate `@/lib/__tests__/studentPermissions.test.ts` → `permissions.test.ts`
   - Create `queries.test.ts` (basic structure tests)
   - Create `logic.test.ts` (comprehensive pure function tests)

**Commit:** `git commit -m "refactor(siswa): students domain 3-layer pattern"`

---

### Phase 3: classes/ Domain (~20 mins)

1. **queries.ts** (8 mins)
   - Extract `fetchAllClasses`, `fetchClassesByKelompok`, `fetchClassMasterMappings`
   - Add `supabase` parameter

2. **logic.ts** (5 mins)
   - Extract `sortClassesByMasterOrder` (already pure)

3. **actions.ts** (5 mins)
   - Thin wrappers only
   - Import from `./queries`, `./logic`

4. **__tests__/** (7 mins)
   - Create `queries.test.ts`
   - Create `logic.test.ts` (test sorting algorithm)

**Commit:** `git commit -m "refactor(siswa): classes domain 3-layer pattern"`

---

### Phase 4: management/ Domain (~35 mins)

1. **queries.ts** (15 mins)
   - Extract archive queries
   - Extract transfer request queries
   - Extract transfer execution queries

2. **logic.ts** (10 mins)
   - Extract validation functions
   - `needsApproval` (decide: import from permissions OR keep here)

3. **actions.ts** (20 mins)
   - Archive actions
   - Transfer actions
   - Import from `./queries`, `./logic`, `../students/permissions`

4. **__tests__/** (10 mins)
   - Create `queries.test.ts`
   - Create `logic.test.ts`

**Commit:** `git commit -m "refactor(siswa): management domain 3-layer pattern"`

---

### Phase 5: Integration (~15 mins)

1. **Create index.ts** (5 mins)
   - Re-export all server actions from 3 domains
   - Re-export types

2. **Delete old files** (2 mins)
   ```bash
   git rm src/app/\(admin\)/users/siswa/actions.ts
   git rm src/app/\(admin\)/users/siswa/actions/classes.ts
   git rm src/app/\(admin\)/users/siswa/actions/management.ts
   git rm src/lib/studentPermissions.ts
   ```

3. **Update component imports** (8 mins)
   ```bash
   # Find files importing studentPermissions
   grep -r "from.*@/lib/studentPermissions" src/

   # Update to new path
   # OLD: import { canSoftDeleteStudent } from '@/lib/studentPermissions'
   # NEW: import { canSoftDeleteStudent } from '../actions/students/permissions'
   ```

**Commit:** `git commit -m "refactor(siswa): cleanup old files and update imports"`

---

### Phase 6: Testing & Verification (~20 mins)

```bash
# 1. Type-check
npm run type-check
# Expected: No errors

# 2. Run tests
npm run test users/siswa
# Expected: All tests pass

# 3. Production build
npm run build
# Expected: Build succeeds

# 4. Manual smoke test
npm run dev
# Test: CRUD, archive, transfer operations
```

**Final commit:** `git commit -m "refactor(siswa): verify all tests and build passing"`

---

## Testing Strategy

### Test Structure

```
users/siswa/actions/
├── students/__tests__/
│   ├── queries.test.ts        (NEW - ~4 tests)
│   ├── logic.test.ts          (NEW - ~8 tests)
│   └── permissions.test.ts    (MIGRATED - ~15 tests)
│
├── classes/__tests__/
│   ├── queries.test.ts        (NEW - ~3 tests)
│   └── logic.test.ts          (NEW - ~4 tests)
│
└── management/__tests__/
    ├── queries.test.ts        (NEW - ~5 tests)
    └── logic.test.ts          (NEW - ~6 tests)
```

**Total:** ~45 tests (15 migrated + 30 new)

---

### Coverage Goals

| Layer | Target Coverage | Rationale |
|-------|----------------|-----------|
| queries.ts | 60-70% | Structure validation with mocked Supabase |
| logic.ts | 95-100% | Pure functions, comprehensive edge cases |
| permissions.ts | Existing | Maintain current coverage from @/lib tests |
| actions.ts | 0-30% | Defer to E2E/manual tests (complex mocking) |

---

### Manual Smoke Test Checklist

```
✅ Load /users/siswa (student list displays)
✅ Filter by class works
✅ Create new student
✅ Update student name/class
✅ Soft delete student
✅ Archive student as graduated
✅ Create transfer request
✅ Classes sorted by sort_order
```

---

## Success Criteria

**Must pass before closing:**

- [ ] All automated tests pass (`npm run test`)
- [ ] Type-check passes (`npm run type-check`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Zero breaking changes (components import from `actions/` unchanged)
- [ ] Each file <500 lines (down from 1,682)
- [ ] Layer separation enforced (queries/logic/actions distinct)
- [ ] Permissions moved to domain folder (`students/permissions.ts`)
- [ ] Manual smoke tests pass (8 checklist items)
- [ ] No console errors in browser
- [ ] SWR cache invalidation working (`revalidatePath` called)

---

## File Count Summary

| Action | Count |
|--------|-------|
| **Created** | 15 files (3 domains × 4 files + 3 test folders) |
| **Deleted** | 4 files (actions.ts, classes.ts, management.ts, @/lib/studentPermissions.ts) |
| **Updated** | ~5 files (components importing permissions) |
| **Net** | +11 files |

---

## Timeline

**Total Estimated Time:** ~2.5 hours

| Phase | Duration |
|-------|----------|
| Preparation | 10 mins |
| students/ domain | 45 mins |
| classes/ domain | 20 mins |
| management/ domain | 35 mins |
| Integration | 15 mins |
| Testing & Verification | 20 mins |

---

## Future Work (Out of Scope)

**Apply pattern to other God files:**
- `laporan/actions.ts` (1,111 lines)
- `rapot/actions.ts` (estimated ~800 lines)
- `materi/actions.ts` (estimated ~600 lines)
- `guru/actions.ts` (estimated ~400 lines)

All future refactorings should follow this design as blueprint.

---

## References

- **sm-d15:** absensi 3-layer pattern (gold standard)
- **CLAUDE.md:** 3-layer architecture section
- **docs/claude/architecture-patterns.md:** File naming conventions
