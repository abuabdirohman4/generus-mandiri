'use client'

import useSWR from 'swr'
import { getStudentEnrollmentHistory } from '../actions/enrollmentHistory'
import { CalenderIcon, ArrowRightIcon } from '@/lib/icons'

interface EnrollmentHistoryProps {
    studentId: string
}

export default function EnrollmentHistory({ studentId }: EnrollmentHistoryProps) {
    const { data, isLoading } = useSWR(
        studentId ? `enrollment-history-${studentId}` : null,
        () => getStudentEnrollmentHistory(studentId),
        { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 }
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <div className="flex items-center gap-2 mb-4">
                <CalenderIcon className="w-5 h-5 text-brand-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Riwayat Kelas</h3>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {[0, 1].map(i => (
                        <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
                    ))}
                </div>
            ) : !data || data.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat kelas.</p>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.map((row, i) => (
                        <li key={`${row.academic_year_name}-${row.semester}-${i}`} className="flex items-center justify-between py-2.5">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {row.academic_year_name}
                                </span>

                            </div>
                            <div className="flex items-center gap-2">
                                <ArrowRightIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {row.class_name}
                                </span>
                                {row.is_active_year && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                        aktif
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
