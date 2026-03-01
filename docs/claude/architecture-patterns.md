# Architecture Patterns & Complex Implementations

This document contains detailed implementation patterns for complex features in the Generus Mandiri project. For the core architecture overview (App Router, Database, Access Control, State Management), see [CLAUDE.md](../../CLAUDE.md).

---

## Hierarchical Teacher Pattern (Guru Desa/Daerah)

**CRITICAL**: Teachers with organizational hierarchy (`desa_id`/`daerah_id`) behave differently from regular teachers.

**Organizational Teachers** (Guru Desa/Daerah):
- Have `role = 'teacher'` in profiles
- Have `desa_id` (Guru Desa) OR `daerah_id` (Guru Daerah) populated
- Do NOT have entries in `teacher_classes` junction table
- Should see ALL data in their organizational scope (like admins)
- Can ONLY create Sambung Desa/Sambung Daerah meetings

### Detection Pattern

```typescript
// Client-side (components/hooks)
const isHierarchicalTeacher = (userProfile.daerah_id || userProfile.desa_id || userProfile.kelompok_id) &&
                               (!userProfile.classes || userProfile.classes.length === 0)

// Server-side (actions)
if (profile?.role === 'teacher') {
  if (profile.teacher_classes && profile.teacher_classes.length > 0) {
    // Regular teacher: has assigned classes
  } else if (profile.kelompok_id || profile.desa_id || profile.daerah_id) {
    // Hierarchical teacher: has organizational access
  }
}
```

### Implementation Requirements

1. **Profile Queries**: MUST include organizational fields
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select(`
       role,
       kelompok_id,
       desa_id,
       daerah_id,
       teacher_classes!left(class_id, classes(id, name))
     `)
   ```
   - Use `left` join for `teacher_classes` (handles both regular and hierarchical)

2. **Data Filtering**: Apply hierarchical filters like admins
   ```typescript
   if (profile.kelompok_id) {
     query = query.eq('kelompok_id', profile.kelompok_id)
   } else if (profile.desa_id) {
     query = query.eq('kelompok.desa_id', profile.desa_id)
   } else if (profile.daerah_id) {
     query = query.eq('kelompok.desa.daerah_id', profile.daerah_id)
   }
   ```

3. **Admin Client Usage**: Bypass RLS for hierarchical access
   ```typescript
   const adminClient = await createAdminClient()
   // Use adminClient for queries, apply organizational filters manually
   ```

4. **UI Display Logic**: Show all classes like admins
   ```typescript
   if (isHierarchicalTeacher) {
     // Show ALL classes in student's records
     displayClasses = student.classes.map(c => c.name).join(', ')
   } else {
     // Regular teacher: filter to only their assigned classes
     displayClasses = student.classes.filter(c => teacherClassIds.includes(c.id))
   }
   ```

5. **Meeting Types & Attendance Access**:
   - Hierarchical teachers with no classes can still access meeting types by relying on organizational level (`daerah_id`, `desa_id`, `kelompok_id`).
   - Use `isHierarchicalTeacher` bypassing logic in `absensi/[meetingId]/page.tsx` class filters (`canUserEditMeetingAttendance` from `meetingHelpersClient`).
   - Ensure the `UserProfile` interfaces correctly type the organizational fields as `string | null` to match Supabase's structure and avoid strict TS assigning issues.

### Files with Hierarchical Teacher Support (sm-3ud)

- `src/app/(admin)/users/siswa/actions/classes.ts` - getAllClasses()
- `src/app/(admin)/users/siswa/actions.ts` - getAllStudents()
- `src/app/(admin)/absensi/actions.ts` - getMeetingsWithStats()
- `src/app/(admin)/laporan/actions.ts` - getAttendanceReport()
- `src/app/(admin)/users/siswa/components/StudentsTable.tsx` - Class display
- `src/app/(admin)/laporan/hooks/useLaporanPage.ts` - Table data mapping + **auto-set filter**

### Auto-Set Filter Pattern for Single Kelompok/Class

For better UX, pages with DataFilter should auto-select filters when user has only 1 option:

```typescript
// Auto-set class filter for teachers with exactly 1 class
useEffect(() => {
  if (userProfile?.role === 'teacher' && userProfile.classes?.length === 1) {
    const teacherClassId = userProfile.classes[0].id
    if (!filters.organisasi?.kelas?.includes(teacherClassId)) {
      setFilter('organisasi', { daerah: [], desa: [], kelompok: [], kelas: [teacherClassId] })
    }
  }
}, [userProfile?.role, userProfile?.classes, filters.organisasi?.kelas, setFilter])

