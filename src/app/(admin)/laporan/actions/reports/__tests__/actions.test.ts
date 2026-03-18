import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchUserProfile: vi.fn(),
  fetchMeetingsForDateRange: vi.fn(),
  fetchClassHierarchyMaps: vi.fn(),
  fetchAttendanceLogs: vi.fn(),
  fetchStudentDetails: vi.fn(),
  fetchKelompokNames: vi.fn(),
  fetchMeetingsWithFullDetails: vi.fn(),
  fetchStudentClassesForEnrollment: vi.fn(),
}))
vi.mock('../logic', () => ({
  buildDateFilter: vi.fn(),
  filterMeetingsByRole: vi.fn(),
  filterAttendanceByClass: vi.fn(),
  filterAttendanceByKelompok: vi.fn(),
  buildClassHierarchyMaps: vi.fn(),
  buildEnrollmentMap: vi.fn(),
  enrichAttendanceLogs: vi.fn(),
  aggregateStudentSummary: vi.fn(),
  aggregateTrendData: vi.fn(),
  formatChartData: vi.fn(),
}))
vi.mock('@/lib/utils/attendanceCalculation', () => ({
  calculateAttendanceStats: vi.fn(),
}))

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchUserProfile,
  fetchMeetingsForDateRange,
  fetchClassHierarchyMaps,
  fetchAttendanceLogs,
  fetchStudentDetails,
  fetchKelompokNames,
  fetchMeetingsWithFullDetails,
  fetchStudentClassesForEnrollment,
} from '../queries'
import {
  buildDateFilter,
  filterMeetingsByRole,
  filterAttendanceByClass,
  filterAttendanceByKelompok,
  buildClassHierarchyMaps,
  buildEnrollmentMap,
  enrichAttendanceLogs,
  aggregateStudentSummary,
  aggregateTrendData,
  formatChartData,
} from '../logic'
import { calculateAttendanceStats } from '@/lib/utils/attendanceCalculation'
import { getAttendanceReport } from '../actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryBuilder(resolvedValue: any = { data: null, error: null }) {
  const b: any = {}
  const terminalMock = vi.fn().mockResolvedValue(resolvedValue)
  b.select = vi.fn().mockReturnValue(b)
  b.insert = vi.fn().mockReturnValue(b)
  b.update = vi.fn().mockReturnValue(b)
  b.delete = vi.fn().mockReturnValue(b)
  b.eq = vi.fn().mockReturnValue(b)
  b.neq = vi.fn().mockReturnValue(b)
  b.in = vi.fn().mockReturnValue(b)
  b.is = vi.fn().mockReturnValue(b)
  b.gte = vi.fn().mockReturnValue(b)
  b.lte = vi.fn().mockReturnValue(b)
  b.order = vi.fn().mockReturnValue(b)
  b.limit = vi.fn().mockReturnValue(b)
  b.single = terminalMock
  b.maybeSingle = terminalMock
  b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
  return b
}

function makeSupabase(overrides: { user?: any; profileData?: any; fromBuilder?: any } = {}) {
  const {
    user = { id: 'user-1' },
    profileData = { id: 'profile-1', role: 'superadmin' },
    fromBuilder,
  } = overrides
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(fromBuilder || makeQueryBuilder({ data: profileData, error: null })),
  } as any
}

function makeAdminSupabase(overrides: { fromBuilder?: any } = {}) {
  return {
    from: vi.fn().mockReturnValue(
      overrides.fromBuilder || makeQueryBuilder({ data: null, error: null })
    ),
  } as any
}

