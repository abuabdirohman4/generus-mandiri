# Type Audit and Centralization - Implementation Plan

> **For Claude/Antigravity:** Execute tasks sequentially. Verify each step before proceeding.

**Goal:** Comprehensive audit and centralization of all duplicate type/interface definitions to `src/types/` with clean break migration.

**Architecture:** Domain-based type organization with hierarchy pattern (Base → Extended → Full). Clean break migration - update all imports, delete all duplicates, single source of truth.

**Tech Stack:** TypeScript, Next.js 15, Supabase

**Reference Documents:**
- Design: `docs/plans/2026-03-15-type-audit-centralization-design.md`
- Pattern: `src/types/student.ts` (hierarchy reference)
- Previous work: sm-s3y (type extraction), sm-8yf (student consolidation)

---

## CRITICAL: Read Before Starting

**MUST READ:**
- `@CLAUDE.md` - All coding rules, patterns, constraints
- `@docs/claude/architecture-patterns.md` - 3-layer architecture, type patterns
- `@src/types/student.ts` - Hierarchy pattern reference (Base → WithOrg → WithClasses → Biodata)

**Key Principles:**
- **Clean Break:** No re-exports, delete all duplicates immediately
- **Hierarchy Pattern:** Base → Extended → Full (like student.ts)
- **Single Source of Truth:** ALL types must import from `@/types/[domain]`
- **Preserve Context:** Keep JSDoc comments and usage guidance

---

## Task 1: Discover UserProfile Duplicates

**Files:**
- Search: All `src/` files

**Step 1: Find all UserProfile/Profile type definitions**

Run:
```bash
grep -rn "^export interface UserProfile\|^interface UserProfile\|^export type UserProfile\|^interface Profile[^a-z]" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

Expected: List of 17+ locations

**Step 2: Record locations in temporary file**

Run:
```bash
grep -rn "interface UserProfile\|interface Profile[^a-z]" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules > /tmp/userprofile-duplicates.txt
cat /tmp/userprofile-duplicates.txt
```

Expected: File with all locations (stores, lib, actions, components, hooks)

**Step 3: Identify canonical definition**

Read each definition and find most complete version.

Expected locations (from design doc):
- `src/stores/userProfileStore.ts`
- `src/lib/accessControl.ts`
- `src/lib/accessControlServer.ts`
- `src/components/shared/DataFilter.tsx`
- `src/app/(admin)/settings/profile/actions/userProfileActions.ts`
- + more

**Step 4: Output summary**

Output: "UserProfile found in X locations. Canonical will be based on stores/userProfileStore.ts (most complete)"

---

## Task 2: Discover Class Type Duplicates

**Files:**
- Search: All `src/` files

**Step 1: Find all Class type definitions**

Run:
```bash
grep -rn "^export interface Class[^a-z]\|^interface Class[^a-z]\|^export interface ClassMaster\|^interface ClassMaster" src/ --include="*.ts" | grep -v "className" | grep -v "ClassValue" | grep -v node_modules
```

Expected: List of 8+ locations

**Step 2: Record locations**

Run:
```bash
grep -rn "interface Class[^a-z]\|interface ClassMaster\|interface ClassData\|interface ClassWithMaster" src/ --include="*.ts" > /tmp/class-duplicates.txt
cat /tmp/class-duplicates.txt
```

Expected locations:
- `src/app/(admin)/users/siswa/actions/classes/actions.ts` - Class
- `src/app/(admin)/kelas/actions/classes.ts` - ClassWithMaster
- `src/app/(admin)/kelas/actions/masters.ts` - ClassMaster, ClassMasterData
- `src/app/(admin)/materi/types.ts` - ClassMaster
- `src/lib/utils/classHelpers.ts` - ClassData

**Step 3: Output summary**

Output: "Class types found in X locations. Will create hierarchy: ClassBase → Class → ClassWithMaster"

---

## Task 3: Discover Organization Type Duplicates

**Files:**
- Search: All `src/` files

**Step 1: Find Organization types**

Run:
```bash
grep -rn "^export interface Daerah\|^interface Daerah\|^export interface Desa\|^interface Desa\|^export interface Kelompok\|^interface Kelompok" src/ --include="*.ts" --include="*.tsx"
```

**Step 2: Record results**

Run:
```bash
grep -rn "interface Daerah\|interface Desa\|interface Kelompok" src/ --include="*.ts" > /tmp/org-duplicates.txt
cat /tmp/org-duplicates.txt
```

**Step 3: Output summary**

Output: "Organization types found in X locations" OR "No organization type duplicates found (may already be centralized or using inline)"

---

## Task 4: Check Material and Rapot Types

**Files:**
- Search: `src/app/(admin)/materi/`, `src/app/(admin)/rapot/`

**Step 1: Check Material types**

Run:
```bash
grep -rn "^export interface Material\|^interface Material\|^type Material" src/app/\(admin\)/materi --include="*.ts"
```

**Step 2: Check Rapot types**

Run:
```bash
grep -rn "^export interface Rapot\|^interface Rapot\|^type Rapot" src/app/\(admin\)/rapot --include="*.ts"
```

**Step 3: Output decision**

Output:
- "Material types found: X locations → Will create src/types/material.ts"
- OR "No Material type duplicates → SKIP"
- "Rapot types found: X locations → Will create src/types/rapot.ts"
- OR "No Rapot type duplicates → SKIP"

---

## Task 5: Create src/types/user.ts

**Files:**
- Create: `src/types/user.ts`

**Step 1: Read canonical UserProfile from stores**

Run:
```bash
cat src/stores/userProfileStore.ts | sed -n '/^export interface UserProfile/,/^}/p'
```

**Step 2: Create src/types/user.ts with hierarchy**

Create file `src/types/user.ts`:

```typescript
/**
 * User Profile Type Definitions
 *
 * IMPORTANT: Single source of truth for user/profile types.
 * All other modules should import from here.
 *
 * Type hierarchy: UserProfileBase → UserProfileWithOrg → UserProfile
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base user profile - minimal fields
 * Use for: Permission checks, basic user operations
 */
