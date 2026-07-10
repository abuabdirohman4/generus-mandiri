# Egress Cost Optimization

Supabase Free tier bills **egress** (outgoing bandwidth) at 5GB/month. This project hit the quota (sm-kt2j, 2026-07). Root cause: **PostgREST payload — table-row data returned to clients — consistently made up ~92% of daily egress**, not database size, not auth, not realtime. Read this before adding any data-fetching code.

## The core rule

**Every fetch = bytes out. Egress scales with *size × frequency* of row fetches, not with database size or number of users.** A small DB (91MB) with sloppy fetch patterns can burn more egress than a large DB with tight ones.

## What NOT to do

- ❌ **`SELECT *` or unnecessary joins on list views.** Only select columns the UI actually renders. Nested joins (e.g. pulling `daerah/desa/kelompok` on every row) multiply payload size — resolve names client-side from an already-cached reference list, or only join on detail views.
- ❌ **Fetch all rows for list rendering.** `fetchAllStudents`-style helpers that bypass Supabase's 1000-row cap are for genuine bulk operations (export, import, grade promotion) — never for rendering a paginated table. See `docs/plans/2026-07-09-sm-kt2j-egress-optimization.md` (sm-uxnv, deferred) for the pagination pattern to use.
- ❌ **`revalidateOnFocus: true` on large-list hooks.** Every window refocus re-fetches the full payload. This was the single biggest egress driver found (`useStudents`, `useTeachers`, `useAdmins` all had it enabled). Default is `false` (`src/lib/swr.ts`) — only opt a hook back into `true` for genuinely small, live-updating payloads (single meeting, single student detail).
- ❌ **Aggressive polling (`refreshInterval`) for infrequent events.** `useNotifications` used to poll every 60s for notices that fire ~once a month. If an event is rare, just refetch on login/navigation — don't poll.
- ❌ **Reaching for realtime (`postgres_changes`) as a default "make it live" solution.** Realtime WAL subscriptions have a background cost even when idle. Only use it for genuinely frequent, latency-sensitive updates (e.g. `useAttendanceRealtime` — live attendance during an active meeting, scoped per-meeting-id). For rare events, prefer refetch-on-navigation.

## What TO do

- ✅ Narrow `.select()` to rendered columns.
- ✅ Server-side pagination via Supabase `.range(from, to)` for any list that can grow past ~50-100 rows.
- ✅ Long `dedupingInterval` (10-30min) + `revalidateIfStale: false` for reference/stable data (classes, kelompok, daerah, desa, activity types — anything that rarely changes).
- ✅ Scope realtime subscriptions tightly (filter by ID, not whole-table) if you do need them — see `useAttendanceRealtime.ts` for the pattern (per-meeting channel, cleanup on unmount).
- ✅ Keep the middleware matcher narrow and skip auth validation (`getUser()`) on Next.js prefetch requests (`next-router-prefetch` / `purpose: prefetch` headers) — see `src/middleware.ts`. Never swap `getUser()` for `getSession()` in middleware, that skips token validation (security regression).
- ✅ **Shrink/aggregate server-side via a Postgres RPC instead of egressing full rows.** If you only need a count, sum, or derived value from a fat column (jsonb array, large text), compute it in SQL (`jsonb_array_length`, `count`, `sum`) and return the small value — the fat field never leaves Postgres. Also use one RPC to collapse a query fetched twice with the same filter. Example: `get_report_meetings` (sm-5jzd) replaced two `/laporan` meeting fetches (one carrying full `student_snapshot` jsonb) with a single RPC returning `snapshot_count`.
- ✅ **Guard admin-only pages in a server component (layout/page), not just by hiding the sidebar menu.** A hidden menu still lets a non-admin hit the URL directly and trigger the page's data fetch (= egress + access leak). A `redirect()` in the server layout blocks render AND fetch before anything runs. Example: `organisasi/layout.tsx` (sm-2m5n).

## Checking impact

Supabase dashboard → Settings → Usage → Egress → "Current billing cycle" → per-source breakdown (hover a bar). Auth/Realtime/Storage should each stay under ~10%; if PostgREST dominates, look for the anti-patterns above in whatever feature was just shipped.

**Dev-session caveat:** egress spikes during active local development (hot-reload, frequent tab-switching before `revalidateOnFocus` fixes, testing with superadmin/admin-daerah accounts that have the widest data scope) are not representative of real user traffic. When investigating a spike, check whether it coincides with a dev session before concluding it's a production problem.

Full incident writeup + baseline numbers: `docs/plans/2026-07-09-sm-kt2j-egress-optimization.md`.
