# Cut Detail-Presensi Egress — sm-euox

**Date:** 2026-07-10
**Beads:** sm-euox (P1)
**GH:** #TBD
**Status:** implemented (Task 1-3+5; Task 4 deferred) — nunggu user test+commit

## Context — why this exists

`/users/siswa/<id>/presensi` (student attendance detail) is the **#1 confirmed egress source in real user traffic**. On 10 Jul, `PJ Generus Pongporang` opened it ~30× in 2 hours (proven via `activity_logs.page_path`), each firing a fat month query. Egress climbed 159MB → 319MB PostgREST that day.

Egress = PostgREST payload bytes × frequency. See `docs/claude/egress-cost-optimization.md`.

### Three waste sources (code read)

**Source query:** `fetchStudentAttendanceHistory` (`users/siswa/actions/students/queries.ts:296`), called by `getStudentAttendanceHistory` (`.../students/actions.ts:1372`), consumed by `useStudentDetail` hook.

1. **`meetings!inner` join fetches `topic` + `description` on EVERY attendance row.**
   - `description`: rendered ONLY in `MeetingDetailModal` (on click, one meeting) — never in list/calendar.
   - `topic`: rendered ONLY in `MeetingDetailModal`; in `AttendanceList` it is **commented out** (line 104-106).
   - So both fat text fields are egressed for every row of every month, but only ever read for the single meeting the user clicks. Pure waste.

2. **`revalidateOnFocus: true`** on the attendance-history SWR (`useStudentDetail.ts`). Every tab-switch refetches (teachers open many tabs). Deduping 30s softens but doesn't remove it.

3. **Per-month SWR key** (`attendance-<id>-<year>-<month>-<classId>`). Navigating months fetches each month separately (the Jan..Jul loop seen in api-logs). Role/class filtering is done **client-side** (fetch-all-then-filter in JS) rather than in the query.

### Modal data-flow constraint (verified — do not break)

`MeetingDetailModal` receives `meeting: AttendanceLog` **from the list** (`onMeetingClick(log)` in `AttendanceList.tsx`). It does NOT fetch its own data. So if `topic`/`description` are dropped from the list query, the modal must get them another way. → Task 2 (lazy-fetch on modal open).

## Scope

### Task 1 — Trim the list query (biggest, safe win)

`fetchStudentAttendanceHistory` — remove `topic` and `description` from the `meetings!inner(...)` select. Keep: `id, title, activity_type_id, activity_type(id,code,name), class_id, class_ids, classes(id,name)`.

```typescript
// queries.ts:302 — new select
meetings!inner(
  id,
  title,
  activity_type_id,
  activity_type:activity_types(id, code, name),
  class_id,
  class_ids,
  classes ( id, name )
)
```

Result: list/calendar payload shrinks by the `topic`+`description` text of every row. `title` stays (list renders it).

### Task 2 — Lazy-fetch meeting detail on modal open

Add `fetchMeetingDetail(supabase, meetingId)` → `meetings.select('id, title, topic, description, ...').eq('id', meetingId).single()`. Add server action `getMeetingDetail(meetingId)`. In the detail page/modal container: when a meeting is clicked, fetch its full detail (SWR key `meeting-detail-<meetingId>`, `revalidateOnFocus:false`, long dedupe) and pass topic/description into `MeetingDetailModal`. Modal reads from this on-demand object.

Type-wise: `AttendanceLog.meetings` no longer guarantees `topic`/`description`. Make those optional in the type (`topic?`, `description?`) so the list type and modal-detail type coexist. Verify `src/types/*` — update the canonical type, don't inline.

**Alternative if lazy-fetch is too invasive:** keep `topic`/`description` ONLY when the calendar view is a single-day drill-down (small row count), still drop them from full-month list. Decide during implementation; prefer lazy-fetch (cleaner, biggest cut).

### Task 3 — Kill focus revalidation on attendance history

`useStudentDetail.ts` — attendance-history SWR: `revalidateOnFocus: true` → `false` (keep `revalidateOnReconnect`, keep `dedupingInterval`). Attendance history is not volatile enough to justify refetch on every tab focus. `studentInfo` SWR already has `revalidateOnFocus:false` — match it.

### Task 4 — (defer / follow-up) push role+class filter into the query

Currently `getStudentAttendanceHistory` fetches all logs then filters by teacher class / classId in JS. Pushing the filter into the DB query would shrink rows for teachers viewing a scoped class. **Defer** — it changes correctness surface (teacher vs admin vs hierarchical-teacher paths) and needs its own test pass. Note as follow-up in the issue, don't bundle. The per-month loop itself is UX (user picks a month) — leave it; Task 1+3 already cut the per-row and per-focus waste.

### Task 5 — Tests

- `queries.test`: assert trimmed select does NOT contain `topic`/`description`; `fetchMeetingDetail` selects them.
- `actions.test` (if present): `getStudentAttendanceHistory` shape unchanged (attendanceLogs + stats); `getMeetingDetail` returns `{success,data,message}`.
- Component: `MeetingDetailModal` still renders topic/description when given a detail object; renders gracefully when absent.
- User runs `npm run test:run` + `npm run type-check` (Claude does not run tests — project feedback).

## Verification

- Open `/users/siswa/<id>/presensi`: list + calendar identical; click a meeting → modal shows topic/description.
- `mcp get_logs (api)` after a view: the `attendance_logs?...meetings!inner(...)` URL no longer contains `topic`/`description`; a separate small `meetings?id=eq.<x>` fires only on modal open.
- Egress dashboard: PostgREST MB per detail-presensi view drops.

## Risk

- LOW–MEDIUM. Task 1 + 3 are low risk (drop unused fields, disable focus refetch). Task 2 (lazy modal) touches type + a component wiring — covered by making `topic`/`description` optional + component test.

## CLAUDE.md Check
- [ ] New pattern? Minor — "fetch fat fields on-demand (modal) not per-row". Already covered by the RPC/shrink rule added in `egress-cost-optimization.md` (sm-5jzd). Add one line referencing the on-demand-detail variant if useful.
- [ ] New DB table? No.
- [ ] New route/page? No.
- [ ] New permission pattern? No.

## Workflow / handoff
- Claude Code: plan + bd (sm-euox) + GH + prompt.
- Implementation: Antigravity (≥3 files: queries, actions, hook, modal, types, tests) OR direct.
- User: git + run tests.

## Related
- sm-5jzd (`/laporan` egress RPC) — same class of fix, different page.
- sm-uxnv (P2) — server-side pagination for the siswa LIST (different from this detail page).
- `docs/claude/egress-cost-optimization.md`.
