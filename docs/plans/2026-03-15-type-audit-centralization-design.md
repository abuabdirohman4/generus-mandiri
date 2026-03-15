# Type Audit and Centralization - Design Document

**Date:** 2026-03-15
**Related Issue:** sm-5nw (Audit and centralize all type/interface definitions)
**Branch:** refactoring-architecture
**Execution:** Google Antigravity (code creation), Claude Code (review)

---

## Overview

Comprehensive audit to discover and centralize all duplicate type/interface definitions across the codebase into `src/types/` directory with clean break migration strategy.

---

## Context

**Problem:** Type fragmentation discovered during sm-8yf implementation:
- Multiple conflicting Student interfaces existed across codebase
- UserProfile has **17 duplicate definitions** in different files
- Class types scattered across 8+ locations
- Dummy files contain duplicate type definitions from `src/types/`

**Previous Work:**
- sm-8yf: Created centralized `src/types/student.ts` with hierarchy pattern
- sm-s3y: Extracted dashboard and report types to `src/types/`
- Pattern established: Base → Extended → Full hierarchy

**Goal:** Apply same centralization pattern to ALL types in codebase.

---

## Goals

1. **Discover all duplicate types** across src/ directory
2. **Centralize types** to `src/types/` with domain-based organization
3. **Apply hierarchy pattern** (Base → Extended → Full) consistently
4. **Clean break migration** - update all imports, delete duplicates
5. **Document guidelines** in README.md and CLAUDE.md
6. **Verify integrity** with type-check and build

---

## Scope

### In Scope (Comprehensive Audit)

**High Priority (Many duplicates):**
- ✅ **UserProfile types** - 17 duplicates found → `src/types/user.ts`
- ✅ **Class types** - 8+ duplicates found → `src/types/class.ts`
- ✅ **Dummy file cleanup** - Remove duplicates from `lib/dummy/processAttendanceLogs.ts`

**Medium Priority (Complete domains):**
- ✅ **Organization types** (Daerah, Desa, Kelompok) → `src/types/organization.ts`
- ✅ **Material types** (check first) → `src/types/material.ts` (if needed)
- ✅ **Rapot types** (check first) → `src/types/rapot.ts` (if needed)

**Documentation:**
- ✅ Create `src/types/README.md` with type management guidelines
- ✅ Update CLAUDE.md Type/Interface Management section
- ✅ Expand architecture-patterns.md Type Management section

### Out of Scope

- Types already centralized: attendance, meeting, student, dashboard, report (verified in sm-s3y)
- Database schema types (handled by Supabase codegen)
- Component-specific prop types (OK to keep inline)
- Third-party library types

---

## Design

### 1. Audit Strategy

#### Discovery Process

**Phase 1: Find all type definitions**
```bash
# Find exported types in app directory
grep -r "^export interface\|^export type" src/app --include="*.ts" --include="*.tsx"

# Find types in lib directory
grep -r "^interface\|^type " src/lib --include="*.ts"

# Find types in components
grep -r "^interface\|^type " src/components --include="*.ts" --include="*.tsx"

# Find types in stores/hooks
grep -r "^interface\|^type " src/stores src/hooks --include="*.ts"
```

**Phase 2: Categorize by domain**

Group findings into:
1. **User/Profile types** - UserProfile, Profile
2. **Class types** - Class, ClassData, ClassMaster, ClassWithMaster, ClassPerformance
3. **Organization types** - Daerah, Desa, Kelompok
4. **Material types** - Material, MaterialData
5. **Rapot types** - Rapot, RapotTemplate, RapotData
6. **Duplicates to clean** - Dummy files, test files

**Phase 3: Identify canonical definition**

For each domain:
- Find most complete version
- Check for JSDoc comments (preserve)
- Prefer definitions with proper field types (not `any`)
- Check usage across codebase (most used = canonical)

---

### 2. Target Type Files

```
src/types/
├── attendance.ts       ✓ Existing (AttendanceLog, AttendanceData, AttendanceStats)
├── meeting.ts          ✓ Existing (Meeting, CreateMeetingData, MeetingWithStats)
├── student.ts          ✓ Existing (StudentBase → StudentWithOrg → StudentWithClasses → StudentBiodata)
├── dashboard.ts        ✓ Existing (Dashboard, TodayMeeting, ClassMonitoringData)
├── report.ts           ✓ Existing (ReportFilters, ReportData)
├── user.ts             ← NEW (UserProfile hierarchy - 17 duplicates)
├── class.ts            ← NEW (Class hierarchy - 8+ duplicates)
├── organization.ts     ← NEW (Daerah, Desa, Kelompok)
├── material.ts         ← NEW (if duplicates found)
├── rapot.ts            ← NEW (if duplicates found)
└── README.md           ← NEW (Type management guidelines)
```

