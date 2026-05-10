'use client'

import { useStudentDetail } from '../hooks/useStudentDetail'
import dayjs from 'dayjs'

interface IkhtisarViewProps {
    studentId: string
}

export default function IkhtisarView({ studentId }: IkhtisarViewProps) {
    // For summary, we use current month by default
    const { student, stats, isLoading } = useStudentDetail(studentId, dayjs())

    if (isLoading) return <IkhtisarSkeleton />

    return (
        <div className="space-y-6">
            {/* Info Dasar Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-3xl font-bold text-brand-600 dark:text-brand-400">
                        {student?.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {student?.name ?? '—'}
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                             {student?.classes && student.classes.length > 0 ? (
                                student.classes.map(cls => (
                                    <span key={cls.id} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                        {cls.name}
                                    </span>
                                ))
                             ) : (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    —
                                </span>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ringkasan Presensi Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ringkasan Presensi</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">Bulan Ini</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Hadir" value={stats?.hadir ?? 0} color="text-green-600 dark:text-green-400" bgColor="bg-green-50 dark:bg-green-900/20" />
                        <StatCard label="Izin" value={stats?.izin ?? 0} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-900/20" />
                        <StatCard label="Sakit" value={stats?.sakit ?? 0} color="text-yellow-600 dark:text-yellow-400" bgColor="bg-yellow-50 dark:bg-yellow-900/20" />
                        <StatCard label="Absen" value={stats?.absen ?? 0} color="text-red-600 dark:text-red-400" bgColor="bg-red-50 dark:bg-red-900/20" />
                    </div>
                </div>

                {/* Info Card Placeholder for future expansion (e.g. Activity or Character) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex items-center justify-center border-dashed">
                    <p className="text-sm text-gray-400 italic">
                        Fitur ringkasan lainnya akan segera hadir
                    </p>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, color, bgColor }: { label: string; value: number; color: string; bgColor: string }) {
    return (
        <div className={`p-4 rounded-xl ${bgColor} text-center transition-transform hover:scale-105 duration-200`}>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">{label}</div>
        </div>
    )
}

function IkhtisarSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
        </div>
    )
}
