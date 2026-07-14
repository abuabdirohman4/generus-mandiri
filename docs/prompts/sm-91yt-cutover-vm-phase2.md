# Prompt: sm-91yt — Cutover Data Plane ke VM (Phase 2)

Hand this to **Claude Code running ON the production VM** (SSH session, `43.133.130.123`).
Phase 1 (local-first data plane) is **DONE and proven** — do not redo it. This is the
**server cutover**: move the data plane (Postgres + PostgREST) onto the VM, flip the live
app's `.env`, and retire Supabase Cloud PostgREST egress.

> ⚠️ This is a **production cutover on a live app** (production since 2026-06-25). It touches
> live user data and can cause downtime. Every destructive/irreversible step below has an
> **APPROVAL GATE** — stop and get the user's explicit "go" before executing it. Do not
> batch through gates.

---

## Issue

- **sm-91yt** — Self-host: server cutover VM (Phase 2). Epic **sm-f2wm**.
- Depends on (both CLOSED / proven): sm-4onc (realtime polling adapter), sm-5ago (RLS 3-role
  verification). The app already runs in self-host mode locally against PostgREST :3001.

## Goal & why

Eliminate the ~92% of Supabase egress that is PostgREST data fetches by serving the data plane
from **localhost on the VM** (DB↔PostgREST↔Next.js = 0 egress). Supabase Cloud keeps **only
Auth (GoTrue) + Realtime** (~7%, fits Free tier forever). The 91MB DB caches fully in RAM.
The client split is env-gated: `NEXT_PUBLIC_DATA_POSTGREST_URL` set → data goes local; unset →
falls back to Supabase Cloud. Cutover = set that env on the VM + point it at local PostgREST.

**Read first, in order:**
1. `docs/plans/2026-07-10-self-host-postgres-postgrest-hybrid.md` — full plan (§4 Phase 2 checklist, §5 capacity/config, §6 risks).
2. `selfhost/README.md` + `selfhost/` scripts (`dump-supabase.sh`, `restore-local.sh`, `run-postgrest.sh`, `sql/00_roles.sql`, `sql/01_auth_shim.sql`, `sql/02_grants.sql`) — the **proven** bring-up. VM reuses these, adapted from Postgres.app→apt and `run` script→systemd.
3. `docs/prompts/self-host-postgres-postgrest-hybrid.md` — the Phase-1 brief; its **"Server context — READ BEFORE Phase 2"** section is the authoritative server inventory (HeadersOverflow, rollback gap, swap). Everything there applies here.
4. `docs/checklists/sm-5ago-rls-verification.md` — the exact RLS smoke tests to re-run against the VM data plane before flipping.

---

## Guardrails

- **Production live app.** Assume real users may be online. Prefer low-traffic window for the flip.
- **Approval gates are hard stops.** Native install, final dump, env flip, `pm2 reload` — each waits for user "go".
- **No `git push`, no code commit** unless the user asks. Code changes needed here (materiQueries batch fix) go through the normal PR flow, NOT pushed from the VM.
- **Bind Postgres + PostgREST to `127.0.0.1` only.** Never open ufw for them (5432 / 3001 stay internal). ufw stays `OpenSSH + Nginx Full`.
- **Keep RLS + policies identical to Cloud** (approach B1). The `selfhost/sql/*` shims already replicate `auth.uid()/role()/jwt()`. Do not drop RLS.
- **Rollback must be ready BEFORE the flip** (see Step 5 + the rollback-gap decision in Step 1).

---

## Step 0 — Self-verify server state (source of truth)

Docs may have drifted since 2026-07-14. Confirm against the live box first:

```bash
cat server/docs/deployment-generus-mandiri.md server/docs/apps.md \
    server/docs/tools.md server/docs/swap.md server/docs/rollback.md 2>/dev/null
free -h && df -h / && swapon --show
pm2 list && node -v
which postgres postgrest psql pg_dump 2>/dev/null   # expect: none yet
ls -la /home/ubuntu/apps/generus-mandiri/            # artifact dir; note .env (600)
cat /home/ubuntu/apps/generus-mandiri/ecosystem.config.js   # note NODE_OPTIONS header-size band-aid
```

Confirm and report: app live via pm2+nginx, no Docker, no Postgres yet, Node 20.20.2,
current swap size, current `.env` data-plane setting (should still point at Supabase Cloud).

**Note the `selfhost/` gap:** the VM only receives `.next/standalone/` build artifacts — it has
**no repo source**, so `selfhost/` scripts + SQL are NOT on the box. You must get them there:
either `git clone` the repo (branch `supabase-local`) to a scratch dir (e.g. `/home/ubuntu/projects/school-management`)
and use `selfhost/` from there, or `scp` the `selfhost/` folder up. Do NOT run `npm install` /
build on the VM (OOM risk) — you only need the `selfhost/` scripts + SQL, not `node_modules`.

## Step 1 — Report findings + plan + get decisions (APPROVAL GATE)