// Auto-set kelompok filter for teachers with exactly 1 kelompok (no classes)
useEffect(() => {
  if (userProfile?.role === 'teacher' && userProfile.kelompok_id && (!userProfile.classes || userProfile.classes.length === 0)) {
    if (!filters.organisasi?.kelompok?.includes(userProfile.kelompok_id)) {
      setFilter('organisasi', { daerah: [], desa: [], kelompok: [userProfile.kelompok_id], kelas: [] })
    }
  }
}, [userProfile?.role, userProfile?.kelompok_id, userProfile?.classes, filters.organisasi?.kelompok, setFilter])
```

- **When to use**: Pages that require filters to show data (Laporan, Absensi list, Student list)
- **Benefit**: Prevents "no data" state when user has only 1 valid option
- **Reference**: `src/app/(admin)/laporan/hooks/useLaporanPage.ts` line 166-194

### Common Pitfalls

- Checking only `teacher_classes` length (hierarchical teachers have 0)
- Using regular user client instead of admin client
- Forgetting to include organizational fields in profile query
- Not handling both `class_id` and `class_ids` in meeting filtering
- Not auto-setting filters for single-option users (causes "no data" bugs)

**Reference Implementation**: See `.beads/progress/sm-3ud.md` for complete hierarchical teacher implementation.

---

## Class Filter Display Format (sm-de3)

Unified format for multi-kelompok selection:

- **All users** (Guru with 2+ kelompok, Admin Desa, Guru Desa, Guru Daerah, Admin Daerah) show **consistent format**
- When 2+ kelompok selected: Show `"Class Name (X kelompok)"` format (deduplicated with count)
- When single/no kelompok: Show `"Class Name"` only (no suffix)
- Implementation: `DataFilter.tsx` uses unified Path 2 deduplication logic

### CRITICAL: Comma-separated Class IDs

Class values may be comma-separated (`"id1,id2,id3"`) for multi-kelompok classes:
- Always split comma-separated IDs before processing: `classId.includes(',') ? classId.split(',') : [classId]`
- See: `useLaporanPage.ts` auto-extract kelompok logic for reference implementation

**Related Issues**: sm-de3 (auto-clear bug fix), sm-hov (duplicate issue)

---

## Dashboard Metrics Pattern

Dual metrics for attendance calculation:

### Primary Metric (Simple Average)
Displayed in main stat card.
- Formula: `(sum of entity_attendance_rate) / entity_count`
- Use case: "Bagaimana performa rata-rata desa/kelompok/kelas?"
- Example: `(81% + 100% + 73% + 75% + 68% + 47%) / 6 = 74%`
- User-friendly, intuitif, consistent with table display

### Secondary Metric (Weighted Average)
Displayed in tooltip.
- Formula: `(sum of total_students_present) / (sum of total_potential_attendance) x 100`
- Use case: "Berapa persen siswa yang benar-benar hadir?"
- Example: `12,500 / 25,000 x 100 = 50%`
- Accurate for resource planning, reflects scale/impact

### Supporting Data
Table shows "Pertemuan" and "Siswa" columns:
- Helps user understand why simple != weighted
- Enables manual verification and deeper analysis

### Files
- **Implementation**: `src/app/(admin)/dashboard/page.tsx` - `attendanceMetrics` useMemo
- **Detailed Documentation**: READ [`docs/claude/dashboard-attendance-calculation-id.md`](dashboard-attendance-calculation-id.md)
- **Related Issues**: sm-nol (dashboard comparison charts)

---

## Meeting Count Deduplication

CRITICAL for multi-class meetings aggregation.

### Problem
Multi-class meetings (SAMBUNG_KELOMPOK, SAMBUNG_DESA, SAMBUNG_DAERAH) were counted multiple times when aggregating by kelompok/desa/daerah.
- Example: 1 meeting for 7 classes in Kelompok "Nambo" showed as **2 meetings**
- Root cause: Aggregation summed `meeting_count` per class without deduplication

### Solution
Use `meeting_ids` array + Set for deduplication:
- `ClassMonitoringData` includes `meeting_ids?: string[]` field
- `aggregateMonitoringData()` uses `Set<string>()` to track unique meeting IDs
- Final `meeting_count` = `meetingIds.size` (deduplicated)

### Files
- `src/app/(admin)/dashboard/actions.ts` - Returns `meeting_ids` in monitoring data
- `src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts` - Deduplication logic
- `src/app/(admin)/dashboard/page.tsx` - Tracks `meetingIds` in aggregation

### Impact
- Per Kelompok: Multi-class meetings counted once (was N times)
- Per Desa: Cross-kelompok meetings counted once (was N times)
- Per Daerah: Cross-desa meetings counted once (was N times)

**Verification**: Kelompok "Nambo" now shows **1 pertemuan** (was 2).
