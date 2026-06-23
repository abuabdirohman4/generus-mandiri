# Plan — sm-ejs — Pending Naik Kelas Actionable per Kelompok

**Issue:** sm-ejs · feat: pending naik kelas actionable per kelompok
**Depends on:** sm-69c (notification system — ✅ done)
**Date:** 2026-06-23
**Author:** Claude Code (plan) → Antigravity (impl)

---

## 1. Goal & context

After Admin Daerah runs the **certain** promotion se-daerah (Kelas 1-6, SMP, SMA — classes with a `promote_to_class_master_id`), the **uncertain** levels remain:

- **Paud** (belum 2 tahun) and **Pra Nikah** (tergantung kuliah/nikah) do NOT promote serempak — they need a **local per-kelompok decision**.

Mechanism: each affected **kelompok/desa** gets an **actionable notification** (a TASK, not a permanent menu): click → page to mark each pending student **naik / tidak naik** this year. Built ON TOP of the sm-69c notification system.

End state (from issue): sidebar `/naik-kelas` becomes **daerah-only**; kelompok access promotion only via the actionable notification.

## 2. Foundation already in place (sm-69c) — REUSE

Explore confirmed the notification system already supports everything needed:

| Capability | Field/Type | Where |
|---|---|---|
| Actionable link | `action_url`, `action_label` | `notifications` table + `src/types/notification.ts` |
| Forced acknowledge / CTA | `dismiss_mode: 'free'\|'acknowledge'\|'cta_required'` | `logic.ts` validates these |
| Display as modal (hard reminder) | `display_mode: 'banner'\|'modal'\|'both'` | `NotificationDisplayConfig` |
| Scoped fan-out | `target_scope` (daerah/desa/kelompok), `fetchRecipientProfileIds` | `notifikasi/actions/notifications/queries.ts` |
| Insert notification | `insertNotification` / `createBroadcastNotification` action | `notifikasi/actions/notifications/actions.ts` |

→ **Use `cta_required` dismiss + `action_url` pointing to the pending page.** This satisfies the issue's "reminder kuat vs hard-block" — `cta_required` = soft hard-block (can't dismiss until task done) WITHOUT blocking the whole account. **Decision: use `cta_required`, NOT a global account hard-block** (less hostile, reuses existing infra).

## 3. Promotion foundation (sm-jsb) — REUSE

| Need | Reuse | File |
|---|---|---|
| Identify pending masters (Paud/Pra Nikah = stoppers OR explicitly flagged) | stopper = `promote_to_class_master_id === null` via `filterPromotableMasters` (inverse) | `naik-kelas/actions/classes/logic.ts` |
| Resolve target class in kelompok | `resolveTargetClassInKelompok` | same |
| Apply promotion per student | `upsertEnrollment`, `updateStudentClassId`, `upsertStudentClass`, `insertPromotionLog` | `naik-kelas/actions/promotion/queries.ts` |
| Audit | `grade_promotion_logs` (immutable) | existing |

