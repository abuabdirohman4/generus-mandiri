# Plan — sm-ju54 — Onboarding Wizard (Org + Kelas + Guru)

**Issue:** sm-ju54 · feat: onboarding wizard org+kelas+guru
**Date:** 2026-06-23
**Author:** Claude Code (plan) → Antigravity (impl)

---

## 1. Goal

Single-page multi-step wizard to set up a NEW organization end-to-end without hopping between 3 separate disconnected pages:

- **Step 1 — Organisasi**: create Daerah → Desa → Kelompok (cascading)
- **Step 2 — Kelas**: create standard classes from `class_master` templates into the new kelompok(s)
- **Step 3 — Guru/Admin**: create teacher/admin accounts scoped to the new org
- **Step 4 — Selesai**: summary + links

Siswa onboarded separately via bulk import (out of scope).

Route: **`/onboarding`**. Permission-gated: **Superadmin + Admin Daerah only** (they create org). NOT toggle-gated.

## 2. Reuse Map (DO NOT rewrite these — call them)

| Step | Reuse existing server action | File |
|---|---|---|
| 1 Daerah | `createDaerah(data)` | `src/app/(admin)/organisasi/actions/daerah.ts` |
| 1 Desa | `createDesa(data)` | `src/app/(admin)/organisasi/actions/desa.ts` |
| 1 Kelompok | `createKelompok({ name, desa_id })` | `src/app/(admin)/organisasi/actions/kelompok.ts` |
| 2 Kelas | `createBatchStandardClasses(kelompokIds, masterIds)` → `BatchStandardResult` | `src/app/(admin)/kelas/actions/batch-standard/actions.ts` |
| 2 master list | `getAllClassMasters()` + `filterStandardMasters()` | `src/app/(admin)/kelas/actions/masters.ts`, `.../batch-standard/logic.ts` |
| 3 Guru | `createTeacher(data: TeacherData)` | `src/app/(admin)/users/guru/actions/teachers/actions.ts` |

**Wizard UI pattern reference:** `src/app/(admin)/naik-kelas/PromotionClient.tsx` (step state `useState<Step>(1)`, step indicator chips, Step N conditional render, Back/Lanjut buttons, sonner toasts). Copy the SHELL, replace step bodies.

**Page guard pattern reference:** `src/app/(admin)/naik-kelas/page.tsx` (`getCurrentUserProfile` + redirect).

**Standard-classes modal reference (form layout to mimic):** `src/app/(admin)/kelas/components/BatchStandardKelasModal.tsx`.

## 3. Key shapes

```ts
// KelompokData
{ name: string; desa_id: string }

// TeacherData (src/app/(admin)/users/guru/actions/types.ts)
{ username: string; full_name: string; email: string; password?: string;
  daerah_id: string; desa_id?: string|null; kelompok_id?: string; permissions?: {...} }

// createBatchStandardClasses returns BatchStandardResult:
{ success, totalCreated, totalSkipped, byKelompok: KelompokResult[], message? }
```

`createDaerah`/`createDesa` return the created row (need its `id` to cascade to next step). **VERIFY return shape during impl** — read `daerah.ts`/`desa.ts` lines 13-60 first; if they return `{ success }` only (no id), add a thin server action `createDaerahReturningId` OR re-query by name. Prefer: extend existing action to return inserted `id` (low risk, additive).

## 4. Architecture decisions

- New folder `src/app/(admin)/onboarding/` co-locating `page.tsx`, `OnboardingClient.tsx`, and a thin `actions/index.ts` that **re-exports** the reused actions (no new business logic — orchestration only). If any glue logic needed (e.g. createDaerahReturningId), put it in 3-layer form under `onboarding/actions/orchestration/{queries,logic,actions}.ts`.
- All Server Actions return `{ success, data, message }` (project convention).
- TDD: glue/orchestration logic → unit test (logic.ts). Pure UI step rendering → no test. Cascading id-resolution + permission gate → MUST test.
- Use existing form components only: `InputFilter`, `Checkbox`, `MultiSelectCheckbox`, `Button`. NO raw `<input>` except plain text fields already used in naik-kelas (search box pattern acceptable).

## 5. Tasks (TDD per task)

### Task 1 — Permission gate logic (TDD)
- `onboarding/actions/orchestration/logic.ts`: `canOnboard(profile): boolean` = `isSuperAdmin(p) || isAdminDaerah(p)`.
- RED: `logic.test.ts` — superadmin true, admin daerah true, admin desa false, teacher false, null false.
- GREEN: implement using `@/lib/accessControl`.
- `npm run test:run` → PASS.

