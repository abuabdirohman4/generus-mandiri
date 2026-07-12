# Self-Host Data Plane — Local Dev Runbook (Phase 1)

Moves PostgreSQL + PostgREST off Supabase Cloud onto localhost. Auth (GoTrue)
+ Realtime stay on Supabase Cloud. See
`docs/plans/2026-07-10-self-host-postgres-postgrest-hybrid.md`.

## Prereqs (this machine)

- **Postgres.app** with the PG 17 server running on `localhost:5432`
  (Supabase prod is PG 17.6 — use the matching version, not "latest").
- **PostgREST** via `brew install postgrest` (done).
- `selfhost/.env.selfhost` filled in (copy from `.env.selfhost.example`):
  - `SUPABASE_DB_URL` — session-pooler connection string + DB password
  - `SUPABASE_JWT_SECRET` — legacy JWT secret from the dashboard

## Bring-up

```bash
cd selfhost
./dump-supabase.sh     # pg_dump public schema from Supabase -> dump/public_full.sql
./restore-local.sh     # drop+create generus_local, shims, restore, grants
./run-postgrest.sh     # PostgREST on http://127.0.0.1:3001
```

Then in the app `.env.local` add:

```
NEXT_PUBLIC_DATA_POSTGREST_URL=http://127.0.0.1:3001
```

and restart `npm run dev`. Remove the variable to fall back to Supabase Cloud
for data (the client split is env-gated).

## How auth keeps working

Login still goes to Supabase Cloud (GoTrue). The access token it issues is
HS256-signed with the project JWT secret; local PostgREST validates it with
the same secret, so `request.jwt.claims` -> `auth.uid()` -> existing RLS
policies all work unchanged.

## What is intentionally different locally

- `profiles.id -> auth.users.id` FK is dropped (auth.users lives on Supabase
  Cloud). App-level integrity unaffected; new-signup profile inserts keep
  working.
- `supabase_vault` / `pg_stat_statements` extensions not installed (unused by
  the `public` schema).
- Realtime `postgres_changes` channels do NOT see local writes (Supabase
  Realtime watches the *cloud* DB). Presence channels are unaffected. See the
  realtime audit in the plan.

## Refresh local data

Re-run `./dump-supabase.sh && ./restore-local.sh` anytime; it is a full
drop-and-rebuild (destroys local-only changes).
