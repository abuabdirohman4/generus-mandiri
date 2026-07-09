# Reduce Supabase Egress — sm-kt2j

**Date:** 2026-07-09
**Beads:** sm-kt2j (epic) · sm-lmi3 (quick wins, CLOSED) · sm-uxnv (pagination, P2 deferred)
**GH Issue:** [#132](https://github.com/abuabdirohman4/generus-mandiri/issues/132)
**Status:** quick wins (P0.1, P0.3, P1.1) implemented & type-checked, awaiting user commit/push. Pagination (sm-uxnv) deferred.

## Context — why this exists

Supabase org (Free plan, 5GB/mo egress) hit a **grace period** — egress exceeded quota in a prior billing cycle. App keeps working until **2 Aug 2026**; after that, Fair Use Policy → requests may return **402**.

### Diagnosis (evidence-based, not guesses)

Investigated via Supabase MCP (`pg_stat_statements`) + egress dashboard per-source breakdown:

| Suspect | Verdict |
|---|---|
| DB size / storage | ❌ Not it — 91MB / 500MB (18%). Adding 1 daerah + 32 kelompok → ~105MB, still fine. |
| RLS/index advisor (268 issues) | ❌ Not egress — real perf/security debt, separate concern. |
| `pg_timezone_names` (2M rows) | ❌ Red herring — Supabase Studio dashboard traffic, not the app. |
| **PostgREST payload** | ✅ **ROOT CAUSE.** Consistently 91.8–92.5% of daily egress across multiple days. |

### Baseline egress data — CURRENT billing cycle (07 Jul – 07 Aug 2026)

Per-source breakdown, first 3 days of the cycle (captured 2026-07-09 via Supabase dashboard, "Current billing cycle" view):

| Date | Total | Auth | PostgREST | Storage | Realtime | Shared Pooler |
|---|---|---|---|---|---|---|
| 07 Jul | ~497MB | 30.642MB (6.2%) | **456.673MB (91.8%)** | 4.798MB (1.0%) | 5.228MB (1.1%) | — |
| 08 Jul | ~540MB | 29.664MB (5.5%) | **494.958MB (91.8%)** | 0.468MB (0.1%) | 13.208MB (2.4%) | 0.884MB (0.2%) |
| 09 Jul | ~146MB | 9.137MB (6.3%) | **134.866MB (92.5%)** | 0.004MB (0.0%) | 1.199MB (0.8%) | 0.554MB (0.4%) |
| **3-day total** | **1.24 GB used / 5 GB quota (24.8%)** | ~6% avg | **~92% avg** | ~0.4% avg | ~1.4% avg | ~0.2% avg |

**Why this matters:**
- **PostgREST share is stable at ~92% across 3 separate days** — not a one-off spike. This is a *consistent pattern*, which strongly confirms the root cause (it's not a fluke from one unusual event).
- **Auth share is stable at ~5.5–6.3%** — confirms auth-token validation volume (900k calls/9mo) is high-*frequency* but low-*byte*. The P1.1 middleware fix (skip getUser on prefetch) is real but minor.
- **Realtime and Storage are both under 2.5%** — confirms realtime presence/postgres_changes and file storage are NOT meaningful egress contributors. No need to touch them.
- **09 Jul dropped sharply (146MB vs 500MB+ prior days)** — likely lower usage that day (weekend/less activity), not yet an effect of the fix (fix was implemented same day, not deployed to production until user commits/pushes/deploys). This is BEFORE-fix baseline data.
- **Run-rate warning:** 1.24GB in 3 days ≈ ~410MB/day average. Extrapolated over a 30-day cycle ≈ **~12GB/month** — more than double the 5GB quota. This matches why the previous cycle went over and confirms the fix is urgent, not optional.

**This 3-day table is the "before" baseline.** Compare against it once the fix has been live for a few days to measure actual impact — success looks like the PostgREST-driven daily total dropping well below the ~400–540MB/day seen here.

---

## Goal

Cut PostgREST egress materially. **Target: PostgREST MB/day drops well below the ~400–540MB baseline; monthly egress stays under 5GB — no plan upgrade, no user reduction needed.**

---

## Scope split

- **sm-lmi3 (DONE — Claude Code direct):** low-risk quick wins — P0.1, P0.3, P1.1. 6 files, ~21 insertions / 8 deletions. Big potential egress win, minimal side-effects, type-check clean.
- **sm-uxnv (deferred):** server-side pagination — higher complexity/risk (search/filter must move server-side). Own issue, TDD, likely Antigravity.

---

## sm-lmi3 — Quick wins (IMPLEMENTED)

### P0.1 — Disable focus revalidation on the heaviest list hooks + global default
**Files changed:**
- `src/lib/swr.ts` — global default `revalidateOnFocus: true` → `false`.
- `src/hooks/useTeachers.ts`, `src/hooks/useAdmins.ts`, `src/hooks/useStudents.ts` — each had an explicit per-hook `revalidateOnFocus: true` override (the global default doesn't apply when a hook overrides it). Flipped all three to `false`.

**Investigation note:** most hooks in the codebase (`useKelompok`, `useDashboard`, `useClasses`, `useDaerah`, `useDesa`, etc. — 15+ files) already had `revalidateOnFocus: false` explicitly set — good existing discipline. Only 5 hooks had it `true`: the 3 changed above (large-list, high egress), plus `useMeetingAttendance.ts` and `useStudentDetail.ts:35` and `useMeetings.ts:169` which were **intentionally left as `true`** — they're live/detail views with smaller payloads (single meeting / single student), not the ~2198-row student list that dominates egress.

**Why:** every window refocus was re-fetching the full row payload (students ~2198 rows, teachers, admins list) — this is DATA egress, not auth. Mutations already call `mutate()`, so writes stay fresh; only passive staleness increases until next mount/navigation.
**Risk:** LOW — staleness only, no auth/correctness impact.

### P0.3 — Kill notification polling (no realtime added)
**File:** `src/hooks/useNotifications.ts` — both SWR keys: `refreshInterval: 60000` → `0`, `revalidateOnFocus: true` → `false`.

**Why:** notifications are sent by superadmin/admin daerah only ~once a month (feature-update announcements). Refetch on login/route-change is more than enough; realtime would add continuous WAL cost for ~monthly events.
**Risk:** NEGLIGIBLE.

### P1.1 — Middleware prefetch skip
**File:** `src/middleware.ts` — added early `NextResponse.next()` before `getUser()` when request has `next-router-prefetch`, `purpose: prefetch`, or `sec-purpose: prefetch` headers (Next.js `<Link>` hover-prefetch).

**Why:** prefetch responses aren't user-visible, so skipping validation can't break a real navigation redirect — the actual click still validates via `getUser()`.
**Did NOT** switch `getUser()` → `getSession()` (would be a security regression; `@supabase/ssr` requires getUser in middleware for token validation).
**Risk:** VERY LOW — no auth-correctness impact.

### Verification done
- `npm run type-check` — clean, no errors.
- Diff reviewed: 6 files, 21 insertions / 8 deletions, matches plan scope.

### Verification still needed (post-deploy)
- Re-check egress dashboard per-source breakdown after a few days live — compare against the 3-day baseline table above.
- Manual smoke test: window refocus doesn't trigger full data re-fetch (Network tab); notifications still appear on login/route-change; logout → protected route redirects to `/signin`; signed-in on `/signin` → `/home`.

---

## sm-uxnv — Server-side pagination (DEFERRED, not started)

**Files:** `src/app/(admin)/users/siswa/actions/students/queries.ts`, `src/lib/utils/batchFetching.ts`, student list table component.
- Replace `fetchAllStudents` (all ~2198 rows) with server-side pagination via Supabase `.range(from, to)`.
- Trim `STUDENT_SELECT` to columns the list renders; drop nested joins from list fetches.
- **KEEP** `fetchAllStudents` for genuine export / bulk-import / grade-promotion paths.
- **RISK (MEDIUM):** search/filter must move server-side (`.ilike()`) — must NOT only search the active page. Needs TDD.

This is the highest-remaining-impact fix (P0.2 in the original full plan) but was deferred to keep the first pass small, fast, and low-risk. Revisit once P0.1/P0.3/P1.1 impact is measured — if PostgREST egress is still high after those land, pagination is next.

---

## Insight to persist (repo rule — TODO)

Still needs: `docs/claude/egress-cost-optimization.md` + one pointer line in CLAUDE.md. Core rules to capture:
- Egress is billed on PostgREST payload (row data), not DB size. Every fetch = bytes out.
- New features MUST NOT: aggressive `refreshInterval` polling; `revalidateOnFocus` on frequently-mounted large-list hooks; `SELECT *` or eager all-row fetches for list rendering.
- Prefer: narrow `.select()`, pagination/`.range()`, long dedupe for stable reference data. Realtime only for FREQUENT events — rare events refetch on login/navigation.
- Middleware matcher stays narrow; auth is cheap (bytes) but volume-heavy (~5-6% of egress, consistent across days).

## Workflow / handoff

- Claude Code: plan + beads (sm-kt2j, sm-lmi3 closed, sm-uxnv open) + GH issue #132 + **executed sm-lmi3 directly**.
- User: git add/commit/push (Claude Code does not run git per project rule) + deploy + monitor egress dashboard over next few days.
- sm-uxnv: separate future session, TDD, likely Antigravity.
