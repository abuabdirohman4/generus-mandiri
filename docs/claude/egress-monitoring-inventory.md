# Egress Monitoring Inventory

Full audit (2026-07-10) of every Supabase data-fetch path in the app, so egress drivers can be watched going forward. Companion to `docs/claude/egress-cost-optimization.md` (rules) and `docs/plans/2026-07-09-sm-kt2j-egress-optimization.md` (sm-kt2j incident/fix history).

**Row counts at audit time:** students 2,198 · profiles 126 · classes 1,248 · meetings 3,249 · attendance_logs 55,592 · activity_logs 36,877 · student_classes 2,241 · student_enrollments 2,471 · teacher_classes 772 · material_items 182 · daerah 9 · desa 20 · kelompok 70.

Legend: 🔴 HIGH (large payload, frequent/uncached) · 🟡 MEDIUM (moderate payload or frequency) · 🟢 LOW (small, scoped, cached, or rare).

---

## 🔴 HIGH RISK — fix next

### 1. `useMeetings.ts` — still has `revalidateOnFocus: true`
**File:** `src/app/(admin)/presensi/hooks/useMeetings.ts:174`
Fetches up to **1000 meetings** (`getMeetingsWithStats`) + per-meeting attendance stats. This is the **only remaining SWR hook in the codebase with `revalidateOnFocus: true`** on a large payload — sm-kt2j fixed students/teachers/admins/notifications but missed this one. Every window refocus on `/presensi` re-fetches the full meetings-with-stats list.
**Action:** same fix pattern as sm-kt2j — flip to `false`, rely on `mutate()` after writes.

### 2. `tracking/page.tsx` — N+1 query + unfiltered realtime trigger
**Files:** `src/app/(admin)/tracking/page.tsx`, `tracking/actions.ts` (`getUserActivitySummary`, `getLogMetadata`)
Three compounding problems:
- `getLogMetadata`: `.limit(2000)` on `activity_logs` (36,877 rows), re-fetched **every mount, no cache**.
- `getUserActivitySummary`: **N+1 pattern** — loops every profile in scope (up to ~126 for superadmin), each running `.select('created_at,action').limit(500)` → worst case **126 × 500 = 63,000 rows** in one page load.
- The page's own realtime channel (`tracking-logs-changes`) subscribes to `activity_logs` INSERT **unfiltered** (no `filter:` clause) — and since `PageViewTracker.tsx` logs an `open_page` activity row on *every route change for every logged-in user app-wide*, this channel fires constantly while `/tracking` is open, re-triggering the N+1 load each time.
**Action:** paginate/cache `getLogMetadata`; replace the N+1 loop with a single aggregated query (`GROUP BY user_id`); scope the realtime filter or debounce the reload.

---

## 🟡 MEDIUM RISK — periodic check, not urgent

| Item | File | Why it's on the list |
|---|---|---|
| `useStudents.ts` | `src/hooks/useStudents.ts` | Largest table fetch in the app (~2,198 rows × joined columns). Already fixed for focus-refetch (sm-kt2j) but still the biggest single payload — watch if it grows. |
| `useReportData.ts` | `src/app/(admin)/laporan/hooks/useReportData.ts:109` | `dedupingInterval` only **5 seconds** (vs 2–10 min elsewhere) — every filter tweak re-queries `attendance_logs` (55,592 rows). |
| `useMateriReportData.ts` | `src/app/(admin)/laporan/hooks/useMateriReportData.ts:53` | `dedupingInterval` only **10 seconds**, 2 parallel report queries per load. |
| `useSebaranSiswa.ts` | `src/app/(admin)/users/siswa/hooks/useSebaranSiswa.ts` | Superadmin view walks the **entire org tree** (daerah→desa→kelompok→class) with student counts. Properly cached (5 min dedupe) but payload scales with org size — will grow with the 32-kelompok expansion. |
| `monitoring/page.tsx` | `src/app/(admin)/monitoring/page.tsx` | 1,331 lines, 7 separate `useEffect` blocks, **no SWR** — every filter/class/student change re-fetches from scratch, zero cache between navigations. Individual queries are scoped, but no caching layer. |
| `MaterialsPageClient.tsx` | `src/app/(admin)/materi/components/layout/MaterialsPageClient.tsx` | `loadSidebarData()` on every mount + every tab switch, plain `useEffect`, no SWR. Small today (material_items=182) — risk grows if that table scales up. |
| Rapot bulk PDF export | `src/app/(admin)/rapot/actions/actions.ts` (`getClassReportsBulk`) | Full nested grade/assessment export per class (`.in('student_id', studentIds)`, `SELECT *` on assessments). Near-zero real data today (`student_reports` has 1 row) — **the pattern to watch as report-card usage grows**, not a current problem. |

---

## 🟢 LOW RISK — confirmed safe, no action needed

- **All other SWR hooks** (`useClasses`, `useTeachers`, `useAdmins`, `useDaerah/Desa/Kelompok`, `useClassMasters`, `useKelas`, `useDashboard`, `useActivityTypes/Levels`, `useNotifications`, `usePromotionEnabled`, `useMeetingAttendance`, `useMeetingFormSettings`, `useStudentDetail`) — proper `revalidateOnFocus: false` + multi-minute `dedupingInterval`, or small/scoped payloads.
- **Realtime — exactly 3 channels exist, confirmed complete:**
  - `attendance-realtime-{meetingId}` (`useAttendanceRealtime.ts`) — filtered per-meeting. Safe.
  - `online-users` (`usePresenceStore.ts`) — presence protocol, no table reads at all. Safe.
  - `tracking-logs-changes` (`tracking/page.tsx`) — see 🔴 #2 above, this is the risky one.
- **Polling — zero active Supabase polling anywhere.** All `refreshInterval` are `0`. The only live `setInterval`s in the codebase are a UI clock tick (`AppHeader.tsx`) and a cosmetic progress-bar animation (`Step3Preview.tsx`) — neither touches Supabase.
- **Batch-fetching utilities** (`batchFetching.ts`, dashboard helpers) — deliberately chunk-sized for Supabase/PostgREST limits (100-ID URL chunks, 3-meeting attendance chunks, 1000-row page caps). Well-designed.
- **QR ID card bulk generation** — reuses already-cached `useStudents()`/`useClasses()`, zero additional reads.
- **Batch student import** — writes only, no bulk read.
- **No Excel/CSV export feature exists** in the codebase (only CSV *import* parsing, which is client-side, not a Supabase read).

---

## How to monitor going forward

1. **Weekly (or after any feature touching a list/report page):** Supabase dashboard → Settings → Usage → Egress → "Current billing cycle" → hover daily bars for per-source breakdown. Watch for PostgREST share climbing or a new sustained daily-MB jump.
2. **Before shipping a new data-heavy feature:** check it against `docs/claude/egress-cost-optimization.md` rules (narrow `.select()`, pagination, `revalidateOnFocus:false` default, no polling for rare events).
3. **When adding a new SWR hook:** grep this file's 🟡/🔴 items first — if the new hook resembles one of them (large table, short dedupe, no SWR at all), apply the same fix pattern used in sm-kt2j before shipping.
4. **Re-run this audit** after the 32-kelompok expansion or any major feature addition — row counts (esp. `students`, `attendance_logs`, `activity_logs`) will grow, which can push a currently-🟢/🟡 item into 🔴.

Timezone note: Supabase's "Egress per day" chart buckets by **UTC**, not WIB. WIB = UTC+7, so a UTC day-bar covers 07:00 WIB to 06:59 WIB the next day.