/** Default happy-path mocks for all Layer 1 & Layer 2 dependencies */
function setupDefaultHappyPathMocks() {
  const supabase = makeSupabase({ profileData: { id: 'profile-1', role: 'superadmin' } })
  vi.mocked(createClient).mockResolvedValue(supabase)

  const adminClient = makeAdminSupabase()
  vi.mocked(createAdminClient).mockResolvedValue(adminClient)

  vi.mocked(fetchUserProfile).mockResolvedValue({
    data: { id: 'profile-1', role: 'superadmin', teacher_classes: [] },
    error: null,
  } as any)

  const mockDateFilter = { date: { gte: '2026-03-01', lte: '2026-03-31' } }
  vi.mocked(buildDateFilter).mockReturnValue(mockDateFilter)

  vi.mocked(fetchMeetingsForDateRange).mockResolvedValue({
    data: [{ id: 'meeting-1', date: '2026-03-10', class_id: 'class-1', class_ids: ['class-1'] }],
    error: null,
  } as any)

  vi.mocked(fetchClassHierarchyMaps).mockResolvedValue({ data: [], error: null } as any)

  const emptyMaps = {
    classKelompokMap: new Map<string, string>(),
    classToDesaMap: new Map<string, string>(),
    classToDaerahMap: new Map<string, string>(),
  }
  vi.mocked(buildClassHierarchyMaps).mockReturnValue(emptyMaps)

  vi.mocked(filterMeetingsByRole).mockReturnValue(['meeting-1'])

  vi.mocked(fetchAttendanceLogs).mockResolvedValue({
    data: [{ meeting_id: 'meeting-1', student_id: 'student-1', status: 'H' }],
    error: null,
  } as any)

  vi.mocked(fetchStudentDetails).mockResolvedValue({
    data: [{ id: 'student-1', name: 'Ahmad', gender: 'L', student_classes: [] }],
    error: null,
  } as any)

  const mockEnrichedLogs = [
    {
      id: 'meeting-1-student-1',
      student_id: 'student-1',
      meeting_id: 'meeting-1',
      date: '2026-03-10',
      status: 'H',
      reason: null,
      students: { id: 'student-1', name: 'Ahmad', gender: 'L', student_classes: [] },
    },
  ]
  vi.mocked(enrichAttendanceLogs).mockReturnValue(mockEnrichedLogs)

  vi.mocked(fetchMeetingsWithFullDetails).mockResolvedValue({
    data: [{ id: 'meeting-1', date: '2026-03-10', class_id: 'class-1', class_ids: ['class-1'], classes: null }],
    error: null,
  } as any)

  vi.mocked(fetchStudentClassesForEnrollment).mockResolvedValue({ data: [], error: null } as any)
  vi.mocked(buildEnrollmentMap).mockReturnValue(new Map())

  vi.mocked(fetchKelompokNames).mockResolvedValue({ data: [], error: null } as any)

  const mockSummary = { total: 1, hadir: 1, izin: 0, sakit: 0, alpha: 0 }
  vi.mocked(calculateAttendanceStats).mockReturnValue(mockSummary as any)
  vi.mocked(formatChartData).mockReturnValue([{ name: 'Hadir', value: 1 }])
  vi.mocked(aggregateTrendData).mockReturnValue([])
  vi.mocked(aggregateStudentSummary).mockReturnValue([
    {
      student_id: 'student-1',
      student_name: 'Ahmad',
      student_gender: 'L',
      class_name: 'Kelas A',
      total_days: 1,
      hadir: 1,
      izin: 0,
      sakit: 0,
      alpha: 0,
      attendance_rate: 100,
    },
  ])
}