export interface UserProfileBase {
  id: string
  role: 'superadmin' | 'admin' | 'teacher' | 'student'
}

// ─── Extended Types ───────────────────────────────────────────────────────────

/**
 * User profile with organizational hierarchy
 * Use for: Access control, filtering by organization
 */
export interface UserProfileWithOrg extends UserProfileBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
}

// ─── Full Types ───────────────────────────────────────────────────────────────

/**
 * Complete user profile with all fields
 * Use for: Most common usage, full user context
 */
export interface UserProfile extends UserProfileWithOrg {
  class_id?: string | null
  class_name?: string | null
  classes?: Array<{ id: string; name: string }>
  teacher_classes?: Array<{
    class_id: string
    classes: { id: string; name: string }
  }>
}

// ─── Aliases ──────────────────────────────────────────────────────────────────

/**
 * Alias for backward compatibility
 */
export type Profile = UserProfile

// ─── Store State ──────────────────────────────────────────────────────────────

/**
 * Zustand store state for user profile
 * Use in: userProfileStore.ts
 */
export interface UserProfileState {
  userProfile: UserProfile | null
  setUserProfile: (profile: UserProfile | null) => void
  clearUserProfile: () => void
}
```

**Step 3: Verify syntax**

Run:
```bash
npx tsc --noEmit src/types/user.ts
```

Expected: No errors

**Step 4: Output confirmation**

Output: "Created src/types/user.ts with UserProfileBase → UserProfileWithOrg → UserProfile hierarchy"

---

## Task 6: Create src/types/class.ts

**Files:**
- Create: `src/types/class.ts`

**Step 1: Read existing Class definitions**

Run:
```bash
cat src/app/\(admin\)/users/siswa/actions/classes/actions.ts | sed -n '/^export interface Class/,/^}/p'
cat src/app/\(admin\)/kelas/actions/masters.ts | sed -n '/^export interface ClassMaster/,/^}/p'
```

**Step 2: Create src/types/class.ts with hierarchy**

Create file `src/types/class.ts`:

```typescript
/**
 * Class Type Definitions
 *
 * IMPORTANT: Single source of truth for class-related types.
 * Covers: Classes, ClassMasters, ClassMasterMappings
 *
 * Type hierarchy:
 * - ClassBase → Class → ClassWithMaster
 * - ClassMasterBase → ClassMaster
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base class type - minimal fields
 * Use for: Simple listings, IDs
 */
export interface ClassBase {
  id: string
  name: string
}

/**
 * Base class master type - minimal fields
 * Use for: Master data lookups
 */
export interface ClassMasterBase {
  id: string
  name: string
  sort_order: number
}

// ─── Extended Types ───────────────────────────────────────────────────────────

/**
 * Class with organizational hierarchy
 * Use for: Main class listings, filters
 */
export interface Class extends ClassBase {
  kelompok_id: string
  kelompok?: {
    id: string
    name: string
    desa_id: string
    desa?: {
      id: string
      name: string
      daerah_id: string
      daerah?: {
        id: string
        name: string
      }
    }
  }
  created_at: string
  updated_at: string
}

/**
 * Class with master mappings
 * Use for: Class management, master-class relationships
 */
export interface ClassWithMaster extends Class {
  class_master_mappings?: Array<{
    class_master_id: string
    class_master?: ClassMaster
  }>
}

// ─── Full Types ───────────────────────────────────────────────────────────────

/**
 * Complete class master definition
 * Use for: Master data management
 */
export interface ClassMaster extends ClassMasterBase {
  description?: string | null
  created_at: string
  updated_at: string
}

