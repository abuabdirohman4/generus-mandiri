# sm-8c8i: Field Jam Masuk per Meeting (Tepat Waktu vs Telat)

## Goal

Per-meeting optional check-in-time tracking. Admin/guru bisa aktifkan "cek waktu masuk" di form meeting + set jam mulai. Saat siswa ditandai Hadir (manual atau QR scan), sistem catat jam masuk aktual dan tandai Tepat Waktu / Telat berdasar threshold jam mulai meeting. Live Presentasi grid sort ulang: Hadir terbaru discan tampil paling depan (roll-call effect).

## DB Schema Changes

### Migration: `add_check_in_time_tracking`

```sql
-- attendance_logs: actual check-in timestamp (nullable, set when status becomes 'H')
ALTER TABLE attendance_logs ADD COLUMN check_in_time timestamptz;

-- meetings: optional start time + toggle for late-check feature
ALTER TABLE meetings ADD COLUMN start_time time; -- nullable, e.g. '19:00:00'
ALTER TABLE meetings ADD COLUMN check_time_enabled boolean NOT NULL DEFAULT false;
```

Apply via `mcp__generus-mandiri-v2__apply_migration` (name: `add_check_in_time_tracking`).

**Design notes:**
- `start_time` = `time` type (jam only, tanpa tanggal) — dikombinasikan dengan `meetings.date` (sudah timestamptz) untuk dapat threshold penuh. Simpan terpisah karena UI-nya "jam mulai" standalone, bukan re-edit tanggal.
- `check_time_enabled` default `false` — feature opt-in per meeting, tidak breaking existing meetings.
- `check_in_time` nullable — attendance lama (sebelum fitur ini) tetap valid tanpa jam masuk.

## Task 1: Types (`src/types/attendance.ts`, `src/types/meeting.ts`)

**File: `src/types/attendance.ts`**

```typescript
export interface AttendanceLog {
  id: string
  student_id: string
  date: string
  meeting_id?: string | null
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
  check_in_time?: string | null // NEW
  recorded_by: string
  created_at: string
  updated_at: string
}
```

`AttendanceData` (client payload) stays unchanged — `check_in_time` is server-set, never client-supplied (avoid clock-skew/spoofing).

**File: `src/types/meeting.ts`**

```typescript
export interface Meeting {
  // ...existing fields...
  start_time?: string | null // NEW, "HH:mm:ss" or "HH:mm"
  check_time_enabled?: boolean // NEW
}

export interface CreateMeetingData {
  // ...existing fields...
  startTime?: string | null // NEW
  checkTimeEnabled?: boolean // NEW
}

export interface UpdateMeetingData extends Partial<CreateMeetingData> {}
```

## Task 2: Pure Logic — `isLate` (TDD)

**File: `src/app/(admin)/presensi/actions/attendance/logic.ts`** — add function:

```typescript
/**
 * Determines if a check-in is late relative to a meeting's start time.
 * Both times compared in the same timezone context (WIB) — meetingDate is
 * the meeting's date (YYYY-MM-DD, WIB), startTime is "HH:mm" or "HH:mm:ss".
 *
 * @param checkInTime ISO timestamp string of actual check-in
 * @param meetingDate meeting date as YYYY-MM-DD (WIB)
 * @param startTime meeting start time as HH:mm or HH:mm:ss, or null/undefined if not set
 * @returns true if checkInTime is after the threshold; false if on-time or no threshold set
 */
export function isLate(
  checkInTime: string | null | undefined,
  meetingDate: string,
  startTime: string | null | undefined
): boolean {
  if (!checkInTime || !startTime) return false

  const [h, m, s] = startTime.split(':').map(Number)
  // Threshold in WIB: meetingDate at start_time, converted to UTC instant (WIB = UTC+7)
  const thresholdUtcMs = new Date(`${meetingDate}T00:00:00Z`).getTime()
    + (h * 3600 + (m || 0) * 60 + (s || 0)) * 1000
    - 7 * 60 * 60 * 1000

  const checkInMs = new Date(checkInTime).getTime()
  if (Number.isNaN(checkInMs) || Number.isNaN(thresholdUtcMs)) return false

  return checkInMs > thresholdUtcMs
}
```

