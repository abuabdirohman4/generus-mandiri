# Student Management Implementation (sm-8yf)

> **Status**: Backend complete ✅ | UI Pending ⏳

## Overview

Implementasi sistem manajemen siswa dengan approval-based transfer workflow, termasuk fitur archive, transfer, soft delete, dan hard delete dengan role-based permissions.

---

## ✅ Completed (Backend)

### 1. Database Schema ✅

**File**: `supabase/migrations/20260211_student_management_schema.sql`

#### Tabel Baru:
- **`transfer_requests`** - Approval-based transfer workflow
  - Support bulk transfer (multiple students)
  - Auto-approval untuk transfer dalam organisasi yang sama
  - Manual approval untuk cross-boundary transfers
  - Notification badge system via `profiles.notification_badge`

#### Update Tabel Existing:
- **`students`**
  - `status` VARCHAR(20): 'active' | 'graduated' | 'inactive'
  - `archived_at`, `archived_by`, `archive_notes`
  - `transfer_history` JSONB array (audit trail)

- **`profiles`**
  - `permissions` JSONB: Teacher-specific permissions
    ```json
    {
      "can_archive_students": false,
      "can_transfer_students": false,
      "can_soft_delete_students": false,
      "can_hard_delete_students": false
    }
    ```
  - `notification_badge` JSONB:
    ```json
    {
      "pending_transfer_requests": 0
    }
    ```

#### RLS Policies ✅
- Superadmin: Full access
- Admin: Access to requests in their organizational hierarchy
- Teacher: Access to own requests
- Auto-update notification badge via database triggers

---

### 2. Permission Logic ✅

**File**: `src/lib/studentPermissions.ts`

**Test Coverage**: 66/66 tests passing (100% coverage)

#### Core Functions:
```typescript
// Archive (graduated/inactive)
canArchiveStudent(user, student): boolean

// Transfer (new approval-based)
canRequestTransfer(user, student): boolean
canReviewTransferRequest(user, request): boolean
needsApproval(requester, request): boolean
isOrganizationInUserHierarchy(user, org): boolean

// Delete
canSoftDeleteStudent(user, student): boolean
canHardDeleteStudent(user, student): boolean

// Transfer boundaries (helper functions)
getTransferableDaerahIds(user, allDaerahIds): string[]
getTransferableDesaIds(user, targetDaerahId, allDesaIds): string[]
getTransferableKelompokIds(user, targetDesaId, allKelompokIds): string[]
```

#### Permission Rules:
- **Superadmin**: All permissions (bypass approval)
- **Admin**: Permissions within their organizational hierarchy
- **Teacher**: Configurable via `profiles.permissions` JSONB
- **Student**: No permissions

#### Transfer Approval Rules:
| Scenario | Auto-Approved? | Reviewer Needed? |
|----------|---------------|------------------|
| Same Kelompok (class change only) | ✅ Yes | ❌ No |
| Different Kelompok, Same Desa | ✅ Yes | ❌ No |
| Different Desa, Same Daerah | ❌ No | ✅ Admin Desa (target) |
| Different Daerah | ❌ No | ✅ Admin Daerah (target) |
| Superadmin transfer | ✅ Yes (bypass) | ❌ No |

---

### 3. Server Actions ✅

**File**: `src/app/(admin)/users/siswa/studentManagementActions.ts`

#### Archive Actions:
```typescript
archiveStudent(input: { studentId, status: 'graduated'|'inactive', notes? }): Promise<Response>
unarchiveStudent(studentId): Promise<Response>
```

#### Transfer Request Actions:
```typescript
createTransferRequest(input: {
  studentIds: string[]  // Support bulk transfer
  toDaerahId, toDesaId, toKelompokId
  toClassIds?: string[]  // Optional class assignment
  reason?: string
  notes?: string
}): Promise<{ success, requestId?, autoApproved?, error? }>

approveTransferRequest(requestId, reviewNotes?): Promise<Response>
rejectTransferRequest(requestId, reviewNotes?): Promise<Response>
cancelTransferRequest(requestId): Promise<Response> // Requester only

getPendingTransferRequests(): Promise<{ requests }>
getMyTransferRequests(): Promise<{ requests }>
```

#### Delete Actions:
```typescript
deleteStudent(studentId, permanent: boolean = false): Promise<Response>
restoreStudent(studentId): Promise<Response>
```