Before touching anything, report to the user:
- Step 0 findings (state confirmed vs docs).
- The exact cutover plan you'll run (Steps 2–5 below), adapted to what you found.
- **Three decisions the user MUST make now — do not proceed without answers:**

  **(a) Rollback strategy for the data plane.** DNS rollback to Vercel points the app back at
  **Supabase Cloud data**, not the VM. So a one-way cutover means DNS rollback = rollback to a
  **stale** Cloud DB (data-loss window). Pick one and document it:
  - **(a1)** Keep Supabase Cloud as a synced read-fallback (logical replication VM→Cloud).
  - **(a2)** Accept rollback = read-only/stale mode with a written reconcile step (simplest; fine if bake window is short and you can re-dump Cloud on rollback).
  - **(a3)** Dual-write during a bake period.
  - *Recommendation:* **(a2)** for a short bake (hours–1 day) given tiny DB + seconds-long downtime; revisit if bake extends.

  **(b) Cutover window.** ⚠️ The flip is a **CI rebuild + redeploy** (see Step 4), so the freeze
  is **minutes, not seconds.** To keep it short: pre-build the new artifact (CI with the env baked
  in) ahead of time, then the freeze covers only *final dump → restore → swap artifact → reload*.
  Pick a low-traffic slot regardless.

  **(c) Go/no-go on pre-cutover quick-wins** (Step 2) landing first.

**WAIT for the user's answers before Step 2.**

## Step 2 — Pre-cutover quick-wins (land BEFORE the flip)

1. **HeadersOverflow permanent fix (code — via PR, not pushed from VM).** Batch the 11 raw
   `.in()` calls in `src/app/(admin)/laporan/actions/reports/materiQueries.ts` (lines 113, 133,
   143–144, 272, 325–326, 413–414, 506–507) via `fetchInBatches()` (chunk 100) from
   `src/lib/utils/batchFetching.ts` — `queries.ts` already does this; `materiQueries.ts` was
   missed. Self-hosted PostgREST uses the same `?id=in.(...)` URL filter and has its own URL/header
   ceiling, so this is **required**, not optional. If done on local (recommended), it deploys to
   the VM via the normal `git push master` → CI → rsync pipeline. Confirm the deployed artifact
   already contains it before flipping, OR keep the `--max-http-header-size=65536` band-aid in
   `ecosystem.config.js` as belt-and-suspenders (keep it regardless).
2. **Confirm PostgREST tolerates large URLs/headers.** PostgREST/Warp default request-line and
   header limits must accommodate the ~30KB `in.(...)` URLs. Verify with a large `?id=in.(...)`
   curl against the VM PostgREST once it's up (Step 4); if it 414/431s, front it so the limit is raised.
3. **Bump swap 1.9GB → 4GB** (OOM net; Postgres + PostgREST + Node co-resident on 3.6GB RAM).
   Run at **low load** — `swapoff` needs RAM to hold current swap contents:
   ```bash
   sudo swapoff /swap.img
   sudo fallocate -l 4G /swap.img && sudo chmod 600 /swap.img
   sudo mkswap /swap.img && sudo swapon /swap.img
   grep -q '/swap.img' /etc/fstab || echo '/swap.img none swap sw 0 0' | sudo tee -a /etc/fstab
   swapon --show
   ```

## Step 3 — Native install Postgres + PostgREST (NO Docker)

APPROVAL GATE before installing.