**Test file: `src/app/(admin)/presensi/actions/attendance/__tests__/logic.test.ts`** (or add to existing test file if present — check first with `find src/app/(admin)/presensi/actions/attendance -iname "*.test.ts"`)

TDD sequence:
1. RED — write tests first:
   ```typescript
   describe('isLate', () => {
     it('returns false when checkInTime is null', () => {
       expect(isLate(null, '2026-07-07', '19:00')).toBe(false)
     })
     it('returns false when startTime is not set (feature disabled)', () => {
       expect(isLate('2026-07-07T12:30:00Z', '2026-07-07', null)).toBe(false)
     })
     it('returns false when check-in is exactly on time', () => {
       // 19:00 WIB = 12:00:00Z
       expect(isLate('2026-07-07T12:00:00.000Z', '2026-07-07', '19:00')).toBe(false)
     })
     it('returns false when check-in is before start time', () => {
       // 18:55 WIB = 11:55:00Z
       expect(isLate('2026-07-07T11:55:00.000Z', '2026-07-07', '19:00')).toBe(false)
     })
     it('returns true when check-in is after start time', () => {
       // 19:05 WIB = 12:05:00Z
       expect(isLate('2026-07-07T12:05:00.000Z', '2026-07-07', '19:00')).toBe(true)
     })
     it('handles startTime with seconds (HH:mm:ss)', () => {
       expect(isLate('2026-07-07T12:05:00.000Z', '2026-07-07', '19:00:00')).toBe(true)
     })
   })
   ```
