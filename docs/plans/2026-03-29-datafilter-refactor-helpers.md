# DataFilter Refactor: Use Helper Functions in useMemo Hooks

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace inline filtering logic in `DataFilter.tsx` useMemo hooks with calls to the exported functions in `dataFilterHelpers.ts`, making the component thinner and the helpers the single source of truth.

**Architecture:** The helpers (`filterDesaList`, `filterKelompokList`, `filterClassList`) already exist and are tested. The gap is that DataFilter.tsx still contains its own inline versions with extra logic not yet in the helpers. We will update the helpers to handle all cases, update existing tests, then swap the useMemo bodies.

**Tech Stack:** React 19, TypeScript 5, Vitest

**GitHub Issue:** https://github.com/abuabdirohman4/generus-mandiri/issues/16
**Beads Issue:** sm-kk1

---

## Gap Analysis (What's Missing in Helpers vs DataFilter.tsx)

### `filterKelompokList`
- DataFilter has: teacher multi-kelompok case — builds list from `userProfile.classes` when `teacherHasMultipleKelompok` is true
- **Missing in helper** → need to add `teacherHasMultipleKelompok` param

### `filterClassList`
- DataFilter has:
  - `if (!shouldShowKelompok) return classList` guard
  - `isTeacherDesa` path: filter by kelompok in their desa
  - `isTeacherDaerah` path: filter by kelompok in their daerah (needs desaList + kelompokList)
  - `teacherHasMultipleClasses` path
  - `isTeacherDaerah`/`isTeacherDesa` in cascade mode
- **All missing in helper** → need to add `activeDesaList`, `activeKelompokList`, `shouldShowKelompok`, `teacherHasMultipleClasses` params

### `filterDesaList`
- Already equivalent — no changes needed

---

## Task 1: Update `filterKelompokList` — add teacher multi-kelompok case

**Files:**
- Modify: `src/components/shared/dataFilterHelpers.ts`
- Test: `src/components/shared/__tests__/dataFilterHelpers.test.ts`

**Step 1: Write the failing test**

Add to `dataFilterHelpers.test.ts` (after existing mock data):

```typescript
const mockUserTeacherMultiKelompok = {
  role: 'teacher' as const,
  id: 'user-teacher-multi',
  full_name: 'Guru Multi Kelompok',
  daerah_id: 'daerah-1',
  desa_id: 'desa-1',
  kelompok_id: 'kelompok-1',
  classes: [
    { id: 'cls-1', kelompok_id: 'kelompok-1', kelompok: { id: 'kelompok-1', name: 'Kelompok 1' } },
    { id: 'cls-2', kelompok_id: 'kelompok-2', kelompok: { id: 'kelompok-2', name: 'Kelompok 2' } },
  ],
}

it('filterKelompokList: teacher multi-kelompok independent mode builds list from classes', () => {
  const role = detectRole(mockUserTeacherMultiKelompok)
  const result = filterKelompokList({
    kelompokList: mockKelompokList,
    desaList: mockDesaList,
    filters: { daerah: [], desa: [], kelompok: [], kelas: [] },
    userProfile: mockUserTeacherMultiKelompok,
    role,
    cascadeFilters: false,
    teacherHasMultipleKelompok: true,
  })
  expect(result.map(k => k.id)).toEqual(['kelompok-1', 'kelompok-2'])
})

it('filterKelompokList: teacher multi-kelompok cascade mode builds list from classes', () => {
  const role = detectRole(mockUserTeacherMultiKelompok)
  const result = filterKelompokList({
    kelompokList: mockKelompokList,
    desaList: mockDesaList,
    filters: { daerah: [], desa: [], kelompok: [], kelas: [] },
    userProfile: mockUserTeacherMultiKelompok,
    role,
    cascadeFilters: true,
    teacherHasMultipleKelompok: true,
  })
  expect(result.map(k => k.id)).toEqual(['kelompok-1', 'kelompok-2'])
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/components/shared/__tests__/dataFilterHelpers.test.ts
```
Expected: TypeScript/compile error — `teacherHasMultipleKelompok` not in params

**Step 3: Update `FilterKelompokParams` and `filterKelompokList` in dataFilterHelpers.ts**

Add `teacherHasMultipleKelompok?: boolean` to `FilterKelompokParams`.

Add a shared `buildFromClasses()` helper inside the function, then insert two branches:
- In `!cascadeFilters` block: after `isAdminDaerah || isTeacherDaerah`, add `if (isTeacher && teacherHasMultipleKelompok) return buildFromClasses()`
- In cascade block: after `isAdminDaerah || isTeacherDaerah`, add `if (isTeacher && teacherHasMultipleKelompok) return buildFromClasses()`

