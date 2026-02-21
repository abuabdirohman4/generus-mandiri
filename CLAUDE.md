# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY: Test-Driven Development (TDD)

**ALL new features, business logic, and permission systems MUST be developed using TDD.**

### Why TDD is Mandatory

- ✅ **Zero bugs on first implementation** - Tests catch issues before production
- ✅ **Clear requirements** - Tests serve as executable specifications
- ✅ **Safe refactoring** - Change code with confidence
- ✅ **Better design** - TDD forces modular, testable code
- ✅ **Documentation** - Tests show how code should be used
- ✅ **Time savings** - Less debugging, fewer production bugs

**Real Example**: `studentPermissions.ts` (sm-8yf)
- 🔴 Wrote 66 tests first (~10 min)
- 🟢 Implemented 10 functions (~15 min)
- 🔵 Refactored (~5 min)
- ✅ Result: 126/126 tests passing, 100% coverage, **0 bugs**, ~30 minutes total

### TDD Workflow: RED → GREEN → REFACTOR

**Step 1: 🔴 RED - Write Failing Tests First**
```typescript
describe('myFeature', () => {
  it('should handle basic case', () => {
    expect(myFunction(input)).toBe(expectedOutput)
  })
  it('should handle edge case: null', () => {
    expect(myFunction(null)).toBe(defaultValue)
  })
})
```

**Step 2: 🟢 GREEN - Implement Minimal Code**
```typescript
export function myFunction(input: InputType): OutputType {
  if (!input) return defaultValue
  return processInput(input)
}
```

**Step 3: 🔵 REFACTOR - Clean Up Code**
```typescript
export function myFunction(input: InputType): OutputType {
  validateInput(input)
  return transformInput(input)
}
```

### When to Use TDD (ALWAYS for these cases)

**✅ REQUIRED for:**
1. **New business logic** - Calculations, validations, rules
2. **Permission systems** - Any access control or authorization
3. **Data transformations** - Filtering, mapping, aggregations
4. **Complex algorithms** - Attendance stats, report generation
5. **Integration points** - API interactions, database queries
6. **Critical features** - Student management, class eligibility

**❌ SKIP TDD for:**
- Simple UI components with no logic (pure presentational)
- Trivial getters/setters
- Configuration files
- Type definitions

### TDD Commands

```bash
npm run test:watch  # Auto-run tests on file save
npm run test:coverage  # Check coverage
npm run test:ui  # Interactive UI
```

**📖 For detailed testing setup, examples, and complete TDD workflow, READ [`docs/claude/testing-guidelines.md`](docs/claude/testing-guidelines.md)**

---

## 📚 Documentation Strategy for AI Knowledge Management

**CRITICAL**: Balance between inline knowledge vs external references for optimal token usage.

### When to Add Knowledge INLINE in CLAUDE.md

Use inline documentation when:
- ✅ **High-frequency reference** - Used in >50% of tasks (e.g., TDD workflow, access control rules)
- ✅ **Short & critical** - <50 lines AND mission-critical (e.g., MCP connection check)
- ✅ **Quick lookup** - Needs instant recall without file read (e.g., development commands)
- ✅ **Core conventions** - Fundamental patterns used across codebase (e.g., Supabase client usage)

### When to Create EXTERNAL Reference Files

Create separate files in `docs/claude/` when:
- ✅ **Low-frequency reference** - Used in <20% of tasks (e.g., bulk database operations)
- ✅ **Long & detailed** - >50 lines OR multiple examples (e.g., testing guidelines, database operations)
- ✅ **Specialized knowledge** - Domain-specific or one-time setup (e.g., PWA configuration)
- ✅ **Reference material** - Detailed examples, troubleshooting guides (e.g., business rules)

### Current Documentation Structure

```
CLAUDE.md (inline)           docs/claude/ (external references)
├─ TDD workflow              ├─ testing-guidelines.md (detailed TDD examples)
├─ Access control rules      ├─ business-rules.md (domain logic)
├─ Development commands      ├─ database-operations.md (bulk ops, migrations)
├─ Architecture overview     └─ ... (future: pwa-setup.md, deployment.md)
└─ MCP connection check
```

### Token Optimization Guidelines

- **Inline limit**: Keep CLAUDE.md under 700 lines for optimal loading
- **Reference pointers**: Use clear "READ [`file.md`]" syntax for external docs
- **Avoid duplication**: Never duplicate between inline and external (use pointer)
- **Update both**: When adding knowledge, decide inline vs external FIRST

