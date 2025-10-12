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
  viewMode: 'general' | 'detailed'
  filters: {
    month: number
    year: number
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
    startDate: any
    endDate: any
    weekYear?: number
    weekMonth?: number
    startWeekNumber?: number
    endWeekNumber?: number
    monthYear?: number
    startMonth?: number
    endMonth?: number
    startYear?: number
    endYear?: number
  }
}

export default function StatsCards({ summaryStats, period, viewMode, filters }: StatsCardsProps) {
  if (!summaryStats) return null

  const { total, hadir, izin, sakit, alpha, attendanceRate, periodLabel, dateRange } = summaryStats

  // Helper function to get month name
  const getMonthName = (monthNumber: number) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return monthNames[monthNumber - 1]
  }

  // Generate period-specific labels
  const getPeriodDisplay = () => {
    if (viewMode === 'general') {
      return `${getMonthName(filters.month)} ${filters.year}`
    }

    switch (filters.period) {
      case 'daily':
        return 'Harian'
      case 'weekly':
        return 'Mingguan'
      case 'monthly':
        return 'Bulanan'
      case 'yearly':
        return 'Tahunan'
      default:
        return 'Bulanan'
    }
  }

  const getRangeDisplay = () => {
    if (viewMode === 'general') {
      return null // No range display for general mode
    }

    switch (filters.period) {
      case 'daily':
        if (filters.startDate && filters.endDate) {
          const startDate = new Date(filters.startDate).toLocaleDateString('id-ID')
          const endDate = new Date(filters.endDate).toLocaleDateString('id-ID')
          return `${startDate} - ${endDate}`
        }
        return null

      case 'weekly':
        if (filters.weekYear && filters.weekMonth && filters.startWeekNumber && filters.endWeekNumber) {
          const monthName = getMonthName(filters.weekMonth)
          return `${filters.startWeekNumber} - ${filters.endWeekNumber}, ${monthName} ${filters.weekYear}`
        }
        return null

      case 'monthly':
        if (filters.monthYear && filters.startMonth && filters.endMonth) {
          const startMonthName = getMonthName(filters.startMonth)
          const endMonthName = getMonthName(filters.endMonth)
          return `${startMonthName} - ${endMonthName} ${filters.monthYear}`
        }
        return null

      case 'yearly':
        if (filters.startYear && filters.endYear) {
          return `${filters.startYear} - ${filters.endYear}`
        }
        return null

      default:
        return null
    }
  }

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
            {getPeriodDisplay()}
          </span>
        </div>
        {getRangeDisplay() && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Rentang Periode
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {getRangeDisplay()}
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
