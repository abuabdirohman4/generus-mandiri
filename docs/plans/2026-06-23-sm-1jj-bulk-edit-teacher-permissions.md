# Plan — sm-1jj — Bulk Edit Teacher Permissions

**Issue:** sm-1jj · feat: bulk edit teacher permissions
**GH:** #81
**Date:** 2026-06-23
**Author:** Claude Code (plan) → Antigravity (impl)

---

## 1. Goal

Admin currently sets materi/monitoring/archive permissions **one teacher at a time** via SettingsModal. Add:

1. **Row multi-select** in GuruTable (checkbox per row + select-all).
2. **BulkPermissionsModal** to grant/revoke these 4 flags across many teachers at once:
   - `can_access_materials`
   - `can_manage_materials`
   - `can_access_monitoring`
   - `can_archive_students`
3. **Bulk server action** that applies the change to each selected teacher (fetch-then-merge JSONB).

## 2. Reuse Map

| Need | Reuse | File |
|---|---|---|
| Per-teacher merge update | `updateTeacherPermissionsQuery` / `updateTeacherMaterialPermissionsQuery` (fetch-then-merge) | `users/guru/actions/settings/queries.ts` |
| Permission checkbox UX reference | `SettingsModal.tsx` (Checkbox + MultiSelectCheckbox for these 4 flags) | `users/guru/components/SettingsModal.tsx` |
| Table | shared `DataTable` | `src/components/table/Table.tsx` |
| Permission field semantics | architecture-patterns.md §"Material Management Permissions" (JSONB merge pattern — CRITICAL) | `docs/claude/architecture-patterns.md` |
| Form components | `Checkbox`, `MultiSelectCheckbox`, `Button` | `components/form/input/`, `components/ui/button/` |

**CRITICAL (from architecture-patterns.md §JSONB Merge sm-97n):** ALWAYS fetch-then-merge `permissions` JSONB — never overwrite. The bulk action MUST reuse the existing merge queries, not write a fresh `.update({ permissions })`.

## 3. Key facts from explore

- GuruTable uses shared `DataTable` (`@/components/table/Table`) which has **NO row-selection support** today.
- `useGuruPage()` exposes `teachers: filteredTeachers`, `mutate` (SWR), modal open/close helpers.
- guru `page.tsx` wires GuruTable + modals; toolbar already has a "Tambah" Button area (line ~81) — bulk-action bar goes near here.
- Permission update split across 2 actions: `updateTeacherPermissions` (archive/transfer/delete flags) + `updateTeacherMaterialPermissions` (materials/monitoring). `can_archive_students` lives in the FIRST; the 3 materi/monitoring flags in the SECOND.

## 4. Architecture decisions

- **Add row-selection to shared `Table.tsx`** (additive, opt-in via new props) so it's reusable for future bulk features (sm-dp7 bulk ganti kelas). New optional props:
  ```ts
  selectable?: boolean
  selectedIds?: Set<string | number>
  onSelectionChange?: (ids: Set<string | number>) => void
  ```
  When `selectable`, render a leading checkbox column (header = select-all of CURRENT filtered page/data, rows = Checkbox). Reuse existing `getRowId`. Default off → zero impact on all existing tables.