Full updated function:

```typescript
interface FilterKelompokParams {
  kelompokList: KelompokBase[]
  desaList: DesaBase[]
  filters: DataFilters
  userProfile: MinimalProfile
  role: RoleFlags
  cascadeFilters: boolean
  /** Pass true when teacher has classes spanning multiple kelompok */
  teacherHasMultipleKelompok?: boolean
}

export function filterKelompokList({
  kelompokList,
  desaList,
  filters,
  userProfile,
  role,
  cascadeFilters,
  teacherHasMultipleKelompok = false,
}: FilterKelompokParams): KelompokBase[] {
  const { isSuperAdmin, isAdminDaerah, isAdminDesa, isTeacherDaerah, isTeacherDesa, isTeacher } = role

  const buildFromClasses = (): KelompokBase[] => {
    const seen = new Set<string>()
    const result: KelompokBase[] = []
    userProfile?.classes?.forEach(cls => {
      if (cls.kelompok_id && cls.kelompok && !seen.has(cls.kelompok_id)) {
        seen.add(cls.kelompok_id)
        result.push({ id: cls.kelompok.id, name: cls.kelompok.name, desa_id: '' })
      }
    })
    return result
  }

  if (!cascadeFilters) {
    if (isAdminDesa || isTeacherDesa) {
      return kelompokList.filter(k => k.desa_id === userProfile?.desa_id)
    }
    if (isAdminDaerah || isTeacherDaerah) {
      const validDesaIds = desaList
        .filter(d => d.daerah_id === userProfile?.daerah_id)
        .map(d => d.id)
      return kelompokList.filter(k => validDesaIds.includes(k.desa_id))
    }
    if (isTeacher && teacherHasMultipleKelompok) {
      return buildFromClasses()
    }
    return kelompokList
  }

  if (isSuperAdmin) {
    if (filters.desa.length > 0) {
      return kelompokList.filter(k => filters.desa.includes(k.desa_id))
    }
    if (filters.daerah.length > 0) {
      const validDesaIds = desaList
        .filter(d => filters.daerah.includes(d.daerah_id))
        .map(d => d.id)
      return kelompokList.filter(k => validDesaIds.includes(k.desa_id))
    }
    return kelompokList
  }

  if (isAdminDesa || isTeacherDesa) {
    return kelompokList.filter(k => k.desa_id === userProfile?.desa_id)
  }

  if (isAdminDaerah || isTeacherDaerah) {
    if (filters.desa.length > 0) {
      return kelompokList.filter(k => filters.desa.includes(k.desa_id))
    }
    const validDesaIds = desaList
      .filter(d => d.daerah_id === userProfile?.daerah_id)
      .map(d => d.id)
    return kelompokList.filter(k => validDesaIds.includes(k.desa_id))
  }

  if (isTeacher && teacherHasMultipleKelompok) {
    return buildFromClasses()
  }

  return kelompokList
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/components/shared/__tests__/dataFilterHelpers.test.ts
```
Expected: All PASS

---

## Task 2: Update `filterClassList` — add missing paths

**Files:**
- Modify: `src/components/shared/dataFilterHelpers.ts`
- Test: `src/components/shared/__tests__/dataFilterHelpers.test.ts`

**Step 1: Write failing tests**

Add to `dataFilterHelpers.test.ts`:

