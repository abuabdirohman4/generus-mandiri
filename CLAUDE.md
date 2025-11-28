# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Generus Mandiri** is a Next.js 15 school management system for managing students, teachers, classes, attendance, and reports with role-based access control. It uses Supabase for PostgreSQL database, authentication, and Row Level Security (RLS).

## Development Commands

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
```

## Architecture Overview

### App Router Structure

The app uses Next.js 15 App Router with two main layout groups:

1. **`(full-width-pages)`** - Unauthenticated pages (signin, signup, errors)
2. **`(admin)`** - Authenticated pages (home, dashboard, absensi, laporan, users, kelas, organisasi)

Protected routes are under `src/app/(admin)/`. Each feature has its own directory with co-located:
- `page.tsx` - Route component
- `actions.ts` - Server actions for mutations
- `hooks/` - SWR data fetching hooks
- `stores/` - Zustand state management
- `components/` - Feature-specific components

### Database & Supabase

**Database**: `warlob-app` on Supabase

**Key Tables**:
- `profiles` - User accounts with role-based access (superadmin, admin, teacher, student)
- `students` - Student records
- `classes` - Class definitions
- `meetings` - Class meetings/sessions with support for multiple classes (`class_ids` array)
- `attendance_logs` - Daily attendance (H/I/S/A status) with composite key (student_id, date)
- `student_classes` - Junction table for student-class many-to-many
- `teacher_classes` - Junction table for teacher-class many-to-many
- `daerah`, `desa`, `kelompok` - Organizational hierarchy (Region > Village > Group)

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
// In hook (src/app/(admin)/absensi/hooks/useMeetingFormSettings.ts)
export function useMeetingFormSettings(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? meetingFormSettingsKeys.settings(userId) : null,
    async () => {
      const result = await getMeetingFormSettings(userId)
      return result.success && result.data ? result.data : DEFAULT_SETTINGS
    },
    {
      revalidateOnFocus: false, // Settings rarely change
      dedupingInterval: 5 * 60 * 1000, // 5 minutes cache
      fallbackData: DEFAULT_SETTINGS, // Show immediately
    }
  )
  return { settings: data || DEFAULT_SETTINGS, isLoading, error, mutate }
}

// In page (prefetch for optimal modal performance)
export default function AbsensiPage() {
  const { profile } = useUserProfile()
  useMeetingFormSettings(profile?.id) // Prefetch before modal opens
  // ...
}

// After mutation, invalidate cache
await mutate(meetingFormSettingsKeys.settings(userId))
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

**Mobile UI Patterns**:
- **Floating Action Buttons**: For primary actions on pages with long scrollable content
  - Use `fixed sm:static bottom-20 sm:bottom-0 left-4 right-4 z-50 shadow-lg sm:shadow-none`
  - `bottom-20` accommodates bottom navigation (64-72px height)
  - Desktop reverts to static positioning
  - Example: Save button in meeting attendance detail page (`src/app/(admin)/absensi/[meetingId]/page.tsx`)

### Special Utilities

**Class Helpers** (`@/lib/utils/classHelpers.ts`):
- `isCaberawitClass(classData)` - Check if PAUD/Caberawit class (via category code/name)
- `isTeacherClass(classData)` - Check if teacher training class (via class name contains 'pengajar')
- `isSambungDesaEligible(classData)` - Check if class is eligible for Sambung Desa meetings (excludes Pengajar and Caberawit classes)
- **Usage**: These helpers are used in `meetingTypes.ts` to determine which meeting types are available to teachers based on their class assignments

**Common Utils** (`@/lib/utils.ts`):
- `cn(...classes)` - Merge Tailwind classes (clsx + tailwind-merge)
- `isMac()`, `isDesktop()`, `isMobile()`, `isTouchDevice()`, `isIOS()`, `shouldUseMobileUI()`

**User Utils** (`@/lib/userUtils.ts`):
- `getCurrentUserId()` - Get current user ID for SWR cache keys
- `clearUserCache()` - Full logout cache clear (with reload)
- `clearSWRCache()` - Soft cache clear (no reload, for login flow)

**Batch Fetching** (`@/lib/utils/batchFetching.ts`):
- `fetchAttendanceLogsInBatches(supabaseClient, meetingIds)` - Fetch attendance logs in batches of 50 to avoid database query limits
- **CRITICAL**: Use this for large datasets (e.g., reports, attendance with many meetings) to prevent data loss from query limits
- Already implemented in:
  - `src/app/(admin)/absensi/actions.ts` - For attendance page
  - `src/app/(admin)/laporan/actions.ts` - For reports page
- Pattern:
  ```typescript
  // 1. Fetch meetings first to get meeting IDs
  const { data: meetings } = await supabase.from('meetings').select('id, date')
  const meetingIds = meetings.map(m => m.id)

  // 2. Use batch fetching for attendance logs
  const { data: attendanceLogs, error } = await fetchAttendanceLogsInBatches(
    adminClient,
    meetingIds
  )

  // 3. Enrich with additional data (students, dates, etc.)
  // ... map and join data
  ```

## Important Conventions

### Attendance System
- Status codes: H (Hadir/Present), I (Izin/Excused), S (Sakit/Sick), A (Alpha/Absent)
- Composite key: (student_id, date) for upsert operations
- Auto-save with debouncing
- Meetings can span multiple classes via `class_ids` array
- **Special Permission Rule**: Teachers who teach PAUD/Kelas 1-6 (Caberawit) can edit attendance for Pengajar (teacher training) class meetings
  - Implemented in `src/app/(admin)/absensi/[meetingId]/page.tsx` (lines 240-243)
  - Uses `isPengajarMeeting && teacherCaberawit` check
  - Requires `class_master_mappings` to be loaded in user profile for `isCaberawitClass()` detection

### Meeting Types & Class Eligibility

**Available Meeting Types**:
- `ASAD` - ASAD meetings (available to all except PAUD and Pengajar classes)
- `PEMBINAAN` - Regular class meetings
- `SAMBUNG_KELOMPOK` - Group-level meetings
- `SAMBUNG_DESA` - Village-level meetings
- `SAMBUNG_DAERAH` - Regional-level meetings
- `SAMBUNG_PUSAT` - Central-level meetings

**Meeting Type Access Rules** (`src/lib/constants/meetingTypes.ts`):
- **Superadmin**: All meeting types
- **Admin Daerah**: All meeting types including ASAD
- **Admin Desa**: SAMBUNG_DESA only (no ASAD, no PEMBINAAN)
- **Admin Kelompok**: ASAD, PEMBINAAN, SAMBUNG_KELOMPOK, SAMBUNG_PUSAT
- **Teachers**: Dynamic based on class assignments
  - **PAUD-only teachers**: PEMBINAAN only
  - **Pengajar-only teachers**: PEMBINAAN only
  - **Other teachers**: PEMBINAAN + ASAD (if not PAUD/Pengajar)
  - **Sambung-capable teachers**: PEMBINAAN + SAMBUNG types (if class has `is_sambung_capable`)
  - **Exclude-pembinaan teachers**: SAMBUNG types only (if class has `exclude_pembinaan`)

**ASAD Meeting Type Restrictions**:
- **Purpose**: General attendance tracking for ASAD activities
- **Excluded Classes**:
  - PAUD classes (category code/name = 'PAUD')
  - Pengajar classes (class name contains 'pengajar')
- **Implementation**: Uses `isTeacherClass()` helper and category code checks
- **Teacher Eligibility**: Teachers must have at least one non-PAUD, non-Pengajar class to create ASAD meetings

**Sambung Desa Meeting Restrictions**:
- Use master classes (Pra Nikah, Remaja, Orang Tua) to select target classes
- **CRITICAL**: Must exclude Pengajar and Caberawit (PAUD/Kelas 1-6) classes
- Use `isSambungDesaEligible(classData)` helper when converting master classes to actual classes
- Example in `CreateMeetingModal.tsx`:
  ```typescript
  const getActualClassIdsFromMasterClasses = (masterClassIds, kelompokIds, allClasses) => {
    return allClasses
      .filter(cls => {
        // Must be in selected kelompok
        if (!kelompokIds.includes(cls.kelompok_id)) return false

        // Must have selected master class
        const hasMasterClass = cls.class_master_mappings.some(m =>
          masterClassIds.includes(m.class_master?.id)
        )
        if (!hasMasterClass) return false

        // CRITICAL: Exclude Pengajar and Caberawit
        return isSambungDesaEligible(cls)
      })
      .map(cls => cls.id)
  }
  ```

**Meeting Visibility**:
- Teachers only see meetings where they teach at least one of the meeting's classes
- **Class Master Mappings**: Junction table `class_master_mappings` links actual classes to master classes

### Multi-class Support
- Teachers can be assigned to multiple classes via `teacher_classes` junction table
- Students can be in multiple classes via `student_classes` junction table
- Profile loads all assigned classes for teachers with complete data:
  - `kelompok_id` and `kelompok` for organizational filtering
  - `class_master_mappings` with full hierarchy (class_master → category) for class type detection
- This enables `isCaberawitClass()` to work correctly on user profile classes

### Filtering & Reporting Conventions

**CRITICAL: Class Filter Logic**
- When filtering attendance/reports by class, **ALWAYS filter by meeting's class**, NOT student's enrolled class
- ❌ **WRONG**: Check if student is enrolled in selected class (`log.students.class_id`)
- ✅ **CORRECT**: Check if meeting was for selected class (`meeting.class_id` or `meeting.class_ids`)
- **Why**: Students can be enrolled in multiple classes. Filtering by student enrollment shows attendance from ALL meetings across ALL their classes, not just the selected class.
- **Example Bug**: Selecting "Pra Nikah" + "Pembinaan" showed student "Reta" whose "Pembinaan" meeting was actually for "Pengajar" class, not "Pra Nikah"
- **Correct Implementation** (see `src/app/(admin)/laporan/actions.ts:448-467`):
  ```typescript
  // Apply class filter - check MEETING's class, not student's class
  if (filters.classId) {
    const classIds = filters.classId.split(',')
    filteredLogs = filteredLogs.filter((log: any) => {
      const meeting = meetingMap.get(log.meeting_id)
      if (!meeting) return false

      // Check if meeting is for the selected class
      if (classIds.includes(meeting.class_id)) return true

      // Check class_ids array for multi-class meetings
      if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
        return meeting.class_ids.some((id: string) => classIds.includes(id))
      }

      return false
    })
  }
  ```

**Meeting Type Filter for Reporting**
- Reports page shows meeting types based on user role:
  - **Admins**: See ALL meeting types for filtering (to view all data)
  - **Teachers**: See only their available meeting types (types they can create)
- Uses `forceShowAllMeetingTypes={isAdmin(userProfile)}` prop on DataFilter component
- **Why**: Separates concerns of "what can I create" vs "what can I filter by"
  - Meeting creation pages: Use role-restricted types (teacher can only create certain types)
  - Reporting/filtering pages: 
    - Admins can filter by any type to view all organizational data
    - Teachers can only filter by types they're allowed to create
- **Implementation**: `src/components/shared/DataFilter.tsx` + `src/app/(admin)/laporan/components/FilterSection.tsx`

### Cache Management
- Use `revalidatePath()` after mutations in server actions
- Call `mutate()` on SWR hooks after client-side updates
- Both logout AND login use `clearUserCache()` to remove all persistent state and reload the page
  - This ensures clean slate and prevents stale cache issues (e.g., wrong percentages, old account data)
  - `clearSWRCache()` is only used for token refresh (no page reload needed)
- For targeted cache invalidation (e.g., after saving settings), use `mutate(specificKey)` from SWR
  - Example: `mutate(meetingFormSettingsKeys.settings(userId))` after updating user's meeting form settings

### Security
- All sensitive operations must be in server actions with permission checks
- Use RLS at database level for defense in depth
- Admin client (`createAdminClient()`) only for cross-organizational admin operations
- Validate user permissions before any data modification

## Environment Variables

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

## Path Aliases

TypeScript path alias configured: `@/*` maps to `src/*`

Always use `@/` imports for consistency:
```typescript
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/userUtils'
```
