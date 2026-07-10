# Cut /laporan Egress — sm-5jzd

**Date:** 2026-07-10
**Beads:** sm-5jzd (P1)
**GH:** #TBD
**Status:** in progress

## Context — why this exists

`/laporan` report generation is the single largest PostgREST egress source. Confirmed via Supabase `api` logs (10 Jul 2026): one full-scope 4-month report load produced **42 `attendance_logs` chunk requests + full-org `students` nested join + `meetings` query carrying `student_snapshot` jsonb**, ~100MB in one burst (10 Jul jumped 159MB → 261MB PostgREST that afternoon).

Egress is billed on PostgREST payload bytes (row data × frequency), not DB size. See `docs/claude/egress-cost-optimization.md`.

### Three concrete waste sources found (read of `actions/reports/actions.ts` + `queries.ts`)

1. **`meetings` fetched TWICE with the same date/activity filter.**
   - Step 6 `fetchMeetingsForDateRange` → `select('id, date, class_id, class_ids')`
   - Step 15 `fetchMeetingsWithFullDetails` → `select('id, title, date, student_snapshot, class_id, class_ids, classes:class_id(id,kelompok_id)')`
   Same WHERE clause, overlapping columns. Two round-trips + two payloads for one logical dataset.

2. **`student_snapshot` (jsonb) egressed but only `.length` is read.**
   - Only consumer: `logic.ts:502` in `aggregateTrendData` — `meeting.student_snapshot?.length || 0` as fallback total-students when a meeting has zero attendance logs.
   - `student_snapshot` is a full array snapshot of students (can be tens of KB per meeting row). Multiplied across hundreds of meetings = large payload for a single integer.

3. **`title` selected in step 15 but never read.** (grep confirms no `.title` read in laporan.)

### Field-usage audit (so the merge is safe)

Meeting fields actually consumed anywhere in `logic.ts` (`enrichAttendanceLogs`, `filterAttendanceByClass`, `filterAttendanceByKelompok`, `aggregateTrendData`):
`meeting.id`, `meeting.date`, `meeting.class_id`, `meeting.class_ids`, `meeting.classes?.kelompok_id` (step 16 enrich), `meeting.student_snapshot?.length` (fallback only).

Nothing else. So one query returning `{id, date, class_id, class_ids, kelompok_id (from classes), snapshot_count}` fully replaces BOTH meeting queries.

## Decision: single Postgres RPC `get_report_meetings`

- One RPC call replaces `fetchMeetingsForDateRange` + `fetchMeetingsWithFullDetails`.
- Returns `snapshot_count := coalesce(jsonb_array_length(student_snapshot), 0)` instead of the full jsonb — the fat field never leaves Postgres.
- Returns `kelompok_id` (joined from `classes.kelompok_id`) directly, so step 16's classKelompokMap enrichment is preserved.
- Filters (date range + activity_type_id + activity_level_id) done in SQL — identical predicate to current queries.
- Runs under `createAdminClient()` (bypasses RLS, same as today). `SECURITY DEFINER`.

Chunk size for `attendance_logs` (3) stays — it exists to dodge the 1000-row truncate, NOT URL length. Do NOT touch it (regression risk; see `batchFetching.ts` comment).

## Scope

### Task 1 — RPC migration (`get_report_meetings`)

Create migration via `mcp__generus-mandiri-v2__apply_migration` (name: `report_meetings_rpc`):

```sql
create or replace function public.get_report_meetings(
  p_date_gte timestamptz default '1900-01-01',
  p_date_lte timestamptz default '2100-12-31',
  p_activity_type_ids uuid[] default null,
  p_activity_level_ids uuid[] default null
)
returns table (
  id uuid,
  date timestamptz,
  class_id uuid,
  class_ids text[],  -- meetings.class_ids is text[] (_text), NOT uuid[]
  kelompok_id uuid,
  snapshot_count int
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.date,
    m.class_id,
    m.class_ids,
    c.kelompok_id,
    coalesce(jsonb_array_length(m.student_snapshot), 0) as snapshot_count
  from meetings m
  left join classes c on c.id = m.class_id
  where m.date >= p_date_gte
    and m.date <= p_date_lte
    and (p_activity_type_ids is null or m.activity_type_id = any(p_activity_type_ids))
    and (p_activity_level_ids is null or m.activity_level_id = any(p_activity_level_ids))
  order by m.date;
$$;

grant execute on function public.get_report_meetings to authenticated, service_role;
```

Verify: `select * from get_report_meetings('2026-07-01','2026-07-31',null,null) limit 5;` returns rows with `snapshot_count` int, no jsonb.