// ─── Request/Response ─────────────────────────────────────────────────────────

/**
 * Data for creating class master
 */
export interface ClassMasterData {
  name: string
  sort_order: number
  description?: string | null
}

/**
 * Data for creating class
 */
export interface CreateClassData {
  name: string
  kelompok_id: string
}

// ─── Utility Types ────────────────────────────────────────────────────────────

/**
 * Simplified class data for helpers
 * Use in: classHelpers.ts
 */
export interface ClassData {
  id: string
  name: string
  kelompok_id: string
}
```

**Step 3: Verify syntax**

Run:
```bash
npx tsc --noEmit src/types/class.ts
```

Expected: No errors

**Step 4: Output confirmation**

Output: "Created src/types/class.ts with ClassBase → Class → ClassWithMaster hierarchy"

---

## Task 7: Create src/types/organization.ts

**Files:**
- Create: `src/types/organization.ts`

**Step 1: Check if organization types already exist**

Run:
```bash
cat /tmp/org-duplicates.txt
```

**Step 2: Create src/types/organization.ts**

Create file `src/types/organization.ts`:

```typescript
/**
 * Organization Type Definitions
 *
 * IMPORTANT: Single source of truth for organizational hierarchy.
 * Hierarchy: Daerah (Region) → Desa (Village) → Kelompok (Group)
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base organization fields
 */
export interface OrganizationBase {
  id: string
  name: string
}

// ─── Daerah (Region) ──────────────────────────────────────────────────────────

/**
 * Daerah (Region) - top level organization
 * Use for: Regional management, top-level filtering
 */
export interface Daerah extends OrganizationBase {
  created_at: string
  updated_at: string
}

/**
 * Daerah with statistics
 * Use for: Dashboard, analytics
 */
export interface DaerahWithStats extends Daerah {
  total_desa: number
  total_kelompok: number
  total_classes: number
  total_students: number
}

// ─── Desa (Village) ───────────────────────────────────────────────────────────

/**
 * Desa (Village) - second level organization
 * Use for: Village management, filtering
 */
export interface Desa extends OrganizationBase {
  daerah_id: string
  daerah?: Daerah
  created_at: string
  updated_at: string
}

/**
 * Desa with statistics
 * Use for: Dashboard, analytics
 */
export interface DesaWithStats extends Desa {
  total_kelompok: number
  total_classes: number
  total_students: number
}

// ─── Kelompok (Group) ─────────────────────────────────────────────────────────

/**
 * Kelompok (Group) - lowest level organization
 * Use for: Group management, class grouping
 */
export interface Kelompok extends OrganizationBase {
  desa_id: string
  desa?: Desa
  created_at: string
  updated_at: string
}

/**
 * Kelompok with statistics
 * Use for: Dashboard, analytics
 */