- **New bulk server action** `bulkUpdateTeacherPermissions(teacherIds, patch)` in a new 3-layer slot `users/guru/actions/settings/` (extend existing folder). `patch` = partial of the 4 flags (each flag optional → only apply provided ones; "leave unchanged" semantics via tri-state).
- Return `{ success, data: { updated, failed: {id,error}[] }, message }` (partial success, no rollback — mirror naik-kelas executeGradePromotion philosophy).
- Bulk modal tri-state per flag: **No change / Grant / Revoke** (avoid accidentally revoking flags user didn't touch). Use `InputFilter`/radio-style or 3-option select per flag. (A plain checkbox = binary, ambiguous for bulk → tri-state required.)

## 5. Tasks (TDD per task)

### Task 1 — Bulk patch logic (TDD)
- `settings/logic.ts`: add `buildPermissionPatch(selections)` → maps tri-state UI selections `{ materials: 'grant'|'revoke'|'none', ... }` to a `{ field: boolean }` object containing ONLY changed fields. Returns `{}` if nothing to change.
- Also `splitPermissionPatch(patch)` → `{ basePatch, materialPatch }` (route `can_archive_students` to base, the 3 materi/monitoring to material). Pure functions.
- RED: `settings/__tests__/logic.test.ts` — none selected → `{}`; grant materials+monitoring → correct booleans; revoke archive → `{ can_archive_students: false }`; split routes fields correctly.
- GREEN. `npm run test:run` → PASS.

### Task 2 — Bulk query (TDD-light)
- `settings/queries.ts`: add `bulkUpdateTeacherPermissionsQuery(supabase, teacherIds, basePatch, materialPatch)` that loops per teacher calling existing `updateTeacherPermissionsQuery` / `updateTeacherMaterialPermissionsQuery` (so merge is guaranteed). Collect per-id errors. Return `{ updated, failed }`.
- RED: queries.test.ts — mock supabase, assert per-teacher merge calls happen, failed array populated on error.
- GREEN. `npm run test:run` → PASS.

### Task 3 — Bulk server action
- `settings/actions.ts`: `export async function bulkUpdateTeacherPermissions(teacherIds: string[], selections)`:
  - auth + permission check (only superadmin/admin — mirror existing `updateTeacherPermissions` guard).
  - `buildPermissionPatch` + `splitPermissionPatch` (Layer 2).
  - if patch empty → return `{ success:false, message:'Tidak ada perubahan dipilih' }`.
  - call `bulkUpdateTeacherPermissionsQuery` (Layer 1).
  - `revalidatePath('/users/guru')`, `logActivity` (action `bulk_update_teacher_permissions`, metadata = selections + count).
  - return `{ success, data:{updated,failed}, message }`.
- Re-export in `settings/index`/`actions/index.ts` so it's importable from page.
- Integration test optional (defer).

### Task 4 — Extend shared DataTable with row selection
- `src/components/table/Table.tsx`: add the 3 optional props (§4). Render leading checkbox column only when `selectable`. Header checkbox = select-all over current `data` (post-filter). Use existing `Checkbox` component. Update `colSpan` for empty/loading rows by +1 when selectable.
- Manual verify other tables unaffected (props default off). No unit test (presentational) — but smoke: type-check + render guru page.

### Task 5 — GuruTable selection wiring
- `GuruTable.tsx`: accept `selectable`, `selectedIds`, `onSelectionChange` props, pass through to DataTable.
- `useGuruPage.ts`: add `selectedTeacherIds` state (`Set<string>`), `setSelectedTeacherIds`, `clearSelection`. Expose.

### Task 6 — BulkPermissionsModal
- New `components/BulkPermissionsModal.tsx`: props `{ isOpen, onClose, teacherIds, onSuccess }`.
- Body: 4 tri-state controls (No change / Grant / Revoke) for the 4 flags. Header shows "{N} guru dipilih".
- Submit → `bulkUpdateTeacherPermissions(teacherIds, selections)`; toast success (`updated` count) + warn if `failed.length`; `onSuccess()` → mutate + clearSelection + close.
- Use `Button`, `Checkbox`/radio group — NO raw form HTML.

### Task 7 — Page wiring (bulk action bar)
- `page.tsx`: when `selectedTeacherIds.size > 0`, show a bar near toolbar: "{N} dipilih · [Atur Permission] · [Batal]". Open BulkPermissionsModal. Pass `selectable` + selection state to GuruTable.
- On success → `mutate()` + `clearSelection()`.

### Task 8 — Verify
- `npm run type-check` → 0 errors.
- `npm run test:run` → PASS.
- Manual: select 3 guru → grant materials+monitoring → verify all 3 updated, other flags untouched (open SettingsModal each). Select all → revoke archive. Confirm partial-failure toast path (optional).

## 6. Out of scope
- Bulk delete/reset password (separate).
- Activity-type bulk assign (separate from permissions).
- Bulk ganti kelas (sm-dp7) — but DataTable selection built here is reused there.

## 7. CLAUDE.md Check
- [ ] New reusable Table prop (`selectable`) → consider 1-line note in `docs/claude/ui-components.md` (Table now supports row selection).
- [ ] No new route, no new DB table.
- [ ] No new permission field (reuses existing 4 flags + JSONB merge).
- [ ] Confirm architecture-patterns.md §JSONB merge still accurate (bulk path reuses same merge queries).

## 8. Commit message template
```
feat(guru): bulk edit teacher permissions (fixes #81)

Add row multi-select to GuruTable and BulkPermissionsModal to grant/revoke
can_access_materials, can_manage_materials, can_access_monitoring,
can_archive_students across many teachers at once. Tri-state per flag
(no-change/grant/revoke). Reuses fetch-then-merge JSONB queries. Adds
opt-in row selection to shared DataTable (reusable for future bulk ops).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