⚠️ **OPEN QUESTION for impl (verify, don't assume):** how exactly are "Paud" and "Pra Nikah" identified? Options:
1. They are `promote_to_class_master_id = null` stoppers (current: Pra Nikah 4 / Orang Tua / Pengurus are stoppers) — but Paud/Pra Nikah 1-3 likely DO have a target.
2. A new explicit flag on `class_masters` (e.g. `requires_local_decision boolean`) is cleaner than guessing.
**Decision in plan: add `class_masters.requires_local_decision boolean DEFAULT false`** and set it true for Paud + Pra Nikah masters. Aligns with project rule "jangan derive jenjang dari sort_order / pakai kolom eksplisit" ([[class-category-via-sort-order-rejected]]). VERIFY with user which masters get the flag before migration.

## 4. New data model

### Table `grade_promotion_pending` (new)
One row per (student, academic_year) that needs a local decision.
```
id uuid pk
student_id uuid → students
academic_year_id uuid → academic_years
kelompok_id uuid → kelompok            -- for scoping the task
from_class_id uuid → classes
suggested_to_class_id uuid null        -- resolveTargetClassInKelompok result (nullable)
status text default 'pending'          -- 'pending' | 'promoted' | 'held'
decided_by uuid null → profiles
decided_at timestamptz null
notification_id uuid null → notifications  -- links the actionable task
created_at timestamptz default now()
UNIQUE(student_id, academic_year_id)
```
RLS: kelompok/desa scope can read+update their own; daerah/superadmin all. (Mirror existing org-scope RLS patterns — verify against junction-table RLS state, see [[rls-junction-tables-deferred]].)

## 5. Architecture decisions

- **3-layer** under `naik-kelas/actions/pending/` (`queries.ts`, `logic.ts`, `actions.ts`) — co-locate with promotion.
- **Generation step** (Admin Daerah, after certain-promotion): `generatePendingTasks(academicYearId)` → for each kelompok with Paud/Pra Nikah students, insert `grade_promotion_pending` rows + create ONE `cta_required` notification per kelompok scope with `action_url = /naik-kelas/pending?year=<id>` (or a dedicated route). Reuse `createBroadcastNotification`-style insert + `fetchRecipientProfileIds`.
- **Resolution page** `/naik-kelas/pending`: lists this kelompok's pending students, each with naik/tidak-naik toggle + "Simpan". On save → apply promotion (reuse promotion queries) for "naik", set `status='held'` for "tidak naik", stamp `decided_by/at`. When all resolved → mark the linked notification satisfied (so `cta_required` lifts).
- **Sidebar change**: `/naik-kelas` main wizard → gate to superadmin + admin daerah only (tighten existing `requirePromotionEnabled` + add role check). Kelompok/desa reach pending page ONLY via notification `action_url`. The pending route itself guarded by "has pending tasks in scope".
- All Server Actions return `{ success, data, message }`.
- Partial success, no rollback (mirror `executeGradePromotion`).

## 6. Tasks (TDD per task)

### Task 1 — Migration: pending table + master flag
- `class_masters.requires_local_decision boolean DEFAULT false`.
- New `grade_promotion_pending` table (§4) + RLS + indexes (`kelompok_id`, `academic_year_id`, `status`).
- Set `requires_local_decision = true` for Paud + Pra Nikah masters (⚠️ CONFIRM list with user first).
- Apply via Supabase MCP `apply_migration`. No unit test (schema) — verify via `list_tables`.

### Task 2 — Pending logic (TDD)
- `pending/logic.ts`:
  - `selectPendingMasters(masters)` → masters where `requires_local_decision === true`.
  - `buildPendingRows(students, resolveTarget)` → maps students in pending classes to pending-row inserts (with `suggested_to_class_id`).
  - `summarizeResolution(decisions)` → counts promoted/held, returns `allResolved: boolean`.
- RED: `pending/__tests__/logic.test.ts` covering each.
- GREEN. `npm run test:run` → PASS.

### Task 3 — Pending queries (TDD-light)
- `pending/queries.ts`: `insertPendingRows`, `fetchPendingForKelompok(supabase, kelompokId, yearId)`, `updatePendingDecision`, `markPendingNotificationSatisfied`. Reuse promotion queries for the actual class change.
- RED: mock-supabase structure tests. GREEN.

### Task 4 — Generate action (Admin Daerah)
- `pending/actions.ts`: `generatePendingTasks(academicYearId)`:
  - permission: superadmin/admin daerah (`validatePromotionPermission`).
  - find pending-master students in daerah scope, group by kelompok.
  - `insertPendingRows` + per-kelompok create `cta_required` notification (`action_url`, `action_label='Isi keputusan naik kelas'`, `display_mode='both'`) scoped to that kelompok.
  - return `{ success, data:{ kelompokCount, studentCount }, message }`.
- Integration test optional.

### Task 5 — Resolution action + page
- `pending/actions.ts`: `getMyPendingPromotions(yearId)` (scope-aware) + `resolvePendingPromotions(decisions[])` (apply naik via promotion queries / hold; stamp decided_by; if all resolved → `markPendingNotificationSatisfied`). `revalidatePath`.
- New page `src/app/(admin)/naik-kelas/pending/page.tsx` + client: list per-student toggle (naik/tidak naik) using `Checkbox`/`Button`, "Simpan". Guard: redirect `/home` if no pending in scope.
- No unit test for page; logic covered in Task 2/3.

### Task 6 — Sidebar gating change
- `/naik-kelas` main wizard nav → superadmin + admin daerah only (extend `AppSidebar` role filter + page guard in `naik-kelas/page.tsx`).
- Ensure `getPageTitle()` covers `/naik-kelas/pending` ('Pending Naik Kelas'). (New sub-route → 3-place nav rule: sidebar entry NOT added for pending — it's notification-only — but `getPageTitle` MUST cover it; QuickActions N/A.)

### Task 7 — Verify
- `npm run type-check` → 0. `npm run test:run` → PASS.
- Manual: as Admin Daerah run certain promotion → `generatePendingTasks` → confirm kelompok user gets a modal `cta_required` notif → click → pending page → mark mix naik/held → save → notif clears, `grade_promotion_logs` written for naik, `student.class_id` updated.

## 7. Out of scope
- Reminder scheduling / escalation cron (follow-up issue if needed).
- Account-wide hard block (rejected in favor of `cta_required`).
- Bulk import of decisions.

## 8. CLAUDE.md Check
- [ ] New table `grade_promotion_pending` → add to Key Tables list in CLAUDE.md (line 146 area).
- [ ] New column `class_masters.requires_local_decision` → note in CLAUDE.md Key Tables (class_masters annotation).
- [ ] New sub-route `/naik-kelas/pending` → add to App Router Structure list.
- [ ] New pattern (actionable-notification-driven task flow) → add section to `docs/claude/architecture-patterns.md` (extends §Notifikasi sm-69c + §Grade Promotion sm-jsb).
- [ ] Confirm RLS approach vs [[rls-junction-tables-deferred]].

## 9. Commit message template
```
feat(naik-kelas): actionable per-kelompok pending promotion (fixes #XX)

After daerah-level certain promotion, generate per-kelompok pending tasks for
Paud & Pra Nikah (requires_local_decision masters). Each kelompok receives a
cta_required notification linking to /naik-kelas/pending to mark students
naik/tidak-naik locally. Reuses sm-69c notification infra and sm-jsb promotion
queries. Adds grade_promotion_pending table; gates main wizard to daerah-only.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
