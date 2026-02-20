# Business Rules

This document contains critical business logic and domain-specific rules for the Generus Mandiri school management system.

## Attendance System

- **Status codes**: H (Hadir/Present), I (Izin/Excused), S (Sakit/Sick), A (Alpha/Absent)
- **Composite key**: (student_id, date) for upsert operations
- **Auto-save**: With debouncing to prevent excessive database calls
- **Multi-class meetings**: Meetings can span multiple classes via `class_ids` array

### Special Permission Rule for Teachers

**CRITICAL**: Teachers who teach PAUD/Kelas 1-6 (Caberawit) can edit attendance for Pengajar (teacher training) class meetings.

- **Implementation**: `src/app/(admin)/absensi/[meetingId]/page.tsx` (lines 240-243)
- **Logic**: Uses `isPengajarMeeting && teacherCaberawit` check
- **Requirement**: `class_master_mappings` must be loaded in user profile for `isCaberawitClass()` detection

## Student Lifecycle Management

### Student Status System

The `students.status` field has three values:
- `active` - Currently studying (default for new students)
- `graduated` - Completed program successfully
- `inactive` - Not active (transferred out, on leave, etc.)

### Archive vs Soft Delete - CRITICAL DIFFERENCE

**⚠️ UNDERSTANDING THIS DISTINCTION IS ESSENTIAL**

#### Archive (`status: graduated/inactive`)
- Student data is **VALID** but no longer active
- **Use for**: Graduated students, transferred out, long-term leave
- **Appears in historical reports** (data is legitimate)
- Hidden from active student lists and attendance
- Can be unarchived (status → `active`)

#### Soft Delete (`deleted_at` timestamp)
- Student data is **INVALID/ERROR**
- **Use for**: Wrong entries, duplicates, test data
- **Hidden from ALL views** including historical reports
- Can be restored within retention period
- Treated as data correction, not lifecycle event

### Student Management Actions

1. **Archive**: Set `status` to `graduated` or `inactive` (keeps history)
2. **Transfer**: Move to different org/class with approval-based workflow (see below)
3. **Soft Delete**: Mark as deleted (restorable)
4. **Hard Delete**: Permanent removal (superadmin only, GDPR compliance)

### Business Rules for Archived Students

