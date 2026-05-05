'use client'

import type { MateriReportData } from '../actions/reports/materiQueries'

interface MateriStatsCardsProps {
    data: MateriReportData | undefined
    isLoading: boolean
}

export default function MateriStatsCards({ data, isLoading }: MateriStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse h-24" />
                ))}
            </div>
        )
    }

    const summary = data?.summary
    if (!summary) return null

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Rata-rata Pencapaian</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.avg_completion_rate}%
                </div>
                <div className="text-xs text-gray-400 mt-1">siswa capai target</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Materi</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.total_materials}
                </div>
                <div className="text-xs text-gray-400 mt-1">item materi dievaluasi</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Kelas</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.class_name || '—'}
                </div>
                <div className="text-xs text-gray-400 mt-1">yang dievaluasi</div>
            </div>
        </div>
    )
}