export interface KelompokWithStats extends Kelompok {
  total_classes: number
  total_students: number
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateDaerahData {
  name: string
}

export interface CreateDesaData {
  name: string
  daerah_id: string
}

export interface CreateKelompokData {
  name: string
  desa_id: string
}
```

**Step 3: Verify syntax**

Run:
```bash
npx tsc --noEmit src/types/organization.ts
```

Expected: No errors

---

## Task 8: Create src/types/material.ts (CONDITIONAL)

**Files:**
- Create: `src/types/material.ts` (ONLY if duplicates found in Task 4)

**Step 1: Check Task 4 results**

If Task 4 found Material type duplicates, proceed. Otherwise SKIP this task.

**Step 2: Create src/types/material.ts**

Create file `src/types/material.ts`:

```typescript
/**
 * Material Type Definitions
 *
 * Educational materials for classes
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface Material {
  id: string
  title: string
  content: string
  class_id: string
  created_by: string
  created_at: string
  updated_at: string
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateMaterialData {
  title: string
  content: string
  class_id: string
}

export interface UpdateMaterialData extends Partial<CreateMaterialData> {
  id: string
}
```

**Step 3: Verify syntax**

Run:
```bash
npx tsc --noEmit src/types/material.ts
```

---

## Task 9: Create src/types/rapot.ts (CONDITIONAL)

**Files:**
- Create: `src/types/rapot.ts` (ONLY if duplicates found in Task 4)

**Step 1: Check Task 4 results**

If Task 4 found Rapot type duplicates, proceed. Otherwise SKIP this task.

**Step 2: Create src/types/rapot.ts**

Create file `src/types/rapot.ts`:

```typescript
/**
 * Rapot (Report Card) Type Definitions
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface RapotTemplate {
  id: string
  name: string
  academic_year: string
  semester: number
  created_at: string
  updated_at: string
}

export interface RapotData {
  id: string
  student_id: string
  template_id: string
  data: Record<string, any>
  created_at: string
  updated_at: string
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateRapotData {
  student_id: string
  template_id: string
  data: Record<string, any>
}

export interface UpdateRapotData extends Partial<CreateRapotData> {
  id: string
}
```

**Step 3: Verify syntax**

Run:
```bash
npx tsc --noEmit src/types/rapot.ts
```

---

## Task 10: Update UserProfile Imports (Part 1/3)

**Files:**
- Modify: `src/stores/userProfileStore.ts`

**Step 1: Update userProfileStore.ts**

Find:
```typescript
export interface UserProfile {
  // ... definition
}

interface UserProfileState {
  // ... definition
}
```

Replace with:
```typescript
import type { UserProfile, UserProfileState } from '@/types/user'
```

Delete the interface definitions.

**Step 2: Verify imports**

Run:
```bash
grep "from '@/types/user'" src/stores/userProfileStore.ts
```

Expected: Import line present

**Step 3: Verify no duplicate definitions**

Run:
```bash
grep "^export interface UserProfile\|^interface UserProfile" src/stores/userProfileStore.ts
```

Expected: No results

---

## Task 11: Update UserProfile Imports (Part 2/3)

**Files:**
- Modify: `src/lib/accessControl.ts`
- Modify: `src/lib/accessControlServer.ts`

**Step 1: Update accessControl.ts**

Find:
```typescript
export interface UserProfile {
  // ... definition
}
```

Replace with:
```typescript
import type { UserProfile } from '@/types/user'
```

Delete interface definition. Keep `export type { UserProfile }` if file re-exports.

**Step 2: Update accessControlServer.ts**

Find:
```typescript
interface UserProfile {
  // ... definition
}
```

Replace with:
```typescript
import type { UserProfile } from '@/types/user'
```

**Step 3: Verify**

Run:
```bash
grep "from '@/types/user'" src/lib/accessControl.ts src/lib/accessControlServer.ts
```

Expected: Both files have import

---

## Task 12: Update UserProfile Imports (Part 3/3)

**Files:**
- Modify: All remaining UserProfile locations from Task 1

**Step 1: Get list of remaining files**

Run:
```bash
grep -l "interface UserProfile\|interface Profile[^a-z]" src/ -r --include="*.ts" --include="*.tsx" | grep -v "src/types/user.ts" | grep -v node_modules
```

**Step 2: For each file, update imports**

Pattern:
```typescript
// OLD:
interface UserProfile { ... }
// or
export interface UserProfile { ... }

// NEW:
import type { UserProfile } from '@/types/user'
```

Files to update (from design doc):
- `src/lib/constants/meetingTypes.ts`
- `src/components/shared/DataFilter.tsx`
- `src/app/(admin)/settings/profile/actions/userProfileActions.ts`
- `src/app/(admin)/absensi/hooks/useMeetingTypes.ts`
- `src/app/(admin)/users/siswa/actions/students/permissions.ts`
- `src/app/(admin)/home/components/QuickActions.tsx`
- + any others found

**Step 3: Verify all updated**

Run:
```bash
grep -r "^interface UserProfile\|^export interface UserProfile" src/ --include="*.ts" --include="*.tsx" | grep -v "src/types/user.ts"
```

Expected: No results (all duplicates removed)

---

## Task 13: Update Class Type Imports

**Files:**
- Modify: All Class type locations from Task 2

**Step 1: Update siswa/actions/classes/actions.ts**

Find:
```typescript
export interface Class {
  // ... definition
}
```

Replace with:
```typescript
import type { Class } from '@/types/class'
```

Keep `export type { Class }` in actions/index.ts if re-exporting.

**Step 2: Update kelas/actions/classes.ts**

Find:
```typescript
export interface ClassWithMaster {
  // ... definition
}
```

Replace with:
```typescript
import type { ClassWithMaster } from '@/types/class'
```

**Step 3: Update kelas/actions/masters.ts**

Find:
```typescript
export interface ClassMaster { ... }
interface ClassMasterData { ... }
```

Replace with:
```typescript
import type { ClassMaster, ClassMasterData } from '@/types/class'
```

**Step 4: Update materi/types.ts**

Find:
```typescript
export interface ClassMaster { ... }
```

Replace with:
```typescript
import type { ClassMaster } from '@/types/class'
```

**Step 5: Update lib/utils/classHelpers.ts**

Find:
```typescript
export interface ClassData { ... }
```

Replace with:
```typescript
import type { ClassData } from '@/types/class'
```

**Step 6: Verify all Class types updated**

Run:
```bash
grep -r "^interface Class[^a-z]\|^export interface Class[^a-z]\|^interface ClassMaster\|^export interface ClassMaster" src/ --include="*.ts" | grep -v "src/types/class.ts" | grep -v "className"
```

Expected: No results

---

## Task 14: Clean Up lib/dummy/processAttendanceLogs.ts

**Files:**
- Modify: `src/lib/dummy/processAttendanceLogs.ts`

**Step 1: Read current duplicates**

Run:
```bash
grep -n "^interface" src/lib/dummy/processAttendanceLogs.ts
```

Expected: AttendanceLog, Meeting, ReportFilters, ReportData, StudentSummary, ChartData, TrendChartData, DetailedRecord

**Step 2: Add imports at top of file**

Add after existing imports:
```typescript
import type { AttendanceLog } from '@/types/attendance'
import type { Meeting } from '@/types/meeting'
import type { ReportFilters, ReportData } from '@/types/report'
```

**Step 3: Delete duplicate interface definitions**

Remove these interface definitions:
```typescript
interface AttendanceLog { ... }
interface Meeting { ... }
interface ReportFilters { ... }
interface ReportData { ... }
```

**Step 4: Keep local interfaces if needed**

If StudentSummary, ChartData, TrendChartData, DetailedRecord are truly local to this file (not used elsewhere), keep them.

If they match types in `@/types/report`, replace with imports.

**Step 5: Verify**

Run:
```bash
grep "from '@/types/" src/lib/dummy/processAttendanceLogs.ts
```

Expected: Imports from @/types/attendance, @/types/meeting, @/types/report

---

## Task 15: Verify Type Consolidation Complete

**Files:**
- Check: All `src/` files

**Step 1: Check no orphaned UserProfile definitions**

Run:
```bash
grep -r "^interface UserProfile\|^export interface UserProfile" src/ --include="*.ts" --include="*.tsx" | grep -v "src/types/user.ts"
```

Expected: No results

**Step 2: Check no orphaned Class definitions**

Run:
```bash
grep -r "^interface Class[^a-z]\|^export interface Class[^a-z]" src/ --include="*.ts" | grep -v "src/types/class.ts" | grep -v "className" | grep -v "ClassValue"
```

Expected: No results

**Step 3: Check no orphaned ClassMaster definitions**

Run:
```bash
grep -r "^interface ClassMaster\|^export interface ClassMaster" src/ --include="*.ts" | grep -v "src/types/class.ts"
```

Expected: No results

**Step 4: List all new type files**

Run:
```bash
ls -la src/types/
```

Expected: user.ts, class.ts, organization.ts (+ material.ts, rapot.ts if created)

**Step 5: Count exports in each file**

Run:
```bash
grep "^export" src/types/user.ts | wc -l
grep "^export" src/types/class.ts | wc -l
grep "^export" src/types/organization.ts | wc -l
```

Expected: Multiple exports per file

---

## Task 16: Run Type Check

**Files:**
- Verify: All TypeScript files

**Step 1: Run TypeScript type checker**

Run:
```bash
npm run type-check
```

Expected: ✅ No errors

**Step 2: If errors found, read first 20 lines**

Run (only if Step 1 fails):
```bash
npm run type-check 2>&1 | head -20
```

**Step 3: Fix common errors**

Common issues:
- Missing import: Add `import type { X } from '@/types/[domain]'`
- Circular dependency: Move type to different file
- Wrong type name: Check spelling, check type actually exported

**Step 4: Re-run until clean**

Run:
```bash
npm run type-check
```

Expected: ✅ No errors

---

## Task 17: Run Build Verification

**Files:**
- Build: Entire Next.js app

**Step 1: Run production build**

Run:
```bash
npm run build 2>&1 | tail -30
```

Expected: ✅ Build succeeds OR pre-existing error (NOT caused by type changes)

**Step 2: If new build errors, check messages**

Run:
```bash
npm run build 2>&1 | grep -A 5 "error"
```

**Step 3: Fix import errors if any**

Common fixes:
- Path alias issue: Check tsconfig.json paths
- Type import from wrong location: Update to @/types/
- Missing export: Add to type file

**Step 4: Verify build success or pre-existing error**

If build fails, verify error existed BEFORE type changes by checking git log/previous builds.

---

## Task 18: Create src/types/README.md

**Files:**
- Create: `src/types/README.md`

**Step 1: Create README.md with comprehensive guidelines**

Create file `src/types/README.md`:

```markdown
# Type Management Guidelines

## Philosophy

**Single Source of Truth:** All shared types are centralized in \`src/types/\` organized by domain.

**Hierarchy Pattern:** Complex entities use Base → Extended → Full pattern (see \`student.ts\` as reference).

**Clean Imports:** Always import from \`@/types/[domain]\`, never from inline definitions.

## Directory Structure

\`\`\`
src/types/
├── user.ts          # User/Profile types (UserProfileBase → UserProfile)
├── student.ts       # Student types (StudentBase → StudentWithOrg → StudentWithClasses → StudentBiodata)
├── class.ts         # Class/ClassMaster types (ClassBase → Class → ClassWithMaster)
├── organization.ts  # Daerah/Desa/Kelompok organizational hierarchy
├── attendance.ts    # Attendance logs and stats
├── meeting.ts       # Meeting types and data
├── dashboard.ts     # Dashboard metrics and monitoring
├── report.ts        # Report filters and data
├── material.ts      # Educational materials (if applicable)
└── rapot.ts         # Report cards (if applicable)
\`\`\`

## When to Create New Type File

**✅ Create centralized type when:**
1. Type is used in **2+ files**
2. Type represents **core domain entity** (User, Student, Class, Organization, etc.)
3. Type has **3+ related interfaces** in same domain

**❌ Keep inline when:**
1. Used in **single file only**
2. Component-specific props (React component props)
3. Internal helper types (not exported outside file)

## Type Hierarchy Pattern

For complex entities with variations, use hierarchy:

\`\`\`typescript
// Base - minimal fields for basic operations
export interface EntityBase {
  id: string
  name: string
}

// Extended - adds specific context
export interface EntityWithOrg extends EntityBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
}

// Full - complete definition (most common usage)
export interface Entity extends EntityWithOrg {
  created_at: string
  updated_at: string
  // all other fields
}
\`\`\`

**Reference:** See \`src/types/student.ts\` for complete hierarchy example with 4 levels.

## Pre-Flight Checklist

**Before creating a new type definition:**

- [ ] Search codebase: \`grep -r "interface MyType\|type MyType" src/\`
- [ ] If exists → import it, don't recreate
- [ ] If needs extension → use \`extends\`, don't copy-paste
- [ ] If truly new → create in \`src/types/[domain].ts\`

## Import Patterns

**✅ Correct:**
\`\`\`typescript
import type { UserProfile } from '@/types/user'
import type { Student, StudentWithClasses } from '@/types/student'
import type { Class, ClassMaster } from '@/types/class'
import type { Daerah, Desa, Kelompok } from '@/types/organization'
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
import type { UserProfile } from '../lib/accessControl'
import type { Student } from './types'
interface MyUserProfile { ... }  // Don't duplicate!
\`\`\`

## Migration from Inline Types

When centralizing existing inline type:

1. **Create canonical version** in \`src/types/[domain].ts\`
2. **Update all imports** to \`@/types/[domain]\`
3. **Delete inline definition**
4. **Run verification**:
   \`\`\`bash
   npm run type-check  # Must pass
   npm run build       # Must succeed
   \`\`\`

## Naming Conventions

- **Base types:** \`EntityBase\`
- **Extended:** \`EntityWith[Feature]\` (e.g., \`UserProfileWithOrg\`, \`StudentWithClasses\`)
- **Full:** \`Entity\` (no suffix - most common usage)
- **Request/Response:** \`CreateEntityData\`, \`UpdateEntityData\`
- **UI/Display:** \`EntityWithStats\`, \`EntitySummary\`

**Avoid:** Entity1, Entity2, EntityNew, EntityOld

## Preserving Business Logic

Keep usage guidance in JSDoc comments:

\`\`\`typescript
/**
 * Student with organizational hierarchy
 * Use for: Filtering, access control, permission checking
 */
export interface StudentWithOrg extends StudentBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
}

