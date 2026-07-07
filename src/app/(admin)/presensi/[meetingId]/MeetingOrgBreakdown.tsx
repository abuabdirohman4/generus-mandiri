'use client'

import { useMemo, useState } from 'react'
import ComparisonChart from '@/app/(admin)/dashboard/components/ComparisonChart'
import type { ClassMonitoringData } from '@/app/(admin)/dashboard/actions'
import {
  aggregateMeetingByOrg,
  isMultiDesaMeeting,
  type AttendanceOrgRow,
  type MeetingForBreakdown,
} from './logic'

interface MeetingOrgBreakdownProps {
  meeting: MeetingForBreakdown
  attendanceRows: AttendanceOrgRow[]
}

/**
 * Per-desa / per-kelompok attendance breakdown chart for a single multi-scope
 * meeting (Sambung Kelompok / Sambung Desa / Sambung Daerah).
 *
 * Reuses `ComparisonChart` (dashboard) for rendering — our simple per-meeting
 * aggregation is adapted into the `ClassMonitoringData[]` shape it expects
 * (meeting_count fixed at 1, since this is a single meeting, already
 * deduplicated by `aggregateMeetingByOrg`).
 */
export default function MeetingOrgBreakdown({ meeting, attendanceRows }: MeetingOrgBreakdownProps) {
  const canToggleDesa = useMemo(() => isMultiDesaMeeting(meeting), [meeting])
  const [level, setLevel] = useState<'kelompok' | 'desa'>(canToggleDesa ? 'desa' : 'kelompok')

  const effectiveLevel = canToggleDesa ? level : 'kelompok'

  const breakdown = useMemo(
    () => aggregateMeetingByOrg(attendanceRows, effectiveLevel),
    [attendanceRows, effectiveLevel]
  )

  const monitoringData: ClassMonitoringData[] = useMemo(
    () =>
      breakdown.map(entry => ({
        class_id: entry.id,
        class_name: entry.name,
        kelompok_name: effectiveLevel === 'kelompok' ? entry.name : undefined,
        desa_name: effectiveLevel === 'desa' ? entry.name : undefined,
        has_meeting: entry.total > 0,
        meeting_count: entry.meeting_count,
        attendance_rate: entry.rate,
        student_count: entry.total,
        meeting_ids: [`${entry.id}-current-meeting`],
      })),
    [breakdown, effectiveLevel]
  )

  const filters = useMemo(
    () => ({
      kelompok: effectiveLevel === 'kelompok' ? breakdown.map(b => b.id) : [],
      kelas: [],
      desa: effectiveLevel === 'desa' ? breakdown.map(b => b.id) : [],
      daerah: [],
    }),
    [breakdown, effectiveLevel]
  )

  if (breakdown.length === 0) return null

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Perbandingan Kehadiran per {effectiveLevel === 'desa' ? 'Desa' : 'Kelompok'}
        </h3>

        {canToggleDesa && (
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setLevel('desa')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                level === 'desa'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Per Desa
            </button>
            <button
              type="button"
              onClick={() => setLevel('kelompok')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                level === 'kelompok'
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Per Kelompok
            </button>
          </div>
        )}
      </div>

      <ComparisonChart
        monitoringData={monitoringData}
        comparisonLevel={effectiveLevel}
        filters={filters}
      />
    </div>
  )
}
