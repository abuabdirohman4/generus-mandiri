'use client'

import type { MateriReportData } from '../actions/reports/materiQueries'
import { PieChartIcon, BookOpenIcon, BuildingIcon } from '@/lib/icons'
import { getProgressColor, getProgressTextColor, getProgressLightBgColor } from '@/lib/percentages'

interface MateriStatsCardsProps {
    data: MateriReportData | undefined
    isLoading: boolean
}

export default function MateriStatsCards({ data, isLoading }: MateriStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse h-32 shadow-sm border border-gray-100 dark:border-gray-700" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse h-32 shadow-sm border border-gray-100 dark:border-gray-700" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse h-32 shadow-sm border border-gray-100 dark:border-gray-700" />
            </div>
        )
    }

    const summary = data?.summary
    if (!summary) return null

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {/* Rata-rata Pencapaian - Full width on mobile, 1/3 on desktop */}
            <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Persentase Pencapaian</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                            {summary.avg_completion_rate}%
                        </h3>
                    </div>
                    <div className={`p-3 ${getProgressLightBgColor(summary.avg_completion_rate)} rounded-full`}>
                        <PieChartIcon className={`w-6 h-6 ${getProgressTextColor(summary.avg_completion_rate)}`} />
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

            {/* Kelas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Kelas</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate max-w-[150px] lg:max-w-[200px]">
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

            {/* Total Materi */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
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
        </div>
    )
}