---

### 3. Type Hierarchy Pattern

**Follow student.ts pattern** (established in sm-8yf):

```typescript
/**
 * [Domain] Type Definitions
 *
 * IMPORTANT: Single source of truth for [domain]-related types.
 * Type hierarchy: [Base] → [Extended] → [Full]
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base [entity] type - minimal fields for basic operations
 * Use for: Permission checks, simple listings
 */
export interface EntityBase {
  id: string
  name: string
}

// ─── Extended Types ───────────────────────────────────────────────────────────

/**
 * [Entity] with organizational hierarchy
 * Use for: Filtering, access control
 */
export interface EntityWithOrg extends EntityBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
}

// ─── Full Types ───────────────────────────────────────────────────────────────

/**
 * Full [entity] with all fields
 * Use for: Main listings, detailed views
 */
export interface Entity extends EntityWithOrg {
  created_at: string
  updated_at: string
  // all other fields
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateEntityData {
  name: string
  // fields needed for creation
}

// ─── UI/Display ───────────────────────────────────────────────────────────────

export interface EntityWithStats extends Entity {
  total: number
  percentage: number
}
```

**Key Principles:**
1. **Base** = Minimal fields (id, name)
2. **WithFeature** = Adds specific context (WithOrg, WithClasses)
3. **Entity** = Full type, most common usage
4. **Preserve JSDoc** - Keep usage guidance comments
5. **Alphabetical sections** - Easier to scan

---

### 4. Consolidation Rules

**Rule 1: Identify Canonical Definition**
- Most complete version wins
- Prefer definitions with JSDoc comments
- Prefer strict types over `any` or `string | null`
- Check git history for original source

**Rule 2: Build Hierarchy**
```typescript
// Example: UserProfile
UserProfileBase         // { id, role }
→ UserProfileWithOrg    // + { daerah_id, desa_id, kelompok_id }
→ UserProfile           // + { classes, all fields } ← canonical
```

**Rule 3: Naming Convention**
- Base: `EntityBase`
- Extended: `EntityWith[Feature]`
- Full: `Entity` (no suffix)
- Avoid: `Entity1`, `Entity2`, `EntityNew`

**Rule 4: Preserve Business Logic in Comments**
```typescript
/** Legacy interface - kept for backward compatibility */
export interface ClassPerformance { ... }

/**
 * Student with organizational hierarchy
 * Use for: Filtering, access control, permission checking
 */
export interface StudentWithOrg extends StudentBase { ... }
```

**Rule 5: Clean Break Migration**
- Create canonical type in `src/types/[domain].ts`
- Update ALL imports to `@/types/[domain]`
- Delete ALL duplicate definitions
- No re-exports for backward compatibility (clean slate)

---

### 5. File-by-File Consolidation Plan

#### File 1: src/types/user.ts (NEW)

**Source duplicates (17 locations):**
1. `src/stores/userProfileStore.ts` - UserProfile interface
2. `src/lib/accessControl.ts` - UserProfile interface
3. `src/lib/accessControlServer.ts` - UserProfile interface
4. `src/lib/constants/meetingTypes.ts` - UserProfile extends AccessControlUserProfile
5. `src/components/shared/DataFilter.tsx` - UserProfile interface
6. `src/app/(admin)/settings/profile/actions/userProfileActions.ts` - UserProfile interface
7. `src/app/(admin)/absensi/hooks/useMeetingTypes.ts` - UserProfile interface
8. `src/app/(admin)/users/siswa/actions/students/permissions.ts` - UserProfile interface
9. `src/app/(admin)/home/components/QuickActions.tsx` - Profile interface
10. + 7 more imports (test files, hooks)

**Canonical type (to be created):**
```typescript
/**
 * User Profile Type Definitions
 *
 * Single source of truth for user/profile types.
 * Type hierarchy: UserProfileBase → UserProfileWithOrg → UserProfile
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface UserProfileBase {
  id: string
  role: 'superadmin' | 'admin' | 'teacher' | 'student'
}

// ─── Extended Types ───────────────────────────────────────────────────────────

export interface UserProfileWithOrg extends UserProfileBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
}

// ─── Full Types ───────────────────────────────────────────────────────────────

export interface UserProfile extends UserProfileWithOrg {
  class_id?: string | null
  class_name?: string | null
  classes?: Array<{ id: string; name: string }>
  teacher_classes?: Array<{ class_id: string; classes: { id: string; name: string } }>
}

// Backward compatibility alias (if needed)
export type Profile = UserProfile
```