```typescript
const mockUserTeacherDesa = {
  role: 'teacher' as const,
  id: 'user-teacher-desa',
  full_name: 'Guru Desa',
  daerah_id: 'daerah-1',
  desa_id: 'desa-1',
  kelompok_id: null,
  classes: [],
}

const mockUserTeacherDaerah = {
  role: 'teacher' as const,
  id: 'user-teacher-daerah',
  full_name: 'Guru Daerah',
  daerah_id: 'daerah-1',
  desa_id: null,
  kelompok_id: null,
  classes: [],
}

const mockClassList = [
  { id: 'cls-1', name: 'Kelas A', kelompok_id: 'kelompok-1' },
  { id: 'cls-2', name: 'Kelas B', kelompok_id: 'kelompok-2' },
  { id: 'cls-3', name: 'Kelas C', kelompok_id: 'kelompok-3' }, // kelompok-3 in desa-3 (daerah-2)
]

it('filterClassList: shouldShowKelompok=false returns all classes', () => {
  const role = detectRole(mockUserTeacherDesa)
  const result = filterClassList({
    classList: mockClassList,
    filters: { daerah: [], desa: [], kelompok: [], kelas: [] },
    filteredKelompokList: [],
    role,
    userProfile: mockUserTeacherDesa,
    cascadeFilters: true,
    activeDesaList: mockDesaList,
    activeKelompokList: mockKelompokList,
    shouldShowKelompok: false,
    teacherHasMultipleClasses: false,
  })
  expect(result).toEqual(mockClassList)
})

it('filterClassList: isTeacherDesa independent mode returns classes in their desa kelompok', () => {
  const role = detectRole(mockUserTeacherDesa)
  // kelompok-1 and kelompok-2 are in desa-1; kelompok-3 is in desa-3
  const result = filterClassList({
    classList: mockClassList,
    filters: { daerah: [], desa: [], kelompok: [], kelas: [] },
    filteredKelompokList: [],
    role,
    userProfile: mockUserTeacherDesa,
    cascadeFilters: false,
    activeDesaList: mockDesaList,
    activeKelompokList: mockKelompokList,
    shouldShowKelompok: true,
    teacherHasMultipleClasses: false,
  })
  expect(result.map(c => c.id)).toEqual(['cls-1', 'cls-2'])
})

it('filterClassList: isTeacherDaerah independent mode returns classes in their daerah', () => {
  const role = detectRole(mockUserTeacherDaerah)
  // daerah-1 has desa-1 and desa-2; kelompok-1 and kelompok-2 are in desa-1
  const result = filterClassList({
    classList: mockClassList,
    filters: { daerah: [], desa: [], kelompok: [], kelas: [] },
    filteredKelompokList: [],
    role,
    userProfile: mockUserTeacherDaerah,
    cascadeFilters: false,
    activeDesaList: mockDesaList,
    activeKelompokList: mockKelompokList,
    shouldShowKelompok: true,
    teacherHasMultipleClasses: false,
  })
  expect(result.map(c => c.id)).toEqual(['cls-1', 'cls-2'])
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/components/shared/__tests__/dataFilterHelpers.test.ts
```
Expected: TypeScript/compile error — new params missing

**Step 3: Update `FilterClassParams` and `filterClassList` in dataFilterHelpers.ts**

```typescript
interface FilterClassParams {
  classList: Class[]
  filters: DataFilters
  filteredKelompokList: KelompokBase[]
  role: RoleFlags
  userProfile: MinimalProfile
  cascadeFilters: boolean
  activeDesaList: DesaBase[]
  activeKelompokList: KelompokBase[]
  /** When false, skip kelompok-based filtering entirely */
  shouldShowKelompok: boolean
  /** True when teacher has >1 class across their assignments */
  teacherHasMultipleClasses: boolean
}

export function filterClassList({
  classList,
  filters,
  filteredKelompokList,
  role,
  userProfile,
  cascadeFilters,
  activeDesaList,
  activeKelompokList,
  shouldShowKelompok,
  teacherHasMultipleClasses,
}: FilterClassParams): Class[] {
  const { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok, isTeacher, isTeacherDesa, isTeacherDaerah } = role

  if (!classList.length) return []

  // Guard: kelompok filter not shown → no kelompok-based narrowing
  if (!shouldShowKelompok) return classList

  // Independent Mode
  if (!cascadeFilters) {
    if (isAdminKelompok) {
      return classList.filter(cls => !cls.kelompok_id || cls.kelompok_id === userProfile?.kelompok_id)
    }
    if (isTeacherDesa) {
      const validKelompokIds = activeKelompokList
        .filter(k => k.desa_id === userProfile?.desa_id)
        .map(k => k.id)
      return classList.filter(cls => cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id))
    }
    if (isTeacherDaerah) {
      const validDesaIds = activeDesaList
        .filter(d => d.daerah_id === userProfile?.daerah_id)
        .map(d => d.id)
      const validKelompokIds = activeKelompokList
        .filter(k => validDesaIds.includes(k.desa_id))
        .map(k => k.id)
      return classList.filter(cls => cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id))
    }
    if (isTeacher && teacherHasMultipleClasses && userProfile?.classes) {
      const teacherClassIds = userProfile.classes.map(c => c.id)
      return classList.filter(cls => teacherClassIds.includes(cls.id))
    }
    if (filters.kelompok.length > 0) {
      const selectedClassIds = (filters.kelas || []).flatMap(k => k.split(','))
      return classList.filter(cls =>
        (cls.kelompok_id && filters.kelompok.includes(cls.kelompok_id)) ||
        selectedClassIds.includes(cls.id)
      )
    }
    return classList
  }

  // Cascade Mode: kelompok filter takes priority
  if (filters.kelompok.length > 0) {
    return classList.filter(cls => cls.kelompok_id && filters.kelompok.includes(cls.kelompok_id))
  }

  if (filteredKelompokList.length === 0) return classList

  if (isSuperAdmin || isAdminDaerah || isAdminDesa || isTeacherDaerah || isTeacherDesa) {
    const validKelompokIds = filteredKelompokList.map(k => k.id)
    if (validKelompokIds.length > 0) {
      return classList.filter(cls => cls.kelompok_id && validKelompokIds.includes(cls.kelompok_id))
    }
    return classList
  }

  if (isAdminKelompok) {
    return classList.filter(cls => !cls.kelompok_id || cls.kelompok_id === userProfile?.kelompok_id)
  }

  if (isTeacher && userProfile?.classes) {
    const teacherClassIds = userProfile.classes.map(c => c.id)
    return classList.filter(cls => teacherClassIds.includes(cls.id))
  }

  return classList
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/components/shared/__tests__/dataFilterHelpers.test.ts
```
Expected: All PASS