### Task 2 — Ensure org-creation actions return inserted id
- Read `daerah.ts:13-46`, `desa.ts:14-56`. If return lacks `id`:
  - Modify the `.insert([...])` to `.insert([...]).select('id').single()` and return `{ success: true, data: { id } }`.
  - Keep backward compat: existing callers ignore `data`, still read `success`.
- RED: add/extend test asserting returned `data.id` is a string (mock supabase insert→select→single).
- GREEN: implement. `npm run test:run` → PASS.
- ⚠️ If modifying shared actions feels risky, INSTEAD add `onboarding/actions/orchestration/queries.ts` `insertKelompokReturningId(supabase, data)` etc. Document the choice in the PR.

### Task 3 — Server page + guard
- `onboarding/page.tsx`: `export const dynamic='force-dynamic'`, fetch `getCurrentUserProfile()`, `if (!canOnboard(profile)) redirect('/home')`. Pass `profile` + class masters (`filterStandardMasters(await getAllClassMasters())`) to `OnboardingClient`.
- No unit test (server component). Manual verify in Task 7.

### Task 4 — OnboardingClient Step 1 (Organisasi)
- Copy wizard shell from `PromotionClient.tsx` (step state, indicator chips labels: `['Organisasi','Kelas','Guru','Selesai']`, card, Back/Lanjut).
- Step 1 body: 3 cascading sections.
  - Daerah: pick existing (InputFilter over `useDaerah()`) OR create new (text field + "Buat" button → `createDaerah`). Capture resulting `daerahId`.
  - Desa: same pattern, scoped to chosen daerah → `daerahId`. Capture `desaId`.
  - Kelompok: same → `desaId`. Capture `kelompokId` (allow 1+; store array `kelompokIds`).
  - Admin Daerah: daerah pre-locked to their own `daerah_id` (read from `userProfile`), hide daerah picker.
- On "Lanjut": require ≥1 kelompokId. `setStep(2)`.
- No unit test (UI). Logic for "which daerah locked" is trivial inline.

### Task 5 — OnboardingClient Step 2 (Kelas)
- Show standard masters (passed from page) as checkbox grid (mimic `BatchStandardKelasModal`). Default: all checked.
- "Buat Kelas" → `createBatchStandardClasses(kelompokIds, selectedMasterIds)`.
- Show `BatchStandardResult` summary (created/skipped per kelompok) via toast + inline.
- Back → step 1. Lanjut → step 3. (Kelas creation can be re-run idempotently — batch skips existing.)

### Task 6 — OnboardingClient Step 3 (Guru) + Step 4 (Selesai)
- Step 3: form (InputFilter for role admin/teacher if applicable, text: full_name/username/email/password, org pre-filled from step 1: daerah_id/desa_id/kelompok_id). "Tambah Guru" → `createTeacher(data)`. List added gurus; allow adding multiple. Lanjut → step 4.
- Step 4: summary counts (X kelompok, Y kelas, Z guru) + buttons linking to `/organisasi`, `/kelas`, `/users/guru`. "Selesai" → router push `/home`.

### Task 7 — Navigation registration (MANDATORY 3 places)
Per CLAUDE.md new-page rule — forgetting one = menu/title hilang:
1. `src/layout/AppSidebar.tsx` `allNavItems[]` — add `/onboarding` (gate visibility to superadmin/admin daerah via existing role-filter mechanism; check how other admin-only items filter).
2. `src/app/(admin)/home/components/QuickActions.tsx` `quickActions[]` — add onboarding quick action (role-gated).
3. `src/layout/AppHeader.tsx` `getPageTitle()` switch — add `/onboarding → 'Onboarding'`.

### Task 8 — Verify
- `npm run type-check` → 0 errors.
- `npm run test:run` → all PASS.
- Manual (dev): login superadmin → `/onboarding` loads; login teacher → redirect `/home`. Walk all 4 steps with a throwaway org.

## 6. Out of scope
- Student onboarding (bulk import handles it).
- Editing/deleting created entities (use existing pages).
- Realtime / undo.

## 7. CLAUDE.md Check
- [ ] New route `/onboarding` → add to App Router Structure list in CLAUDE.md (line 142 area).
- [ ] New pattern introduced? (orchestration-only re-export folder) — if novel, add 1 line to `docs/claude/architecture-patterns.md`.
- [ ] No new DB table. No new permission field (reuses isSuperAdmin/isAdminDaerah).
- [ ] If `createDaerah`/`createDesa` return shape changed → note in architecture-patterns.md.

## 8. Commit message template
```
feat(onboarding): single-page wizard for org+kelas+guru setup (fixes #XX)

Add /onboarding 4-step wizard: create Daerah/Desa/Kelompok, batch standard
classes, and teacher accounts in one flow. Reuses existing createKelompok,
createBatchStandardClasses, createTeacher actions. Superadmin/Admin Daerah only.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
