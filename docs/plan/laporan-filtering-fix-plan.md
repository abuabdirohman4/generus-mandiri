# Plan: Fix Laporan Class/Kelompok Filtering Bug

## Problem Summary

When selecting a specific class from a specific kelompok on the laporan page, the system incorrectly displays:
- Data from other kelompok
- Data from classes that were not selected
- Incorrect percentages in the table

**User Confirmation**: The dashboard page ([src/app/(admin)/dashboard/page.tsx](src/app/(admin)/dashboard/page.tsx)) has CORRECT percentage calculations per class and per month. We will learn from how dashboard handles filtering.

## Root Cause Analysis

The filtering system has a **client-server separation issue**:

### The Disconnect
1. **Client-side**: UI correctly cascades filters (kelompok → class selection)
   - User selects "Kelompok A" in DataFilter
   - Dropdown shows only classes from "Kelompok A"
   - User selects "Pra Nikah" class

2. **Server-side**: Only validates `classId`, missing kelompok context
   - Hook passes `classId="xyz"` to server
   - Server has NO context that user selected "Kelompok A"
   - Server fetches ALL meetings for class "xyz" (could include other kelompok instances)

3. **Result**: Data leakage across organizational boundaries

### Key Difference: Dashboard (Correct) vs Laporan (Buggy)

**Dashboard (`getClassMonitoring`)** - Lines 350-372, 518-524 of [dashboard/actions.ts](src/app/(admin)/dashboard/actions.ts):
- Fetches `student_classes` with kelompok context
- Builds strict class+kelompok enrollment maps
- Only counts attendance for students enrolled in THAT specific class+kelompok combo

**Laporan (`getAttendanceReport`)** - Lines 346-374, 448-467 of [laporan/actions.ts](src/app/(admin)/laporan/actions.ts):
- Fetches student data with kelompok info but doesn't use it for filtering
- Class filter only validates meeting's class (line 448-467)
- NO validation that class belongs to selected kelompok
- NO validation that student belongs to selected kelompok

## Critical Files

1. [src/app/(admin)/laporan/actions.ts](src/app/(admin)/laporan/actions.ts) - Server-side filtering logic (lines 58-88, 346-467)
2. [src/app/(admin)/laporan/hooks/useLaporanPage.ts](src/app/(admin)/laporan/hooks/useLaporanPage.ts) - Hook that calls server action (line 38-40)
3. [src/app/(admin)/dashboard/actions.ts](src/app/(admin)/dashboard/actions.ts) - Reference for correct pattern (lines 350-372)

## Implementation Plan

### Step 1: Update ReportFilters Interface
**File**: [src/app/(admin)/laporan/actions.ts](src/app/(admin)/laporan/actions.ts) (lines 58-88)

Add kelompok filter field to `ReportFilters` interface:
```typescript
export interface ReportFilters {
  // ... existing fields
  classId?: string
  kelompokId?: string // NEW: Add kelompok filter
  // ... rest of fields
}
```

### Step 2: Pass Kelompok Filter from Hook to Server Action
**File**: [src/app/(admin)/laporan/hooks/useLaporanPage.ts](src/app/(admin)/laporan/hooks/useLaporanPage.ts) (line 38-40)

Modify the filters passed to `getAttendanceReport()`:
```typescript
classId: filters.organisasi?.kelas?.length ? filters.organisasi.kelas.join(',') : filters.classId || undefined,
kelompokId: filters.organisasi?.kelompok?.length ? filters.organisasi.kelompok.join(',') : undefined, // NEW
```

**Why**: Mirrors existing `classId` pattern (comma-separated for multi-select). Uses `filters.organisasi.kelompok` which DataFilter already populates.

### Step 3: Build Class-to-Kelompok Mapping
**File**: [src/app/(admin)/laporan/actions.ts](src/app/(admin)/laporan/actions.ts) (after line 374)

Insert after fetching students data:
```typescript
// Build class-to-kelompok mapping for validation
const classKelompokMap = new Map<string, string>()
if (studentsData) {
  studentsData.forEach(student => {
    student.student_classes?.forEach((sc: any) => {
      if (sc.classes?.id && sc.classes?.kelompok_id) {
        classKelompokMap.set(sc.classes.id, sc.classes.kelompok_id)
      }
    })
  })
}
```

**Why**: Enables defense-in-depth validation - we can validate BOTH meeting's class AND student's kelompok.

### Step 4: Add Dual-Validation Kelompok Filter
**File**: [src/app/(admin)/laporan/actions.ts](src/app/(admin)/laporan/actions.ts) (after line 467)

