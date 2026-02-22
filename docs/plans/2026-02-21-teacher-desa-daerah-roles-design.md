# Teacher Desa/Daerah Roles - Design Document

**Issue**: sm-ee7
**Date**: 2026-02-21
**Status**: Approved

## Overview

Add support for Teacher roles at Desa and Daerah organizational levels with configurable permissions. This allows "Guru Koordinator" who can access and manage student data and attendance across multiple kelompok within their desa or daerah, without having administrative privileges to manage organizational structure or classes.

## Requirements

### Teacher Levels

Three levels of teachers based on organizational scope:

1. **Teacher Kelompok** (existing): Assigned to specific kelompok
   - Access: Students and attendance in their kelompok only
   - Database: `kelompok_id` filled, `desa_id` filled, `daerah_id` filled

2. **Teacher Desa** (new): Assigned to desa level
   - Access: All students and attendance in their desa (across all kelompok)
   - Database: `desa_id` filled, `daerah_id` filled, `kelompok_id` NULL

3. **Teacher Daerah** (new): Assigned to daerah level
   - Access: All students and attendance in their daerah (across all desa and kelompok)
   - Database: `daerah_id` filled, `desa_id` NULL, `kelompok_id` NULL

### Access Scope

Teachers can:
- ✅ View and manage student data within their scope
- ✅ View and manage attendance within their scope
- ✅ Teach multiple classes across kelompok (via teacher_classes)
- ✅ Archive/transfer/delete students (if permission granted) within their scope

Teachers CANNOT:
- ❌ Manage organizational structure (Daerah/Desa/Kelompok)
- ❌ Manage classes (Class/ClassMaster)
- ❌ Manage other users (Guru/Admin)

### Permissions Scope

Configurable permissions (can_archive_students, can_transfer_students, can_soft_delete_students, can_hard_delete_students) apply within teacher's organizational scope:
- Teacher Daerah: permissions apply to all students in daerah
- Teacher Desa: permissions apply to all students in desa
- Teacher Kelompok: permissions apply to students in kelompok

## Architecture

### Approach: Helper Function Based

Consistent with existing Admin pattern (isAdminDaerah, isAdminDesa, isAdminKelompok), using helper functions to detect teacher level based on organizational fields.

### Core Components

#### 1. Helper Functions (`lib/accessControl.ts`, `lib/userUtils.ts`)

```typescript
// Teacher level detection
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

// Access control
export function canTeacherAccessStudent(
  profile: UserProfile,
  student: { daerah_id?: string; desa_id?: string; kelompok_id?: string }
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

#### 2. Access Control Server (`lib/accessControlServer.ts`)

Update `getDataFilter()` to support teacher scope:

```typescript
export function getDataFilter(profile: UserProfile) {
  // Existing admin logic...

  // NEW: Teacher filtering
  if (profile.role === 'teacher') {
    if (isTeacherDaerah(profile)) {
      return { daerah_id: profile.daerah_id }
    }
    if (isTeacherDesa(profile)) {
      return { desa_id: profile.desa_id }
    }
    if (isTeacherKelompok(profile)) {
      return { kelompok_id: profile.kelompok_id }
    }
  }

  return null // Superadmin
}
```

#### 3. Permission Checks (`lib/studentPermissions.ts`)

Update all permission functions to use `canTeacherAccessStudent()`:

```typescript
export function canArchiveStudent(profile: UserProfile, student: StudentWithOrg): boolean {
  if (!profile.permissions?.can_archive_students) return false

  if (profile.role === 'admin' || profile.role === 'superadmin') {
    return canAccessStudent(profile, student)
  }

  // NEW: Teacher scope check
  if (profile.role === 'teacher') {
    return canTeacherAccessStudent(profile, student)
  }

  return false
}

// Similar updates for canTransferStudent, canSoftDeleteStudent, canHardDeleteStudent
```

## Database Changes

### Migration 1: Allow Teacher Desa/Daerah

**File**: `allow_teacher_desa_daerah.sql`

```sql
-- Make kelompok_id nullable for teachers
ALTER TABLE profiles
  ALTER COLUMN kelompok_id DROP NOT NULL;

