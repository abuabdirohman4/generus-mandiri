# Setup Local Supabase Dev Environment — sm-csvk

**Date:** 2026-07-10
**Beads:** sm-csvk (P3 — quality-of-life, NOT urgent)
**Status:** planned, not started

## Context — why this exists

Development against the **live production DB** inflates Supabase egress with dev-session traffic (repeated page reloads, manual feature testing, hot-reload). Evidence from two separate investigations:
- **22–25 Jun 2026:** egress spiked to 540–560MB/day. Git log shows 35+ commits in 4 days — onboarding wizard, presensi pagination/optimistic UI, naik-kelas, siswa filters, plus debugging `.in()` batch queries and the attendance-stats-0 (1000-row truncate) bug. Heavy manual testing window.
- **07–09 Jul 2026:** same pattern — QR scanner, realtime presensi, live attendance chart shipping, egress 400–540MB/day.

Both spikes = **active development windows, not real-user load.** Quiet days sit comfortably under ~150MB/day (5GB/30 ≈ 167MB/day is the safe average).

**This is why sm-csvk is P3, not P0:** the egress *root cause* (PostgREST refetch patterns) was already fixed under sm-kt2j/sm-hsp7. Local dev only removes the *remaining occasional* dev-session contribution — real, but not chronic. Do this when starting the next big dev sprint (so that sprint runs local from day one), not as an emergency.

## Decision: local Supabase (Docker+CLI), NOT Supabase branching

- **Supabase branching** (`create_branch` MCP tool) exists but is **paid** — the tool requires a `confirm_cost_id`, confirming it bills compute per branch. Not free-tier.
- **Local Supabase** (`supabase start` via CLI + Docker) is **free, zero-egress, fully isolated.** The project's own MCP guidance already recommends "prefer local development and testing before applying changes to a remote project."
- A **second free Supabase project** for dev is the simplest but doubles migration maintenance and still uses cloud egress (just on a throwaway quota). Local is cleaner.

## Goal

A working `supabase start` local stack that mirrors production schema, seeded with realistic dummy data, so feature development and destructive testing (delete/naik-kelas/bulk import) never touch production or its egress quota.

## Scope

1. **Init Supabase CLI** — `supabase init` (creates `supabase/config.toml`, `supabase/migrations/`). Add `supabase/.temp`, `supabase/.branches` to `.gitignore`.
2. **Capture production schema as a migration** — `supabase db dump --schema-only` (or `--linked` after `supabase link`) → commit as the baseline migration so `supabase start` reproduces the exact prod schema (tables, RLS, functions, triggers). Do NOT dump production *data* into git.
3. **Write `supabase/seed.sql`** — realistic dummy org tree: a couple daerah → desa → kelompok, ~20–30 students, a few teachers/admins/superadmin, sample classes/class_masters, a handful of meetings + attendance_logs. Enough to exercise list/filter/pagination/report paths without being production data. Keep it anonymized/synthetic (no real names/PII).
4. **Env switching** — document a `.env.development.local` (or `.env.local` swap) pointing to the local stack's URL + anon/service keys (printed by `supabase start`). Make the local-vs-prod switch explicit and hard to mix up (this app is sensitive to cached sessions — see `clearUserCache()` / Zustand persist in CLAUDE.md).
5. **Docs** — `docs/claude/local-dev-setup.md` (repo rule): how to start/stop, apply migrations both ways, reseed, switch env, and the known gotchas below. Add one pointer line to CLAUDE.md.

## Challenges to address in implementation (do NOT skip these in docs)

- **Schema drift:** every prod migration must also land in `supabase/migrations/` and be applied both places. Document the `supabase db diff` / `supabase db push` flow so local and prod don't diverge.
- **Data seeding:** `supabase start` gives an empty DB — `seed.sql` runs on `supabase db reset`. Testing features that need "lots of realistic data" (500+ students) needs a bigger seed or a sanitized prod export; note the limitation.
- **Auth keys:** local Auth (GoTrue) has its own URL/keys, different from prod `.env.local`. Mixing them = confusing session bugs. Document the explicit env-file switch.
- **Realtime/Storage parity:** local emulates but isn't byte-identical to hosted — presence/QR-upload features still need a staging/prod smoke test before shipping.
- **Docker overhead:** Docker Desktop must run; `supabase start` pulls many containers (first run 5–10 min). `supabase stop` when done, or accept idle resource use.

## Non-goals

- Not migrating ALL development to local — visual/UX-only checks can stay on live now that `revalidateOnFocus` no longer spams refetches. Local is specifically for feature dev + destructive testing.
- Not automating prod→local data sync (manual reseed is fine at this scale).

## Verification

- `supabase start` succeeds; Studio reachable at local URL.
- App runs against local env: login works, `/presensi`, `/users/siswa`, `/laporan` render against seeded data.
- Zero requests hit the production project during a local dev session (confirm: production egress dashboard shows no bump during a local-only work block).
- Destructive test (delete a student, run naik-kelas) affects only local; prod untouched.

## Workflow / handoff

- Claude Code: this plan + bd (sm-csvk) + GH issue + prompt file.
- Implementation: Antigravity or direct (setup is config + docs heavy, low code-logic — likely direct once schema dump is settled).
- User: git + runs `supabase` CLI commands locally (Claude Code can't run Docker interactively).

## Related

- `docs/claude/egress-cost-optimization.md`, `docs/claude/egress-monitoring-inventory.md` (sm-kt2j/sm-hsp7 — the code-side egress fixes this complements).
- `docs/SERVER_SETUP.md`, `docs/server-components-explained.md` (production VPS + GitHub Actions deploy).
