# Self-Host Postgres + PostgREST (Hybrid) — Eliminate PostgREST Egress

**Date:** 2026-07-10
**Status:** PROPOSAL — pending decision. Do local-first, then server.
**Related:** `docs/claude/egress-cost-optimization.md` · `docs/claude/egress-monitoring-inventory.md` · `docs/plans/2026-07-09-sm-kt2j-egress-optimization.md`

---

## 1. Why this exists

Supabase Free plan (5GB/mo egress) hit a grace period (Egress Exceeded). Grace ends **02 Aug 2026** → after that, requests may return **402**.

**Root cause is known and evidence-based** (sm-kt2j): **PostgREST payload = ~92% of egress**, consistently across days. Auth ~6%, Realtime ~1.4%, Storage <0.4%. DB is only **91MB** — the problem is fetch *size × frequency*, not scale.

This plan **removes the 92%** by moving the data plane (Postgres + PostgREST) onto our own VM. Data fetches become localhost traffic → **zero Supabase egress for data**. Auth + Realtime stay on Supabase Cloud (combined ~7%, negligible, and not worth self-hosting).

### Do these FIRST (cheaper, no architecture change)
1. Finish remaining egress quick-win: `tracking/page.tsx` N+1 + `getLogMetadata` `.limit(2000)` cache (see inventory 🔴 #2).
2. Measure a **quiet, non-dev** 2–3 day egress window. The sm-kt2j baseline (~410MB/day) is inflated by dev sessions. If real user egress already fits under 5GB after quick wins, self-hosting is optional (a "never worry again" upgrade), not urgent.

**Status update (2026-07-11):** major code-side egress cuts have since landed — server-side student-list pagination (**sm-uxnv**), a `get_report_meetings` RPC that returns `snapshot_count` instead of full jsonb (**sm-5jzd**), and lazy-fetch of meeting topic/description on `/presensi` + student detail (**sm-2fux**, **sm-euox**). Together these remove the largest PostgREST payloads. **Re-measure real egress before committing to self-host** — the code path may now fit Free tier comfortably, which pushes this plan firmly into "scale insurance / eliminate the dependency," not "urgent fix."

**Related dev-side effort — `sm-csvk` (local Supabase for dev):** a *complementary, separate* plan (`docs/plans/2026-07-10-sm-csvk-local-supabase-dev.md`). It runs `supabase start` locally so **development** traffic stops burning **production** egress. That is a dev-environment concern; THIS plan is the **production** data-plane move. They don't conflict — and sm-csvk's local schema-dump + `supabase start` stack is a useful foundation for THIS plan's Phase 1 local bring-up.

**Self-hosting is the permanent fix** — pursue it deliberately, not as a panic response.

---

## 2. Target architecture (Hybrid)

```
                        ┌─────────────────────── Supabase Cloud ───────────────────────┐
  Browser / Next.js ───►│  GoTrue (Auth: login, OAuth, JWT issue)   Realtime (presence) │
        │               └───────────────────────────────────────────────────────────────┘
        │                         ▲ issues JWT (signed with JWT secret)
        │ Authorization: Bearer <supabase access_token>
        ▼
  ┌───────────────── This VM (localhost) ─────────────────┐
  │  PostgREST  ──►  PostgreSQL 16  (all app tables, RLS)  │
  │  validates JWT with the SAME Supabase JWT secret       │
  │  → auth.uid() works → existing RLS policies enforce    │
  └────────────────────────────────────────────────────────┘
```

- **Stays on Supabase Cloud:** GoTrue (Auth), Realtime. Reason: tiny egress share, and self-hosting GoTrue means migrating the `auth.users` store + OAuth config — high effort, no egress benefit.
- **Moves to VM:** PostgreSQL (all `public` schema tables + functions + RLS), PostgREST (the REST layer supabase-js talks to).
- **Key trick:** local PostgREST is configured with Supabase's **JWT secret**, so Supabase-Cloud-issued access tokens validate locally. `auth.uid()` / `auth.jwt()` resolve from the token claims → **existing RLS policies keep working unchanged.**

### Why `.from()` code barely changes
supabase-js `.from().select()` just speaks the PostgREST wire protocol. Point the **data client** at `http://localhost:PORT` instead of `https://<proj>.supabase.co` and the 587 existing queries work as-is. No Drizzle/Prisma rewrite.

---

## 3. The one real code change: split the client

Today one supabase-js instance does **both** auth and data. We split into two:

| Client | Endpoint | Used by |
|---|---|---|
| `authClient` | Supabase Cloud | login / OAuth / session / `auth.getUser()` (~74 call sites) |
| `dataClient` | local PostgREST | all `.from()` / `.rpc()` (~587 call sites) |

**Smaller surface = keep `createClient()` returning the DATA client** (so the 587 `.from()` calls are untouched), and route the ~74 auth calls through a new `createAuthClient()`.

**Critical:** the data client must send the current user's Supabase access token as `Authorization: Bearer <token>` so PostgREST can enforce RLS.
- **Server** (`lib/supabase/server.ts`): read the Supabase session cookie → extract `access_token` → build data client with `global.headers.Authorization`.
- **Browser** (`lib/supabase/client.ts`): read session from `authClient` → attach token; refresh header on token refresh.
- **Admin/service paths** (`createAdminClient`, 36 sites): data client using the **service_role** JWT (or a local role that bypasses RLS) — same bypass semantics as today.

**RLS decision (pick one, record it):**
- **B1 — RLS preserved (recommended, secure):** local PostgREST validates the Supabase JWT secret; `auth.uid()` works; all current RLS policies migrate and enforce. Defense-in-depth intact.
- **B2 — RLS off, app-layer only (simpler, security tradeoff):** run PostgREST trusted/service-role, rely solely on `getDataFilter` app-layer scoping. Less wiring, but **drops RLS as a security layer** (sm-2bx invested in RLS — do not choose silently).

Default to **B1**.

---

## 4. Phases

### Phase 0 — Prep & secrets (local)
- [ ] From Supabase dashboard: **Settings → API → JWT Settings → JWT Secret** (needed for PostgREST `PGRST_JWT_SECRET`).
- [ ] Supabase DB connection string (Settings → Database) for `pg_dump`.
- [ ] Confirm RLS decision **B1 vs B2**. Record in this file.
- [ ] Inventory: `grep -rl "createAdminClient" src` (service-role sites) and `from '@/lib/supabase/server'` (RLS sites) — the two client-split cohorts.

### Phase 1 — Local dev bring-up (on developer laptop first)
- [ ] Local Postgres 16 (Docker fine locally): `docker run postgres:16`.
- [ ] Dump Supabase: `pg_dump --schema=public --no-owner --no-privileges` (schema + data) + separately capture RLS policies and the 2 RPC functions (`get_valid_class_ids`, `get_valid_student_ids`). Restore into local PG.
- [ ] Create the Supabase-compat `auth` schema shims in local PG: `auth.uid()`, `auth.role()`, `auth.jwt()` (standard Supabase definitions — read the current claim off `request.jwt.claims`). Grant `anon`/`authenticated` roles PostgREST expects.
- [ ] Local PostgREST (Docker binary) with `PGRST_JWT_SECRET=<supabase secret>`, `PGRST_DB_ANON_ROLE=anon`, `PGRST_DB_SCHEMAS=public`.
- [ ] Implement client split (Section 3). Add env: `DATA_POSTGREST_URL`, keep `NEXT_PUBLIC_SUPABASE_URL` for auth only.
- [ ] Run against a real Supabase login token (auth still cloud) hitting local PostgREST for data. Verify: RLS scoping per role (superadmin / admin-daerah / teacher), the 2 RPCs, batch-fetch helpers, writes (`createAdminClient` paths).
- [ ] Full test suite: `npm run test`, `npm run type-check`, key e2e (naik-kelas, presensi, laporan).

### Phase 2 — Server deploy (this VM)
- [ ] **Native install** (not Docker — saves RAM on a 3.6GB box): `apt install postgresql-16 postgrest` (or PostgREST static binary). See Section 5.
- [ ] Restore schema+data+RLS into local PG on VM. Set up nightly `pg_dump` backup to disk (33GB free).
- [ ] systemd unit for PostgREST bound to `127.0.0.1` only (never public). Postgres listens on localhost only.
- [ ] Point Next.js `.env` `DATA_POSTGREST_URL=http://127.0.0.1:PORT`. Keep Supabase auth env.
- [ ] **Data sync cutover:** freeze writes briefly → final `pg_dump` from Supabase → restore → flip env → `pm2 restart`. (Small DB, downtime is seconds.)
- [ ] Monitor egress dashboard 2–3 days: PostgREST share should collapse toward ~0%; Auth/Realtime remain.

---

## 5. Server capacity / performance / storage impact (this VM)

**Server spec (from `server/README.md`):** Tencent Cloud via sumopod.com · 2 vCPU · 4GB RAM (3.6GB usable) · 60GB disk · **Egress 1.54TB/mo @ 30 Mbps** · Rp90.000/mo · Public IP 43.133.130.123.

**Current state (measured 2026-07-10):**
- RAM: 3.6GB total, ~654MB free, **~2.3GB available** (buff/cache reclaimable). Swap 1.9GB (663MB used).
- Disk: 59GB, **33GB free**.
- Running: Next.js via pm2 (~232MB). No Postgres/Docker present.

### Egress capacity — the whole point (measured 2026-07-10)

Supabase egress is ~92% PostgREST (data fetches), already gzip-compressed on the wire (verified: Node/undici sends `Accept-Encoding: gzip`, so compression is NOT an untapped lever). Measured compressed payloads: meetings-full **597KB**, students/1000-rows **87KB**, activity/attendance-logs/2000 **~60KB**, classes **35KB**.

Per-user monthly egress estimate (by role scope): guru ~10MB · admin sedang ~40MB · admin daerah/superadmin ~120MB.

**Capacity per egress ceiling:**

| Architecture | Egress ceiling | guru (10MB) | admin sedang (40MB) | admin luas (120MB) |
|---|---|---|---|---|
| Supabase Free (now) | 5 GB | ~512 | ~128 | **~43** |
| Supabase Pro ($25/mo) | 250 GB | ~25,600 | ~6,400 | ~2,100 |
| **Self-host on this VM** | **1.54 TB** | ~157,000 | ~39,000 | **~13,000** |

**Why self-host wins here:** the VM's 1.54TB is **308× the Supabase Free 5GB** and 6× Pro's 250GB — and it's already paid for. After self-hosting: (1) DB↔PostgREST↔Next.js traffic is **localhost = 0 egress**, doesn't touch the VM's 1.54TB; (2) the only VM egress is Next.js→browser, which already runs on this VM today, so self-hosting **adds nothing** to VM egress; (3) Supabase drops to Auth+Realtime only (~7%, ~28MB/day) → **fits Free tier forever, Supabase bill → 0**. Root bottleneck moves from egress → the 4GB RAM (fine for a 91MB DB).

**Added load (native install):**
| Component | RAM | Disk | Notes |
|---|---|---|---|
| PostgreSQL 16 | ~120–200MB RSS | ~300–600MB | 91MB DB caches fully in `shared_buffers` (set 128–256MB). |
| PostgREST | ~30–60MB | ~15MB binary | Single Haskell process, bound to localhost. |
| **Total added** | **~200–260MB** | **~0.5–1GB** | Fits in the ~2.3GB available. |

**Verdict:**
- **RAM:** fits, but the box is modest — use **native** (not Docker daemon, which adds ~100–200MB overhead). Set Postgres conservatively (`shared_buffers=192MB`, `max_connections=20`, `work_mem=8MB`). Consider growing swap to 2–3GB as a safety net.
- **Disk:** trivial — 91MB DB + WAL + indexes + backups « 33GB free.
- **Performance:** **improves.** Every query today crosses the internet to Supabase's region (tens of ms RTT). Localhost = sub-ms. The 91MB DB living entirely in RAM cache means near-instant reads.
- **Risk:** memory pressure if a heavy report + Next.js build + Postgres coincide. Mitigate: cap Postgres memory, keep swap, don't run `npm run build` on the VM during peak (build on CI / already deployed as prebuilt).

---

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **RLS breaks** (auth.uid() null → policies deny/leak) | B1: PGRST_JWT_SECRET = Supabase secret; port `auth.uid/jwt/role` shims; test all 3 roles before cutover. |
| Client-split leaks token or forgets header → RLS denies all | Centralize header injection in `server.ts`/`client.ts`; add a smoke test asserting a scoped query returns role-appropriate rows. |
| `auth.users` FKs in public tables | public tables reference the user UUID; keep the UUIDs identical (pg_dump preserves them). Drop hard FK to `auth.users` if it blocks restore; app already joins via `profiles`/`user_profiles`. |
| Supabase rotates JWT secret | Document it; rotation requires updating `PGRST_JWT_SECRET`. Rare. |
| VM Postgres data loss | Nightly `pg_dump` to disk + optionally off-box copy; Supabase remains a warm fallback until cutover is proven. |
| Realtime still needs DB changes it can't see (WAL) | Realtime stays on Supabase Cloud reading Supabase's DB — but our writes now go to the VM DB. **Presence (`online-users`) is fine (no table reads).** `postgres_changes` channels (`attendance-realtime`, `tracking-logs-changes`) would NOT see VM writes. **Audit realtime table-subscriptions before cutover** — may need to move those to SSE/polling or accept they break. (Inventory: only `useAttendanceRealtime` uses `postgres_changes` on a real table.) |
| Public exposure of PostgREST/Postgres | Bind both to `127.0.0.1` only; never open firewall ports. |

**⚠ The Realtime `postgres_changes` row (last) is a genuine gotcha** — once data moves off Supabase, any realtime channel that watches a *table* stops seeing new rows. Resolve `useAttendanceRealtime` (live meeting attendance) before cutover: either self-host Realtime too, or replace that one feature with SSE/polling against the VM.

---

## 7. Decision checklist before starting

- [ ] Quick-win egress fixes done + real (non-dev) egress measured — is self-hosting still needed/wanted?
- [ ] RLS approach chosen: **B1** (recommended) or B2.
- [ ] Accept the Realtime `postgres_changes` follow-up (audit + fix `useAttendanceRealtime`).
- [ ] Confirm doing it local-first, prove it, then server cutover with Supabase as fallback.