**Archived students (graduated/inactive) DON'T appear in**:
- Active student lists
- Attendance forms (can't take attendance)
- Class assignment modals

**Archived students DO appear in**:
- Historical reports (valid data for past periods)
- Alumni/graduated views (filter by `status = 'graduated'`)
- Statistics for their active period

**Query pattern**:
- For active lists: `WHERE status = 'active'`
- For historical reports: `WHERE status != 'deleted'`

## Approval-Based Transfer Workflow

### Overview

Students can be transferred across organizational boundaries with an approval system. Transfers within the same organization are auto-approved, while cross-boundary transfers require approval from the destination admin.

### Transfer Request Status Flow

```
[Created] → pending
    ↓
    ├─→ Auto-approved (same org) → approved → executed
    │
    └─→ Needs approval (cross-boundary) → pending
            ↓
            ├─→ [Reviewer: Approve] → approved → executed
            │
            ├─→ [Reviewer: Reject] → rejected (can re-submit)
            │
            └─→ [Requester: Cancel] → cancelled
```

### Auto-Approval Rules

- ✅ **Same Kelompok** (class change only) → Auto-approved
- ✅ **Superadmin transfers** → Auto-approved (bypass)
- ⏳ **Different Kelompok, Same Desa** → Needs approval from Admin Kelompok (target)
- ⏳ **Different Desa, Same Daerah** → Needs approval from Admin Desa (target)
- ⏳ **Different Daerah** → Needs approval from Admin Daerah (target)

### Permission Functions

See `src/lib/studentPermissions.ts`:
- `canRequestTransfer(user, student)` - Check if user can create transfer request
- `canReviewTransferRequest(user, request)` - Check if user can approve/reject
- `needsApproval(requester, request)` - Determine if approval needed
- `isOrganizationInUserHierarchy(user, org)` - Check reviewer authority

### Key Features

- 📦 **Bulk transfers**: Transfer multiple students in one request
- 🔔 **In-app notifications**: Badge count for pending requests
- 🔄 **Re-submission**: Rejected requests can be re-submitted
- ♾️ **No expiration**: Requests stay pending until reviewed
- 🔍 **Audit trail**: Full history in `transfer_requests` table

### Implementation Status

- ✅ Permission logic implemented and tested (66 tests, 100% coverage)
- ✅ Database migration applied (transfer_requests table + triggers)
- ✅ Server actions implemented (src/app/(admin)/users/siswa/actions/management.ts)
  - createTransferRequest, approveTransferRequest, rejectTransferRequest
  - cancelTransferRequest, getPendingTransferRequests, getMyTransferRequests
  - archiveStudent, unarchiveStudent, restoreStudent
- ⏳ UI components (TransferRequestModal, PendingRequestsSection) - TODO

### Teacher Permissions

Teachers can be granted student management permissions via `profiles.permissions` JSONB field:

```json
{
  "can_archive_students": false,
  "can_transfer_students": false,
  "can_soft_delete_students": false,
  "can_hard_delete_students": false
}
```

- **Default**: Teachers have NO student management permissions
- **Configurable**: Admin can grant permissions per teacher in `/users/guru` page (via SettingsModal)
- **Superadmin & Admin**: Always have all permissions (hardcoded)

### CRITICAL: Permission Implementation Checklist

When implementing permission-based features, follow these steps to avoid common pitfalls:

#### 1. ✅ Query `permissions` field from database

```typescript
// In AdminLayoutProvider.tsx (line 50)
.select(`
  id,
  full_name,
  role,
  permissions,  // ← MUST include this!
  ...
`)
```
**Common Bug**: Forgetting to select `permissions` field → permissions always `undefined` → buttons never appear

#### 2. ✅ Use correct permission check functions

```typescript
// Client-side: Use dedicated permission functions
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent
} from '@/lib/studentPermissions'

// NOT just role checks like `isAdmin`
```

#### 3. ✅ Check permissions in page-level logic

```typescript
// In page.tsx (e.g., src/app/(admin)/users/siswa/page.tsx)
const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

// Permission checks for each action
const canArchive = isAdmin || userProfile?.permissions?.can_archive_students === true
const canTransfer = isAdmin || userProfile?.permissions?.can_transfer_students === true
const canSoftDelete = isAdmin || userProfile?.permissions?.can_soft_delete_students === true

// Pass to components
<StudentsTable
  onArchive={canArchive ? handleArchiveClick : undefined}
  onTransfer={canTransfer ? handleTransferClick : undefined}
  userProfile={userProfile}
/>
```

#### 4. ✅ Validate permissions in server actions (defense in depth)

```typescript
// In actions.ts
export async function archiveStudent(studentId: string) {
  'use server'
  const user = await getCurrentUserProfile()
  const student = await getStudent(studentId)

  if (!canArchiveStudent(user, student)) {
    throw new Error('Permission denied')
  }

  // Perform action...
}
```

#### 5. ✅ Conditional rendering in components

```typescript
// In StudentsTable.tsx
{canArchiveStudent(userProfile, student) && onArchive && student.status === 'active' && (
  <button onClick={() => onArchive(student)}>
    Archive
  </button>
)}
```

#### 6. ✅ Modal permission checks

```typescript
// In DeleteStudentModal.tsx
const canSoftDelete = isAdmin || userProfile?.permissions?.can_soft_delete_students === true
const canHardDelete = userProfile?.role === 'superadmin' // ONLY superadmin

{canSoftDelete && !studentDeletedAt && (
  <Button onClick={onSoftDelete}>Hapus (Data Tersimpan)</Button>
)}

{canHardDelete && studentDeletedAt && (
  <Button onClick={onHardDelete}>Hapus Permanen ⚠️</Button>
)}
```

### Common Bugs & Solutions

| Bug | Symptom | Solution |
|-----|---------|----------|
| `permissions` field not queried | Buttons never appear for teachers with permissions | Add `permissions` to AdminLayoutProvider query (line 50) |
| Using `isAdmin` instead of permission check | Teachers can't access features even with permissions | Use `canArchive`, `canTransfer` variables in page |
| Not passing `onArchive` prop | `onArchive === false` in component | Check page-level condition and pass callback |
| Hard Delete shown to non-superadmin | Teachers see "Hapus Permanen" button | Check `canHardDelete` (ONLY superadmin) |
| Permission not validated in server action | Security vulnerability | Always check `canArchiveStudent()` etc. in actions |

### Related Files

- Permission logic: `src/lib/studentPermissions.ts` (66 tests, 100% coverage)
- UI checks: `src/app/(admin)/users/siswa/components/StudentsTable.tsx` (lines 329-435)
- Page logic: `src/app/(admin)/users/siswa/page.tsx` (lines 59-63, 414-416)
- Server actions: `src/app/(admin)/users/siswa/actions/management.ts`
- Settings UI: `src/app/(admin)/users/guru/components/SettingsModal.tsx` (lines 232-306)
- Profile query: `src/components/layouts/AdminLayoutProvider.tsx` (line 50)
- Delete modal: `src/app/(admin)/users/siswa/components/DeleteStudentModal.tsx` (lines 31-42)

**Testing**: All permission functions have 100% test coverage. See `src/lib/__tests__/studentPermissions.test.ts` for examples.

## Meeting Types & Class Eligibility

### Available Meeting Types

- `ASAD` - ASAD meetings (available to all except PAUD and Pengajar classes)
- `PEMBINAAN` - Regular class meetings
- `SAMBUNG_KELOMPOK` - Group-level meetings
- `SAMBUNG_DESA` - Village-level meetings
- `SAMBUNG_DAERAH` - Regional-level meetings
- `SAMBUNG_PUSAT` - Central-level meetings

### Meeting Type Access Rules

See `src/lib/constants/meetingTypes.ts`:

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

### ASAD Meeting Type Restrictions

- **Purpose**: General attendance tracking for ASAD activities
- **Excluded Classes**:
  - PAUD classes (category code/name = 'PAUD')
  - Pengajar classes (class name contains 'pengajar')
- **Implementation**: Uses `isTeacherClass()` helper and category code checks
- **Teacher Eligibility**: Teachers must have at least one non-PAUD, non-Pengajar class to create ASAD meetings

### Sambung Desa Meeting Restrictions

Use master classes (Pra Nikah, Remaja, Orang Tua) to select target classes.

**CRITICAL**: Must exclude Pengajar and Caberawit (PAUD/Kelas 1-6) classes.

Use `isSambungDesaEligible(classData)` helper when converting master classes to actual classes.

**Example** in `CreateMeetingModal.tsx`:
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

### Meeting Visibility

- Teachers only see meetings where they teach at least one of the meeting's classes
- **Class Master Mappings**: Junction table `class_master_mappings` links actual classes to master classes

## Multi-class Support

- Teachers can be assigned to multiple classes via `teacher_classes` junction table
- Students can be in multiple classes via `student_classes` junction table
- Profile loads all assigned classes for teachers with complete data:
  - `kelompok_id` and `kelompok` for organizational filtering
  - `class_master_mappings` with full hierarchy (class_master → category) for class type detection
- This enables `isCaberawitClass()` to work correctly on user profile classes

## Filtering & Reporting Conventions

### CRITICAL: Class Filter Logic

When filtering attendance/reports by class, **ALWAYS filter by meeting's class**, NOT student's enrolled class.

- ❌ **WRONG**: Check if student is enrolled in selected class (`log.students.class_id`)
- ✅ **CORRECT**: Check if meeting was for selected class (`meeting.class_id` or `meeting.class_ids`)

**Why**: Students can be enrolled in multiple classes. Filtering by student enrollment shows attendance from ALL meetings across ALL their classes, not just the selected class.

**Example Bug**: Selecting "Pra Nikah" + "Pembinaan" showed student "Reta" whose "Pembinaan" meeting was actually for "Pengajar" class, not "Pra Nikah"

**Correct Implementation** (see `src/app/(admin)/laporan/actions.ts:448-467`):
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

### Meeting Type Filter for Reporting

Reports page shows meeting types based on user role:
- **Admins**: See ALL meeting types for filtering (to view all data)
- **Teachers**: See only their available meeting types (types they can create)

Uses `forceShowAllMeetingTypes={isAdmin(userProfile)}` prop on DataFilter component.

**Why**: Separates concerns of "what can I create" vs "what can I filter by"
- Meeting creation pages: Use role-restricted types (teacher can only create certain types)
- Reporting/filtering pages:
  - Admins can filter by any type to view all organizational data
  - Teachers can only filter by types they're allowed to create

**Implementation**: `src/components/shared/DataFilter.tsx` + `src/app/(admin)/laporan/components/FilterSection.tsx`
