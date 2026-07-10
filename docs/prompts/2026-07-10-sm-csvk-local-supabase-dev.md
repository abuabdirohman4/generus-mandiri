# Prompt: Setup Local Supabase Dev Environment (sm-csvk)

**Plan:** `docs/plans/2026-07-10-sm-csvk-local-supabase-dev.md` (read it first)
**Beads:** sm-csvk (P3)

## Task

Set up a local Supabase dev stack (Docker + CLI) so development stops consuming production egress and stops risking production data. Follow the plan file's scope exactly.

## Steps

1. `supabase init` — commit `supabase/config.toml`. Add `supabase/.temp`, `supabase/.branches`, `supabase/.env` to `.gitignore`.
2. `supabase link --project-ref <prod-ref>` then `supabase db dump --schema-only -f supabase/migrations/<timestamp>_baseline_schema.sql`. Verify it includes tables, RLS policies, functions, triggers. **Do not** commit production row data.
3. Write `supabase/seed.sql` — synthetic org tree (2 daerah → desa → kelompok, ~20–30 students, superadmin + admin daerah/desa/kelompok + a few teachers, classes/class_masters with sort_order, a few meetings + attendance_logs). Anonymized, no real PII. Must exercise list/filter/pagination/report paths.
4. `supabase start` → `supabase db reset` (applies migrations + seed). Confirm Studio loads and seed data is present.
5. Document env switching: create `.env.development.local` template pointing at the local stack URL + keys from `supabase start` output. Make local-vs-prod switching explicit (this app caches sessions — see `clearUserCache()`).
6. Write `docs/claude/local-dev-setup.md` covering: start/stop, migration flow both directions (`supabase db diff`, `supabase db push`), reseed, env switch, and ALL five challenges from the plan (schema drift, seed limits, auth keys, realtime/storage parity, Docker overhead). Add one pointer line to CLAUDE.md.

## Acceptance

- `supabase start` + `supabase db reset` reproduces prod schema with seed data locally.
- App runs end-to-end against local env (login, /presensi, /users/siswa, /laporan render on seeded data).
- Production egress dashboard shows NO bump during a local-only dev session.
- Destructive test (delete student / naik-kelas) touches only local.
- `docs/claude/local-dev-setup.md` exists with all challenges documented; CLAUDE.md has a pointer line.

## Constraints

- Claude Code cannot run `supabase`/Docker interactively — user runs CLI commands; agent prepares files (config, seed.sql, docs, .gitignore, .env template) and the exact commands to run.
- Do not dump or commit production data/PII.
- No git operations by the agent — provide commit message, user commits.
