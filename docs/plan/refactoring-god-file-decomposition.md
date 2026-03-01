# Refactoring Strategy: God File Decomposition

## Context

The project has ~10,000 lines spread across 9 `actions.ts` files. The top 3 offenders are `absensi/actions.ts` (2,524 lines), `users/siswa/actions.ts` (1,682 lines), and `laporan/actions.ts` (1,111 lines — one 950-line function). These God Files make the codebase hard to navigate, test, and maintain. Some features (siswa, kelas) already have partial splits in `actions/` folders but inconsistently.

**Goal**: Establish a consistent, functional (non-OOP) architecture pattern by refactoring incrementally, starting with `absensi` as the pilot.

**Constraints**: Functional style only (no classes/DI), Next.js App Router conventions, incremental execution (1 feature per session), no behavior changes.

---

## 1. Architecture: 3-Layer Functional Pattern (Per Domain File)

Each feature's `actions.ts` becomes an `actions/` folder with domain-based files. Each file has 3 internal layers:

```
src/app/(admin)/<feature>/
├── actions/
│   ├── <domain1>.ts     ← Domain file with 3 layers inside
│   ├── <domain2>.ts
│   └── index.ts         ← Re-exports all server actions (backward compat)
```

### Inside each domain file:

```typescript
'use server'

// ─── LAYER 1: QUERIES (private, DB access only) ──────────────
async function fetchMeetingById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('meetings').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// ─── LAYER 2: BUSINESS LOGIC (exported, pure, testable) ──────
export function validateMeetingData(data: CreateMeetingData) {
  if (!data.classIds?.length) return { ok: false, error: 'Class is required' }
  if (!data.date) return { ok: false, error: 'Date is required' }
  return { ok: true }
}

export function buildStudentSnapshot(students: Student[], classIds: string[]) {
  return students.filter(s => s.classes.some(c => classIds.includes(c.id))).map(s => s.id)
}

// ─── LAYER 3: SERVER ACTIONS (exported, thin orchestrator) ───
export async function createMeeting(data: CreateMeetingData) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const validation = validateMeetingData(data)       // Layer 2
  if (!validation.ok) return { success: false, error: validation.error }

  const result = await insertMeeting(supabase, data)  // Layer 1
  revalidatePath('/absensi')
  return { success: true, data: result }
}
```

**Rules:**
- Layer 1 (Queries): Private functions, receive `supabase` client as param
- Layer 2 (Business Logic): Exported pure functions, no DB calls, no `'use server'` needed (file already has it but these are pure)
- Layer 3 (Server Actions): Exported async, orchestrate L1+L2, handle auth + revalidation
- `index.ts`: Re-export all Layer 3 functions so existing imports don't break

### Pilot: absensi/actions.ts (2,524 lines) → actions/ folder

| File | Layer 3 (Server Actions) | Layer 2 (Business Logic) |
|------|--------------------------|--------------------------|
| `meetings.ts` | createMeeting, updateMeeting, deleteMeeting, getMeetingById, getMeetingsByClass, getMeetingsWithStats | validateMeetingData, buildStudentSnapshot, canUserAccessMeeting |
| `attendance.ts` | saveAttendance, saveAttendanceForMeeting, getAttendanceByDate, getAttendanceByMeeting, getAttendanceStats, getStudentsFromSnapshot | calculateAttendanceForMeeting, transformAttendanceData |
| `index.ts` | Re-export all server actions from meetings.ts + attendance.ts | — |

---

## 2. Colocation Rules: Global vs Local

| Used by... | Put in... | Example |
|---|---|---|
| 1 feature only | Co-located in feature folder | `absensi/types.ts`, `absensi/stores/absensiUIStore.ts` |
| 2+ features | Global: `src/types/`, `src/lib/`, `src/stores/`, `src/hooks/` | `src/types/meeting.ts`, `src/lib/studentPermissions.ts` |
| Unsure? | Start local, promote to global when shared | — |

### Target folder structure (per feature):

```
src/app/(admin)/absensi/
├── actions/
│   ├── meetings.ts
│   ├── attendance.ts
│   └── index.ts
├── components/
├── hooks/
│   └── useAbsensi.ts
├── stores/
│   └── absensiUIStore.ts
├── utils/
│   ├── meetingHelpers.ts        (existing)
│   ├── meetingHelpersClient.ts  (existing)
│   └── __tests__/               (existing + new)
└── page.tsx
```

### Global structure:

