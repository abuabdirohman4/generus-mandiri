'use client'

interface SummaryStats {
  total: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  attendanceRate: number
  periodLabel: string
  dateRange: {
    start: string | null
    end: string | null
  }
}

interface StatsCardsProps {
  summaryStats: SummaryStats | null
  period: string
}

export default function StatsCards({ summaryStats, period }: StatsCardsProps) {
  if (!summaryStats) return null

  const { total, hadir, izin, sakit, alpha, attendanceRate, periodLabel, dateRange } = summaryStats

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Statistik Kehadiran
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Rata-rata Kehadiran
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {attendanceRate}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Periode Laporan
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
            {periodLabel}
          </span>
        </div>
        {dateRange.start && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Rentang Tanggal
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {dateRange.start} - {dateRange.end || 'Sekarang'}
            </span>
          </div>
        )}
      </div>
    </div>
    // <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      // Quick Stats
      
      // Summary Cards
      // <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      //   <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
      //     Ringkasan Data
      //   </h3>
      //   <div className="grid grid-cols-2 gap-4">
      //     <div className="text-center">
      //       <div className="text-2xl font-bold text-gray-900 dark:text-white">
      //         {total}
      //       </div>
      //       <div className="text-sm text-gray-500 dark:text-gray-400">
      //         Total
      //       </div>
      //     </div>
      //     <div className="text-center">
      //       <div className="text-2xl font-bold text-green-600">
      //         {hadir}
      //       </div>
      //       <div className="text-sm text-gray-500 dark:text-gray-400">
      //         Hadir
      //       </div>
      //     </div>
      //     <div className="text-center">
      //       <div className="text-2xl font-bold text-yellow-600">
      //         {izin}
      //       </div>
      //       <div className="text-sm text-gray-500 dark:text-gray-400">
      //         Izin
      //       </div>
      //     </div>
      //     <div className="text-center">
      //       <div className="text-2xl font-bold text-blue-600">
      //         {sakit}
      //       </div>
      //       <div className="text-sm text-gray-500 dark:text-gray-400">
      //         Sakit
      //       </div>
      //     </div>
      //     <div className="text-center col-span-2">
      //       <div className="text-2xl font-bold text-red-600">
      //         {alpha}
      //       </div>
      //       <div className="text-sm text-gray-500 dark:text-gray-400">
      //         Alpha
      //       </div>
      //     </div>
      //   </div>
      // </div>
    // </div>
  )
}