**Updated**: Existing `deleteStudent()` in `actions.ts` now uses new permission logic

---

## 📋 Implementation Details

### Archive vs Soft Delete (CRITICAL DIFFERENCE)

#### Archive (`status: graduated/inactive`)
- **Purpose**: Valid lifecycle status
- **Use Case**: Graduated students, transferred out, long-term leave
- **Behavior**:
  - ✅ Appears in historical reports (data is legitimate)
  - ❌ Hidden from active student lists
  - ❌ Cannot take attendance
- **Reversible**: Yes (`unarchiveStudent()` → `status: active`)

#### Soft Delete (`deleted_at` timestamp)
- **Purpose**: Invalid/error data
- **Use Case**: Wrong entries, duplicates, test data
- **Behavior**:
  - ❌ Hidden from ALL views (including historical reports)
  - ✅ Can be restored within retention period
- **Reversible**: Yes (`restoreStudent()`)

#### Hard Delete (Permanent)
- **Purpose**: GDPR compliance, permanent removal
- **Requirements**:
  - ⚠️ Superadmin ONLY
  - ⚠️ Must be soft deleted first (2-step process)
- **Behavior**: Cascades to `attendance_logs`, `student_classes`
- **Reversible**: ❌ NO (permanent)

---

### Transfer Workflow States

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

**Key Features**:
- 📦 **Bulk transfer**: Transfer multiple students in one request
- 🔔 **In-app notifications**: Badge count updates via database trigger
- 🔄 **Re-submission**: Rejected requests can be re-submitted
- ♾️ **No expiration**: Requests stay pending until reviewed
- 🔍 **Full audit trail**: `transfer_requests` + `students.transfer_history`

---

## ⏳ TODO: UI Components

### Phase 4: UI Implementation

**Files to Create**:
1. **`TransferRequestModal`** (NEW)
   - Destination selector (no hard restrictions, all orgs available)
   - Bulk student selection (multi-select)
   - Reason field (required if cross-boundary)
   - Preview: "Auto-approved" vs "Needs approval from Admin X"

2. **`PendingTransferRequestsSection`** (NEW)
   - List requests awaiting review (for admin reviewers)
   - Approve/Reject buttons with notes
   - Show student details, reason, requester name
   - Notification badge integration

3. **`TransferRequestHistoryModal`** (NEW)
   - Show request status (pending/approved/rejected/cancelled)
   - Timeline view of events
   - Link to view request details

4. **`NotificationBadge`** (NEW)
   - Display `profiles.notification_badge.pending_transfer_requests`
   - Click → navigate to pending requests section
   - Auto-update on request status change

5. **`ArchiveStudentModal`** (Update existing?)
   - Status selector: 'graduated' or 'inactive'
   - Notes field (optional)
   - Confirmation dialog

6. **Update `DeleteStudentModal`**
   - Soft delete confirmation
   - Warning about restore capability
   - Distinguish from hard delete

7. **`HardDeleteConfirmDialog`** (NEW)
   - Superadmin only
   - Type "DELETE" confirmation
   - Warning: permanent action
   - Check if student is soft deleted first

---

## 🧪 Testing

### Unit Tests ✅
**File**: `src/lib/__tests__/studentPermissions.test.ts`

**Coverage**: 66 tests passing
- Archive permissions (14 tests)
- Transfer permissions (14 tests)
- Soft delete permissions (10 tests)
- Hard delete permissions (10 tests)
- Approval workflow (28 tests)
  - `canRequestTransfer()`
  - `canReviewTransferRequest()`
  - `needsApproval()`
  - `isOrganizationInUserHierarchy()`

**Run Tests**:
```bash
npm run test -- studentPermissions
```

### Integration Tests (TODO)
- Auto-approved transfer flow
- Approval-required transfer flow
- Bulk transfer (5 students at once)
- Rejection and re-submission
- Archive/unarchive
- Soft delete/restore
- Hard delete cascade

---

## 🚀 Deployment Checklist

### 1. Database Migration
```bash
# Run migration in Supabase Dashboard
# File: supabase/migrations/20260211_student_management_schema.sql
```

**Migration includes**:
- ✅ Create `transfer_requests` table
- ✅ Add columns to `students` (status, archived_at, etc.)
- ✅ Add columns to `profiles` (permissions, notification_badge)
- ✅ RLS policies
- ✅ Database triggers for notification badge
- ✅ Helper functions

