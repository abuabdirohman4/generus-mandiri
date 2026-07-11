# Prompt: Self-Host Postgres + PostgREST (Hybrid) — Local-First

Hand this to Claude Code on the **local dev machine**. Do NOT touch the server yet.

---

## Task

Migrate the app's **data plane** (PostgreSQL + PostgREST) off Supabase Cloud onto a self-hosted Postgres + PostgREST, while keeping **Auth (GoTrue) and Realtime on Supabase Cloud**. Goal: eliminate the ~92% of Supabase egress that comes from PostgREST data fetches. Prove it fully in local dev first; server deployment is a separate later step.

## Why (the numbers, measured 2026-07-10)

- Supabase egress is ~92% PostgREST data fetches, **already gzip-compressed** (Node/undici sends `Accept-Encoding: gzip` — compression is NOT an untapped lever, don't chase it). DB is only **91MB**.
- Target VM (`server/README.md`): 2 vCPU · **4GB RAM (3.6GB usable)** · 60GB disk · **egress 1.54TB/mo @ 30 Mbps** · already paid (Rp90k/mo).
- Self-hosting moves the DB↔PostgREST↔Next.js hop to **localhost = 0 egress**; only Next.js→browser touches the VM's 1.54TB (that traffic already runs on the VM today, so no net increase). Supabase then drops to Auth+Realtime (~7%, ~28MB/day) → fits Free tier forever, Supabase bill → 0.
- Capacity jumps from ~43–128 users (Supabase Free 5GB) to ~13k–39k users (VM 1.54TB). **The new bottleneck is the 4GB RAM, not egress** — keep Postgres lean (`shared_buffers=192MB`, `max_connections=20`).

**Read first, in order:**
1. `docs/plans/2026-07-10-self-host-postgres-postgrest-hybrid.md` — the full plan (architecture, phases, risks, capacity). This prompt is the executable brief for it.
2. `docs/claude/egress-cost-optimization.md` and `docs/claude/egress-monitoring-inventory.md` — why egress is what it is.
3. `docs/plans/2026-07-09-sm-kt2j-egress-optimization.md` — the incident + evidence the root cause is PostgREST payload (DB is only 91MB).

## Guardrails
- **Superpowers first.** Use `superpowers:brainstorming` before planning, and follow any process skills. This is a large migration — plan before editing.
- **Local only.** No server changes, no `.env` production edits, no deploy.
- **Preserve RLS (approach B1 in the plan).** Do not silently drop RLS. If you hit a blocker, surface it — don't fall back to B2 without explicit sign-off.
- **Keep the 587 `.from()` / `.rpc()` call sites unchanged.** Achieve this by keeping `createClient()` returning the *data* client (pointed at local PostgREST) and introducing a separate `createAuthClient()` for the ~74 auth call sites.
- Don't commit/push unless asked.

## Do

1. **Spin up local infra**
   - Local PostgreSQL 16 (Docker ok locally).
   - Local PostgREST configured with `PGRST_JWT_SECRET` = the **Supabase JWT secret** (from Supabase → Settings → API → JWT Settings). This lets Supabase-Cloud-issued tokens validate locally so `auth.uid()` works.

2. **Migrate schema + data + policies**
   - `pg_dump --schema=public --no-owner --no-privileges` from Supabase → restore locally.
   - Capture & recreate: all **RLS policies**, the 2 RPC functions (`get_valid_class_ids`, `get_valid_student_ids`), any triggers/functions in `public`.
   - Create Supabase-compat `auth` schema shims: `auth.uid()`, `auth.role()`, `auth.jwt()` reading from `request.jwt.claims`. Create `anon` / `authenticated` roles PostgREST expects.

3. **Split the client** (`src/lib/supabase/`)
   - `client.ts`, `server.ts`, `middleware.ts`: `createClient()` → **data client** pointed at `DATA_POSTGREST_URL`, injecting the current user's Supabase access token as `Authorization: Bearer <token>` (server: from session cookie; browser: from auth client session, refreshed on token refresh).
   - New `createAuthClient()` → **Supabase Cloud** for the ~74 auth call sites (`auth.getUser`, `signIn`, `signOut`, OAuth callback, login `actions.ts`).
   - `createAdminClient()` (36 sites): data client using **service_role** semantics (bypass RLS) against local PostgREST.
   - Add envs: `DATA_POSTGREST_URL` (data), keep `NEXT_PUBLIC_SUPABASE_URL` / anon key for auth. Update `.env.example`.

4. **Verify (must all pass before declaring done)**
   - RLS scoping correct for **superadmin**, **admin-daerah**, **teacher** (rows returned match `getDataFilter` expectations).
   - The 2 RPCs work; batch-fetch helpers (`batchFetching.ts`, dashboard helpers) work; writes via admin paths work.
   - `npm run type-check`, `npm run test`, and key flows (presensi, laporan, naik-kelas, dashboard).
   - **Realtime audit — HARD GATE, do this before declaring local done:** identify every `postgres_changes` channel (per inventory: `useAttendanceRealtime` = live presensi, `tracking-logs-changes`). These watch *tables* — once data moves to the VM DB, Supabase Realtime **will not see VM writes**, so these features silently break at cutover. Report exactly which channels break, and propose+prototype the fix for `useAttendanceRealtime` (SSE or polling against the VM DB is the likely answer; self-hosting Realtime is the heavier alternative). Presence `online-users` is fine (no table reads). **Do not hand off for server cutover until this is resolved.**

## Report back
- Diff summary of the client split + migration scripts (schema/RLS/functions dump-restore).
- RLS verification results per role.
- **Realtime breakage list** + recommended fix for each.
- Any deviation from approach B1, with reason.
- A short "ready for server cutover?" checklist mapped to Phase 2 in the plan.

## Out of scope (do not do now)
- Server / VM changes, systemd, native install, production `.env`, deploy, data cutover. Those are Phase 2 (server), done only after local is proven.