---

## Task 3: Replace useMemo inline logic in DataFilter.tsx with helper calls

**Files:**
- Modify: `src/components/shared/DataFilter.tsx`

**Step 1: Update import in DataFilter.tsx**

Change the existing import line from:
```typescript
import type { DataFilters } from './dataFilterHelpers'
```
To:
```typescript
import { detectRole, filterDesaList, filterKelompokList, filterClassList } from './dataFilterHelpers'
import type { DataFilters } from './dataFilterHelpers'
```

**Step 2: Replace role detection block (lines ~120–130) with detectRole call**

Remove the 10 manual `const isSuperAdmin = ...` lines and replace with:

```typescript
const role = useMemo(() => detectRole(userProfile ?? null), [userProfile])
const { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok, isAdmin, isTeacher, isTeacherDaerah, isTeacherDesa, isTeacherKelompok } = role
```

**Step 3: Replace `filteredDesaList` useMemo body**

```typescript
const filteredDesaList = useMemo(() => {
  if (!shouldShowDesa) return []
  return filterDesaList({ desaList: activeDesaList, filters, userProfile: userProfile ?? null, role, cascadeFilters })
}, [activeDesaList, filters, userProfile, role, shouldShowDesa, cascadeFilters])
```

**Step 4: Replace `filteredKelompokList` useMemo body**

```typescript
const filteredKelompokList = useMemo(() => {
  if (!shouldShowKelompok) return []
  return filterKelompokList({
    kelompokList: activeKelompokList,
    desaList: activeDesaList,
    filters,
    userProfile: userProfile ?? null,
    role,
    cascadeFilters,
    teacherHasMultipleKelompok,
  })
}, [activeKelompokList, activeDesaList, filters, userProfile, role, shouldShowKelompok, cascadeFilters, teacherHasMultipleKelompok])
```

**Step 5: Replace `filteredClassList` useMemo body**

```typescript
const filteredClassList = useMemo(() => {
  if (!showKelasFilter) return []
  return filterClassList({
    classList,
    filters,
    filteredKelompokList,
    role,
    userProfile: userProfile ?? null,
    cascadeFilters,
    activeDesaList,
    activeKelompokList,
    shouldShowKelompok,
    teacherHasMultipleClasses: teacherHasMultipleClasses ?? false,
  })
}, [classList, filters, filteredKelompokList, role, userProfile, cascadeFilters, activeDesaList, activeKelompokList, shouldShowKelompok, teacherHasMultipleClasses, showKelasFilter])
```

**Step 6: Run type-check**

```bash
npm run type-check
```
Expected: No errors. Fix any type issues before continuing.

---

## Task 4: Full validation

**Step 1: Run all unit tests**

```bash
npm run test:run
```
Expected: All PASS

**Step 2: Run type-check**

```bash
npm run type-check
```
Expected: No errors

**Step 3: Spot-check in browser (manual)**

Open `/users/siswa` and `/absensi` pages. Verify org filter dropdowns still cascade correctly for at least 2 roles (superadmin + admin daerah).

---

## Commit & PR (User Executes)

Setelah semua test PASS dan type-check bersih, jalankan:

```bash
git add src/components/shared/dataFilterHelpers.ts \
        src/components/shared/__tests__/dataFilterHelpers.test.ts \
        src/components/shared/DataFilter.tsx
git commit -m "refactor: use dataFilterHelpers functions in DataFilter useMemo hooks (fixes #16)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin feature/gh-16-datafilter-refactor-helpers
gh pr create \
  --title "refactor: DataFilter.tsx - use dataFilterHelpers in useMemo hooks" \
  --body "## Summary

- Replace inline useMemo logic in DataFilter.tsx with calls to exported helpers
- Update filterKelompokList to handle teacher multi-kelompok case
- Update filterClassList to cover isTeacherDesa, isTeacherDaerah, and teacherHasMultipleClasses paths
- All existing and new tests passing, type-check clean

Fixes #16"
```