```
src/
├── types/           ← Shared entity types
│   ├── student.ts   (existing)
│   ├── meeting.ts   (NEW - extract from absensi/actions.ts interfaces)
│   ├── attendance.ts (NEW)
│   └── user.ts
├── lib/             ← Shared utilities (keep as-is, already good)
├── stores/          ← Cross-page stores (already exists for most)
└── hooks/           ← Cross-page hooks
```

---

## 3. Testing Strategy (Prioritized)

**Test Layer 2 (Business Logic) first** — pure functions, zero DB mocking needed.

### Priority order:

1. **Validation & business rules** (pure functions extracted in refactoring)
   - `validateMeetingData()`, `buildStudentSnapshot()`
   - Pattern: same as existing `classHelpers.test.ts`, `attendanceCalculation.test.ts`

2. **Permission checkers** (already have good test coverage)
   - `studentPermissions.test.ts`, `teacherPermissions.test.ts` — maintain

3. **Data transformations** (currently inline, extract during refactoring)
   - `transformStudentsData()` in siswa (200+ lines, needs extraction)
   - Attendance stats aggregation

4. **Server Actions** — SKIP for now (requires Supabase mock setup)

### Where to put tests:

```
src/app/(admin)/absensi/
└── utils/
    └── __tests__/
        ├── meetingHelpersClient.test.ts  (existing)
        ├── meetingValidation.test.ts     (NEW)
        └── attendanceTransform.test.ts   (NEW)
```

---

## 4. Red Flags to Avoid

1. **Don't refactor + add features simultaneously** — 1 PR = 1 concern
2. **Don't change behavior** — refactoring = moving code, NOT changing logic
3. **Don't refactor all files at once** — 1 feature per session
4. **Don't create premature abstractions** — if used in 1 place, leave it
5. **Don't forget `index.ts` re-exports** — or all component imports break
6. **Don't over-split** — 2-3 domain files per feature is enough
7. **Don't skip manual testing** — check browser after each feature refactor
8. **Don't chase 100% extraction** — Layer 2 extraction can be incremental

---

## 5. Execution Plan (Incremental)

### Session 1: Pilot — absensi/actions.ts
1. Create `src/app/(admin)/absensi/actions/` folder
2. Split into `meetings.ts` + `attendance.ts` (move code, don't change logic)
3. Create `index.ts` with re-exports
4. Extract shared interfaces to `src/types/meeting.ts` and `src/types/attendance.ts`
5. Delete old `actions.ts`
6. Update any imports that used deep imports (most should work via index.ts)
7. Manual test: create meeting, take attendance, view meetings list
8. Write tests for extracted Layer 2 pure functions

### Session 2: users/siswa/actions.ts
- Already partially split (actions/classes.ts, actions/management.ts)
- Consolidate: main actions.ts → actions/students.ts + actions/biodata.ts
- Extract `transformStudentsData()` (200 lines) to utils/ for testing
- Create index.ts re-exports

### Session 3: laporan/actions.ts
- Break the 950-line monster function into sub-functions by period type
- `actions/reports.ts` with extracted business logic
- Move date helpers to utils/

### Session 4-6: Remaining features
- materi, rapot/templates, guru, dashboard, rapot, admin
- Apply same pattern, should be faster with established template

### Session 7: Documentation & Cleanup
- Update `docs/claude/architecture-patterns.md` with the pattern
- Update CLAUDE.md with pointer to architecture doc
- Run dead code detection
- Final type audit

---

## 6. Verification

After each session:
1. `npm run type-check` — no TypeScript errors
2. `npm run test:run` — all existing tests pass
3. `npm run build` — production build succeeds
4. Manual browser testing of the refactored feature
5. `git diff --stat` — verify no logic changes, only file moves + re-exports

---

## Critical Files

### To modify (pilot — absensi):
- `src/app/(admin)/absensi/actions.ts` → DELETE (replace with actions/ folder)
- `src/app/(admin)/absensi/actions/meetings.ts` → NEW
- `src/app/(admin)/absensi/actions/attendance.ts` → NEW
- `src/app/(admin)/absensi/actions/index.ts` → NEW
- `src/types/meeting.ts` → NEW (extracted interfaces)

### Existing patterns to reuse:
- `src/app/(admin)/users/siswa/actions/classes.ts` — reference split pattern
- `src/lib/utils/__tests__/attendanceCalculation.test.ts` — test pattern for pure functions
- `src/lib/utils/__tests__/classHelpers.test.ts` — test pattern for helpers

### Files that import from absensi/actions.ts (will need index.ts re-export):
- Components in `absensi/components/`
- Hooks in `absensi/hooks/`
- `absensi/[meetingId]/page.tsx` and sub-pages