**Example of good pointer**:
```markdown
## Database Operations

**For bulk user creation, migrations, and complex database operations, READ [`docs/claude/database-operations.md`](docs/claude/database-operations.md)**

Key points:
- NEVER manually INSERT into `auth.users` without auth.identities
- Use empty string `''` for tokens, not NULL
- Pre-hash passwords in bulk operations
```

---

## 📋 Beads Issue Progress Documentation Standard

**MANDATORY for all multi-session work tracked in Beads.**

### When to Create Progress Documentation

Create a progress file in `.beads/progress/` for ANY issue that:
- ✅ Spans multiple sessions (can't complete in one sitting)
- ✅ Has complex implementation steps (refactoring, architecture changes)
- ✅ Involves TDD workflow (track test/implementation progress)
- ✅ Has dependencies or blockers
- ✅ Needs context preservation across compaction

**Skip for**:
- ❌ Simple one-session tasks (quick fixes, single file changes)
- ❌ Trivial updates (typo fixes, documentation tweaks)

### File Naming Convention

**Location**: `.beads/progress/`
**Format**: `{issue-id}.md` (e.g., `sm-mln.md`, `sm-8yf.md`)

### Required Sections

```markdown
# {Issue Title} - Progress Summary

**Beads Issue**: {issue-id}
**Status**: {⏳ In Progress | ✅ Complete | ❌ Blocked}
**Total Tests**: {X passing ✅}

## ✅ Completed - {Phase Name}

### {Step Number}. {Component Name} ({file-path})
**Purpose**: {What this does}

**Functions/Features Implemented**:
- ✅ `functionName()` - Description

**Tests**: {X tests, Y% coverage ✅}

## ⏳ Current Phase - {Phase Name}

### {Step Number}. {Component Name} - {Status}
**Purpose**: {What this does}

**Functions Implemented**:
- ✅ `completedFunction()` - Description
- ⏳ `inProgressFunction()` - WIP
- ❌ `blockedFunction()` - Blocked by {reason}

**Tests**: {X tests ✅ (more tests needed)}

## 📊 Metrics

- **Lines of Code Created**: ~{X} lines
- **Test Coverage**: {Y}% overall
- **Tests Passing**: {X}/{Y} ✅
- **Files Created**: {N} ({breakdown})

## 🎯 Next Steps

1. ⏳ **Current Priority**: {What to do next}
2. ⏳ **Phase {N}**: {Upcoming work}

## 📝 Notes

- **{Key Decision}**: {Rationale}
- **{Blocker}**: {Issue and resolution}

---

**Last Updated**: {YYYY-MM-DD} ({Phase name})
**Next Session**: {What to focus on}
```

### Update Workflow

**When starting work on an issue**:
1. Check if `.beads/progress/{issue-id}.md` exists
2. If NOT, create it with initial structure
3. Update **Status** section with current phase

**During implementation**:
1. ✅ Mark completed steps with checkmarks
2. ⏳ Update "Current Phase" section
3. 📊 Update metrics (tests passing, coverage, LOC)
4. 📝 Add notes for decisions/blockers

**At end of session**:
1. Update **Last Updated** timestamp
2. Update **Next Session** with clear next steps
3. Commit progress file WITH code changes
4. Run `bd sync` to persist

**Before closing issue**:
1. Change **Status** to ✅ Complete
2. Verify all sections are ✅
3. Add final metrics and summary
4. Commit final progress update

### Example

See `.beads/progress/sm-mln.md` for complete example.

---

## 🚨 CRITICAL: MCP Connection Check

**BEFORE running ANY Supabase operations** (migrations, queries, etc.), you MUST:

1. **Check MCP Connection Status** using `mcp__generus-mandiri-v2__list_tables` or `mcp__better-planner__list_tables`
2. **If connection fails**:
   - ❌ **DO NOT** ask user to restart Claude Code
   - ✅ **INFORM** user: "MCP Supabase belum terkoneksi. Silakan aktifkan MCP di settings Claude Code."
   - ✅ Continue with other tasks that don't require database access
3. **If connection succeeds**: Proceed with database operations normally

**Why This Matters**:
- MCP can be activated/deactivated without restart
- Avoids confusion about "connection errors"
- User knows exactly what to do (enable MCP in settings)

**Example Check**:
```typescript
// Try to list tables to verify connection
const result = await mcp__generus-mandiri-v2__list_tables({ schemas: ["public"] })
// If successful, MCP is connected ✅
// If error, inform user to enable MCP ❌
```

---

## 📐 Type/Interface Management Guidelines

**CRITICAL**: Avoid type fragmentation by centralizing type definitions.

### Rules for Type Definitions

1. ✅ **Centralize Shared Types** in `src/types/` directory
   - Database entities (Student, Class, User, etc.)
   - API request/response types
   - Shared business logic types

2. ❌ **NEVER Duplicate Type Definitions** across files
   - Before creating a type, search: `grep -r "interface MyType" src/` or `grep -r "type MyType" src/`
   - If type exists, import it—don't recreate

3. ✅ **Use Type Hierarchy** for complex entities (extends pattern)
   ```typescript
   // Example: Student types (src/types/student.ts)
   export interface StudentBase { id, name, gender, status }
   export interface StudentWithOrg extends StudentBase { daerah_id, desa_id, kelompok_id }
   export interface StudentWithClasses extends StudentWithOrg { classes, class_id }
   export interface StudentBiodata extends StudentWithClasses { all biodata fields }
   ```

4. ✅ **Re-export for Backward Compatibility** when migrating types
   ```typescript
   // Old location (for backward compatibility)
   export type { StudentBiodata } from '@/types/student'
   ```

5. ✅ **Name Consistently**: Use descriptive, hierarchical names
   - ✅ `UserBase`, `UserWithRole`, `UserProfile`
   - ❌ `User1`, `User2`, `UserV2`

6. ⚠️ **Local Types Are OK For**:
   - Component-specific props
   - Form data (internal to component)
   - Internal state management

7. ⚠️ **Centralize Types For**:
   - Database entities
   - API request/response
   - Shared across 2+ files
   - Used in multiple modules

### Type Location Structure

```
src/
├── types/              # Centralized types (NEW)
│   ├── student.ts     # Student hierarchy
│   ├── user.ts        # User/Profile types
│   ├── class.ts       # Class/ClassMaster types
│   └── README.md      # Type documentation
├── app/
│   └── (admin)/
│       └── users/
│           └── siswa/
│               └── types.ts  # Re-exports from @/types/student
└── lib/
    └── studentPermissions.ts # Imports from @/types/student
```

### Check Before Creating Types

**Before adding `interface MyType` or `type MyType`**:

1. **Search for existing definitions**:
   ```bash
   grep -r "interface MyType" src/
   grep -r "type MyType" src/
   ```

2. **If type exists**:
   - ✅ Import it: `import type { MyType } from '@/types/...'`
   - ❌ Don't recreate/duplicate

3. **If type needs extension**:
   - ✅ Use `extends`: `interface MyTypeExtended extends MyType { ... }`
   - ❌ Don't copy-paste fields

4. **If type doesn't exist and is shared**:
   - Create in `src/types/[entity].ts`
   - Export with clear hierarchy
   - Document in comments

### Example: Student Type Centralization

**Problem**: 3 different `Student` interfaces caused type mismatches

**Solution**: Created `src/types/student.ts` with hierarchy
```typescript
// src/types/student.ts - Single source of truth
export interface StudentBase { ... }
export interface StudentWithOrg extends StudentBase { ... }
export interface StudentWithClasses extends StudentWithOrg { ... }
export interface StudentBiodata extends StudentWithClasses { ... }

// All modules import from here
import type { StudentWithOrg } from '@/types/student'
```

**Related Issue**: See `sm-5nw` for comprehensive type audit

---

## 📚 Project Overview

**Generus Mandiri** is a Next.js 15 school management system for LDII (Lembaga Dakwah Islam Indonesia) religious education programs. It manages students (generus), teachers, classes, attendance tracking, academic reports, report cards (rapot), and educational materials (materi) with role-based access control. It uses Supabase for PostgreSQL database, authentication, and Row Level Security (RLS).

**Organizational Structure**: The system follows a 3-level hierarchy:
- **Daerah** (Region) - Top level organizational unit
- **Desa** (Village) - Mid level under Daerah
- **Kelompok** (Group) - Bottom level under Desa

Each admin level (admin_daerah, admin_desa, admin_kelompok) has access restricted to their organizational scope and below.

---

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000

# Build & Type Checking
npm run build            # Production build
npm run type-check       # Run TypeScript compiler without emitting files

# Code Quality
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without writing
npm run fix:all          # Format and type-check in sequence

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once (for CI/CD)
npm run test:ui          # Open Vitest UI (interactive test viewer)
npm run test:coverage    # Generate coverage report
```

---

## 🏗️ Architecture Overview

### App Router Structure

The app uses Next.js 15 App Router with two main layout groups:

1. **`(full-width-pages)`** - Unauthenticated pages (signin, signup, errors)
2. **`(admin)`** - Authenticated pages:
   - `/home` - Dashboard with quick actions
   - `/absensi` - Attendance management with meeting types
   - `/laporan` - Reports and analytics
   - `/users/siswa`, `/users/guru`, `/users/admin` - User management
   - `/kelas` - Class and class master management
   - `/organisasi` - Organization hierarchy management
   - `/rapot` - Report card generation and templates
   - `/materi` - Educational materials management
   - `/settings` - PWA settings, cache management, profile

Protected routes are under `src/app/(admin)/`. Each feature has its own directory with co-located:
- `page.tsx` - Route component
- `actions.ts` - Server actions for mutations
- `hooks/` - SWR data fetching hooks
- `stores/` - Zustand state management
- `components/` - Feature-specific components

### Database & Supabase

**Database**: `generus-mandiri-v2` on Supabase

**Key Tables**:
- `profiles` - User accounts with role-based access (superadmin, admin, teacher, student)
- `students` - Student records with biodata
- `classes` - Class definitions (linked to kelompok level)
- `class_masters` - Master class types (Pra Nikah, Remaja, Orang Tua, etc.) with categories
- `class_master_mappings` - Junction table linking classes to master classes (many-to-many)
- `meetings` - Class meetings/sessions with support for multiple classes (`class_ids` array)
- `attendance_logs` - Daily attendance (H/I/S/A status) with composite key (student_id, date)
- `student_classes` - Junction table for student-class many-to-many
- `teacher_classes` - Junction table for teacher-class many-to-many
- `daerah`, `desa`, `kelompok` - Organizational hierarchy (Region > Village > Group)
- `rapot_templates` - Report card templates with customizable sections
- `rapot_data` - Generated report cards for students
- `materials` - Educational materials (materi) with TipTap rich text content

**Supabase Client Usage**:
- `createClient()` from `@/lib/supabase/client` - Browser client for client components
- `createClient()` from `@/lib/supabase/server` - Server client for server actions (uses cookies)
- `createAdminClient()` from `@/lib/supabase/server` - Service role client to bypass RLS (admin operations only)

### Access Control

**Role Hierarchy**:
```
superadmin (global access)
  └─ admin
      ├─ admin_daerah (region level)
      ├─ admin_desa (village level)
      └─ admin_kelompok (group level)
teacher (assigned classes only)
student (own data only)
```

**CRITICAL ACCESS CONTROL RULES**:
- **Client Components/Hooks**: ALWAYS use `import { isSuperAdmin, isAdminDaerah, ... } from '@/lib/userUtils'`
- **Server Actions**: ALWAYS use `import { canAccessFeature, getDataFilter, getCurrentUserProfile } from '@/lib/accessControlServer'`
- **NEVER** import directly from `@/lib/accessControl.ts`

**Key Functions**:
- `isSuperAdmin(profile)`, `isAdminDaerah(profile)`, `isAdminDesa(profile)`, `isAdminKelompok(profile)`, `isTeacher(profile)`
- `canAccessFeature(profile, feature)` - Check feature-level access
- `getDataFilter(profile)` - Get filter object based on user's organizational level
- `shouldShowDaerahFilter(profile)`, `shouldShowDesaFilter(profile)`, etc. - UI visibility helpers

### State Management

**Zustand Stores** (persisted to localStorage):
- `userProfileStore` - Current user profile with organizational hierarchy and assigned classes
- `sidebarStore`, `themeStore`, `languageStore` - UI preferences
- `attendanceStore`, `absensiUIStore` - Attendance management state
- `siswaStore`, `kelasStore`, `guruStore`, `adminStore` - Feature-specific states
- `laporanStore`, `organisasiStore` - Reports and organization management

**CRITICAL Store Patterns**:
- **Dynamic Defaults**: NEVER hardcode dates/months in helper functions for production use
  ```typescript
  // ❌ BAD - Hardcoded for dummy data
  const getCurrentMonth = () => 10 // October
  const getCurrentYear = () => 2025

  // ✅ GOOD - Dynamic system date
  const getCurrentMonth = () => new Date().getMonth() + 1 // 1-12
  const getCurrentYear = () => new Date().getFullYear()
  ```
- **Store Initialization**: Default values should use helper functions, not hardcoded values
- **Filter Defaults**: Monthly/yearly filters should default to current period for better UX

**SWR Configuration**:
- 2-minute deduping interval (can be customized per hook)
- Revalidates on focus and reconnect (can be disabled per hook)
- localStorage-based persistent cache (survives page refresh)
- Cache cleared on login/logout via `clearUserCache()` (with page reload)
- Centralized SWR keys in `@/lib/swr.ts` for consistency (e.g., `meetingFormSettingsKeys`, `studentKeys`, `classKeys`)

### Data Fetching Patterns

**Pattern 1**: Server Action + SWR Hook
```typescript
// In actions.ts
export async function getAllStudents(classId?: string): Promise<Student[]> {
  'use server'
  const supabase = await createClient()
  // Query with RLS
}

// In hooks or components
export function useStudents({ classId }: Options) {
  const { data, mutate } = useSWR(key, () => getAllStudents(classId))
  return { students: data, mutate }
}
```

**Pattern 2**: Direct Server Action for Mutations
```typescript
async function handleSubmit(data) {
  const result = await saveAttendance(data)
  if (result.success) {
    mutate() // Revalidate SWR cache
    revalidatePath('/absensi') // Server-side cache
  }
}
```

**Pattern 3**: Prefetch + Custom SWR Configuration (for optimal performance)
```typescript
// Example: Meeting form settings with long cache and no revalidation on focus
export function useMeetingFormSettings(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? meetingFormSettingsKeys.settings(userId) : null,
    async () => {
      const result = await getMeetingFormSettings(userId)
      return result.success && result.data ? result.data : DEFAULT_SETTINGS
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes cache
      fallbackData: DEFAULT_SETTINGS,
    }
  )
  return { settings: data || DEFAULT_SETTINGS, isLoading, error, mutate }
}
```

### UI Components

**Reusable Components**: Located in `src/components/`
- Use existing components for buttons, modals, inputs, delete confirmations
- For icons, use those in `public/icons` & `src/lib/icons.ts` (or add new ones there)

**Key Component Groups**:
- `components/ui/` - Base UI components (button, modal, dropdown, skeleton, pagination)
- `components/form/input/` - Form inputs
- `components/layouts/` - App header, sidebar, bottom navigation
- `components/charts/` - Recharts-based visualizations
- `components/shared/DataFilter.tsx` - Centralized filter component

**Filter Guidelines - DataFilter Component**:
- **IMPORTANT**: When adding new filter types, consider adding them to `DataFilter.tsx` if they will be reused across multiple pages
- **Current filters in DataFilter**: Daerah, Desa, Kelompok, Class, Gender, Meeting Type, Month/Year
- **When to add to DataFilter**:
  - ✅ Filter will be used in 2+ pages
  - ✅ Filter follows standard dropdown/select pattern
  - ✅ Filter needs organizational hierarchy (daerah → desa → kelompok)
- **When NOT to add to DataFilter**:
  - ❌ Page-specific filter (only used once)
  - ❌ Complex custom UI (date range picker, multi-step)
  - ❌ Tightly coupled to page state

**Mobile UI Patterns**:
- **Floating Action Buttons**: For primary actions on pages with long scrollable content
  - Use `fixed sm:static bottom-20 sm:bottom-0 left-4 right-4 z-50 shadow-lg sm:shadow-none`
  - `bottom-20` accommodates bottom navigation (64-72px height)
  - Desktop reverts to static positioning

### Special Utilities

**Class Helpers** (`@/lib/utils/classHelpers.ts`):
- `isCaberawitClass(classData)` - Check if PAUD/Caberawit class (via category code/name)
- `isTeacherClass(classData)` - Check if teacher training class (via class name contains 'pengajar')
- `isSambungDesaEligible(classData)` - Check if class is eligible for Sambung Desa meetings

**Common Utils** (`@/lib/utils.ts`):
- `cn(...classes)` - Merge Tailwind classes (clsx + tailwind-merge)
- `isMac()`, `isDesktop()`, `isMobile()`, `isTouchDevice()`, `isIOS()`, `shouldUseMobileUI()`

**User Utils** (`@/lib/userUtils.ts`):
- `getCurrentUserId()` - Get current user ID for SWR cache keys
- `clearUserCache()` - Full logout cache clear (with reload)
- `clearSWRCache()` - Soft cache clear (no reload, for login flow)

**Batch Fetching** (`@/lib/utils/batchFetching.ts`):
- `fetchAttendanceLogsInBatches(supabaseClient, meetingIds)` - Fetch attendance logs in batches of 10 to avoid database query limits
- **CRITICAL**: Use this for large datasets (e.g., reports, attendance with many meetings) to prevent data loss from query limits

---

## ⚠️ Important Business Rules

**Before implementing features related to Students, Attendance, Transfers, or Meetings, YOU MUST READ [`docs/claude/business-rules.md`](docs/claude/business-rules.md)**

This document contains critical business logic including:
- Attendance System rules and special permissions
- Student Lifecycle Management (Archive vs Soft Delete - CRITICAL difference)
- Approval-Based Transfer Workflow (auto-approval rules, status flow)
- Meeting Types & Class Eligibility (ASAD, Sambung Desa restrictions)
- Multi-class Support
- Filtering & Reporting Conventions (Class Filter Logic)

---

## 🔒 Security & Cache Management

- All sensitive operations must be in server actions with permission checks
- Use RLS at database level for defense in depth
- Admin client (`createAdminClient()`) only for cross-organizational admin operations
- Validate user permissions before any data modification
- Use `revalidatePath()` after mutations in server actions
- Call `mutate()` on SWR hooks after client-side updates
- Both logout AND login use `clearUserCache()` to remove all persistent state and reload the page
- For targeted cache invalidation (e.g., after saving settings), use `mutate(specificKey)` from SWR

---

## 🗄️ Database Operations & Migrations

**For bulk user creation, complex migrations, and database operations, READ [`docs/claude/database-operations.md`](docs/claude/database-operations.md)**

### 🚨 CRITICAL: Creating Supabase Auth Users

**NEVER manually INSERT into `auth.users` without ALL required fields.**

Common mistakes that cause "Database error querying schema":
- ❌ Missing `auth.identities` record (CRITICAL!)
- ❌ Empty `raw_user_meta_data` (no display name in UI)
- ❌ Using `NULL` instead of `''` for token fields
- ❌ Inconsistent email domains (check existing convention)

**Required when creating users via SQL**:
1. ✅ Insert into `auth.users` with ALL fields (see database-operations.md for template)
2. ✅ Insert into `auth.identities` with provider info
3. ✅ Insert into `profiles` with role and organization
4. ✅ Use `''` (empty string) for tokens, NOT `NULL`
5. ✅ Populate `raw_user_meta_data` with `{name, username, full_name}`

**Debugging checklist**:
```sql
-- Check if identities exists
SELECT u.email, i.id IS NOT NULL as has_identity
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email = 'problematic@email.com';