**Actions:**
1. Create `src/types/user.ts` with hierarchy
2. Update 17 import statements to `import type { UserProfile } from '@/types/user'`
3. Delete 17 duplicate interface definitions
4. Run type-check to verify

---

#### File 2: src/types/class.ts (NEW)

**Source duplicates (8+ locations):**
1. `src/app/(admin)/users/siswa/actions/classes/actions.ts` - Class interface
2. `src/app/(admin)/kelas/actions/classes.ts` - ClassWithMaster interface
3. `src/app/(admin)/kelas/actions/masters.ts` - ClassMaster, ClassMasterData
4. `src/app/(admin)/materi/types.ts` - ClassMaster interface
5. `src/app/(admin)/users/guru/actions/teachers/logic.ts` - ClassData interface
6. `src/lib/utils/classHelpers.ts` - ClassData interface
7. `src/types/dashboard.ts` - ClassMonitoringData, ClassPerformance (keep here, not duplicate)

**Canonical types (to be created):**
```typescript
/**
 * Class Type Definitions
 *
 * Single source of truth for class-related types.
 * Covers: Classes, ClassMasters, ClassMasterMappings
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface ClassBase {
  id: string
  name: string
}

export interface ClassMasterBase {
  id: string
  name: string
  sort_order: number
}

// ─── Extended Types ───────────────────────────────────────────────────────────

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

export interface ClassWithMaster extends Class {
  class_master_mappings?: Array<{
    class_master_id: string
    class_master?: ClassMaster
  }>
}

// ─── Full Types ───────────────────────────────────────────────────────────────

export interface ClassMaster extends ClassMasterBase {
  description?: string | null
  created_at: string
  updated_at: string
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface ClassMasterData {
  name: string
  sort_order: number
  description?: string | null
}

export interface CreateClassData {
  name: string
  kelompok_id: string
}

// ─── Utility Types ────────────────────────────────────────────────────────────

export interface ClassData {
  id: string
  name: string
  kelompok_id: string
}
```

**Actions:**
1. Create `src/types/class.ts`
2. Update 8+ imports
3. Delete duplicate definitions
4. Verify classHelpers.ts uses canonical ClassData

---

#### File 3: src/types/organization.ts (NEW)

**Source search:**
```bash
grep -rn "interface Daerah\|interface Desa\|interface Kelompok" src/ --include="*.ts"
```

**Expected types:**
```typescript
/**
 * Organization Type Definitions
 *
 * Organizational hierarchy: Daerah (Region) → Desa (Village) → Kelompok (Group)
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface OrganizationBase {
  id: string
  name: string
}

// ─── Daerah (Region) ──────────────────────────────────────────────────────────

export interface Daerah extends OrganizationBase {
  created_at: string
  updated_at: string
}

export interface DaerahWithStats extends Daerah {
  total_desa: number
  total_kelompok: number
  total_classes: number
  total_students: number
}

// ─── Desa (Village) ───────────────────────────────────────────────────────────

export interface Desa extends OrganizationBase {
  daerah_id: string
  daerah?: Daerah
  created_at: string
  updated_at: string
}

export interface DesaWithStats extends Desa {
  total_kelompok: number
  total_classes: number
  total_students: number
}

// ─── Kelompok (Group) ─────────────────────────────────────────────────────────

export interface Kelompok extends OrganizationBase {
  desa_id: string
  desa?: Desa
  created_at: string
  updated_at: string
}

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

**Actions:**
1. Grep to find all organization type definitions
2. Create `src/types/organization.ts`
3. Update imports
4. Delete duplicates

---

#### File 4: src/types/material.ts (CONDITIONAL)

**Check first:**
```bash
grep -rn "interface Material\|type Material" src/app/\(admin\)/materi --include="*.ts"
```

**If duplicates found, create:**
```typescript
/**
 * Material Type Definitions
 *
 * Educational materials for classes
 */