/** Legacy interface - kept for backward compatibility */
export interface ClassPerformance {
  class_id: string
  class_name: string
  attendance_percentage: number
}
\`\`\`

## Type File Template

\`\`\`typescript
/**
 * [Domain] Type Definitions
 *
 * IMPORTANT: Single source of truth for [domain]-related types.
 * Type hierarchy: [Base] → [Extended] → [Full]
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface EntityBase {
  id: string
  name: string
}

// ─── Extended Types ───────────────────────────────────────────────────────────

export interface EntityWithFeature extends EntityBase {
  feature_field: string
}

// ─── Full Types ───────────────────────────────────────────────────────────────

export interface Entity extends EntityWithFeature {
  created_at: string
  updated_at: string
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateEntityData {
  name: string
}

// ─── UI/Display ───────────────────────────────────────────────────────────────

export interface EntityWithStats extends Entity {
  total: number
}
\`\`\`

## FAQ

**Q: Can I create a new type file for my feature?**
A: Only if (1) type is used in 2+ files, (2) represents core entity, or (3) has 3+ related types. Otherwise keep inline.

**Q: What if I need to extend an existing type?**
A: Use \`extends\`:
\`\`\`typescript
import type { UserProfile } from '@/types/user'
export interface AdminUserProfile extends UserProfile {
  adminField: string
}
\`\`\`

**Q: Can I modify an existing type in \`src/types/\`?**
A: Yes, but ensure change is backward compatible. If breaking change, create new type with different name or add to hierarchy.

**Q: Type exists but missing field I need?**
A: If field is specific to your use case → extend. If field should be part of core type → add to \`src/types/\` with JSDoc explaining usage.

## Related Documentation

- **CLAUDE.md** - Type/Interface Management section
- **architecture-patterns.md** - Type Management & Organization section
- **student.ts** - Reference implementation (4-level hierarchy)
\`\`\`

**Step 2: Verify file created**

Run:
```bash
cat src/types/README.md | head -20
```

Expected: File content visible

---

## Task 19: Update CLAUDE.md Type Management Section

**Files:**
- Modify: `CLAUDE.md` (around line 91)

**Step 1: Find Type/Interface Management section**

Run:
```bash
grep -n "^## 📐 Type/Interface Management" CLAUDE.md
```

Expected: Line number ~91

**Step 2: Read current content**

Run:
```bash
sed -n '/^## 📐 Type\/Interface Management/,/^## /p' CLAUDE.md | head -20
```

**Step 3: Expand section after existing pointer**

Find this section and add AFTER the existing "CRITICAL" line:

Add:
```markdown