- **PostgreSQL 16** (or 17 to match Supabase PG 17.6 — prefer matching the dump's server version):
  `sudo apt install postgresql-16`. Listen on `localhost` only. Lean config in `postgresql.conf`:
  `shared_buffers=192MB`, `max_connections=20`, `work_mem=8MB`. The 91MB DB caches fully.
- **PostgREST**: static binary (no apt package needed) → `/usr/local/bin/postgrest`. Bind
  `127.0.0.1:3001`.
- Create DB + roles + shims **by reusing `selfhost/sql/`** (from the scratch clone/scp in Step 0),
  adapted from Postgres.app paths to the apt cluster:
  - `sql/00_roles.sql` — `anon`/`authenticated`/`service_role`/`authenticator` + **`statement_timeout`
    on `authenticator`** (15s; without it the schema-cache introspection hangs → PGRST002 → all 503.
    This bit the local setup — see `docs/plans/rosy-roaming-minsky.md` / memory
    `selfhost-postgrest-authenticator-timeout`). Do NOT omit.
  - `sql/01_auth_shim.sql` — `auth.uid()/role()/jwt()` reading `request.jwt.claims`.
  - `sql/02_grants.sql` — grants incl. `authenticator` SELECT for introspection.
- **systemd unit for PostgREST** (replaces `run-postgrest.sh`), env mirroring that script:
  `PGRST_DB_URI=postgres://authenticator:...@localhost:5432/<db>`, `PGRST_DB_SCHEMAS=public`,
  `PGRST_DB_ANON_ROLE=anon`, `PGRST_SERVER_HOST=127.0.0.1`, `PGRST_SERVER_PORT=3001`,
  `PGRST_SERVER_CORS_ALLOWED_ORIGINS=https://<prod-domain>`, and the **JWK-Set-wrapped
  `PGRST_JWT_SECRET`** (the `run-postgrest.sh` python snippet that wraps the Supabase legacy
  secret + `kid` — GoTrue tokens carry a `kid`; a bare secret → "No suitable key" → 401). Enable
  + start; PostgREST must survive reboot.

## Step 4 — Cutover: freeze → dump → restore → flip → verify

APPROVAL GATE before the write-freeze (this is the downtime window).

1. **Announce/enter a brief write-freeze** (per decision (b)). Downtime is seconds — small DB.
2. **Final dump from Supabase Cloud** → VM: run `selfhost/dump-supabase.sh` (needs
   `SUPABASE_DB_URL` in `selfhost/.env.selfhost`; use pg_dump matching the Cloud server version).
   This is the authoritative last snapshot.
3. **Restore into VM Postgres**: `selfhost/restore-local.sh` (drops+recreates the DB, strips the
   `profiles→auth.users` FK, applies roles/shims/grants, `VACUUM ANALYZE`). Verify the row counts
   it prints (tables / policies / functions / RLS tables) match Cloud.
4. **Point the app at local PostgREST — REQUIRES A REBUILD, not just an `.env` edit.**
   > 🚨 **Verified from code (2026-07-14):** `NEXT_PUBLIC_DATA_POSTGREST_URL` is read in
   > **client components** — `src/lib/supabase/client.ts:36` (the browser data client),
   > `src/hooks/useAttendanceRealtime.ts:15` (polling-vs-Cloud switch), `src/app/(admin)/tracking/page.tsx:122`.
   > `NEXT_PUBLIC_*` vars are **inlined into the browser bundle at BUILD time**. The build runs
   > on **GitHub Actions (cloud), not the VM.** So editing `/home/ubuntu/apps/.env` + `pm2 reload`
   > does **NOT** change the browser bundle — client queries would still hit Supabase and the
   > polling adapter would stay off (breaking live presensi on VM writes).
   >
   > **Correct cutover:** set `NEXT_PUBLIC_DATA_POSTGREST_URL=http://127.0.0.1:3001` in the
   > **GitHub Actions build env / repo secret**, then trigger a **rebuild + redeploy** (`git push master`
   > → CI builds with the var baked in → rsync artifact → `pm2 reload`). That is the flip.
   >
   > *(Server-side `server.ts:11-12` also reads a non-`NEXT_PUBLIC_` fallback `DATA_POSTGREST_URL`
   > at runtime, but the client half is build-time — so a rebuild is mandatory regardless.)*
   Keep all Supabase auth envs (`NEXT_PUBLIC_SUPABASE_URL`, anon key) unchanged — Auth + Realtime
   stay Cloud.
5. After the redeploy lands (CI → rsync → `pm2 reload generus-mandiri`) → lift the write-freeze.
   > Note: because the flip is a CI rebuild, the write-freeze window = **CI build + deploy time
   > (minutes), not seconds.** Plan the freeze/window (decision (b)) around that, or pre-build the
   > new artifact and keep the freeze only around the final dump→restore→swap-artifact→reload.
6. **Smoke test against the live VM data plane** — re-run `docs/checklists/sm-5ago-rls-verification.md`
   condensed: login superadmin / admin-daerah / teacher; confirm row-scoping matches Cloud
   (no cross-daerah leak); the 2 RPCs (`get_valid_class_ids`, `get_valid_student_ids`) 200; a
   write (create meeting / isi presensi / QR scan) persists; presensi live-polling updates;
   large `?id=in.(...)` query does not 414/overflow. In DevTools, confirm data requests hit
   `127.0.0.1:3001` server-side (not `*.supabase.co`) while auth still hits Supabase.

## Step 5 — Rollback runbook + monitor

- **Rollback (data plane):** the fast lever is to **unset** `NEXT_PUBLIC_DATA_POSTGREST_URL` in
  the VM `.env` (or DNS→Vercel) → app falls back to Supabase Cloud data. Per decision (a),
  document the data implication: with (a2), Cloud is the pre-cutover snapshot → any writes made
  after cutover are on the VM only → rollback needs a reconcile (re-dump VM→Cloud or accept the
  gap). Write the exact rollback commands into `server/docs/rollback.md` before the flip.
- **Nightly `pg_dump` backup** on the VM to disk (33GB free) + optional off-box copy. Add a cron.
- **Monitor egress dashboard 2–3 days:** PostgREST share should collapse toward ~0%; Auth +
  Realtime remain (~7%, ~28MB/day). Confirm Supabase Free-tier headroom returns.

## Report back

- Step 0 state; the 3 decisions the user made (a/b/c).
- Install summary (Postgres config, PostgREST systemd unit, roles/shims applied, `authenticator`
  timeout set).
- Cutover result: dump/restore row-count parity, RLS smoke-test results per role, HeadersOverflow
  large-`in` check, `pm2 reload` outcome.
- The written rollback runbook + backup cron.
- 2–3 day egress-monitoring plan.
- Any deviation from this prompt or the plan, with reason.

## Out of scope (not now)

- Migrating Auth (GoTrue) or Realtime off Supabase — they stay Cloud by design.
- Self-hosting Supabase Realtime — the polling adapter (sm-4onc) already covers VM writes.
- Any schema change beyond the materiQueries batch fix.