export interface Material {
  id: string
  title: string
  content: string
  class_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateMaterialData {
  title: string
  content: string
  class_id: string
}
```

**If NO duplicates:** Skip (materi may already be using inline types correctly or has minimal types)

---

#### File 5: src/types/rapot.ts (CONDITIONAL)

**Check first:**
```bash
grep -rn "interface Rapot\|type Rapot" src/app/\(admin\)/rapot --include="*.ts"
```

**If duplicates found, create:**
```typescript
/**
 * Rapot (Report Card) Type Definitions
 */

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

export interface CreateRapotData {
  student_id: string
  template_id: string
  data: Record<string, any>
}
```

**If NO duplicates:** Skip

---

#### File 6: Clean up lib/dummy/processAttendanceLogs.ts

**Current duplicates in this file:**
- `interface AttendanceLog` → use `import type { AttendanceLog } from '@/types/attendance'`
- `interface Meeting` → use `import type { Meeting } from '@/types/meeting'`
- `interface ReportFilters` → use `import type { ReportFilters } from '@/types/report'`
- `interface ReportData` → use `import type { ReportData } from '@/types/report'`
- Other local interfaces (StudentSummary, ChartData, etc.) → evaluate if needed or can use existing types

**Actions:**
1. Replace duplicate interfaces with imports
2. Keep ONLY dummy-specific types if truly local
3. Minimize file to just dummy data processing logic

---

### 6. Migration Strategy (Clean Break)

**Phase 1: Create Canonical Types**
1. Create `src/types/user.ts`
2. Create `src/types/class.ts`
3. Create `src/types/organization.ts`
4. (Conditional) Create `src/types/material.ts`
5. (Conditional) Create `src/types/rapot.ts`

**Phase 2: Update Imports**
For each type file created:
1. Find all files importing old types:
   ```bash
   grep -r "UserProfile" src/ --include="*.ts" --include="*.tsx" -l
   ```
2. Update imports:
   ```typescript
   // OLD:
   interface UserProfile { ... }