-- Add check constraint for valid organizational hierarchy
ALTER TABLE profiles
  ADD CONSTRAINT profiles_teacher_org_hierarchy_check
  CHECK (
    role != 'teacher' OR (
      daerah_id IS NOT NULL AND (
        -- Teacher Daerah: daerah_id only
        (desa_id IS NULL AND kelompok_id IS NULL) OR
        -- Teacher Desa: daerah_id + desa_id
        (desa_id IS NOT NULL AND kelompok_id IS NULL) OR
        -- Teacher Kelompok: daerah_id + desa_id + kelompok_id
        (desa_id IS NOT NULL AND kelompok_id IS NOT NULL)
      )
    )
  );
```

### Migration 2: Update RLS Policies

**File**: `update_rls_for_teacher_levels.sql`

Update RLS policies for:
1. `students` table - Teachers can view students in their scope
2. `attendance_logs` table - Teachers can manage attendance in their scope
3. `classes` table - Teachers can view classes in their scope
4. `meetings` table - Teachers can view meetings in their scope

See Section 2.2 in design presentation for full SQL.

## UI Changes

### GuruModal (`src/app/(admin)/users/guru/components/GuruModal.tsx`)

**Key Changes:**

1. Add teacher level selection (radio buttons)
2. Conditional field visibility based on level
3. Update validation logic
4. Permission checks (prevent Admin Kelompok from creating Teacher Desa/Daerah)

**New UI Elements:**

```typescript
// State
const [teacherLevel, setTeacherLevel] = useState<'kelompok' | 'desa' | 'daerah'>('kelompok')

// Radio buttons
<div className="mb-4">
  <Label>Level Guru</Label>
  <div className="flex gap-4 mt-2">
    <label><input type="radio" value="kelompok" ... /> Guru Kelompok</label>
    <label><input type="radio" value="desa" ... /> Guru Desa</label>
    <label><input type="radio" value="daerah" ... /> Guru Daerah</label>
  </div>
</div>

// Conditional DataFilter
<DataFilter
  showKelompok={teacherLevel === 'kelompok'}
  requiredFields={{
    daerah: true,
    desa: teacherLevel !== 'daerah',
    kelompok: teacherLevel === 'kelompok'
  }}
/>
```

## Server Actions Updates

### `src/app/(admin)/users/guru/actions.ts`

Update validation in `createTeacher()` and `updateTeacher()`:

```typescript
// Conditional validation
if (data.kelompok_id && !data.desa_id) {
  throw new Error('Desa harus dipilih untuk guru dengan kelompok')
}

if (data.desa_id && !data.daerah_id) {
  throw new Error('Daerah harus dipilih untuk guru dengan desa')
}

// Allow NULL kelompok_id and desa_id
const { error: profileError } = await supabase
  .from('profiles')
  .insert([{
    // ...
    desa_id: data.desa_id || null,
    kelompok_id: data.kelompok_id || null,
  }]);