Add kelompok filtering logic after the class filter:
```typescript
// Apply kelompok filter - validate students AND meetings belong to selected kelompok
if (filters.kelompokId) {
  const kelompokIds = filters.kelompokId.split(',')

  filteredLogs = filteredLogs.filter((log: any) => {
    const student = log.students
    const meeting = meetingMap.get(log.meeting_id)
    if (!student || !meeting) return false

    // Validation 1: Check if meeting's class belongs to selected kelompok
    const meetingClassId = meeting.class_id
    const meetingClassKelompok = classKelompokMap.get(meetingClassId)

    if (meetingClassKelompok && !kelompokIds.includes(meetingClassKelompok)) {
      return false // Meeting's class not in selected kelompok
    }

    // Validation 2: Check if student belongs to selected kelompok
    // Check student's primary kelompok_id
    if (student.kelompok_id && kelompokIds.includes(student.kelompok_id)) {
      return true
    }

    // For multi-kelompok students, check via student_classes
    if (student.student_classes && Array.isArray(student.student_classes)) {
      return student.student_classes.some((sc: any) => {
        const cls = sc.classes
        return cls && cls.kelompok_id && kelompokIds.includes(cls.kelompok_id)
      })
    }

    return false
  })
}
```

**Why this dual validation**:
- **Validation 1**: Ensures meeting's class belongs to selected kelompok (prevents wrong meetings)
- **Validation 2**: Ensures student belongs to selected kelompok (prevents wrong students)
- **Handles edge cases**: Multi-class meetings, multi-kelompok students
- **Defense-in-depth**: Even if class filter passes, kelompok filter ensures correct scope

### Step 5: Update Meetings Filter for Consistency
**File**: [src/app/(admin)/laporan/actions.ts](src/app/(admin)/laporan/actions.ts) (around line 512)

Enhance the meetings filter to respect kelompok:
```typescript
// Filter meetings by class AND kelompok
const filteredMeetings = filters.classId
  ? meetingsToFilter.filter((meeting: any) => {
      const classIds = filters.classId!.split(',')
      // Check primary class_id
      if (classIds.includes(meeting.class_id)) {
        // NEW: If kelompok filter active, validate class belongs to kelompok
        if (filters.kelompokId) {
          const kelompokIds = filters.kelompokId.split(',')
          const meetingClassKelompok = classKelompokMap.get(meeting.class_id)
          if (!meetingClassKelompok || !kelompokIds.includes(meetingClassKelompok)) {
            return false
          }
        }
        return true
      }
      // Check class_ids array for multi-class meetings
      if (meeting.class_ids && Array.isArray(meeting.class_ids)) {
        return meeting.class_ids.some((id: string) => {
          if (!classIds.includes(id)) return false

          // NEW: Validate kelompok for multi-class meetings
          if (filters.kelompokId) {
            const kelompokIds = filters.kelompokId.split(',')
            const classKelompok = classKelompokMap.get(id)
            if (!classKelompok || !kelompokIds.includes(classKelompok)) {
              return false
            }
          }
          return true
        })
      }
      return false
    })
  : meetingsToFilter
```

**Why filter meetings too**:
- **Consistency**: Ensures trend chart and meeting counts only show relevant meetings
- **Performance**: Reduces data processing for aggregations
- **User experience**: Charts show accurate data for selected kelompok

## Test Cases

### Test 1: Single Kelompok Selection
- Select "Kelompok A" → "Pra Nikah"
- **Expected**: ONLY students from "Kelompok A" appear
- **Expected**: Percentages calculated only from "Kelompok A" data
- **Expected**: Table shows NO students from other kelompok

### Test 2: Multi-Kelompok Selection
- Select "Kelompok A, Kelompok B" → "Pra Nikah"
- **Expected**: Students from BOTH kelompok appear
- **Expected**: NO students from "Kelompok C" appear

### Test 3: No Kelompok Filter (All Kelompok)
- Select "Semua Kelompok" → "Pra Nikah"
- **Expected**: ALL students from all kelompok appear
- **Expected**: Existing behavior preserved

### Test 4: Multi-Class Students
- Student enrolled in "Pra Nikah (Kelompok A)" AND "Remaja (Kelompok B)"
- Select "Kelompok A" → "Pra Nikah"
- **Expected**: Student appears ONLY with "Pra Nikah" data
- **Expected**: "Remaja" attendance NOT included

### Test 5: Multi-Class Meetings
- Meeting with `class_ids: ["PraNikah-A", "PraNikah-B"]`
- Select "Kelompok A" only
- **Expected**: Meeting appears but ONLY shows students from "Kelompok A"

### Test 6: Access Control
- Verify admin_kelompok, admin_desa, admin_daerah still see correct scoped data
- Verify RLS policies still work correctly

## Expected Outcome

After this fix:
- ✅ Selecting Kelompok A + Class X shows ONLY attendance from Kelompok A's Class X
- ✅ Table displays ONLY students from the selected kelompok
- ✅ Percentages calculated correctly based on filtered dataset
- ✅ No data leakage across kelompok boundaries
- ✅ Server-side validation matches client-side UI cascading logic
- ✅ Charts and trend data reflect only selected kelompok

## Implementation Notes

- Uses existing `student_classes` junction table data (already fetched at lines 357-368)
- No additional database queries needed
- Filter logic is additive (class filter → kelompok filter)
- Preserves existing behavior when kelompok filter is not selected
- Critical data integrity and access control fix
- Follows dashboard's proven filtering pattern