### Type Centralization Rules

**Before creating ANY type definition:**

1. **Search first:**
   \`\`\`bash
   grep -r "interface MyType\|type MyType" src/ --include="*.ts"
   \`\`\`

2. **If exists → import it:**
   \`\`\`typescript
   import type { MyType } from '@/types/[domain]'
   \`\`\`

3. **If needs extension → use extends:**
   \`\`\`typescript
   import type { UserProfile } from '@/types/user'
   export interface MyUserProfile extends UserProfile { ... }
   \`\`\`

4. **If truly new → create in src/types/:**
   - Domain has 3+ related types
   - Type used in 2+ files
   - Represents core entity

### Type Hierarchy Pattern

For complex entities (User, Student, Class):

\`\`\`typescript
EntityBase          // Minimal (id, name)
→ EntityWithOrg     // + organizational fields
→ Entity            // Full (canonical, most used)
\`\`\`

**Reference:** \`src/types/student.ts\` (4 levels), \`src/types/user.ts\` (3 levels).

### Import Pattern

**✅ Correct:**
\`\`\`typescript
import type { UserProfile, UserProfileBase } from '@/types/user'
import type { Student, StudentWithClasses } from '@/types/student'
import type { Class, ClassMaster } from '@/types/class'
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
import type { UserProfile } from '../lib/accessControl'
interface UserProfile { ... }  // DON'T duplicate!
\`\`\`

### When to Keep Types Inline

**OK to keep inline:**
- Component props (React component specific)
- Single-file internal helpers
- Test mock types

**Documentation:** See \`src/types/README.md\` for detailed guidelines.
```