```

### `src/app/(admin)/users/siswa/actions.ts`

Update `getAllStudents()` to apply teacher filtering:

```typescript
if (profile.role === 'teacher') {
  const filter = getDataFilter(profile)
  if (filter?.kelompok_id) {
    query = query.eq('kelompok_id', filter.kelompok_id)
  } else if (filter?.desa_id) {
    query = query.eq('desa_id', filter.desa_id)
  } else if (filter?.daerah_id) {
    query = query.eq('daerah_id', filter.daerah_id)
  }
}
```

### `src/app/(admin)/absensi/actions.ts`

Add scope validation in `saveAttendance()`:

```typescript
if (profile.role === 'teacher') {
  // Fetch students to verify access
  const { data: students } = await supabase
    .from('students')
    .select('id, daerah_id, desa_id, kelompok_id')
    .in('id', studentIds)

  // Check if teacher can access ALL students
  const filter = getDataFilter(profile)
  const invalidStudents = students?.filter(student => {
    // Check against filter
  })

  if (invalidStudents?.length > 0) {
    throw new Error('Anda tidak memiliki akses untuk beberapa siswa...')
  }
}
```

## Testing Strategy

### Unit Tests

**File**: `lib/__tests__/teacherAccessControl.test.ts`
- Test `isTeacherKelompok()`, `isTeacherDesa()`, `isTeacherDaerah()`
- Test `getTeacherScope()`
- Test `canTeacherAccessStudent()` for all combinations

**File**: `lib/__tests__/teacherPermissions.test.ts`
- Test permission functions with teacher scope
- Test edge cases (access outside scope)

### Integration Tests

Manual testing checklist:
1. Create Teacher Daerah → Login → Can see all students in daerah
2. Create Teacher Desa → Login → Can see all students in desa
3. Create Teacher Kelompok → Login → Only see students in kelompok (existing)
4. Test permissions (archive/transfer) respect scope
5. Test RLS prevents unauthorized access

## Error Handling

### Edge Cases

1. **Invalid hierarchy**: Database constraint prevents
2. **Permission escalation**: RLS policies prevent unauthorized access
3. **Admin creating teacher with wider scope**: UI validation blocks
4. **Data migration**: Existing teachers remain Teacher Kelompok (no migration needed)

### Error Messages

```typescript
// Admin Kelompok trying to create Teacher Desa
'Anda tidak dapat membuat Guru Desa karena level Anda adalah Admin Kelompok'

// Admin Desa trying to create Teacher Daerah
'Anda tidak dapat membuat Guru Daerah. Hanya Superadmin atau Admin Daerah yang bisa.'

// Teacher accessing student outside scope
'Anda tidak memiliki akses untuk beberapa siswa dalam daftar kehadiran ini'
```

## Implementation Checklist

### Phase 1: Core Infrastructure (TDD)
- [ ] Write tests in `lib/__tests__/teacherAccessControl.test.ts`
- [ ] Write tests in `lib/__tests__/teacherPermissions.test.ts`
- [ ] Add helper functions to `lib/accessControl.ts`
- [ ] Update `lib/accessControlServer.ts`
- [ ] Update `lib/studentPermissions.ts`
- [ ] Re-export from `lib/userUtils.ts`
- [ ] Run tests → All pass ✅

### Phase 2: Database Changes
- [ ] Create migration `allow_teacher_desa_daerah.sql`
- [ ] Apply migration
- [ ] Create migration `update_rls_for_teacher_levels.sql`
- [ ] Apply RLS policies
- [ ] Test RLS with different teacher levels

### Phase 3: Server Actions
- [ ] Update `guru/actions.ts` (createTeacher, updateTeacher)
- [ ] Update `siswa/actions.ts` (getAllStudents)
- [ ] Update `absensi/actions.ts` (saveAttendance)

### Phase 4: UI Components
- [ ] Update `GuruModal.tsx`
  - [ ] Add teacher level selection
  - [ ] Conditional field visibility
  - [ ] Update validation
  - [ ] Permission checks
- [ ] Manual UI testing

### Phase 5: Integration Testing
- [ ] Test all teacher levels end-to-end
- [ ] Verify permissions respect scope
- [ ] Verify RLS prevents unauthorized access

### Phase 6: Documentation
- [ ] Update CLAUDE.md
- [ ] Add JSDoc comments
- [ ] Clean up debug code

## Migration Strategy

### Backward Compatibility
- ✅ Existing teachers remain Teacher Kelompok (no data change)
- ✅ No code breaking changes (RLS updated to support all levels)
- ✅ New feature is opt-in

### Rollback Plan
1. Revert RLS policies
2. Make kelompok_id NOT NULL again
3. Remove radio buttons from UI

## Estimated Impact

- **New code**: ~200 lines (tests + helpers)
- **Modified code**: ~150 lines (UI + actions + permissions)
- **SQL**: ~80 lines (migrations + RLS)
- **Total**: ~430 lines
- **Files affected**: 10 files (2 new, 8 modified)
- **Test coverage**: 20+ unit tests

## Conclusion

This design provides a clean, type-safe way to support Teacher roles at Desa and Daerah levels while maintaining backward compatibility and following established patterns in the codebase. The helper function approach is consistent with existing Admin role handling and provides clear, testable access control logic.
