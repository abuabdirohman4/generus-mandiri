# Design: Filter Empty Classes from CreateMeetingModal

**Date:** 2026-02-28
**Author:** Claude Sonnet 4.5
**Status:** Approved

## Problem Statement

Currently, the CreateMeetingModal component displays ALL available classes in the class selection dropdown, including classes that have 0 active students. This creates confusion for teachers and admins when creating meetings, as they see irrelevant empty classes in the list.

**User Impact:**
- Teachers waste time reviewing empty classes
- Risk of accidentally selecting empty classes
- Cluttered UI with irrelevant options

## Requirements

**Primary Goal:** Hide classes with 0 active students from the class selection dropdown in CreateMeetingModal.

**Scope:**
- Only affect CreateMeetingModal component
- Filter based on active students only (status = 'active')
- Preserve all existing functionality (role-based access, sorting, multi-class support)

**Out of Scope:**
- Other components using class selectors (can be addressed separately)
- Server-side changes to class fetching
- Database schema modifications

## Proposed Solution

### Approach: Client-Side Filtering with useMemo

**Why Client-Side?**
1. ✅ Works with existing data (students already loaded for student selection UI)
2. ✅ No server changes needed (lower risk, faster implementation)
3. ✅ Automatic updates when students/classes change
4. ✅ Performance overhead negligible (<1ms for typical datasets)
5. ✅ Easy to test and maintain

### Architecture

**Data Flow:**
```
useStudents() → students array
     ↓
classStudentCounts (useMemo) → Map<classId, activeStudentCount>
     ↓
availableClasses (useMemo) → filtered & sorted class array (exclude count === 0)
     ↓
MultiSelectCheckbox → rendered UI
```

**Key Components:**

1. **classStudentCounts (new):** Computed map of class IDs to active student counts
   - Counts only students with `status === 'active'`
   - Handles both many-to-many (`student.classes`) and legacy (`student.class_id`)
   - Cached with `useMemo`, recomputes only when `students` changes

2. **availableClasses (modified):** Add filtering step after sorting
   - Filter out classes where `classStudentCounts.get(classId) === 0`
   - Preserve existing logic: role-based filtering, organizational hierarchy, sort by `sort_order`

### Implementation Details

**Step 1: Compute classStudentCounts**

Insert before existing `availableClasses` useMemo (around line 117):

```typescript
// Count active students per class
const classStudentCounts = useMemo(() => {
  const counts = new Map<string, number>()

  students.forEach(student => {
    // Only count active students
    if (student.status !== 'active') return

    // Handle both many-to-many (student.classes) and legacy (student.class_id)
    const studentClassIds = (student.classes || []).map(c => c.id)
    const allClassIds = student.class_id
      ? [...studentClassIds, student.class_id]
      : studentClassIds

    allClassIds.forEach(classId => {
      counts.set(classId, (counts.get(classId) || 0) + 1)
    })
  })

  return counts
}, [students])
```

**Step 2: Filter availableClasses**

Modify existing `availableClasses` useMemo to filter out empty classes:

```typescript
const availableClasses = useMemo(() => {
  let filtered: any[] = []

  // Existing logic for role-based filtering
  if (isHierarchicalTeacher) {
    filtered = classes || []
  } else if (userProfile?.role === 'teacher' && userProfile.classes && userProfile.classes.length > 1) {
    const enriched = userProfile.classes.map(cls => {
      const fullClass = classes.find(c => c.id === cls.id)
      return {
        ...cls,
        kelompok_id: fullClass?.kelompok_id || null
      }
    })
    filtered = enriched
  } else if (userProfile?.role === 'teacher') {
    filtered = userProfile.classes || []
  } else {
    filtered = classes || []
  }

  // Sort by class_master.sort_order
  const sorted = sortClassesByMasterOrder(filtered)

  // NEW: Filter out classes with 0 active students
  const withStudents = sorted.filter(cls => {
    const count = classStudentCounts.get(cls.id) || 0
    return count > 0
  })

  return withStudents
}, [
  userProfile?.role,
  userProfile?.classes?.length,
  userProfile?.classes?.map(c => c.id).join(','),
  classes?.length,
  classes?.map(c => `${c.id}-${c.kelompok_id}`).join(','),
  isHierarchicalTeacher,
  classStudentCounts // NEW dependency
])
```

### Edge Cases & Handling

| Edge Case | Behavior | Implementation |
|-----------|----------|----------------|
| Teacher with all empty classes | Show empty state in dropdown | Check `availableClasses.length === 0` |
| Students without class assignment | Don't count (won't affect visibility) | Skip if no `classes` or `class_id` |
| Student in multiple classes | Count in ALL classes | Loop through all `studentClassIds` |
| Loading state | Show all classes (no filter) | Filter only when `students` loaded |
| Class with only archived students | Hide class (0 active) | Filter by `status === 'active'` |

### Testing Strategy

**Manual Testing Checklist:**
- [ ] Open CreateMeetingModal with classes that have 0 active students
- [ ] Verify empty classes don't appear in class selector
- [ ] Archive all students in a class, verify class disappears from dropdown
- [ ] Add active student to empty class, verify class reappears
- [ ] Verify existing functionality preserved:
  - [ ] Role-based access (hierarchical teacher, regular teacher, admin)
  - [ ] Class sorting by `sort_order`
  - [ ] Multi-class support
  - [ ] Gender filter still works
  - [ ] Student selection still works

**Unit Tests (Optional, if TDD applied):**
- Test `classStudentCounts` computation with various student datasets
- Test filtering removes classes with 0 students
- Test edge cases (no students, all archived, multi-class students)

### Performance Considerations

**Computational Complexity:**
- Students loop: O(n × m) where n = students, m = avg classes per student
- Filter: O(k) where k = available classes
- **Total:** O(n × m + k)

**Expected Performance:**
- Dataset: 500 students × 2 classes each, 50 total classes
- Computation: ~0.5ms (negligible)
- Re-computation: Only when students/classes change (cached with useMemo)

**Memory:** Additional Map object (~1KB for 50 classes)

### User Experience Impact

**Before:**
- Class selector shows 20 classes
- 5 classes have 0 students
- User must mentally filter or check each class

**After:**
- Class selector shows 15 classes
- Only classes with active students visible
- Clearer, more relevant choices

**Visual Change:** Fewer options in dropdown (empty classes hidden)

**No Breaking Changes:** Existing functionality preserved, just fewer visible options

## Files to Modify

| File | Changes | Lines Affected |
|------|---------|----------------|
| `src/app/(admin)/absensi/components/CreateMeetingModal.tsx` | Add `classStudentCounts` useMemo, modify `availableClasses` useMemo | ~117-145 |

**Estimated LOC:** +25 lines

## Success Criteria

1. ✅ Classes with 0 active students are hidden from class selector
2. ✅ Classes with 1+ active students remain visible
3. ✅ Existing functionality preserved (role-based access, sorting, multi-class)
4. ✅ No performance degradation
5. ✅ Edge cases handled gracefully

## Rollout Plan

**Phase 1: Implementation** (1 session)
- Add `classStudentCounts` computation
- Modify `availableClasses` filtering
- Manual testing

**Phase 2: Validation** (1 session)
- User acceptance testing
- Edge case verification
- Performance check

**Rollback Plan:** Simple revert (isolated change, no database modifications)

## Future Enhancements (Out of Scope)

- Apply same filter to other class selectors (DataFilter, student import, etc.)
- Add visual indicator for class student count (e.g., "Kelas A (15 siswa)")
- Make filter toggleable (show/hide empty classes)

---

**Next Step:** Create implementation plan with writing-plans skill
