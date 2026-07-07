'use client'

import { useMemo, useState } from 'react'
import ComparisonChart from '@/app/(admin)/dashboard/components/ComparisonChart'
import DataFilter from '@/components/shared/DataFilter'
import type { ClassMonitoringData } from '@/app/(admin)/dashboard/actions'
import type { UserProfile } from '@/types/user'
import type { DesaBase, KelompokBase } from '@/types/organization'
import {
  aggregateMeetingByOrg,
  filterAttendanceRowsByOrg,
  isMultiDesaMeeting,
  type AttendanceOrgRow,
  type MeetingForBreakdown,
} from './logic'

interface MeetingOrgBreakdownProps {
  meeting: MeetingForBreakdown
  attendanceRows: AttendanceOrgRow[]
  userProfile: UserProfile | null | undefined
  desaList: DesaBase[]
  kelompokList: KelompokBase[]
}

/**
 * Per-desa / per-kelompok attendance breakdown chart for a single multi-scope
 * meeting (Sambung Kelompok / Sambung Desa / Sambung Daerah).
 *
 * Reuses `ComparisonChart` (dashboard) for rendering — our simple per-meeting
 * aggregation is adapted into the `ClassMonitoringData[]` shape it expects
 * (meeting_count fixed at 1, since this is a single meeting, already
 * deduplicated by `aggregateMeetingByOrg`).
 *
 * Includes its own `DataFilter` (desa/kelompok only) so the user can narrow
 * the chart to a subset of the meeting's participating desa/kelompok —
 * mirrors the filter pattern in laporan's `OverviewTab`.
 */
export default function MeetingOrgBreakdown({
  meeting,
  attendanceRows,
  userProfile,
  desaList,
  kelompokList,
}: MeetingOrgBreakdownProps) {
  const canToggleDesa = useMemo(() => isMultiDesaMeeting(meeting), [meeting])
  const [level, setLevel] = useState<'kelompok' | 'desa'>(canToggleDesa ? 'desa' : 'kelompok')
  const [orgFilter, setOrgFilter] = useState<{ desa: string[]; kelompok: string[] }>({ desa: [], kelompok: [] })

  const effectiveLevel = canToggleDesa ? level : 'kelompok'

  const filteredRows = useMemo(() => {
    const byDesa = filterAttendanceRowsByOrg(attendanceRows, 'desa', orgFilter.desa)
    return filterAttendanceRowsByOrg(byDesa, 'kelompok', orgFilter.kelompok)
  }, [attendanceRows, orgFilter])

  const breakdown = useMemo(
    () => aggregateMeetingByOrg(filteredRows, effectiveLevel),
    [filteredRows, effectiveLevel]
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

  const chartFilters = useMemo(
    () => ({
      kelompok: effectiveLevel === 'kelompok' ? breakdown.map(b => b.id) : [],
      kelas: [],
      desa: effectiveLevel === 'desa' ? breakdown.map(b => b.id) : [],
      daerah: [],
    }),
    [breakdown, effectiveLevel]
  )

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-4">
        <DataFilter
          filters={{ daerah: [], desa: orgFilter.desa, kelompok: orgFilter.kelompok, kelas: [] }}
          onFilterChange={(f) => setOrgFilter({ desa: f.desa || [], kelompok: f.kelompok || [] })}
          userProfile={userProfile}
          daerahList={[]}
          desaList={desaList}
          kelompokList={kelompokList}
          classList={[]}
          showDaerah={false}
          showDesa={canToggleDesa}
          showKelompok={true}
          showKelas={false}
          showGender={false}
          cascadeFilters={true}
        />
      </div>

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

        {breakdown.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
            Tidak ada data untuk filter yang dipilih.
          </div>
        ) : (
          <ComparisonChart
            monitoringData={monitoringData}
            comparisonLevel={effectiveLevel}
            filters={chartFilters}
          />
        )}
      </div>
    </div>
  )
}
