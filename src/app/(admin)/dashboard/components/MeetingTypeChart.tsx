'use client';

import type { MeetingTypeDistribution } from '../actions';

interface MeetingTypeChartProps {
    data: MeetingTypeDistribution[];
}

export default function MeetingTypeChart({ data }: MeetingTypeChartProps) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Belum ada data pertemuan
                </p>
            </div>
        );
    }

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-yellow-500',
        'bg-pink-500',
        'bg-indigo-500'
    ];

    return (
        <div className="space-y-4">
            {/* Bar Chart */}
            <div className="space-y-3">
                {data.map((item, index) => {
                    const percentage = total > 0 ? (item.count / total) * 100 : 0;
                    return (
                        <div key={item.type}>
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {item.label}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {item.count} ({percentage.toFixed(0)}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div
                                    className={`h-2.5 rounded-full ${colors[index % colors.length]} transition-all`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Total Pertemuan
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {total}
                    </span>
                </div>
            </div>
        </div>
    );
}