const baseFilters = {
  period: 'monthly' as const,
  viewMode: 'detailed' as const,
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('getAttendanceReport (Layer 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Auth & profile checks
  // ─────────────────────────────────────────────────────────────────────────

  describe('authentication and profile checks', () => {
    it('throws when user is not authenticated', async () => {
      const supabase = makeSupabase({ user: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      await expect(getAttendanceReport(baseFilters)).rejects.toThrow('User not authenticated')
    })

    it('throws when user profile is not found', async () => {
      const supabase = makeSupabase({ profileData: null })
      vi.mocked(createClient).mockResolvedValue(supabase)

      vi.mocked(fetchUserProfile).mockResolvedValue({ data: null, error: null } as any)

      await expect(getAttendanceReport(baseFilters)).rejects.toThrow('User profile not found')
    })

    it('throws when fetchAttendanceLogs returns an error', async () => {
      setupDefaultHappyPathMocks()
      const dbError = new Error('DB connection error')
      vi.mocked(fetchAttendanceLogs).mockResolvedValue({ data: null, error: dbError } as any)

      await expect(getAttendanceReport(baseFilters)).rejects.toThrow('DB connection error')
    })

    it('throws when fetchStudentDetails returns an error', async () => {
      setupDefaultHappyPathMocks()
      const dbError = new Error('Students query failed')
      vi.mocked(fetchStudentDetails).mockResolvedValue({ data: null, error: dbError } as any)

      await expect(getAttendanceReport(baseFilters)).rejects.toThrow('Students query failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Happy path — superadmin
  // ─────────────────────────────────────────────────────────────────────────

  describe('superadmin happy path', () => {
    it('returns complete ReportData structure', async () => {
      setupDefaultHappyPathMocks()

      const result = await getAttendanceReport(baseFilters)

      expect(result).toMatchObject({
        summary: { total: 1, hadir: 1, izin: 0, sakit: 0, alpha: 0 },
        chartData: [{ name: 'Hadir', value: 1 }],
        trendChartData: [],
        period: baseFilters.period,
        dateRange: { start: '2026-03-01', end: '2026-03-31' },
      })
      expect(result.detailedRecords).toHaveLength(1)
      expect(result.detailedRecords[0].student_name).toBe('Ahmad')
    })

    it('calls buildDateFilter with filters and a Date object', async () => {
      setupDefaultHappyPathMocks()

      await getAttendanceReport(baseFilters)

      expect(buildDateFilter).toHaveBeenCalledWith(baseFilters, expect.any(Date))
    })

    it('calls createAdminClient to bypass RLS for sensitive queries', async () => {
      setupDefaultHappyPathMocks()

      await getAttendanceReport(baseFilters)

      expect(createAdminClient).toHaveBeenCalled()
    })

    it('passes all meeting IDs to fetchAttendanceLogs', async () => {
      setupDefaultHappyPathMocks()

      await getAttendanceReport(baseFilters)

      expect(fetchAttendanceLogs).toHaveBeenCalledWith(
        expect.anything(),
        ['meeting-1']
      )
    })

    it('fetches student details for unique student IDs extracted from logs', async () => {
      setupDefaultHappyPathMocks()

      await getAttendanceReport(baseFilters)

      expect(fetchStudentDetails).toHaveBeenCalledWith(
        expect.anything(),
        ['student-1']
      )
    })

    it('calls aggregateStudentSummary with enriched logs and kelompok map', async () => {
      setupDefaultHappyPathMocks()

      await getAttendanceReport(baseFilters)

      expect(aggregateStudentSummary).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Map)
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Teacher role
  // ─────────────────────────────────────────────────────────────────────────

  describe('teacher role scoping', () => {
    it('extracts teacher class IDs from teacher_classes relation', async () => {
      setupDefaultHappyPathMocks()
      vi.mocked(fetchUserProfile).mockResolvedValue({
        data: {
          id: 'profile-t',
          role: 'teacher',
          teacher_classes: [
            { class_id: 'tc-1', classes: { id: 'tc-1' } },
            { class_id: 'tc-2', classes: { id: 'tc-2' } },
          ],
        },
        error: null,
      } as any)

      await getAttendanceReport(baseFilters)

      // filterMeetingsByRole receives the teacher class IDs
      expect(filterMeetingsByRole).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ role: 'teacher' }),
        ['tc-1', 'tc-2'],
        expect.any(Object)
      )
    })

    it('uses an empty teacherClassIds array for non-teacher roles', async () => {
      setupDefaultHappyPathMocks()
      // profile is superadmin (default from setupDefaultHappyPathMocks)

      await getAttendanceReport(baseFilters)

      expect(filterMeetingsByRole).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ role: 'superadmin' }),
        [], // empty for non-teacher
        expect.any(Object)
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Optional filters
  // ─────────────────────────────────────────────────────────────────────────

  describe('optional filter application', () => {
    it('applies classId filter via filterAttendanceByClass when classId provided', async () => {
      setupDefaultHappyPathMocks()
      const filters = { ...baseFilters, classId: 'class-1' }

      await getAttendanceReport(filters)

      expect(filterAttendanceByClass).toHaveBeenCalledWith(
        expect.any(Array),
        'class-1',
        expect.any(Map),
        expect.any(Map)
      )
    })

    it('does not call filterAttendanceByClass when classId is absent', async () => {
      setupDefaultHappyPathMocks()

      await getAttendanceReport(baseFilters) // no classId

      expect(filterAttendanceByClass).not.toHaveBeenCalled()
    })

    it('applies kelompokId filter via filterAttendanceByKelompok when kelompokId provided', async () => {
      setupDefaultHappyPathMocks()
      const filters = { ...baseFilters, kelompokId: 'kelompok-1' }

      await getAttendanceReport(filters)

      expect(filterAttendanceByKelompok).toHaveBeenCalledWith(
        expect.any(Array),
        'kelompok-1',
        expect.any(Object),
        expect.any(Map)
      )
    })

    it('does not call filterAttendanceByKelompok when kelompokId is absent', async () => {
      setupDefaultHappyPathMocks()

      await getAttendanceReport(baseFilters)

      expect(filterAttendanceByKelompok).not.toHaveBeenCalled()
    })

    it('applies gender filter inline when gender provided', async () => {
      setupDefaultHappyPathMocks()
      // enrichAttendanceLogs returns mixed-gender logs
      const mixedLogs = [
        { id: 'log-1', student_id: 's1', meeting_id: 'm1', date: '2026-03-10', status: 'H', reason: null, students: { id: 's1', gender: 'L' } },
        { id: 'log-2', student_id: 's2', meeting_id: 'm1', date: '2026-03-10', status: 'H', reason: null, students: { id: 's2', gender: 'P' } },
      ]
      vi.mocked(enrichAttendanceLogs).mockReturnValue(mixedLogs)

      const filters = { ...baseFilters, gender: 'L' }
      await getAttendanceReport(filters)

      // aggregateStudentSummary should only receive the male student log
      const summaryCall = vi.mocked(aggregateStudentSummary).mock.calls[0][0]
      expect(summaryCall).toHaveLength(1)
      expect(summaryCall[0].students.gender).toBe('L')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Edge cases — empty data
  // ─────────────────────────────────────────────────────────────────────────

  describe('empty data edge cases', () => {
    it('returns empty summary when no meetings exist for date range', async () => {
      setupDefaultHappyPathMocks()
      vi.mocked(fetchMeetingsForDateRange).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(filterMeetingsByRole).mockReturnValue([])
      vi.mocked(fetchAttendanceLogs).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(fetchStudentDetails).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(enrichAttendanceLogs).mockReturnValue([])
      vi.mocked(fetchMeetingsWithFullDetails).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(aggregateStudentSummary).mockReturnValue([])
      vi.mocked(aggregateTrendData).mockReturnValue([])
      vi.mocked(calculateAttendanceStats).mockReturnValue({ total: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0 } as any)
      vi.mocked(formatChartData).mockReturnValue([])

      const result = await getAttendanceReport(baseFilters)

      expect(result.summary.total).toBe(0)
      expect(result.detailedRecords).toHaveLength(0)
      expect(result.trendChartData).toHaveLength(0)
    })

    it('handles meetings with class_ids array (multi-class meetings)', async () => {
      setupDefaultHappyPathMocks()
      vi.mocked(fetchMeetingsForDateRange).mockResolvedValue({
        data: [
          { id: 'meeting-multi', date: '2026-03-10', class_id: null, class_ids: ['class-1', 'class-2'] },
        ],
        error: null,
      } as any)

      await getAttendanceReport(baseFilters)

      // fetchClassHierarchyMaps must be called with both class IDs
      expect(fetchClassHierarchyMaps).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining(['class-1', 'class-2'])
      )
    })

    it('deduplicates class IDs from multiple meetings before fetching hierarchy', async () => {
      setupDefaultHappyPathMocks()
      vi.mocked(fetchMeetingsForDateRange).mockResolvedValue({
        data: [
          { id: 'm1', date: '2026-03-10', class_id: 'class-1', class_ids: ['class-1'] },
          { id: 'm2', date: '2026-03-11', class_id: 'class-1', class_ids: ['class-1'] },
        ],
        error: null,
      } as any)

      await getAttendanceReport(baseFilters)

      const hierarchyCall = vi.mocked(fetchClassHierarchyMaps).mock.calls[0][1] as string[]
      // class-1 must appear exactly once
      expect(hierarchyCall.filter((id) => id === 'class-1')).toHaveLength(1)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // dateRange in returned result
  // ─────────────────────────────────────────────────────────────────────────

  describe('dateRange in result', () => {
    it('returns gte as start and lte as end from dateFilter', async () => {
      setupDefaultHappyPathMocks()
      vi.mocked(buildDateFilter).mockReturnValue({ date: { gte: '2026-01-01', lte: '2026-01-31' } })

      const result = await getAttendanceReport(baseFilters)

      expect(result.dateRange).toEqual({ start: '2026-01-01', end: '2026-01-31' })
    })

    it('uses eq as end when dateFilter has eq instead of lte', async () => {
      setupDefaultHappyPathMocks()
      vi.mocked(buildDateFilter).mockReturnValue({ date: { eq: '2026-03-18' } })

      const result = await getAttendanceReport(baseFilters)

      expect(result.dateRange).toEqual({ start: null, end: '2026-03-18' })
    })

    it('returns the period value from filters in the result', async () => {
      setupDefaultHappyPathMocks()
      const filters = { ...baseFilters, period: 'yearly' as const }

      const result = await getAttendanceReport(filters)

      expect(result.period).toBe('yearly')
    })
  })
})
