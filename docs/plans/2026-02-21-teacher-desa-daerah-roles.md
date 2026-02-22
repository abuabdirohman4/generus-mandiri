# Teacher Desa/Daerah Roles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Teacher roles at Desa and Daerah organizational levels with scope-based access control and configurable permissions.

**Architecture:** Helper function-based approach (consistent with existing Admin pattern). Teachers can have three levels: Kelompok (existing), Desa (new), or Daerah (new), determined by which organizational IDs are filled in the profiles table. RLS policies and server-side filtering ensure data access respects teacher scope.

**Tech Stack:** TypeScript, Next.js 15, Supabase (PostgreSQL + RLS), Vitest, React

---

## Task 1: Add Teacher Level Detection Helper Functions

**Files:**
- Test: `src/lib/__tests__/teacherAccessControl.test.ts` (create)
- Modify: `src/lib/accessControl.ts:32-44` (after `isTeacher()` function)

**Step 1: Write failing tests for teacher level detection**

Create test file:

```typescript
import { describe, it, expect } from 'vitest'
import {
  isTeacherKelompok,
  isTeacherDesa,
  isTeacherDaerah,
  getTeacherScope,
  type UserProfile
} from '@/lib/accessControl'

describe('Teacher Level Detection', () => {
  const teacherKelompok: UserProfile = {
    id: '1',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: 'k1',
    full_name: 'Teacher Kelompok',
    email: 'teacher.kelompok@test.com'
  }

  const teacherDesa: UserProfile = {
    id: '2',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: null,
    full_name: 'Teacher Desa',
    email: 'teacher.desa@test.com'
  }

  const teacherDaerah: UserProfile = {
    id: '3',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: null,
    kelompok_id: null,
    full_name: 'Teacher Daerah',
    email: 'teacher.daerah@test.com'
  }

  describe('isTeacherKelompok', () => {
    it('should return true for teacher with kelompok_id', () => {
      expect(isTeacherKelompok(teacherKelompok)).toBe(true)
    })

    it('should return false for teacher desa', () => {
      expect(isTeacherKelompok(teacherDesa)).toBe(false)
    })

    it('should return false for teacher daerah', () => {
      expect(isTeacherKelompok(teacherDaerah)).toBe(false)
    })

    it('should return false for non-teacher', () => {
      expect(isTeacherKelompok({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(false)
    })
  })

  describe('isTeacherDesa', () => {
    it('should return true for teacher with desa_id but no kelompok_id', () => {
      expect(isTeacherDesa(teacherDesa)).toBe(true)
    })

    it('should return false for teacher kelompok', () => {
      expect(isTeacherDesa(teacherKelompok)).toBe(false)
    })

    it('should return false for teacher daerah', () => {
      expect(isTeacherDesa(teacherDaerah)).toBe(false)
    })

    it('should return false for non-teacher', () => {
      expect(isTeacherDesa({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(false)
    })
  })

  describe('isTeacherDaerah', () => {
    it('should return true for teacher with only daerah_id', () => {
      expect(isTeacherDaerah(teacherDaerah)).toBe(true)
    })

    it('should return false for teacher desa', () => {
      expect(isTeacherDaerah(teacherDesa)).toBe(false)
    })

    it('should return false for teacher kelompok', () => {
      expect(isTeacherDaerah(teacherKelompok)).toBe(false)
    })

    it('should return false for non-teacher', () => {
      expect(isTeacherDaerah({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(false)
    })
  })

  describe('getTeacherScope', () => {
    it('should return "kelompok" for teacher kelompok', () => {
      expect(getTeacherScope(teacherKelompok)).toBe('kelompok')
    })

    it('should return "desa" for teacher desa', () => {
      expect(getTeacherScope(teacherDesa)).toBe('desa')
    })

    it('should return "daerah" for teacher daerah', () => {
      expect(getTeacherScope(teacherDaerah)).toBe('daerah')
    })

    it('should return null for non-teacher', () => {
      expect(getTeacherScope({ id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' })).toBe(null)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test teacherAccessControl`

Expected: FAIL with "isTeacherKelompok is not exported" or similar

**Step 3: Implement helper functions in accessControl.ts**

Add after line 31 (after `isTeacher()` function):

```typescript
// Teacher level detection utilities
export function isTeacherKelompok(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.kelompok_id
}

export function isTeacherDesa(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.desa_id && !profile.kelompok_id
}

export function isTeacherDaerah(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.daerah_id && !profile.desa_id && !profile.kelompok_id
}

// Get teacher scope for filtering
export function getTeacherScope(profile: UserProfile): 'kelompok' | 'desa' | 'daerah' | null {
  if (!isTeacher(profile)) return null
  if (isTeacherKelompok(profile)) return 'kelompok'
  if (isTeacherDesa(profile)) return 'desa'
  if (isTeacherDaerah(profile)) return 'daerah'
  return null
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test teacherAccessControl`

Expected: PASS (all tests green)

**Step 5: Commit**

