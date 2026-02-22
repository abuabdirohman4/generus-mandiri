# Fix Missing Data for Guru Desa/Daerah - Progress Summary

**Beads Issue**: sm-3ud
**Status**: ✅ Complete (Phase 1)
**Total Tests**: 159 passing ✅

## Problem Statement

Guru Desa and Guru Daerah (hierarchical teachers) experienced complete data loss across three critical pages:
1. `/absensi` - Empty meetings page
2. `/users/siswa` - Empty class dropdown and class column
3. `/laporan` - Data visible but organizational columns empty

**Root Cause**: Core data fetching functions only supported regular teachers with `teacher_classes` assignments, not hierarchical teachers with organizational IDs (`desa_id`/`daerah_id`).

## ✅ Completed - Phase 1: Core Data Access

### 1. getAllClasses() Fix (src/app/(admin)/users/siswa/actions/classes.ts)
**Purpose**: Enable class dropdown for hierarchical teachers

**Changes**:
- ✅ Updated profile query to include `kelompok_id`, `desa_id`, `daerah_id`
- ✅ Added hierarchical filtering logic:
  - Kelompok teachers: filter by `kelompok_id`
  - Desa teachers: filter by `kelompok.desa_id`
  - Daerah teachers: filter by `kelompok.desa.daerah_id`
- ✅ Used `left` join for `teacher_classes` (handles both regular and hierarchical)

**Tests**: All existing tests passing ✅

---

### 2. getAllStudents() Fix (src/app/(admin)/users/siswa/actions.ts)
**Purpose**: Enable student list for hierarchical teachers

**Changes**:
- ✅ Added profile organizational fields to query
- ✅ Added hierarchical teacher detection and filtering
- ✅ Used admin client to bypass RLS for hierarchical access
- ✅ Applied organizational filters (kelompok/desa/daerah)

**Tests**: All existing tests passing ✅

---

### 3. getMeetingsWithStats() Fix (src/app/(admin)/absensi/actions.ts)
**Purpose**: Enable meetings page for hierarchical teachers

**Changes**:
- ✅ Added ~300 lines of hierarchical teacher logic
- ✅ Built hierarchical maps: `classToKelompokMap`, `classToDesaMap`, `classToDaerahMap`
- ✅ Mirrored admin filtering pattern for teachers
- ✅ Handled both `class_id` (single) and `class_ids` (array) in meetings
- ✅ Used `.some()` for multi-class meeting filtering

**Tests**: All existing tests passing ✅

---

### 4. Laporan Actions Fix (src/app/(admin)/laporan/actions.ts)
**Purpose**: Fix initialization bug and add organizational fields

**Critical Bug Fixed**:
- ❌ **Error**: "Cannot access 'classToDesaMap' before initialization"
- ✅ **Fix**: Moved map creation from line 541 to line 325 (before filtering logic)

**Organizational Data Added**:
- ✅ Updated `studentsData` query to include `kelompok`, `desa`, `daerah` relations
- ✅ Added to `studentSummary`: `kelompok_name`, `desa_name`, `daerah_name`
- ✅ Added to `detailedRecords`: same organizational fields
- ✅ Updated TypeScript interface to include new fields

**Tests**: All existing tests passing ✅

---

### 5. SWR Retry Logic (src/app/(admin)/laporan/hooks/useReportData.ts)
**Purpose**: Fix premature error toast UX issue

**Problem**:
- ❌ Toast "Gagal memuat laporan" appeared on EVERY filter change
- ❌ Then data appeared - confusing UX

**Fix**:
- ✅ Removed `handleApiError()` toast from server action
- ✅ Added SWR retry configuration:
  - 3 retries with 1s interval
  - Error only logged after all retries fail
  - User-friendly retry messages in console

**Tests**: Manual UX testing confirmed ✅

---

### 6. Students Table Fix (src/app/(admin)/users/siswa/components/StudentsTable.tsx)
**Purpose**: Fix empty Kelas column for hierarchical teachers

**Changes**:
- ✅ Added `isHierarchicalTeacher` detection:
  ```typescript
  const isHierarchicalTeacher = (userProfile.daerah_id || userProfile.desa_id || userProfile.kelompok_id) &&
                                 (!userProfile.classes || userProfile.classes.length === 0)
  ```
- ✅ Hierarchical teachers now see ALL student classes (like admins)
- ✅ Regular teachers still see filtered classes (backward compatible)