-- Check if display name is populated
SELECT email, raw_user_meta_data->>'name' as display_name
FROM auth.users WHERE email = 'problematic@email.com';
```

---

## 🌍 Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional:
```
NEXT_PUBLIC_USE_DUMMY_DATA=false
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
```

---

## 🗂️ Path Aliases

TypeScript path alias configured: `@/*` maps to `src/*`

Always use `@/` imports for consistency:
```typescript
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/userUtils'
```

---

## 🛠️ Key Technologies

- **Next.js 15** with App Router (React Server Components)
- **React 19** with TypeScript 5
- **Tailwind CSS 4** with PostCSS
- **Supabase** (PostgreSQL + Auth + RLS)
- **SWR** for data fetching with persistent cache
- **Zustand** for client state management (persisted to localStorage)
- **Vitest** for unit testing
- **Ant Design (antd)** for some UI components
- **Recharts** for data visualization
- **@react-pdf/renderer** for PDF generation (report cards)
- **PWA** support with manifest and service workers
- **TipTap** for rich text editing (educational materials)
- **dnd-kit** for drag-and-drop interfaces
- **Sonner** for toast notifications
- **Flatpickr** for date/time pickers

---

## 📖 Additional Documentation

- **Testing Guidelines**: [`docs/claude/testing-guidelines.md`](docs/claude/testing-guidelines.md) - Complete testing setup, examples, TDD workflow
- **Business Rules**: [`docs/claude/business-rules.md`](docs/claude/business-rules.md) - Critical domain logic for Students, Attendance, Transfers, Meetings