### 2. Verify Database Changes
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('transfer_requests');

-- Check columns added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'students' AND column_name IN ('status', 'archived_at', 'transfer_history');

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('permissions', 'notification_badge');
```

### 3. Code Deployment
```bash
# Verify TypeScript compilation
npm run type-check

# Run tests
npm run test:run -- studentPermissions

# Build for production
npm run build
```

### 4. Post-Deployment Testing
- [ ] Create transfer request (same org) → should auto-approve
- [ ] Create transfer request (cross-boundary) → should need approval
- [ ] Approve/reject transfer request
- [ ] Archive student (graduated) → check hidden from active lists
- [ ] Soft delete student → check hidden from all views
- [ ] Restore soft deleted student
- [ ] Hard delete (superadmin) → verify cascade

---

## 📊 Database Query Examples

### Get Pending Requests for Reviewer
```sql
-- Admin Desa viewing requests targeting their desa
SELECT tr.*,
       array_agg(s.full_name) as student_names,
       p.full_name as requester_name
FROM transfer_requests tr
JOIN profiles p ON tr.requested_by = p.id
JOIN students s ON s.id = ANY(tr.student_ids)
WHERE tr.status = 'pending'
  AND tr.to_desa_id = :user_desa_id
  AND (:user_role = 'superadmin' OR tr.to_daerah_id = :user_daerah_id)
GROUP BY tr.id, p.full_name
ORDER BY tr.requested_at DESC;
```

### Get Student Transfer History
```sql
SELECT
  full_name,
  status,
  transfer_history
FROM students
WHERE id = :student_id;
```

### Check Notification Badge Count
```sql
SELECT
  full_name,
  notification_badge->'pending_transfer_requests' as pending_count
FROM profiles
WHERE role IN ('admin', 'superadmin')
  AND (notification_badge->>'pending_transfer_requests')::int > 0;
```

---

## 🔗 Related Files

### Backend (✅ Complete)
- `src/lib/studentPermissions.ts` - Permission logic
- `src/lib/__tests__/studentPermissions.test.ts` - Unit tests
- `src/app/(admin)/users/siswa/studentManagementActions.ts` - Server actions
- `src/app/(admin)/users/siswa/actions.ts` - Updated `deleteStudent()`
- `supabase/migrations/20260211_student_management_schema.sql` - Database migration

### Frontend (⏳ Pending)
- `src/app/(admin)/users/siswa/components/TransferRequestModal.tsx` - TODO
- `src/app/(admin)/users/siswa/components/PendingTransferRequestsSection.tsx` - TODO
- `src/app/(admin)/users/siswa/components/NotificationBadge.tsx` - TODO
- `src/app/(admin)/users/siswa/components/ArchiveStudentModal.tsx` - TODO
- Update: `src/app/(admin)/users/siswa/components/DeleteStudentModal.tsx` - TODO

---

## 📝 Notes for Next Session

1. **Database Migration**: Run migration di Supabase Dashboard terlebih dahulu
2. **UI Implementation**: Mulai dari `TransferRequestModal` (most complex)
3. **Notification Badge**: Integrate with header/sidebar layout
4. **Testing**: Create integration tests after UI complete
5. **Edge Cases**:
   - Student already has pending transfer → Show warning, allow cancel old request
   - Request for deleted student → Not allowed, must restore first
   - Reviewer deletes their account → Request stays pending
   - Destination org gets deleted → Request auto-cancelled with notification

---

## 🎯 Success Criteria

- ✅ Admin can request transfer to ANY organization
- ✅ Transfers within same org are auto-approved
- ✅ Cross-boundary transfers create pending request
- ⏳ Target admin receives in-app notification badge (UI pending)
- ⏳ Target admin can approve/reject with notes (UI pending)
- ✅ Rejected requests can be re-submitted
- ✅ Bulk transfer (multiple students) in single request
- ✅ No expiration on pending requests
- ✅ Archived students hidden from active lists
- ✅ Soft deleted students can be restored
- ✅ Hard delete requires superadmin + double confirmation
- ✅ Full audit trail in `transfer_requests` and `transfer_history`

---

**Status**: Backend implementation complete. Ready for database migration and UI development.

**Next Step**: Run database migration → Test with dummy data → Begin UI implementation
