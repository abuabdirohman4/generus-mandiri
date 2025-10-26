'use client'

import { ATTENDANCE_COLORS } from "@/lib/constants/colors"
import { getStatusBgColor, getStatusColor } from "@/lib/percentages"

interface MonthlyStatsProps {
  stats: {
    total: number
    hadir: number
    izin: number
    sakit: number
    absen: number
  } | null
}

export default function MonthlyStats({ stats }: MonthlyStatsProps) {
  if (!stats) return null

  const attendancePercentage = stats.total > 0 
    ? Math.round((stats.hadir / stats.total) * 100) 
    : 0

  return (
    <>
    <div className={`rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden px-2 mb-3`}>
      <div className="bg-white dark:bg-gray-800 flex items-center justify-between px-2 sm:px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {stats.total} Pertemuan
          </h2>
          {/* <div className="text-sm text-gray-600 dark:text-gray-300">
            {stats.hadir} Hadir, {stats.izin} Izin, {stats.sakit} Sakit, {stats.absen} Alfa
          </div> */}
          <div className="flex flex-wrap gap-2 md:gap-3 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.hadir }}></div>
              <span className="text-gray-600 dark:text-gray-400">{stats.hadir} Hadir</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.absen }}></div>
              <span className="text-gray-600 dark:text-gray-400">{stats.absen} Alfa</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.izin }}></div>
              <span className="text-gray-600 dark:text-gray-400">{stats.izin} Izin</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.sakit }}></div>
              <span className="text-gray-600 dark:text-gray-400">{stats.sakit} Sakit</span>
            </div>
          </div>
        </div>
        {attendancePercentage !== undefined && (
          <div className="text-center">
            <div className="text-sm">Kehadiran</div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusBgColor(attendancePercentage)} ${getStatusColor(attendancePercentage)}`}>
              {attendancePercentage}%
            </div>
          </div>
        )}
        {/* {children} */}
      </div>
    </div>

      {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          This Month Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.hadir}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Hadir</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.izin}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Izin</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.sakit}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Sakit</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.absen}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Alfa</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Pertemuan</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{attendancePercentage}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Persentase Kehadiran</div>
          </div>
        </div>
      </div> */}
    </>
  )
}
