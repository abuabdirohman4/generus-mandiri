'use client'

import type { MateriReportData } from '../actions/reports/materiQueries'
import { PieChartIcon, BookOpenIcon, BuildingIcon } from '@/lib/icons'
import { getProgressColor } from '@/lib/percentages'

interface MateriStatsCardsProps {
    data: MateriReportData | undefined
    isLoading: boolean
}

export default function MateriStatsCards({ data, isLoading }: MateriStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse h-32 shadow-sm border border-gray-100 dark:border-gray-700" />
                ))}
            </div>
        )
    }

    const summary = data?.summary
    if (!summary) return null

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Rata-rata Pencapaian */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Persentase Pencapaian</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                            {summary.avg_completion_rate}%
                        </h3>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                        <PieChartIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className={`${getProgressColor(summary.avg_completion_rate)} h-1.5 rounded-full transition-all duration-1000 ease-out`} 
                            style={{ width: `${summary.avg_completion_rate}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">siswa capai target</p>
                </div>
            </div>

            {/* Total Materi */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Materi</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                            {summary.total_materials}
                        </h3>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                        <BookOpenIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
                <div className="mt-8">
                    <p className="text-xs text-gray-400">item materi dievaluasi</p>
                </div>
            </div>

            {/* Kelas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Kelas</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[180px]">
                            {summary.class_name || '—'}
                        </h3>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-full">
                        <BuildingIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>
                <div className="mt-8">
                    <p className="text-xs text-gray-400">yang dievaluasi</p>
                </div>
            </div>
        </div>
    )
}