**Step 4: Verify update**

Run:
```bash
grep -A 10 "Type Centralization Rules" CLAUDE.md
```

Expected: New section visible

---

## Task 20: Update architecture-patterns.md Type Management

**Files:**
- Modify: `docs/claude/architecture-patterns.md` (after line 504)

**Step 1: Find end of Type Management section**

Run:
```bash
grep -n "^## Type Management & Organization" docs/claude/architecture-patterns.md
```

Expected: Line ~416

**Step 2: Find end of current section**

Run:
```bash
tail -20 docs/claude/architecture-patterns.md
```

**Step 3: Add Type Consolidation Process section**

Add at end of Type Management section (after "Reference Implementation"):

```markdown

### Type Consolidation Process

When centralizing duplicate types:

**1. Discovery**
\`\`\`bash
# Find all definitions
grep -r "^export interface EntityName\|^interface EntityName" src/ --include="*.ts"
\`\`\`

**2. Identify Canonical**
- Most complete version
- Has JSDoc comments
- Strict types (not \`any\` or loose unions)
- Most usage across codebase

**3. Build Hierarchy**
\`\`\`typescript
// Minimal
export interface EntityBase { id, name }

// Add context
export interface EntityWithFeature extends EntityBase { feature_fields }

// Full (canonical)
export interface Entity extends EntityWithFeature { all_fields }
\`\`\`

**4. Migrate Imports**
\`\`\`bash
# Find all usages
grep -r "EntityName" src/ --include="*.ts" --include="*.tsx" -l

# Update each file:
# OLD: interface EntityName { ... }
# NEW: import type { EntityName } from '@/types/entity'
\`\`\`

**5. Delete Duplicates**
- Remove all inline definitions
- Keep canonical in \`src/types/[domain].ts\`
- No re-exports for backward compatibility (clean break)

**6. Verify**
\`\`\`bash
npm run type-check  # Must pass
npm run build       # Must succeed

# Check no orphaned definitions
grep -r "^interface EntityName" src/ --include="*.ts"
# Should return ONLY src/types/entity.ts
\`\`\`

### Common Anti-Patterns

**❌ Don't:**
\`\`\`typescript
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
\`\`\`

**✅ Do:**
\`\`\`typescript
// Import canonical
import type { UserProfile } from '@/types/user'

// Extend when needed
import type { StudentBase } from '@/types/student'
export interface MyStudent extends StudentBase {
  myField: string
}
\`\`\`

### Pre-Flight Checklist

Before creating ANY type:

- [ ] Search codebase for existing definition
- [ ] If exists → import from \`@/types/\`
- [ ] If needs modification → use \`extends\`
- [ ] If truly new → check if 2+ files will use it
- [ ] If shared → create in \`src/types/[domain].ts\`
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
export interface UserProfile extends UserProfileWithOrg { classes, teacher_classes }

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
```