   // NEW:
   import type { UserProfile } from '@/types/user'
   ```
3. Delete inline type definition

**Phase 3: Clean Up**
1. Delete all duplicate type definitions
2. Clean up `lib/dummy/processAttendanceLogs.ts`
3. Remove unused imports

**Phase 4: Verification**
1. Run `npm run type-check` (must pass)
2. Run `npm run build` (must succeed)
3. Grep for orphaned types:
   ```bash
   grep -r "^interface UserProfile\|^export interface UserProfile" src/ --include="*.ts"
   # Should return ONLY src/types/user.ts
   ```

---

### 7. Documentation Strategy

#### Create src/types/README.md

```markdown
# Type Management Guidelines

## Philosophy

**Single Source of Truth:** All shared types are centralized in `src/types/` organized by domain.

**Hierarchy Pattern:** Complex entities use Base → Extended → Full pattern (see `student.ts` as reference).

**Clean Imports:** Always import from `@/types/[domain]`, never from inline definitions.

## Directory Structure

\`\`\`
src/types/
├── user.ts          # User/Profile types
├── student.ts       # Student types (hierarchy reference)
├── class.ts         # Class/ClassMaster types
├── organization.ts  # Daerah/Desa/Kelompok
├── attendance.ts    # Attendance logs
├── meeting.ts       # Meeting types
├── dashboard.ts     # Dashboard metrics
├── report.ts        # Report filters & data
├── material.ts      # Educational materials
└── rapot.ts         # Report cards
\`\`\`

## When to Create New Type File

**✅ Create centralized type when:**
1. Type is used in **2+ files**
2. Type represents **core domain entity** (User, Student, Class, etc.)
3. Type has **3+ related interfaces** in same domain

**❌ Keep inline when:**
1. Used in **single file only**
2. Component-specific props (React component props)
3. Internal helper types (not exported)

## Type Hierarchy Pattern

For complex entities with variations, use hierarchy:

\`\`\`typescript
// Base - minimal fields
export interface EntityBase {
  id: string
  name: string
}

// Extended - adds context
export interface EntityWithOrg extends EntityBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
}

// Full - most common usage
export interface Entity extends EntityWithOrg {
  created_at: string
  updated_at: string
  // all fields
}
\`\`\`

**Reference:** See \`src/types/student.ts\` for complete hierarchy example.

## Pre-Flight Checklist

Before creating a new type definition:

- [ ] Search codebase: \`grep -r "interface MyType" src/\`
- [ ] If exists → import it, don't recreate
- [ ] If needs extension → use \`extends\`, don't copy-paste
- [ ] If truly new → create in \`src/types/[domain].ts\`

## Import Patterns

**✅ Correct:**
\`\`\`typescript
import type { UserProfile } from '@/types/user'
import type { Student } from '@/types/student'
import type { Class } from '@/types/class'
\`\`\`

**❌ Incorrect:**
\`\`\`typescript
import type { UserProfile } from '../lib/accessControl'
import type { Student } from './types'
interface MyUserProfile { ... }  // Don't duplicate!
\`\`\`

## Migration from Inline Types

When centralizing existing inline type:

1. Create canonical version in \`src/types/[domain].ts\`
2. Update all imports to \`@/types/[domain]\`
3. Delete inline definition
4. Run \`npm run type-check\` to verify

## Naming Conventions

- **Base types:** \`EntityBase\`
- **Extended:** \`EntityWith[Feature]\` (EntityWithOrg, EntityWithClasses)
- **Full:** \`Entity\` (no suffix)
- **Request/Response:** \`CreateEntityData\`, \`UpdateEntityData\`
- **UI/Display:** \`EntityWithStats\`, \`EntitySummary\`

**Avoid:** Entity1, Entity2, EntityNew, EntityOld

## Preserving Business Logic

Keep usage guidance in JSDoc:

\`\`\`typescript
/**
 * Student with organizational hierarchy
 * Use for: Filtering, access control, permission checking
 */
export interface StudentWithOrg extends StudentBase { ... }

/** Legacy interface - kept for backward compatibility */
export interface ClassPerformance { ... }
\`\`\`
```

---

#### Update CLAUDE.md (Expand Type/Interface Management Section)

**Location:** ~line 91 (Type/Interface Management section)

**Expand with:**

```markdown
## 📐 Type/Interface Management

**CRITICAL**: All domain types centralized in \`src/types/\`. For extraction rules, organization patterns, and import guidelines, READ [\`docs/claude/architecture-patterns.md#type-management--organization\`](docs/claude/architecture-patterns.md#type-management--organization). For advanced type patterns (extends hierarchy, pre-flight checks), READ [\`docs/claude/type-management.md\`](docs/claude/type-management.md)

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

**Reference:** \`src/types/student.ts\` for complete example.

### Import Pattern

**✅ Correct:**
\`\`\`typescript
import type { UserProfile, UserProfileBase } from '@/types/user'
import type { Student, StudentWithClasses } from '@/types/student'
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

---

#### Update architecture-patterns.md (Expand Type Management Section)

**Location:** After line 504 (end of current Type Management section)

**Add:**

```markdown
### Type Consolidation Process

When centralizing duplicate types:

**1. Discovery**
\`\`\`bash
# Find all definitions
grep -r "^export interface EntityName" src/ --include="*.ts"
grep -r "^interface EntityName" src/ --include="*.ts"
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

### Type File Organization Template

\`\`\`typescript
/**
 * [Domain] Type Definitions
 *
 * IMPORTANT: Single source of truth for [domain] types.
 * Type hierarchy: [Base] → [Extended] → [Full]
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base [entity] type - minimal fields
 * Use for: Permission checks, simple operations
 */
export interface EntityBase {
  id: string
  name: string
}

// ─── Extended Types ───────────────────────────────────────────────────────────

/**
 * [Entity] with organizational context
 * Use for: Filtering, access control
 */
export interface EntityWithOrg extends EntityBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
}

// ─── Full Types ───────────────────────────────────────────────────────────────

/**
 * Complete [entity] definition
 * Use for: Main listings, detailed views (most common)
 */
export interface Entity extends EntityWithOrg {
  created_at: string
  updated_at: string
  // all other fields
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateEntityData {
  name: string
  // fields for creation
}

export interface UpdateEntityData extends Partial<CreateEntityData> {
  id: string
}

// ─── UI/Display ───────────────────────────────────────────────────────────────

export interface EntityWithStats extends Entity {
  total: number
  percentage: number
}
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

### Reference Implementations

**Best examples:**
- \`src/types/student.ts\` - Complete hierarchy pattern (Base → WithOrg → WithClasses → Biodata)
- \`src/types/dashboard.ts\` - Clean domain organization
- \`src/types/report.ts\` - Request/Response pattern

**See also:**
- \`src/types/README.md\` - Detailed guidelines
- \`CLAUDE.md\` - Quick reference rules
```

---

## Success Criteria

**Code Changes:**
- [ ] `src/types/user.ts` created with UserProfile hierarchy
- [ ] `src/types/class.ts` created with Class/ClassMaster types
- [ ] `src/types/organization.ts` created with Daerah/Desa/Kelompok
- [ ] `src/types/material.ts` created (if duplicates found)
- [ ] `src/types/rapot.ts` created (if duplicates found)
- [ ] All 17 UserProfile duplicates consolidated
- [ ] All 8+ Class type duplicates consolidated
- [ ] `lib/dummy/processAttendanceLogs.ts` cleaned up
- [ ] All imports updated to `@/types/[domain]`
- [ ] All duplicate definitions deleted
- [ ] `npm run type-check` passes ✅
- [ ] `npm run build` succeeds ✅
- [ ] No orphaned type definitions

**Documentation:**
- [ ] `src/types/README.md` created with comprehensive guidelines
- [ ] `CLAUDE.md` Type/Interface Management section expanded
- [ ] `architecture-patterns.md` Type Management section expanded with consolidation process
- [ ] All docs include examples and anti-patterns

**Quality:**
- [ ] Types follow hierarchy pattern (Base → Extended → Full)
- [ ] JSDoc comments preserved
- [ ] Alphabetical sorting within sections
- [ ] Consistent naming (EntityBase, EntityWithFeature, Entity)
- [ ] No technical debt (no re-exports, clean break)

---

## Review Checklist (For Claude Code)

When reviewing Antigravity's work:

**1. File Structure:**
- [ ] Check `src/types/` has all expected files (user, class, organization, +conditionals)
- [ ] Open each new type file, verify JSDoc header
- [ ] Verify hierarchy pattern (Base → Extended → Full)
- [ ] Check alphabetical sorting within sections

**2. Type Completeness:**
- [ ] Compare new user.ts with 17 original UserProfile sources
- [ ] Compare new class.ts with 8+ original Class sources
- [ ] Verify no types were lost in consolidation
- [ ] Check JSDoc comments preserved

**3. Import Updates:**
- [ ] Grep for old UserProfile imports (should be ZERO):
   ```bash
   grep -r "interface UserProfile" src/ --include="*.ts" | grep -v "src/types/user.ts"
   ```
- [ ] Grep for old Class imports (should be ZERO):
   ```bash
   grep -r "interface Class[^a-z]" src/ --include="*.ts" | grep -v "src/types/class.ts"
   ```
- [ ] Spot-check 5-10 files for correct imports from `@/types/`

**4. Dummy File Cleanup:**
- [ ] Check `lib/dummy/processAttendanceLogs.ts` has imports, not duplicates
- [ ] Verify file is minimal (dummy logic only)

**5. Build Verification:**
- [ ] Run `npm run type-check` (must pass)
- [ ] Run `npm run build` (must succeed)
- [ ] Check console for any import errors

**6. Documentation:**
- [ ] Read `src/types/README.md` - comprehensive?
- [ ] Check CLAUDE.md Type Management expanded
- [ ] Check architecture-patterns.md expanded
- [ ] Verify examples in docs are correct

**7. Clean-up:**
- [ ] No orphaned type definitions
- [ ] No commented-out types
- [ ] No "TODO" or "FIXME" comments left
- [ ] No duplicate definitions remaining

---

## Rollback Plan

If issues found during review:

**Partial Rollback (specific domain):**
```bash
git checkout HEAD -- src/types/user.ts
git checkout HEAD -- src/stores/userProfileStore.ts
git checkout HEAD -- src/lib/accessControl.ts
# ... restore other affected files
```

**Full Rollback:**
```bash
git checkout HEAD -- src/types/
git checkout HEAD -- src/
git checkout HEAD -- docs/
```

**Re-apply with fixes:** Provide specific feedback to Antigravity.

---

## Execution Plan Summary (For Antigravity)

**Phase 1: Discovery** (30 min)
- Grep all type definitions
- Categorize by domain
- Identify canonical versions

**Phase 2: Create Type Files** (60 min)
- Create user.ts, class.ts, organization.ts
- Build hierarchies
- Add JSDoc comments

**Phase 3: Update Imports** (90 min)
- Update 17 UserProfile imports
- Update 8+ Class imports
- Update organization imports
- Clean up dummy file

**Phase 4: Delete Duplicates** (30 min)
- Remove all inline definitions
- Verify no orphaned types

**Phase 5: Verification** (20 min)
- Run type-check
- Run build
- Grep for orphans

**Phase 6: Documentation** (40 min)
- Create README.md
- Update CLAUDE.md
- Expand architecture-patterns.md

**Total:** ~4.5 hours

---

## Related Issues

- **sm-5nw** - Audit and centralize all type/interface definitions (this issue)
- **sm-s3y** - Extract inline types to src/types/ (completed - established pattern)
- **sm-8yf** - Student type consolidation (completed - hierarchy pattern reference)

---

**End of Design Document**