2. Run `npm run test:run -- logic.test.ts` → verify FAIL (function doesn't exist yet).
3. GREEN — implement `isLate` as above.
4. Run test again → verify PASS.

## Task 3: Queries — capture check_in_time on Hadir

**File: `src/app/(admin)/presensi/actions/attendance/queries.ts`**

Modify `upsertAttendanceLogs` — when `status === 'H'`, stamp `check_in_time` server-side with `new Date().toISOString()` UNLESS record already has one (avoid overwriting original check-in on re-save/edit of reason etc). Since upsert is a blind overwrite, resolve this in `actions.ts` (Task 4) instead — queries.ts stays a pure pass-through of what it's given. Add `check_in_time` to the accepted record shape:

```typescript
export async function upsertAttendanceLogs(
  supabase: SupabaseClient,
  records: Array<{
    student_id: string
    date: string
    meeting_id?: string | null
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string | null
    check_in_time?: string | null // NEW
    recorded_by: string
  }>
): Promise<{ data: any; error: any }> {
  // unchanged body
}
```

Add `check_in_time` to `fetchAttendanceByMeeting` and `fetchAttendanceByDate` select lists:
```typescript
.select(`
  id,
  student_id,
  status,
  reason,
  check_in_time,   // NEW
  students ( ... )
`)
```

Add `check_in_time` to `fetchAttendanceLogByStudentAndMeeting` select: `'id, status, check_in_time'`.

**File: `src/app/(admin)/presensi/actions/meetings/queries.ts`**

`insertMeeting`: add to `meetingData`:
```typescript
start_time: data.startTime || null,
check_time_enabled: data.checkTimeEnabled ?? false,
```

`updateMeetingRecord`: add:
```typescript
if (data.startTime !== undefined) updateData.start_time = data.startTime
if (data.checkTimeEnabled !== undefined) updateData.check_time_enabled = data.checkTimeEnabled
```

`fetchMeetingById` (or wherever meeting detail is selected for the presensi page) — ensure `start_time`, `check_time_enabled` are in the select list. Check `src/app/(admin)/presensi/actions/meetings/queries.ts:12` `fetchMeetingById` select columns and add both fields if using explicit column list (not `select('*')`).

`fetchMeetingForScan` — add `start_time, check_time_enabled` to select (needed by `markAttendanceByQrScan` to compute lateness).

## Task 4: Actions — wire check_in_time + isLate through

**File: `src/app/(admin)/presensi/actions/attendance/actions.ts`**

`saveAttendanceForMeeting`: fetch existing logs first to avoid clobbering `check_in_time` on already-'H' records when only reason changes. Modify:

```typescript
// After fetching meeting (already selects teacher_id, class_ids, date) — also select start_time, check_time_enabled:
const { data: meeting, error: meetingError } = await adminClient
  .from('meetings')
  .select('teacher_id, class_ids, date, start_time, check_time_enabled')
  .eq('id', meetingId)
  .single()

// ...existing meetingDateStr logic...

// Fetch existing attendance to preserve check_in_time for already-H students
const { data: existingLogs } = await adminClient
  .from('attendance_logs')
  .select('student_id, status, check_in_time')
  .eq('meeting_id', meetingId)

const existingByStudent = new Map((existingLogs || []).map((l: any) => [l.student_id, l]))

const nowIso = new Date().toISOString()
const attendanceRecords = attendanceData.map(record => {
  const existing = existingByStudent.get(record.student_id)
  let checkInTime: string | null = null
  if (record.status === 'H') {
    checkInTime = existing?.status === 'H' && existing.check_in_time
      ? existing.check_in_time // preserve original check-in
      : nowIso // newly marked H → stamp now
  }
  return {
    student_id: record.student_id,
    meeting_id: meetingId,
    date: meetingDateStr,
    status: record.status,
    reason: record.reason,
    check_in_time: checkInTime,
    recorded_by: profile.id
  }
})
```

`markAttendanceByQrScan`: already fetches `existingLog` before upsert. Add `check_in_time` to the upsert call:
```typescript
const { error } = await upsertAttendanceLogs(adminClient, [
  {
    student_id: studentId,
    meeting_id: meetingId,
    date: meetingDateStr,
    status: 'H',
    check_in_time: new Date().toISOString(), // NEW — QR scan = immediate check-in
    recorded_by: profile.id
  }
])
```
(No preserve-check needed here — `existingLog?.status === 'H'` already short-circuits with `already_marked` before reaching upsert.)

Also update `fetchMeetingForScan` call site type usage: `meeting.start_time`, `meeting.check_time_enabled` now available — not required for the scan action itself (isLate computed client/display-side from attendance data + meeting data already fetched by `useMeetingAttendance`), skip unless UI needs immediate late feedback on scan toast (out of scope for this issue — display badge is on Presentasi/Daftar Hadir views only, per issue description).

## Task 5: Client hooks

**File: `src/hooks/useAttendanceRealtime.logic.ts`**

Add `check_in_time` to `AttendanceEntry` and `AttendanceLogRow`:
```typescript
export interface AttendanceEntry {
  status: AttendanceStatus
  reason?: string
  check_in_time?: string | null // NEW
}

export interface AttendanceLogRow {
  student_id?: string
  status?: AttendanceStatus
  reason?: string | null
  check_in_time?: string | null // NEW
}
```

`applyAttendanceEvent`: propagate `check_in_time` into the merged entry:
```typescript
return {
  ...map,
  [studentId]: {
    status: row.status,
    reason: row.reason ?? undefined,
    check_in_time: row.check_in_time ?? undefined, // NEW
  },
}
```

Existing test file for this logic (`useAttendanceRealtime.logic.test.ts` if present — check `find src -iname "*AttendanceRealtime*test*"`) needs a case asserting `check_in_time` passthrough. Add:
```typescript
it('propagates check_in_time on INSERT/UPDATE', () => {
  const result = applyAttendanceEvent({}, {
    eventType: 'INSERT',
    new: { student_id: 's1', status: 'H', check_in_time: '2026-07-07T12:05:00.000Z' },
    old: {}
  })
  expect(result.s1.check_in_time).toBe('2026-07-07T12:05:00.000Z')
})
```

**File: `src/app/(admin)/presensi/hooks/useMeetingAttendance.ts`**

`AttendanceRecord`/`AttendanceData` local interfaces: add `check_in_time?: string | null` to `AttendanceData[studentId]` shape. In `fetcher`, when building `attendanceData[record.student_id]`, add `check_in_time: record.check_in_time || undefined`.

## Task 6: UI — CreateMeetingModal (toggle + jam mulai)

**File: `src/app/(admin)/presensi/components/CreateMeetingModal.tsx`**

Add state near line 47-62:
```typescript
const [checkTimeEnabled, setCheckTimeEnabled] = useState(meeting?.check_time_enabled || false)
const [startTime, setStartTime] = useState(meeting?.start_time || '')
```

Add UI block after the Date Picker section (around line 1034, inside `formSettings.showDate` block or as its own always-visible block — place right after Date Picker):
```tsx
{/* Cek Waktu Masuk Toggle */}
<div className="mb-4">
  <Checkbox
    label="Aktifkan cek waktu masuk"
    checked={checkTimeEnabled}
    onChange={(checked) => setCheckTimeEnabled(checked)}
    disabled={isSubmitting}
  />
</div>

{checkTimeEnabled && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      Jam Mulai
    </label>
    <input
      type="time"
      value={startTime}
      onChange={(e) => setStartTime(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
    />
  </div>
)}
```
Import `Checkbox` from `@/components/form/input/Checkbox` (check exact export name/path first — `grep -rn "export default" src/components/form/input/Checkbox*`). Per CLAUDE.md raw-HTML-form rule, `<input type="time">` has no existing dedicated component in this codebase (confirm via `grep -rn "type=\"time\"" src/components`) — if none exists, raw `<input type="time">` is acceptable here as there's no InputFilter/DatePicker equivalent for bare time-of-day; keep styling consistent with adjacent text inputs (as shown above).

Wire into `handleSubmit` — both `createMeeting` and `updateMeeting` calls: add
```typescript
startTime: checkTimeEnabled ? (startTime || undefined) : null,
checkTimeEnabled,
```

## Task 7: UI — AttendanceTable badge (Daftar Hadir)

**File: `src/app/(admin)/presensi/components/AttendanceTable.tsx`**

Update `AttendanceData` interface (line ~14-19):
```typescript
interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
    check_in_time?: string | null // NEW
  }
}
```

Add props for meeting context needed to compute lateness:
```typescript
interface AttendanceTableProps {
  // ...existing...
  meetingDate?: string        // NEW, YYYY-MM-DD
  meetingStartTime?: string | null  // NEW
  checkTimeEnabled?: boolean  // NEW
}
```

In the Nama cell (around line 279-289), after the `reason` div, add badge when `checkTimeEnabled` and student has `check_in_time`:
```tsx
{checkTimeEnabled && attendance[student.id]?.status === 'H' && attendance[student.id]?.check_in_time && (
  <div className="mt-1 flex items-center gap-1.5">
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
      isLate(attendance[student.id].check_in_time, meetingDate || '', meetingStartTime)
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    }`}>
      {isLate(attendance[student.id].check_in_time, meetingDate || '', meetingStartTime) ? 'Telat' : 'Tepat Waktu'}
    </span>
    <span className="text-[10px] text-gray-400 dark:text-gray-500">
      {new Date(attendance[student.id].check_in_time!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
    </span>
  </div>
)}
```
Import `isLate` from `../actions/attendance/logic`.

**Call site**: find where `<AttendanceTable>` is rendered (in `[meetingId]/page.tsx`) and pass `meetingDate={meeting?.date ? getMeetingWibDateStr(meeting.date) : undefined}`, `meetingStartTime={meeting?.start_time}`, `checkTimeEnabled={meeting?.check_time_enabled}`.

## Task 8: UI — LivePresensiTab badge + sort by check_in_time

**File: `src/app/(admin)/presensi/components/LivePresensiTab.tsx`**

Update `Student`/`AttendanceMap` usage — `attendanceMap[s.id]` already carries `check_in_time` after Task 5. Add props:
```typescript
interface LivePresensiTabProps {
  // ...existing...
  meetingDate?: string
  meetingStartTime?: string | null
  checkTimeEnabled?: boolean
}
```

Modify `sortedStudents` (line ~150-157) — new sort rule per issue: **Hadir sorted by check_in_time DESC (newest scan first), then belum-hadir alfabetis**:
```typescript
const sortedStudents = useMemo(() => {
  return [...students].sort((a, b) => {
    const aHadir = attendanceMap[a.id]?.status === 'H'
    const bHadir = attendanceMap[b.id]?.status === 'H'
    if (aHadir !== bHadir) return aHadir ? -1 : 1 // hadir first

    if (aHadir && bHadir) {
      // Both hadir: sort by check_in_time DESC (most recent scan first)
      const aTime = attendanceMap[a.id]?.check_in_time
      const bTime = attendanceMap[b.id]?.check_in_time
      if (aTime && bTime) return new Date(bTime).getTime() - new Date(aTime).getTime()
      if (aTime) return -1 // has check_in_time sorts before one without
      if (bTime) return 1
      return a.name.localeCompare(b.name) // neither has check_in_time (feature off/legacy) → alfabetis
    }

    // Both belum-hadir: alfabetis
    return a.name.localeCompare(b.name)
  })
}, [students, attendanceMap])
```

Add badge in the name grid card (after `kelompok_name` div, around line 235-238), same badge pattern as Task 7, gated on `checkTimeEnabled`.

**Call site**: `[meetingId]/page.tsx` — pass the three new props alongside existing `students`/`attendanceMap`/`connectionStatus`.

## Task 9: Meeting detail page — thread meeting fields to children

**File: `src/app/(admin)/presensi/[meetingId]/page.tsx`**

`useMeetingAttendance` already returns `meeting` (raw object from `getMeetingById` — verify `start_time`, `check_time_enabled` are selected in that query; if `getMeetingById` uses `select('*')` no change needed, otherwise add columns — check `src/app/(admin)/presensi/actions/meetings/actions.ts` `getMeetingById`).

Pass down to `<AttendanceTable>` and `<LivePresensiTab>`:
```tsx
meetingDate={meeting?.date ? getMeetingWibDateStr(meeting.date) : undefined}
meetingStartTime={meeting?.start_time}
checkTimeEnabled={meeting?.check_time_enabled}
```
Import `getMeetingWibDateStr` from `../actions/attendance/logic` if not already imported.

## Task 10: Verification

```bash
npm run test:run           # all unit tests incl. new isLate + realtime logic tests
npm run type-check         # TS check
```

Manual smoke test (dev server, user-driven — do not run automated for this):
1. Create meeting with "Aktifkan cek waktu masuk" ON, jam mulai `19:00`.
2. Mark a student Hadir at a time before 19:00 → badge "Tepat Waktu" (green).
3. Mark another student Hadir after 19:00 → badge "Telat" (orange).
4. Open Presentasi tab → confirm newest-scanned Hadir student appears first in grid.
5. Create/open a meeting with toggle OFF → confirm no badges shown, no crash.

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? — Tidak, mengikuti 3-layer pattern existing.
- [ ] Apakah ada tabel database baru? — Tidak, hanya ALTER TABLE (kolom baru) pada `meetings` dan `attendance_logs`. Update deskripsi kolom di CLAUDE.md Key Tables jika relevan (opsional, minor).
- [ ] Apakah ada route/page baru? — Tidak.
- [ ] Apakah ada permission pattern baru? — Tidak.
- [ ] Update docs? — Tidak perlu file baru; cukup pastikan `src/types/attendance.ts`/`meeting.ts` jadi source of truth (sudah oleh Task 1).