```bash
git add src/lib/__tests__/teacherAccessControl.test.ts src/lib/accessControl.ts
git commit -m "test: add teacher level detection helper functions with tests

Add isTeacherKelompok, isTeacherDesa, isTeacherDaerah, and getTeacherScope
helper functions with comprehensive unit tests.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Teacher Access Control Function

**Files:**
- Test: `src/lib/__tests__/teacherAccessControl.test.ts` (modify)
- Modify: `src/lib/accessControl.ts` (add after getTeacherScope)

**Step 1: Write failing test for canTeacherAccessStudent**

Add to `teacherAccessControl.test.ts` after getTeacherScope tests:

```typescript
describe('canTeacherAccessStudent', () => {
  const teacherKelompok: UserProfile = {
    id: '1',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: 'k1',
    full_name: 'Teacher Kelompok',
    email: 'teacher.k@test.com'
  }

  const teacherDesa: UserProfile = {
    id: '2',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: null,
    full_name: 'Teacher Desa',
    email: 'teacher.ds@test.com'
  }

  const teacherDaerah: UserProfile = {
    id: '3',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: null,
    kelompok_id: null,
    full_name: 'Teacher Daerah',
    email: 'teacher.d@test.com'
  }

  const student = {
    id: 's1',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: 'k1'
  }

  it('should allow teacher kelompok to access student in their kelompok', () => {
    expect(canTeacherAccessStudent(teacherKelompok, student)).toBe(true)
  })

  it('should deny teacher kelompok access to student in different kelompok', () => {
    const otherStudent = { ...student, kelompok_id: 'k2' }
    expect(canTeacherAccessStudent(teacherKelompok, otherStudent)).toBe(false)
  })

  it('should allow teacher desa to access all students in their desa', () => {
    expect(canTeacherAccessStudent(teacherDesa, student)).toBe(true)
    const studentK2 = { ...student, kelompok_id: 'k2' }
    expect(canTeacherAccessStudent(teacherDesa, studentK2)).toBe(true)
  })

  it('should deny teacher desa access to student in different desa', () => {
    const otherStudent = { ...student, desa_id: 'ds2' }
    expect(canTeacherAccessStudent(teacherDesa, otherStudent)).toBe(false)
  })

  it('should allow teacher daerah to access all students in their daerah', () => {
    expect(canTeacherAccessStudent(teacherDaerah, student)).toBe(true)
    const studentDs2 = { ...student, desa_id: 'ds2' }
    expect(canTeacherAccessStudent(teacherDaerah, studentDs2)).toBe(true)
  })

  it('should deny teacher daerah access to student in different daerah', () => {
    const otherStudent = { ...student, daerah_id: 'd2' }
    expect(canTeacherAccessStudent(teacherDaerah, otherStudent)).toBe(false)
  })

  it('should deny non-teacher access', () => {
    const admin = { id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' }
    expect(canTeacherAccessStudent(admin, student)).toBe(false)
  })
})
```

**Step 2: Import function in test file**

Add to imports at top of test file:

```typescript
import {
  isTeacherKelompok,
  isTeacherDesa,
  isTeacherDaerah,
  getTeacherScope,
  canTeacherAccessStudent, // ADD THIS
  type UserProfile
} from '@/lib/accessControl'
```

**Step 3: Run test to verify it fails**

Run: `npm run test teacherAccessControl`

Expected: FAIL with "canTeacherAccessStudent is not exported"

**Step 4: Implement canTeacherAccessStudent**

Add to `src/lib/accessControl.ts` after getTeacherScope:

```typescript
// Check if teacher can access a student based on their scope
export function canTeacherAccessStudent(
  profile: UserProfile,
  student: { daerah_id?: string | null; desa_id?: string | null; kelompok_id?: string | null }
): boolean {
  if (!isTeacher(profile)) return false

  if (isTeacherDaerah(profile)) {
    return student.daerah_id === profile.daerah_id
  }
  if (isTeacherDesa(profile)) {
    return student.desa_id === profile.desa_id
  }
  if (isTeacherKelompok(profile)) {
    return student.kelompok_id === profile.kelompok_id
  }

  return false
}
```

**Step 5: Run tests to verify they pass**

Run: `npm run test teacherAccessControl`

Expected: PASS (all tests green)

**Step 6: Commit**

```bash
git add src/lib/__tests__/teacherAccessControl.test.ts src/lib/accessControl.ts
git commit -m "feat: add canTeacherAccessStudent function with scope checking

Add function to check if teacher can access student based on their
organizational scope (kelompok/desa/daerah).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Re-export Functions from userUtils

**Files:**
- Modify: `src/lib/userUtils.ts:21-38`

**Step 1: Add exports to userUtils.ts**

Update the re-export section (around line 21-38):

```typescript
// Re-export from accessControl.ts for backward compatibility
export {
  isSuperAdmin,
  isAdminDaerah,
  isAdminDesa,
  isAdminKelompok,
  isTeacher,
  isAdmin,
  isMaterialCoordinator,
  canManageMaterials,
  shouldShowDaerahFilter,
  shouldShowDesaFilter,
  shouldShowKelompokFilter,
  shouldShowKelasFilter,
  getRequiredOrgFields,
  getAutoFilledOrgValues,
  canAccessFeature,
  getDataFilter,
  // ADD THESE NEW EXPORTS:
  isTeacherKelompok,
  isTeacherDesa,
  isTeacherDaerah,
  getTeacherScope,
  canTeacherAccessStudent,
  type UserProfile
} from './accessControl'
```

**Step 2: Verify no errors**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/userUtils.ts
git commit -m "refactor: re-export teacher helper functions from userUtils

Export isTeacherKelompok, isTeacherDesa, isTeacherDaerah,
getTeacherScope, and canTeacherAccessStudent for use throughout app.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update getDataFilter for Teacher Scope

**Files:**
- Modify: `src/lib/accessControlServer.ts:30-50` (in getDataFilter function)

**Step 1: Update getDataFilter function**

Find the `getDataFilter()` function (around line 30-50) and update it:

```typescript
export function getDataFilter(profile: UserProfile | null): {
  daerah_id?: string
  desa_id?: string
  kelompok_id?: string
} | null {
  if (!profile) return null

  // Superadmin has access to all data
  if (profile.role === 'superadmin') {
    return null
  }

  // Admin filtering (existing logic)
  if (profile.role === 'admin') {
    // Admin Kelompok
    if (profile.kelompok_id) {
      return { kelompok_id: profile.kelompok_id }
    }
    // Admin Desa
    if (profile.desa_id) {
      return { desa_id: profile.desa_id }
    }
    // Admin Daerah
    if (profile.daerah_id) {
      return { daerah_id: profile.daerah_id }
    }
  }

  // NEW: Teacher filtering
  if (profile.role === 'teacher') {
    // Teacher Kelompok
    if (profile.kelompok_id) {
      return { kelompok_id: profile.kelompok_id }
    }
    // Teacher Desa
    if (profile.desa_id && !profile.kelompok_id) {
      return { desa_id: profile.desa_id }
    }
    // Teacher Daerah
    if (profile.daerah_id && !profile.desa_id && !profile.kelompok_id) {
      return { daerah_id: profile.daerah_id }
    }
  }

  return null
}
```

**Step 2: Verify no type errors**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/accessControlServer.ts
git commit -m "feat: extend getDataFilter to support teacher scope filtering

Add teacher scope filtering logic to getDataFilter. Teachers now get
filtered data based on their organizational level (kelompok/desa/daerah).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update Student Permission Functions

**Files:**
- Test: `src/lib/__tests__/teacherPermissions.test.ts` (create)
- Modify: `src/lib/studentPermissions.ts:100-180` (permission functions)

**Step 1: Write failing tests for teacher permissions**

Create test file:

```typescript
import { describe, it, expect } from 'vitest'
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent,
  type UserProfile,
  type StudentWithOrg
} from '@/lib/studentPermissions'

describe('Teacher Permissions by Scope', () => {
  const teacherDesaWithPerms: UserProfile = {
    id: '1',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: null,
    full_name: 'Teacher Desa',
    permissions: {
      can_archive_students: true,
      can_transfer_students: true,
      can_soft_delete_students: false,
      can_hard_delete_students: false
    }
  }

  const teacherDesaNoPerms: UserProfile = {
    id: '2',
    role: 'teacher',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: null,
    full_name: 'Teacher Desa No Perms',
    permissions: {
      can_archive_students: false,
      can_transfer_students: false,
      can_soft_delete_students: false,
      can_hard_delete_students: false
    }
  }

  const studentInDesa: StudentWithOrg = {
    id: 's1',
    daerah_id: 'd1',
    desa_id: 'ds1',
    kelompok_id: 'k1',
    full_name: 'Student 1',
    gender: 'L',
    status: 'active'
  }

  const studentOutsideDesa: StudentWithOrg = {
    id: 's2',
    daerah_id: 'd1',
    desa_id: 'ds2',
    kelompok_id: 'k2',
    full_name: 'Student 2',
    gender: 'L',
    status: 'active'
  }

  describe('canArchiveStudent', () => {
    it('should allow teacher desa with permission to archive student in their desa', () => {
      expect(canArchiveStudent(teacherDesaWithPerms, studentInDesa)).toBe(true)
    })

    it('should deny teacher desa from archiving student outside their desa', () => {
      expect(canArchiveStudent(teacherDesaWithPerms, studentOutsideDesa)).toBe(false)
    })

    it('should deny teacher without permission', () => {
      expect(canArchiveStudent(teacherDesaNoPerms, studentInDesa)).toBe(false)
    })
  })

  describe('canTransferStudent', () => {
    it('should allow teacher desa with permission to transfer student in their desa', () => {
      expect(canTransferStudent(teacherDesaWithPerms, studentInDesa)).toBe(true)
    })

    it('should deny teacher desa from transferring student outside their desa', () => {
      expect(canTransferStudent(teacherDesaWithPerms, studentOutsideDesa)).toBe(false)
    })

    it('should deny teacher without permission', () => {
      expect(canTransferStudent(teacherDesaNoPerms, studentInDesa)).toBe(false)
    })
  })

  describe('canSoftDeleteStudent', () => {
    it('should deny teacher desa without permission', () => {
      expect(canSoftDeleteStudent(teacherDesaWithPerms, studentInDesa)).toBe(false)
    })
  })

  describe('canHardDeleteStudent', () => {
    it('should deny teacher desa without permission', () => {
      expect(canHardDeleteStudent(teacherDesaWithPerms, studentInDesa)).toBe(false)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test teacherPermissions`

Expected: FAIL (tests fail because permission functions don't check teacher scope yet)

**Step 3: Update canArchiveStudent function**

In `src/lib/studentPermissions.ts`, find `canArchiveStudent` (around line 100) and update:

```typescript
export function canArchiveStudent(profile: UserProfile, student: StudentWithOrg): boolean {
  // Check if user has the permission
  if (!profile.permissions?.can_archive_students) return false

  // Admin checks
  if (profile.role === 'admin' || profile.role === 'superadmin') {
    return canAccessStudent(profile, student)
  }

  // NEW: Teacher scope check
  if (profile.role === 'teacher') {
    return canTeacherAccessStudent(profile, student)
  }

  return false
}
```

**Step 4: Update canTransferStudent function**

Find `canTransferStudent` and update similarly:

```typescript
export function canTransferStudent(profile: UserProfile, student: StudentWithOrg): boolean {
  if (!profile.permissions?.can_transfer_students) return false

  if (profile.role === 'admin' || profile.role === 'superadmin') {
    return canAccessStudent(profile, student)
  }

  // NEW: Teacher scope check
  if (profile.role === 'teacher') {
    return canTeacherAccessStudent(profile, student)
  }

  return false
}
```

**Step 5: Update canSoftDeleteStudent function**

Find `canSoftDeleteStudent` and update:

```typescript
export function canSoftDeleteStudent(profile: UserProfile, student: StudentWithOrg): boolean {
  if (!profile.permissions?.can_soft_delete_students) return false

  if (profile.role === 'admin' || profile.role === 'superadmin') {
    return canAccessStudent(profile, student)
  }

  // NEW: Teacher scope check
  if (profile.role === 'teacher') {
    return canTeacherAccessStudent(profile, student)
  }

  return false
}
```

**Step 6: Update canHardDeleteStudent function**

Find `canHardDeleteStudent` and update:

```typescript
export function canHardDeleteStudent(profile: UserProfile, student: StudentWithOrg): boolean {
  if (!profile.permissions?.can_hard_delete_students) return false

  if (profile.role === 'admin' || profile.role === 'superadmin') {
    return canAccessStudent(profile, student)
  }

  // NEW: Teacher scope check
  if (profile.role === 'teacher') {
    return canTeacherAccessStudent(profile, student)
  }

  return false
}
```

**Step 7: Add import for canTeacherAccessStudent**

At the top of `studentPermissions.ts`, update imports:

```typescript
import {
  isAdminKelompok,
  isAdminDesa,
  isAdminDaerah,
  isSuperAdmin,
  canTeacherAccessStudent, // ADD THIS
  type UserProfile
} from './accessControl'
```

**Step 8: Run tests to verify they pass**

Run: `npm run test teacherPermissions`

Expected: PASS (all tests green)

**Step 9: Commit**

```bash
git add src/lib/__tests__/teacherPermissions.test.ts src/lib/studentPermissions.ts
git commit -m "feat: update student permissions to respect teacher scope

Update canArchiveStudent, canTransferStudent, canSoftDeleteStudent, and
canHardDeleteStudent to check teacher scope using canTeacherAccessStudent.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Database Migration - Allow Teacher Desa/Daerah

**Files:**
- Create: Database migration (via MCP)

**Step 1: Check MCP connection**

Use `mcp__generus-mandiri-v2__list_tables` to verify MCP is connected.

If connection fails, inform user to enable MCP in settings.

**Step 2: Create migration to make kelompok_id nullable**

Use MCP `apply_migration` with name `allow_teacher_desa_daerah`:

```sql
-- Make kelompok_id nullable for teachers
ALTER TABLE profiles
  ALTER COLUMN kelompok_id DROP NOT NULL;

-- Add check constraint for valid organizational hierarchy
ALTER TABLE profiles
  ADD CONSTRAINT profiles_teacher_org_hierarchy_check
  CHECK (
    role != 'teacher' OR (
      -- Teacher must have at least daerah_id
      daerah_id IS NOT NULL AND (
        -- Valid combinations:
        -- 1. Teacher Daerah: daerah_id only
        (desa_id IS NULL AND kelompok_id IS NULL) OR
        -- 2. Teacher Desa: daerah_id + desa_id
        (desa_id IS NOT NULL AND kelompok_id IS NULL) OR
        -- 3. Teacher Kelompok: daerah_id + desa_id + kelompok_id
        (desa_id IS NOT NULL AND kelompok_id IS NOT NULL)
      )
    )
  );

COMMENT ON CONSTRAINT profiles_teacher_org_hierarchy_check ON profiles IS
  'Ensures teachers have valid organizational hierarchy: Daerah only, Desa (with Daerah), or Kelompok (with Desa and Daerah)';
```

**Step 3: Verify migration was applied**

Use `mcp__generus-mandiri-v2__list_migrations` to check migration is in list.

**Step 4: Test constraint with dummy data (optional)**

Use `execute_sql` to test:

```sql
-- This should succeed (Teacher Desa)
INSERT INTO profiles (id, role, daerah_id, desa_id, kelompok_id, full_name, email, username)
VALUES ('test-teacher-desa', 'teacher', 'd1', 'ds1', NULL, 'Test Teacher Desa', 'test@test.com', 'testteacher');

-- Clean up
DELETE FROM profiles WHERE id = 'test-teacher-desa';
```

**Step 5: Commit (code tracking only)**

```bash
git commit --allow-empty -m "migration: allow Teacher Desa/Daerah by making kelompok_id nullable

Add database constraint to enforce valid teacher organizational hierarchy.
Migration applied via MCP: allow_teacher_desa_daerah

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Database Migration - Update RLS Policies

**Files:**
- Create: Database migration (via MCP)

**Step 1: Create migration for RLS policies**

Use MCP `apply_migration` with name `update_rls_for_teacher_levels`:

```sql
-- 1. Students table: Teachers can view students in their scope
DROP POLICY IF EXISTS "Teachers can view students in their scope" ON students;
CREATE POLICY "Teachers can view students in their scope" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'teacher' AND (
        -- Teacher Daerah: all students in daerah
        (kelompok_id IS NULL AND desa_id IS NULL AND daerah_id = students.daerah_id) OR
        -- Teacher Desa: all students in desa
        (kelompok_id IS NULL AND desa_id = students.desa_id) OR
        -- Teacher Kelompok: students in kelompok
        (kelompok_id = students.kelompok_id)
      )
    )
  );

-- 2. Attendance logs: Teachers can manage attendance in their scope
DROP POLICY IF EXISTS "Teachers can manage attendance in their scope" ON attendance_logs;
CREATE POLICY "Teachers can manage attendance in their scope" ON attendance_logs
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      INNER JOIN students s ON (
        (p.kelompok_id IS NULL AND p.desa_id IS NULL AND p.daerah_id = s.daerah_id) OR
        (p.kelompok_id IS NULL AND p.desa_id = s.desa_id) OR
        (p.kelompok_id = s.kelompok_id)
      )
      WHERE p.role = 'teacher' AND s.id = attendance_logs.student_id
    )
  );

-- 3. Classes: Teachers can view classes in their scope
DROP POLICY IF EXISTS "Teachers can view classes in their scope" ON classes;
CREATE POLICY "Teachers can view classes in their scope" ON classes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      INNER JOIN kelompok k ON (
        -- Teacher Daerah: all classes in daerah
        (p.kelompok_id IS NULL AND p.desa_id IS NULL AND k.desa_id IN (
          SELECT id FROM desa WHERE daerah_id = p.daerah_id
        )) OR
        -- Teacher Desa: all classes in desa
        (p.kelompok_id IS NULL AND p.desa_id = k.desa_id) OR
        -- Teacher Kelompok: classes in kelompok
        (p.kelompok_id = k.id)
      )
      WHERE p.role = 'teacher' AND k.id = classes.kelompok_id
    )
  );

-- 4. Meetings: Teachers can view meetings in their scope
DROP POLICY IF EXISTS "Teachers can view meetings in their scope" ON meetings;
CREATE POLICY "Teachers can view meetings in their scope" ON meetings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      WHERE p.role = 'teacher' AND (
        -- Check if any class in meeting's class_ids array is in teacher's scope
        EXISTS (
          SELECT 1 FROM classes c
          INNER JOIN kelompok k ON k.id = c.kelompok_id
          WHERE c.id = ANY(meetings.class_ids) AND (
            (p.kelompok_id IS NULL AND p.desa_id IS NULL AND k.desa_id IN (
              SELECT id FROM desa WHERE daerah_id = p.daerah_id
            )) OR
            (p.kelompok_id IS NULL AND p.desa_id = k.desa_id) OR
            (p.kelompok_id = k.id)
          )
        )
      )
    )
  );
```

**Step 2: Verify migration was applied**

Use `mcp__generus-mandiri-v2__list_migrations` to check.

**Step 3: Commit (code tracking only)**

```bash
git commit --allow-empty -m "migration: update RLS policies for teacher scope filtering

Update RLS policies on students, attendance_logs, classes, and meetings
to support Teacher Desa and Teacher Daerah access patterns.
Migration applied via MCP: update_rls_for_teacher_levels

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update GuruModal - Add Teacher Level Selection

**Files:**
- Modify: `src/app/(admin)/users/guru/components/GuruModal.tsx:65-90`

**Step 1: Add teacher level state**

Find the state declarations (around line 65-90) and add:

```typescript
const [formData, setFormData] = useState({
  username: '',
  full_name: '',
  password: '',
  daerah_id: '',
  kelompok_id: '',
  classIds: [] as string[]
});
// ADD THIS NEW STATE:
const [teacherLevel, setTeacherLevel] = useState<'kelompok' | 'desa' | 'daerah'>('kelompok');
const [dataFilters, setDataFilters] = useState({
  // ... existing filters
});
```

**Step 2: Add radio button UI**

Find the form JSX (around line 467, after the general error display and before username field) and add:

```typescript
{/* General Error Display */}
{generalError && (
  // ... existing error display
)}

{/* ADD THIS SECTION - Teacher Level Selection */}
<div className="mb-4">
  <Label>Level Guru</Label>
  <div className="flex gap-4 mt-2">
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        name="teacherLevel"
        value="kelompok"
        checked={teacherLevel === 'kelompok'}
        onChange={(e) => setTeacherLevel('kelompok')}
        disabled={isLoading}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
      />
      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Guru Kelompok</span>
    </label>
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        name="teacherLevel"
        value="desa"
        checked={teacherLevel === 'desa'}
        onChange={(e) => setTeacherLevel('desa')}
        disabled={isLoading}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
      />
      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Guru Desa</span>
    </label>
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        name="teacherLevel"
        value="daerah"
        checked={teacherLevel === 'daerah'}
        onChange={(e) => setTeacherLevel('daerah')}
        disabled={isLoading}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
      />
      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Guru Daerah</span>
    </label>
  </div>
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {teacherLevel === 'kelompok' && 'Guru yang mengajar di kelompok tertentu'}
    {teacherLevel === 'desa' && 'Guru koordinator yang bisa akses semua data di desa'}
    {teacherLevel === 'daerah' && 'Guru koordinator yang bisa akses semua data di daerah'}
  </p>
</div>

<div>
  <Label htmlFor="username">Username</Label>
  {/* ... existing username field */}
</div>
```

**Step 3: Verify no errors**

Run: `npm run type-check`

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/(admin)/users/guru/components/GuruModal.tsx
git commit -m "feat: add teacher level selection radio buttons to GuruModal

Add UI for selecting teacher level (Kelompok/Desa/Daerah) with
descriptive labels for each level.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update GuruModal - Conditional Field Visibility

**Files:**
- Modify: `src/app/(admin)/users/guru/components/GuruModal.tsx:662-686` (DataFilter section)

**Step 1: Update DataFilter props for conditional visibility**

Find the DataFilter component (around line 662-686) and update:

```typescript
<div className="md:col-span-3">
  <DataFilter
    filters={dataFilters}
    onFilterChange={handleDataFilterChange}
    userProfile={userProfile}
    daerahList={filteredLists.daerahList}
    desaList={filteredLists.desaList}
    kelompokList={filteredLists.kelompokList}
    classList={[]}
    showKelas={false}
    showDaerah={userProfile?.role === 'superadmin'}
    showDesa={userProfile?.role === 'superadmin' || (!userProfile?.desa_id && !!userProfile?.daerah_id)}
    showKelompok={teacherLevel === 'kelompok'} {/* UPDATED - conditional based on level */}
    variant="modal"
    compact={true}
    hideAllOption={true}
    errors={errors}
    requiredFields={{
      daerah: true,
      desa: teacherLevel !== 'daerah', {/* UPDATED - not required for Teacher Daerah */}
      kelompok: teacherLevel === 'kelompok' {/* UPDATED - only required for Teacher Kelompok */}
    }}
    filterLists={filteredLists}
  />
</div>
```

**Step 2: Verify form renders correctly**

Run: `npm run dev`

Navigate to `/users/guru` and click "Tambah Guru"
- Select "Guru Kelompok" → Kelompok field should show
- Select "Guru Desa" → Kelompok field should hide
- Select "Guru Daerah" → Desa and Kelompok fields should hide

**Step 3: Commit**

```bash
git add src/app/(admin)/users/guru/components/GuruModal.tsx
git commit -m "feat: conditional field visibility based on teacher level

Hide Kelompok field for Teacher Desa, hide Desa and Kelompok for
Teacher Daerah. Update required field validation accordingly.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update GuruModal - Form Validation

**Files:**
- Modify: `src/app/(admin)/users/guru/components/GuruModal.tsx:374-408` (validation section)

**Step 1: Update validation logic**

Find the validation section in `handleSubmit` (around line 374-408) and update:

```typescript
// Validate required fields
const newErrors: typeof errors = {};

if (!formData.username.trim()) {
  newErrors.username = 'Username harus diisi';
}
if (!formData.full_name.trim()) {
  newErrors.full_name = 'Nama lengkap harus diisi';
}
if (!formData.password && !guru) {
  newErrors.password = 'Password harus diisi';
}
if (!dataFilters.daerah || dataFilters.daerah.length === 0) {
  newErrors.daerah = 'Daerah harus dipilih';
}

// UPDATED: Conditional validation based on teacher level
if (teacherLevel !== 'daerah' && (!dataFilters.desa || dataFilters.desa.length === 0)) {
  newErrors.desa = 'Desa harus dipilih';
}

if (teacherLevel === 'kelompok' && (!dataFilters.kelompok || dataFilters.kelompok.length === 0)) {
  newErrors.kelompok = 'Kelompok harus dipilih untuk Guru Kelompok';
}

// If errors exist, stop and show them
if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  setIsLoading(false);
  return;
}
```

**Step 2: Update submit data preparation**

Find submitData preparation (around line 410-419) and update:

```typescript
// Prepare submit data
const submitData = {
  username: formData.username,
  full_name: formData.full_name,
  email: generatedEmail,
  password: formData.password || undefined,
  daerah_id: dataFilters.daerah.length > 0 ? dataFilters.daerah[0] : '',
  desa_id: teacherLevel !== 'daerah' && dataFilters.desa.length > 0 ? dataFilters.desa[0] : null, // UPDATED
  kelompok_id: teacherLevel === 'kelompok' && dataFilters.kelompok.length > 0 ? dataFilters.kelompok[0] : null // UPDATED
};
```

**Step 3: Test validation**

Run: `npm run dev`

Test form validation:
1. Select "Guru Daerah", leave Daerah empty → Should show error
2. Select "Guru Desa", leave Desa empty → Should show error
3. Select "Guru Kelompok", leave Kelompok empty → Should show error

**Step 4: Commit**

```bash
git add src/app/(admin)/users/guru/components/GuruModal.tsx
git commit -m "feat: update validation logic for teacher level requirements

Conditionally validate Desa and Kelompok fields based on selected
teacher level. Update submit data to send NULL for unused fields.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Update GuruModal - Permission Checks

**Files:**
- Modify: `src/app/(admin)/users/guru/components/GuruModal.tsx:374-380` (add permission check before validation)

**Step 1: Add permission check in handleSubmit**

Add this check at the start of `handleSubmit`, before validation (around line 374):

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setErrors({});
  setGeneralError('');

  try {
    // ADD THIS PERMISSION CHECK:
    // Prevent admins from creating teachers with wider scope than themselves
    if (userProfile && isAdminKelompok(userProfile)) {
      if (teacherLevel === 'desa' || teacherLevel === 'daerah') {
        setGeneralError('Anda tidak dapat membuat Guru Desa atau Guru Daerah karena level Anda adalah Admin Kelompok');
        setIsLoading(false);
        return;
      }
    }

    if (userProfile && isAdminDesa(userProfile)) {
      if (teacherLevel === 'daerah') {
        setGeneralError('Anda tidak dapat membuat Guru Daerah. Hanya Superadmin atau Admin Daerah yang bisa.');
        setIsLoading(false);
        return;
      }
    }

    // Generate email from username
    const generatedEmail = `${formData.username}@generus.com`;

    // Validate required fields
    // ... existing validation
```

**Step 2: Test permission checks manually**

Cannot easily test without different user roles, but verify code compiles:

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(admin)/users/guru/components/GuruModal.tsx
git commit -m "feat: add permission checks to prevent scope escalation

Prevent Admin Kelompok from creating Teacher Desa/Daerah.
Prevent Admin Desa from creating Teacher Daerah.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Update GuruModal - Initialize Teacher Level from Existing Data

**Files:**
- Modify: `src/app/(admin)/users/guru/components/GuruModal.tsx:165-230` (useEffect for data loading)

**Step 1: Update useEffect to detect teacher level from guru data**

Find the useEffect that loads guru data (around line 165-230) and update:

```typescript
useEffect(() => {
  if (!isOpen) return;

  const loadData = async () => {
    if (guru) {
      // ADD THIS: Detect teacher level from existing data
      let detectedLevel: 'kelompok' | 'desa' | 'daerah' = 'kelompok';
      if (guru.kelompok_id) {
        detectedLevel = 'kelompok';
      } else if (guru.desa_id) {
        detectedLevel = 'desa';
      } else if (guru.daerah_id) {
        detectedLevel = 'daerah';
      }
      setTeacherLevel(detectedLevel); // SET THE DETECTED LEVEL

      // Load teacher's assigned classes
      try {
        const teacherClasses = await getTeacherClasses(guru.id);
        const classIds = teacherClasses.map(tc => tc.class_id);

        setFormData({
          username: guru.username || '',
          full_name: guru.full_name || '',
          password: '',
          daerah_id: guru.daerah_id || '',
          kelompok_id: guru.kelompok_id || '',
          classIds: classIds
        });
      } catch (error) {
        console.error('Error loading teacher classes:', error);
        setFormData({
          username: guru.username || '',
          full_name: guru.full_name || '',
          password: '',
          daerah_id: guru.daerah_id || '',
          kelompok_id: guru.kelompok_id || '',
          classIds: []
        });
      }

      setDataFilters({
        daerah: guru.daerah_id ? [guru.daerah_id] : [],
        desa: guru.desa_id ? [guru.desa_id] : [],
        kelompok: guru.kelompok_id ? [guru.kelompok_id] : [],
        kelas: []
      });
    } else {
      // CREATE MODE: reset to default
      setTeacherLevel('kelompok'); // RESET TO KELOMPOK

      // Create mode - auto-fill organizational fields based on user role
      const isSuperadmin = userProfile?.role === 'superadmin';
      const autoFilledDaerah = !isSuperadmin ? userProfile?.daerah_id || '' : '';
      const autoFilledDesa = !isSuperadmin ? userProfile?.desa_id || '' : '';
      const autoFilledKelompok = !isSuperadmin && userProfile && isAdminKelompok(userProfile)
        ? userProfile.kelompok_id || ''
        : '';

      // ... rest of existing create mode logic
    }
    setErrors({});
    setGeneralError('');
  };

  loadData();
}, [guru, isOpen, userProfile]);
```

**Step 2: Verify teacher level is detected correctly in edit mode**

Run: `npm run dev`

Edit an existing teacher → Radio button should match their level

**Step 3: Commit**

```bash
git add src/app/(admin)/users/guru/components/GuruModal.tsx
git commit -m "feat: detect and initialize teacher level from existing guru data

In edit mode, automatically detect teacher level based on which
organizational IDs are filled (kelompok_id, desa_id, daerah_id).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Update Server Actions - Validation

**Files:**
- Modify: `src/app/(admin)/users/guru/actions.ts:24-44` (createTeacher validation)
- Modify: `src/app/(admin)/users/guru/actions.ts:102-119` (updateTeacher validation)

**Step 1: Update createTeacher validation**

Find validation in `createTeacher` (around line 24-44) and update:

```typescript
export async function createTeacher(data: TeacherData) {
  try {
    // Validate required fields
    if (!data.username?.trim()) {
      throw new Error('Username harus diisi');
    }
    if (!data.full_name?.trim()) {
      throw new Error('Nama lengkap harus diisi');
    }
    if (!data.email?.trim()) {
      throw new Error('Email harus diisi');
    }
    if (!data.password) {
      throw new Error('Password harus diisi');
    }
    if (!data.daerah_id) {
      throw new Error('Daerah harus dipilih');
    }

    // UPDATED: Conditional validation based on teacher level
    // Teacher Kelompok: needs kelompok_id (and implicitly desa_id)
    if (data.kelompok_id && !data.desa_id) {
      throw new Error('Desa harus dipilih untuk guru dengan kelompok');
    }

    // Teacher Desa: needs desa_id (and implicitly daerah_id)
    if (data.desa_id && !data.daerah_id) {
      throw new Error('Daerah harus dipilih untuk guru dengan desa');
    }

    // At least daerah_id must be present
    if (!data.daerah_id) {
      throw new Error('Minimal daerah harus dipilih');
    }

    // ... rest of existing code (auth user creation, profile creation)
```

**Step 2: Update updateTeacher validation**

Find validation in `updateTeacher` (around line 102-119) and update similarly:

```typescript
export async function updateTeacher(id: string, data: TeacherData) {
  try {
    // Validate required fields
    if (!data.username?.trim()) {
      throw new Error('Username harus diisi');
    }
    if (!data.full_name?.trim()) {
      throw new Error('Nama lengkap harus diisi');
    }
    if (!data.email?.trim()) {
      throw new Error('Email harus diisi');
    }
    if (!data.daerah_id) {
      throw new Error('Daerah harus dipilih');
    }

    // UPDATED: Conditional validation
    if (data.kelompok_id && !data.desa_id) {
      throw new Error('Desa harus dipilih untuk guru dengan kelompok');
    }

    if (data.desa_id && !data.daerah_id) {
      throw new Error('Daerah harus dipilih untuk guru dengan desa');
    }

    // ... rest of existing update code
```

**Step 3: Verify no type errors**

Run: `npm run type-check`

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/(admin)/users/guru/actions.ts
git commit -m "feat: update teacher server action validation for new levels

Add conditional validation for Teacher Desa/Daerah in createTeacher
and updateTeacher. Ensure organizational hierarchy is valid.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Update Student Actions - Teacher Filtering

**Files:**
- Modify: `src/app/(admin)/users/siswa/actions.ts:50-100` (getAllStudents function)

**Step 1: Add teacher filtering to getAllStudents**

Find the filtering logic in `getAllStudents` (around line 50-100) and add teacher filtering:

```typescript
export async function getAllStudents(classId?: string) {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();

    let query = supabase
      .from('students')
      .select(`/* ... existing select ... */`)
      .eq('is_archived', false);

    // Apply filters based on user role
    if (profile) {
      // Admin filtering (existing)
      if (profile.role === 'admin') {
        const filter = getDataFilter(profile);
        if (filter?.kelompok_id) {
          query = query.eq('kelompok_id', filter.kelompok_id);
        } else if (filter?.desa_id) {
          query = query.eq('desa_id', filter.desa_id);
        } else if (filter?.daerah_id) {
          query = query.eq('daerah_id', filter.daerah_id);
        }
      }

      // NEW: Teacher filtering
      if (profile.role === 'teacher') {
        const filter = getDataFilter(profile);
        if (filter?.kelompok_id) {
          // Teacher Kelompok: students in their kelompok
          query = query.eq('kelompok_id', filter.kelompok_id);
        } else if (filter?.desa_id) {
          // Teacher Desa: all students in their desa
          query = query.eq('desa_id', filter.desa_id);
        } else if (filter?.daerah_id) {
          // Teacher Daerah: all students in their daerah
          query = query.eq('daerah_id', filter.daerah_id);
        }
      }
    }

    // Class filter (existing)
    if (classId) {
      query = query.contains('class_ids', [classId]);
    }

    const { data, error } = await query;
    // ... rest of existing code
  } catch (error) {
    // ... existing error handling
  }
}
```

**Step 2: Verify no type errors**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(admin)/users/siswa/actions.ts
git commit -m "feat: add teacher scope filtering to getAllStudents

Filter students based on teacher organizational level (kelompok/desa/daerah)
using getDataFilter helper function.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Update Attendance Actions - Teacher Scope Validation

**Files:**
- Modify: `src/app/(admin)/absensi/actions.ts` (find saveAttendance function)

**Step 1: Find saveAttendance function**

Use search to locate the `saveAttendance` function. It should validate teacher can access students before saving.

**Step 2: Add teacher scope validation**

Add this validation after getting profile and before saving:

```typescript
export async function saveAttendance(attendanceData: /* type */) {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();

    if (!profile) throw new Error('Unauthorized');

    // NEW: Validate teacher can access students in this attendance
    if (profile.role === 'teacher') {
      const studentIds = attendanceData.records.map(r => r.student_id);

      // Fetch students to verify access
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, daerah_id, desa_id, kelompok_id')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Check if teacher can access ALL students
      const filter = getDataFilter(profile);
      const invalidStudents = students?.filter(student => {
        if (filter?.kelompok_id) {
          return student.kelompok_id !== filter.kelompok_id;
        } else if (filter?.desa_id) {
          return student.desa_id !== filter.desa_id;
        } else if (filter?.daerah_id) {
          return student.daerah_id !== filter.daerah_id;
        }
        return false;
      });

      if (invalidStudents && invalidStudents.length > 0) {
        throw new Error('Anda tidak memiliki akses untuk beberapa siswa dalam daftar kehadiran ini');
      }
    }

    // ... rest of existing save logic
  } catch (error) {
    // ... existing error handling
  }
}
```

**Step 3: Verify no type errors**

Run: `npm run type-check`

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/(admin)/absensi/actions.ts
git commit -m "feat: add teacher scope validation to saveAttendance

Verify teacher has access to all students before saving attendance.
Prevent teachers from saving attendance for students outside their scope.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Integration Testing & Documentation

**Files:**
- Update: `CLAUDE.md` (add teacher level documentation)

**Step 1: Manual integration testing**

Test the following scenarios:

1. **Create Teacher Daerah** (as Superadmin/Admin Daerah):
   - Go to `/users/guru`
   - Click "Tambah Guru"
   - Select "Guru Daerah"
   - Fill form (Daerah only, no Desa/Kelompok)
   - Submit → Success

2. **Create Teacher Desa** (as Superadmin/Admin Desa/Admin Daerah):
   - Select "Guru Desa"
   - Fill form (Daerah + Desa, no Kelompok)
   - Submit → Success

3. **Create Teacher Kelompok** (as any admin):
   - Select "Guru Kelompok"
   - Fill form (Daerah + Desa + Kelompok)
   - Submit → Success

4. **Edit existing teacher**:
   - Edit a Teacher Kelompok
   - Radio button should show "Guru Kelompok"
   - Change to "Guru Desa"
   - Remove Kelompok selection
   - Submit → Success

5. **Permission check** (as Admin Kelompok):
   - Try to create "Guru Desa"
   - Should show error: "Anda tidak dapat membuat Guru Desa..."

**Step 2: Update CLAUDE.md documentation**

Add this section after the "Access Control" section (around line 100):

```markdown
### Teacher Levels

Teachers can be assigned at three organizational levels:

**Teacher Kelompok** (default):
- `kelompok_id` filled
- Access: Students and attendance in their kelompok
- Use case: Regular classroom teachers

**Teacher Desa** (coordinator):
- `desa_id` filled, `kelompok_id` NULL
- Access: All students and attendance in their desa (across all kelompok)
- Use case: District coordinators, subject specialists

**Teacher Daerah** (coordinator):
- `daerah_id` filled, `desa_id` & `kelompok_id` NULL
- Access: All students and attendance in their daerah (across all desa and kelompok)
- Use case: Regional coordinators

**Helper Functions**:
- `isTeacherKelompok(profile)`, `isTeacherDesa(profile)`, `isTeacherDaerah(profile)` - Detect teacher level
- `getTeacherScope(profile)` - Get scope as string ('kelompok' | 'desa' | 'daerah')
- `canTeacherAccessStudent(profile, student)` - Check if teacher can access student

**Permissions**: Archive/Transfer/Delete permissions apply within teacher's scope.

**Limitations**: Teachers CANNOT manage organizational structure, classes, or other users (admin-only features).
```

**Step 3: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: add Teacher Desa/Daerah documentation to CLAUDE.md

Document three teacher levels, helper functions, and access patterns.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Final Testing & Cleanup

**Step 1: Run full test suite**

Run: `npm run test`

Expected: All tests pass

**Step 2: Run type check**

Run: `npm run type-check`

Expected: No errors

**Step 3: Check for console.logs or debug code**

Search codebase for any debug code added during development:

```bash
grep -r "console.log" src/lib/__tests__/teacherAccessControl.test.ts
grep -r "console.log" src/lib/__tests__/teacherPermissions.test.ts
grep -r "console.log" src/lib/accessControl.ts
```

Remove any debug logs found.

**Step 4: Update beads issue status**

```bash
bd update sm-ee7 --status=in_progress
bd close sm-ee7
```

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: clean up debug code and finalize Teacher Desa/Daerah feature

Remove debug logs, verify all tests pass, mark issue sm-ee7 as complete.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 6: Push to remote**

```bash
git push origin master
```

---

## Implementation Complete

**Summary:**
- ✅ Helper functions for teacher level detection (with tests)
- ✅ Teacher access control function (with tests)
- ✅ Permission functions updated (with tests)
- ✅ Database migrations (nullable kelompok_id + RLS policies)
- ✅ UI updates (radio buttons, conditional fields, validation)
- ✅ Server actions updated (validation + filtering)
- ✅ Documentation updated
- ✅ Integration tested

**Total**: 17 tasks, ~430 lines of code, 20+ tests, 2 database migrations

**Files Modified**: 10 files
**Files Created**: 2 test files
**Migrations**: 2 (allow_teacher_desa_daerah, update_rls_for_teacher_levels)