### Task 2 — queries.ts: add `fetchReportMeetings`, keep old fns for now

Add:
```typescript
export async function fetchReportMeetings(
    supabase: SupabaseClient,
    dateFilter: { date?: { eq?: string; gte?: string; lte?: string } },
    activityTypeFilter?: string,
    activityLevelFilter?: string
) {
    const activityTypes = activityTypeFilter ? activityTypeFilter.split(',').filter(Boolean) : null
    const activityLevels = activityLevelFilter ? activityLevelFilter.split(',').filter(Boolean) : null
    return await supabase.rpc('get_report_meetings', {
        p_date_gte: dateFilter.date?.gte || '1900-01-01',
        p_date_lte: dateFilter.date?.lte || '2100-12-31',
        p_activity_type_ids: activityTypes && activityTypes.length ? activityTypes : null,
        p_activity_level_ids: activityLevels && activityLevels.length ? activityLevels : null,
    })
}
```

RPC returns flat `kelompok_id`; step 16 code reads `meeting.classes?.kelompok_id`. Shape it back so downstream logic is untouched: map each row to `{ ...row, classes: row.kelompok_id ? { id: row.class_id, kelompok_id: row.kelompok_id } : null, student_snapshot: undefined }`. Do this mapping inside `fetchReportMeetings` OR in actions.ts step-15 replacement (prefer actions.ts so query stays a thin wrapper).

### Task 3 — logic.ts: use `snapshot_count`

`logic.ts:502`:
```typescript
// BEFORE
: meeting.student_snapshot?.length || 0
// AFTER (RPC provides snapshot_count; keep fallback for safety)
: meeting.snapshot_count ?? (meeting.student_snapshot?.length || 0)
```

### Task 4 — actions.ts: single meetings fetch

- Replace step 6 `fetchMeetingsForDateRange(...)` AND step 15 `fetchMeetingsWithFullDetails(...)` with ONE call to `fetchReportMeetings(...)`.
- Assign result to both `meetingsForFilter` and `meetings` (same array). Build the RPC-row → `{classes:{kelompok_id}}` shape once so steps 7, 11, 16, 20, 21 keep working unchanged.
- Delete now-dead `fetchMeetingsForDateRange` / `fetchMeetingsWithFullDetails` imports + fns ONLY after tests pass (Task 6).

### Task 5 — trim `fetchStudentDetails` join (verify-first, lower priority)

Audit which student sub-fields the report table + `aggregateStudentSummary` actually render before trimming. `student_classes` nested double-join (`classes→kelompok`) feeds `classKelompokMap` (step 17) — keep. `desa`/`daerah` nested objects: confirm rendered in `aggregateStudentSummary` before dropping. If unused → drop from select. Do NOT guess — grep usage first. If uncertain, skip and leave a follow-up note.

### Task 6 — tests

- `queries.test.ts`: add case asserting `fetchReportMeetings` calls `supabase.rpc('get_report_meetings', {...})` with correct params (null when no filter, array when filter present).
- `logic.test.ts`: `aggregateTrendData` uses `snapshot_count` when logs empty; still falls back to `student_snapshot.length` when `snapshot_count` absent.
- `actions.test.ts`: report shape unchanged (summary/chartData/trendChartData/detailedRecords present).
- Run `npm run test:run` (user runs — Claude does not run tests per project feedback).

## Verification

- `npm run type-check` clean.
- `npm run test:run` green (user runs).
- Manual/E2E: open `/laporan` full scope 4-month → numbers, table, trend chart identical to before.
- `mcp get_logs (api)` after a report load: `meetings` appears ONCE (not twice), no `student_snapshot` in the meetings URL, `snapshot_count` via rpc.
- Next-day egress dashboard: PostgREST MB per report load drops.

## Risk

- MEDIUM. Behavioral parity hinges on the RPC-row→`{classes:{kelompok_id}}` reshape matching what steps 16/17 expect. Covered by keeping the old fallback and by actions.test shape assertion.
- RLS: RPC is `security definer` + already gated by the existing auth check in actions.ts step 1; scope filtering still done in `filterMeetingsByRole` (Layer 2). No new data exposure — admin client already bypassed RLS here before.

## CLAUDE.md Check
- [ ] New pattern introduced? YES — first report-path Postgres RPC for egress reduction. Add a short note to `docs/claude/egress-cost-optimization.md` (pattern: "aggregate/shrink jsonb server-side via RPC instead of egressing full rows").
- [ ] New DB table? No (new function only).
- [ ] New route/page? No.
- [ ] New permission pattern? No.

## Workflow / handoff
- Claude Code: plan + bd + GH + prompt + (this session) direct implementation per user instruction.
- User: git + run tests.
