/**
 * Meeting org breakdown — pure business logic
 *
 * Pure functions for deciding when to show a per-desa/per-kelompok attendance
 * breakdown chart on the meeting detail page, and for aggregating attendance
 * rows into that breakdown.
 *
 * Kept dependency-free (no Supabase, no React) so it is trivially unit-testable.
 */

/** Minimal shape of a class as returned in `meeting.allClasses` (see getMeetingById). */
export interface MeetingClassOrgInfo {
  id: string
  kelompok_id?: string | null
  kelompok?: {
    id?: string
    name?: string
    desa?: {
      id?: string
      name?: string
    } | null
  } | null
}

/** Minimal shape of a meeting needed to decide whether to show the breakdown. */
export interface MeetingForBreakdown {
  class_ids?: string[] | null
  allClasses?: MeetingClassOrgInfo[] | null
}

/** One attendance row with the org fields needed to group by kelompok/desa. */
export interface AttendanceOrgRow {
  /** Present so a future multi-meeting caller can dedup meetings; single-meeting
   *  detail pages can omit it (defaults to a single implicit meeting id). */
  meeting_id?: string
  student_id: string
  status: 'H' | 'I' | 'S' | 'A'
  kelompok_id?: string | null
  kelompok_name?: string | null
  desa_id?: string | null
  desa_name?: string | null
}

export interface OrgBreakdownEntry {
  /** Group id (kelompok_id or desa_id) */
  id: string
  name: string
  present: number
  total: number
  rate: number
  /** Deduplicated meeting count contributing to this group (Set-based, see
   *  docs/claude/architecture-patterns.md "Meeting Count Deduplication"). */
  meeting_count: number
}

/**
 * Decides whether the org breakdown chart should be shown for a meeting.
 * Only relevant for multi-scope meetings (classes spanning more than one
 * kelompok). Single-class / single-kelompok meetings return false.
 */
export function shouldShowBreakdown(meeting: MeetingForBreakdown | null | undefined): boolean {
  if (!meeting) return false

  // Single class (or none) can never be multi-scope.
  if (!meeting.class_ids || meeting.class_ids.length <= 1) return false

  const classes = meeting.allClasses
  if (!classes || classes.length === 0) return false

  const kelompokIds = new Set<string>()
  classes.forEach(c => {
    const kelompokId = c.kelompok_id || c.kelompok?.id
    if (kelompokId) kelompokIds.add(kelompokId)
  })

  return kelompokIds.size > 1
}

/**
 * Whether the meeting spans multiple desa (used to decide if the desa/kelompok
 * toggle should be offered — a multi-kelompok-but-single-desa meeting only
 * makes sense to break down by kelompok).
 */
export function isMultiDesaMeeting(meeting: MeetingForBreakdown | null | undefined): boolean {
  if (!meeting?.allClasses || meeting.allClasses.length === 0) return false

  const desaIds = new Set<string>()
  meeting.allClasses.forEach(c => {
    const desaId = c.kelompok?.desa?.id
    if (desaId) desaIds.add(desaId)
  })

  return desaIds.size > 1
}

/**
 * Aggregates attendance rows into per-kelompok or per-desa breakdown entries.
 *
 * - Groups by `kelompok_id` or `desa_id` depending on `level`.
 * - `total` = number of distinct students in the group; `present` = number
 *   with status 'H'.
 * - `meeting_count` is deduplicated via a Set of `meeting_id` per group, so
 *   feeding this function multi-meeting rows never double-counts a meeting
 *   that spans several classes/kelompok (see Meeting Count Deduplication).
 * - Rows missing the relevant org id are skipped (can't be grouped).
 */
export function aggregateMeetingByOrg(
  attendanceRows: AttendanceOrgRow[],
  level: 'kelompok' | 'desa'
): OrgBreakdownEntry[] {
  if (!attendanceRows || attendanceRows.length === 0) return []

  const idKey = level === 'kelompok' ? 'kelompok_id' : 'desa_id'
  const nameKey = level === 'kelompok' ? 'kelompok_name' : 'desa_name'

  interface Group {
    id: string
    name: string
    studentIds: Set<string>
    presentStudentIds: Set<string>
    meetingIds: Set<string>
  }

  const groups = new Map<string, Group>()

  attendanceRows.forEach(row => {
    const groupId = row[idKey]
    if (!groupId) return // can't group rows without the org id

    let group = groups.get(groupId)
    if (!group) {
      group = {
        id: groupId,
        name: row[nameKey] || groupId,
        studentIds: new Set(),
        presentStudentIds: new Set(),
        meetingIds: new Set(),
      }
      groups.set(groupId, group)
    }

    // Dedup by student so a student appearing in more than one row (e.g. two
    // classes) is only counted once per group.
    group.studentIds.add(row.student_id)
    if (row.status === 'H') {
      group.presentStudentIds.add(row.student_id)
    }

    // Dedup meeting count (Set pattern) — defaults to a single implicit
    // meeting when meeting_id isn't provided (typical single-meeting-detail use).
    group.meetingIds.add(row.meeting_id || '__single_meeting__')
  })

  const result: OrgBreakdownEntry[] = Array.from(groups.values()).map(g => {
    const total = g.studentIds.size
    const present = g.presentStudentIds.size
    return {
      id: g.id,
      name: g.name,
      present,
      total,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
      meeting_count: g.meetingIds.size,
    }
  })

  return result.sort((a, b) => a.name.localeCompare(b.name))
}