---
```

**Step 4: Verify addition**

Run:
```bash
grep -A 5 "Type Consolidation Process" docs/claude/architecture-patterns.md
```

Expected: New section visible

---

## Task 21: Final Verification - Complete Type Check

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
npm run build 2>&1 | tail -20
```

Expected: ✅ Build succeeds OR pre-existing error

**Step 3: Verify no orphaned UserProfile**

Run:
```bash
grep -r "^interface UserProfile\|^export interface UserProfile" src/ --include="*.ts" --include="*.tsx"
```

Expected: ONLY `src/types/user.ts:export interface UserProfile`

**Step 4: Verify no orphaned Class types**

Run:
```bash
grep -r "^interface Class[^a-z]\|^export interface Class[^a-z]" src/ --include="*.ts"
```

Expected: ONLY `src/types/class.ts`

**Step 5: Verify no orphaned ClassMaster**

Run:
```bash
grep -r "^interface ClassMaster\|^export interface ClassMaster" src/ --include="*.ts"
```

Expected: ONLY `src/types/class.ts`

---

## Task 22: Final Verification - Documentation

**Files:**
- Verify: Documentation files

**Step 1: Verify README.md exists**

Run:
```bash
ls -la src/types/README.md
```

Expected: File exists

**Step 2: Verify CLAUDE.md updated**

Run:
```bash
grep -A 5 "Type Centralization Rules" CLAUDE.md
```

Expected: New section present

**Step 3: Verify architecture-patterns.md updated**

Run:
```bash
grep -A 5 "Type Consolidation Process" docs/claude/architecture-patterns.md
```

Expected: New section present

**Step 4: Count documentation additions**

Run:
```bash
wc -l src/types/README.md
wc -l docs/claude/architecture-patterns.md
```

Expected: README ~200 lines, architecture-patterns ~600+ lines (was ~504)

---

## Success Criteria Checklist

**Code Changes:**
- [ ] `src/types/user.ts` created with UserProfile hierarchy (3 levels)
- [ ] `src/types/class.ts` created with Class/ClassMaster types
- [ ] `src/types/organization.ts` created with Daerah/Desa/Kelompok
- [ ] `src/types/material.ts` created (if applicable)
- [ ] `src/types/rapot.ts` created (if applicable)
- [ ] All 17 UserProfile duplicates consolidated
- [ ] All 8+ Class type duplicates consolidated
- [ ] `lib/dummy/processAttendanceLogs.ts` cleaned up
- [ ] All imports updated to `@/types/[domain]`
- [ ] All duplicate definitions deleted
- [ ] `npm run type-check` passes ✅
- [ ] `npm run build` succeeds ✅ (or pre-existing error confirmed)
- [ ] No orphaned type definitions

**Documentation:**
- [ ] `src/types/README.md` created (~200 lines comprehensive)
- [ ] `CLAUDE.md` Type/Interface Management section expanded
- [ ] `architecture-patterns.md` Type Management section expanded with consolidation process
- [ ] All docs include examples and anti-patterns

**Quality:**
- [ ] Types follow hierarchy pattern (Base → Extended → Full)
- [ ] JSDoc comments preserved
- [ ] Alphabetical sorting within sections
- [ ] Consistent naming (EntityBase, EntityWithFeature, Entity)
- [ ] No technical debt (clean break, no re-exports)

---

## Rollback Instructions

If errors found during review:

**Rollback specific domain:**
```bash
git checkout HEAD -- src/types/user.ts
git checkout HEAD -- src/stores/userProfileStore.ts
git checkout HEAD -- src/lib/accessControl.ts
# ... restore other affected files
```

**Rollback all changes:**
```bash
git checkout HEAD -- src/types/
git checkout HEAD -- src/
git checkout HEAD -- docs/
```

---

## Timeline Estimate

| Task | Duration | Notes |
|------|----------|-------|
| Tasks 1-4: Discovery | 30 min | Grep all duplicates |
| Tasks 5-9: Create Type Files | 60 min | 5 type files with hierarchies |
| Tasks 10-14: Update Imports | 90 min | Update 25+ files |
| Task 15: Verification | 20 min | Check orphans |
| Tasks 16-17: Build Check | 20 min | type-check + build |
| Tasks 18-20: Documentation | 40 min | README + CLAUDE + patterns |
| Tasks 21-22: Final Verification | 10 min | Complete checks |
| **Total** | **~4.5 hours** | **Comprehensive audit** |

---

**End of Implementation Plan**