**Tests**: Manual verification - column now populated ✅

---

### 7. Laporan Hook Fix (src/app/(admin)/laporan/hooks/useLaporanPage.ts)
**Purpose**: Pass organizational data to table and fix class display

**Changes**:
- ✅ Added organizational fields to `tableData` mapping:
  - `kelompok_name: record.kelompok_name || '-'`
  - `desa_name: record.desa_name || '-'`
  - `daerah_name: record.daerah_name || '-'`
- ✅ Added hierarchical teacher detection for class display
- ✅ Hierarchical teachers now see ALL classes (like admins)

**Tests**: Manual verification - all columns populated ✅

---

## 📊 Phase 1 Metrics

- **Files Modified**: 7
- **Lines Added**: ~500 lines (including hierarchical logic)
- **Bugs Fixed**: 5
  1. Map initialization order bug
  2. Premature error toast UX issue
  3. Empty Kelas column in Students table
  4. Empty organizational columns in Laporan table
  5. Empty Kelas column in Laporan table
- **Test Coverage**: 159/159 tests passing ✅
- **TypeScript Errors**: 0 ✅
- **Backward Compatibility**: ✅ (all existing roles work unchanged)

---

## 🎯 Phase 1 Success Criteria - ALL MET ✅

✅ **Guru Desa can see**:
- All classes in their desa (in class dropdown)
- All students in their desa (in students table)
- All meetings for classes in their desa (in absensi page)
- "Kelas" column populated for all students
- Organizational columns (Desa, Kelompok) populated in reports

✅ **Guru Daerah can see**:
- All classes in their daerah (in class dropdown)
- All students in their daerah (in students table)
- All meetings for classes in their daerah (in absensi page)
- All organizational columns populated

✅ **No Regressions**:
- Regular teachers still see only their assigned classes
- Admin Desa/Daerah functionality unchanged
- All 159 tests passing
- 0 TypeScript errors

---

## ⏳ Phase 2 - Absensi Detail & Modal (NEW ISSUES - Next Session)

### 1. Meeting Detail Page - Empty Data
**File**: `src/app/(admin)/absensi/[meetingId]/page.tsx`
**Issue**: Guru Desa/Daerah see empty data when opening meeting detail
**Status**: ❌ Not started (next session)

### 2. CreateMeetingModal - Wrong Access/UI
**File**: `src/app/(admin)/absensi/components/CreateMeetingModal.tsx`
**Issue**: Guru Desa/Daerah don't have same access/UI as Admin Desa/Daerah
**Status**: ❌ Not started (next session)

### 3. Same Issues for Guru Daerah
**Scope**: Both issues above affect Guru Daerah too
**Status**: ❌ Not started (next session)

---

## 📝 Technical Notes

### Key Patterns Implemented

1. **Hierarchical Teacher Detection**:
   ```typescript
   const isHierarchicalTeacher = (profile.daerah_id || profile.desa_id || profile.kelompok_id) &&
                                  (!profile.teacher_classes || profile.teacher_classes.length === 0)
   ```

2. **Two-Query Pattern for class_master_mappings** (from MEMORY.md):
   - PostgREST nested join with `sort_order` silently fails
   - Always query mappings first, then masters by ID

3. **Admin Client for Hierarchical Access**:
   - Use `createAdminClient()` to bypass RLS
   - Apply organizational filters manually
   - Same pattern as Admin Desa/Daerah

4. **Multi-Class Meeting Handling**:
   - Check both `class_id` (string) and `class_ids` (array)
   - Use `.some()` to check if ANY class matches

### Critical Decisions

- **Why admin client?**: RLS not configured for teacher hierarchical access
- **Why mirror admin pattern?**: Proven working implementation, maintains consistency
- **Why left join for teacher_classes?**: Handles both regular and hierarchical teachers
- **Why SWR retry?**: Better UX than immediate error, handles transient failures

---

## 🚨 Blockers Encountered & Resolved

1. **Map initialization order** → Moved to before filtering ✅
2. **SWR error toast UX** → Added retry logic ✅
3. **Missing organizational data** → Updated queries and mappings ✅
4. **Class display for hierarchical teachers** → Added detection logic ✅

---

**Last Updated**: 2026-02-22 (Phase 1 Complete)
**Next Session**:
1. Fix meeting detail page for hierarchical teachers
2. Fix CreateMeetingModal access/UI for hierarchical teachers
3. Verify both work for Guru Desa and Guru Daerah
