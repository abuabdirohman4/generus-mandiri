'use client'

import type { SebaranSiswaStats } from '../../actions/sebaran/types'

interface Props {
  stats: SebaranSiswaStats
}

export default function SebaranSiswaStats({ stats }: Props) {
  const items = [
    stats.total_daerah !== undefined && { label: 'Total Daerah', value: stats.total_daerah },
    stats.total_desa !== undefined && { label: 'Total Desa', value: stats.total_desa },
    stats.total_kelompok !== undefined && { label: 'Total Kelompok', value: stats.total_kelompok },
    { label: 'Total Siswa', value: stats.total_siswa },
  ].filter(Boolean) as { label: string; value: number }[]

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 text-center min-w-[100px]"
        >
          <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
        </div>
      ))}

      {stats.kelompok_kosong > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3 shadow-sm border border-amber-200 dark:border-amber-700 text-center min-w-[100px]">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {stats.kelompok_kosong}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400">⚠️ Kelompok Kosong</div>
        </div>
      )}
    </div>
  )
}
