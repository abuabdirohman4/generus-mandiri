'use client'

import { ATTENDANCE_COLORS } from '@/lib/constants/colors'

interface SummaryData {
  total: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
}

interface SummaryCardsProps {
  summary: SummaryData
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <>
      {/* Quick Legend */}
      <div className="flex flex-wrap gap-2 md:gap-3 text-xs mb-4">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.hadir }}></div>
          <span className="text-gray-600 dark:text-gray-400">{summary.hadir} Hadir</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.absen }}></div>
          <span className="text-gray-600 dark:text-gray-400">{summary.alpha} Alfa</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.izin }}></div>
          <span className="text-gray-600 dark:text-gray-400">{summary.izin} Izin</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.sakit }}></div>
          <span className="text-gray-600 dark:text-gray-400">{summary.sakit} Sakit</span>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">T</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">H</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Hadir
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.hadir}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">I</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Izin
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.izin}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">S</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Sakit
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.sakit}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Alpha
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {summary.alpha}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
