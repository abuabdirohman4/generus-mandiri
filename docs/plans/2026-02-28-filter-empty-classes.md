# Filter Empty Classes from CreateMeetingModal - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hide classes with 0 active students from the CreateMeetingModal class selector to reduce UI clutter and prevent confusion.

**Architecture:** Client-side filtering using `useMemo` to compute active student counts per class, then filter `availableClasses` to exclude empty classes. No server changes needed—leverages existing `useStudents()` data.

**Tech Stack:** React 19, TypeScript, Next.js 15, useMemo for performance optimization

**Related:** Design document at `docs/plans/2026-02-28-filter-empty-classes-design.md`, Beads issue `sm-pis`

---

## Task 1: Add classStudentCounts Computation

**Files:**
- Modify: `src/app/(admin)/absensi/components/CreateMeetingModal.tsx:115-117`

**Context:** We need to count how many active students belong to each class. Insert this new `useMemo` hook BEFORE the existing `availableClasses` useMemo (currently at line 118).

**Step 1: Add classStudentCounts useMemo**

Insert at line 116 (after `isHierarchicalTeacher` useMemo, before `availableClasses`):

```typescript
  // Count active students per class for filtering empty classes
  const classStudentCounts = useMemo(() => {
    const counts = new Map<string, number>()

    students.forEach(student => {
      // Only count active students (exclude graduated/inactive)
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

**Step 2: Verify syntax and imports**

Check that:
- `students` is available from `useStudents()` hook (line 64)
- No TypeScript errors (Map<string, number> is valid)
- Placement is correct (before `availableClasses` useMemo)

**Step 3: Save file**

```bash
# Just save, don't commit yet (we'll test after Step 2)
```

---

## Task 2: Modify availableClasses to Filter Empty Classes

**Files:**
- Modify: `src/app/(admin)/absensi/components/CreateMeetingModal.tsx:118-144`

**Context:** The existing `availableClasses` useMemo does role-based filtering and sorting. We need to add a final filtering step to remove classes with 0 active students.

**Step 1: Locate the existing availableClasses useMemo**

Current structure (lines 118-144):
```typescript
const availableClasses = useMemo(() => {
  if (isHierarchicalTeacher) {
    return sortClassesByMasterOrder(classes || [])
  }

  if (userProfile?.role === 'teacher' && userProfile.classes && userProfile.classes.length > 1) {
    const enriched = userProfile.classes.map(cls => {
      const fullClass = classes.find(c => c.id === cls.id)
      return {
        ...cls,
        kelompok_id: fullClass?.kelompok_id || null
      }
    })
    return sortClassesByMasterOrder(enriched)
  } else if (userProfile?.role === 'teacher') {
    return sortClassesByMasterOrder(userProfile.classes || [])
  }
  return sortClassesByMasterOrder(classes || [])
}, [
  userProfile?.role,
  userProfile?.classes?.length,
  userProfile?.classes?.map(c => c.id).join(','),
  classes?.length,
  classes?.map(c => `${c.id}-${c.kelompok_id}`).join(','),
  isHierarchicalTeacher
])
```

**Step 2: Refactor to use intermediate variables and add filtering**

Replace the entire `availableClasses` useMemo (lines 118-144) with:

```typescript
const availableClasses = useMemo(() => {
  let filtered: any[] = []

  // Role-based filtering (existing logic)
  if (isHierarchicalTeacher) {
    filtered = classes || []
  } else if (userProfile?.role === 'teacher' && userProfile.classes && userProfile.classes.length > 1) {
    // Enrich teacher classes with kelompok_id from classes
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

  // Sort by class_master.sort_order (existing logic)
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

**Step 3: Verify the changes**

Check that:
- All early returns are replaced with intermediate variables
- Sorting logic preserved (sortClassesByMasterOrder called)
- Filter step added AFTER sorting
- `classStudentCounts` added to dependency array
- No TypeScript errors

**Step 4: Save file**

```bash
# Save the file
```

---

## Task 3: Manual Testing

**Files:**
- Test: CreateMeetingModal component in browser

**Prerequisites:**
- Development server running (`npm run dev`)
- Test database with some classes that have 0 active students

**Step 1: Start dev server if not running**

```bash
npm run dev
```

Expected: Server starts at http://localhost:3000

**Step 2: Test Case 1 - Empty classes are hidden**

1. Navigate to `/absensi` page
2. Click "Buat Pertemuan" button to open CreateMeetingModal
3. Look at "Pilih Kelas" dropdown

Expected:
- Classes with 1+ active students appear
- Classes with 0 active students do NOT appear
- No console errors

**Step 3: Test Case 2 - Role-based access still works**

Test with different user roles:
- Superadmin: Should see all non-empty classes
- Admin Daerah/Desa/Kelompok: Should see non-empty classes in their scope
- Teacher (regular): Should see only their assigned non-empty classes
- Teacher (hierarchical): Should see all non-empty classes in their scope

Expected: Role-based filtering preserved, empty classes still filtered

**Step 4: Test Case 3 - Existing functionality preserved**

In CreateMeetingModal:
1. Select classes from dropdown
2. Verify students from selected classes appear
3. Apply gender filter
4. Select meeting type
5. Submit form

Expected: Everything works as before, just with fewer class options

**Step 5: Test Case 4 - Edge case (all classes empty)**

If you have a teacher/admin with ALL empty classes:

Expected:
- Class selector shows empty state or 0 options
- No crashes or errors
- Form still renders properly

**Step 6: Test Case 5 - Dynamic updates**

(Optional, if you have ability to modify data)
1. Archive all students in a class → class disappears
2. Add active student to empty class → class reappears

Expected: UI updates automatically (SWR revalidation)

---

## Task 4: Code Review and Cleanup

**Files:**
- Review: `src/app/(admin)/absensi/components/CreateMeetingModal.tsx`

**Step 1: Check code quality**

Review checklist:
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Consistent formatting
- [ ] TypeScript types correct
- [ ] Dependencies in useMemo array are complete
- [ ] No performance warnings in browser console

**Step 2: Verify edge cases are handled**

Check the code handles:
- [ ] Students without `classes` array (uses `student.class_id` fallback)
- [ ] Students with `status !== 'active'` (excluded from count)
- [ ] Classes not in `classStudentCounts` map (treated as 0)
- [ ] Empty arrays (`students === []` or `classes === []`)

**Step 3: Check for regressions**

Verify these features still work:
- [ ] Class sorting by `sort_order`
- [ ] Multi-kelompok class deduplication in labels
- [ ] Gender filter
- [ ] Student selection with previously selected students
- [ ] Meeting type auto-selection
- [ ] Form submission

---

## Task 5: Commit and Sync

**Files:**
- Commit: `src/app/(admin)/absensi/components/CreateMeetingModal.tsx`

**Step 1: Check git status**

```bash
git status
```

Expected: Shows `CreateMeetingModal.tsx` as modified

**Step 2: Review the diff**

```bash
git diff src/app/\(admin\)/absensi/components/CreateMeetingModal.tsx
```

Expected: Shows +~30 lines (classStudentCounts + refactored availableClasses)

**Step 3: Stage the changes**

```bash
git add src/app/\(admin\)/absensi/components/CreateMeetingModal.tsx
```

**Step 4: Commit with descriptive message**

```bash
git commit -m "$(cat <<'EOF'
feat(absensi): filter empty classes from CreateMeetingModal selector

- Add classStudentCounts useMemo to compute active student count per class
- Modify availableClasses to filter out classes with 0 active students
- Preserve existing functionality: role-based access, sorting, multi-class
- Improve UX by reducing clutter in class selector dropdown

Fixes: sm-pis

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Step 5: Update beads issue status**

```bash
bd update sm-pis --status=in_progress
```

**Step 6: Sync beads (commit beads changes)**

```bash
bd sync
```

Expected: Beads changes committed to git

**Step 7: Push to remote**

```bash
git push
```

Expected: Changes pushed to remote repository

---

## Task 6: Close Beads Issue

**Files:**
- Update: `.beads/issues.jsonl`

**Step 1: Mark issue as completed**

```bash
bd close sm-pis
```

Expected: Issue status changed to "closed"

**Step 2: Verify closure**

```bash
bd show sm-pis
```

Expected: Status shows "closed"

**Step 3: Sync beads to commit closure**

```bash
bd sync
```

**Step 4: Push to remote**

```bash
git push
```

---

## Success Criteria Checklist

After completing all tasks, verify:

- [x] Classes with 0 active students are hidden from class selector
- [x] Classes with 1+ active students remain visible
- [x] Existing functionality preserved:
  - [x] Role-based access (hierarchical teacher, regular teacher, admin)
  - [x] Class sorting by `sort_order`
  - [x] Multi-class support
  - [x] Gender filter works
  - [x] Student selection works
  - [x] Meeting creation/edit works
- [x] No performance degradation (no lag in modal)
- [x] No console errors
- [x] Code committed and pushed
- [x] Beads issue closed

---

## Rollback Plan (If Needed)

If issues are discovered:

```bash
# Revert the commit
git revert HEAD

# Or reset to previous commit
git reset --hard HEAD~1

# Reopen beads issue
bd reopen sm-pis

# Push changes
git push --force-with-lease
```

---

## Notes for Implementer

**Key Points:**
1. This is a pure client-side change—no server actions or database changes
2. The filter uses `useMemo` for performance—only recomputes when `students` changes
3. Students with `status !== 'active'` are excluded from counts (business rule)
4. The implementation handles both many-to-many (`student.classes`) and legacy (`student.class_id`) relationships
5. Existing role-based filtering and sorting are preserved—we just add filtering at the end

**Common Pitfalls:**
- Don't forget to add `classStudentCounts` to the `availableClasses` dependency array
- Make sure to filter AFTER sorting, not before (preserve sort order)
- Handle edge case where class is not in `classStudentCounts` map (use `|| 0`)

**Testing Tips:**
- Use browser DevTools to check `availableClasses` value in React components
- Check Network tab to ensure no extra API calls
- Test with different user roles (superadmin, admin, teacher)

**Performance:**
- Expected computation time: <1ms for typical datasets (500 students, 50 classes)
- Memory overhead: ~1KB for Map object
- No additional network requests

---

**Estimated Time:** 30-45 minutes (including testing)

**Difficulty:** Low (isolated change, well-defined scope)
