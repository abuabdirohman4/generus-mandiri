'use client'

import { useState } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'
import { getStudentOverview } from '../../actions/overview'
import { getRateStyle, getRateGrade } from '@/lib/percentages'
import { getMonthName, getSemesterMonths } from '@/app/(admin)/materi/types'
import { 
    CalenderIcon, 
    BookOpenIcon, 
    CheckCircleIcon,
    TimeIcon,
    ChevronDownIcon,
    ShootingStarIcon
} from '@/lib/icons'
import { useUserProfile } from '@/stores/userProfileStore'
import { canAccessMonitoring } from '@/lib/accessControl'

interface IkhtisarViewProps {
    studentId: string
}

export default function IkhtisarView({ studentId }: IkhtisarViewProps) {
    const [viewMode, setViewMode] = useState<'semester' | 'monthly'>('semester')
    const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1)
    const { profile } = useUserProfile()
    const canSeeMateri = canAccessMonitoring(profile)
    
    const { data, isLoading, error } = useSWR(
        studentId ? `overview-${studentId}-${dayjs().format('YYYY-MM')}` : null,
        () => getStudentOverview(studentId, dayjs().toISOString()),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000
        }
    )

    if (isLoading) return <IkhtisarSkeleton />
    if (error) return <div className="p-8 text-center text-red-500">Gagal memuat data overview</div>
    if (!data) return null

    const { student, attendance, materi, academicYearName } = data
    
    // Choose stats based on mode
    const currentAttendance = viewMode === 'semester' ? attendance.semester : attendance.monthly
    const currentMateri = viewMode === 'semester' ? materi.semester : materi.monthly
    
    const semester = (dayjs().month() + 1) >= 7 ? 1 : 2
    const semesterMonths = getSemesterMonths(semester as 1 | 2)

    const getDisplayedClasses = () => {
        if (!student?.classes || student.classes.length === 0) return []
        
        // If admin, show all classes
        if (profile?.role === 'admin' || profile?.role === 'superadmin') {
            return student.classes
        }

        // If teacher, filter to only classes they teach
        if (profile?.role === 'teacher' && profile.classes) {
            const teacherClassIds = profile.classes.map((c: any) => c.id)
            return student.classes.filter((c: any) => teacherClassIds.includes(c.id))
        }

        return student.classes
    }

    const displayedClasses = getDisplayedClasses()

    return (
        <div className="space-y-6 mx-auto px-0 pb-28 md:pb-0">
            {/* Header Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShootingStarIcon className="w-32 h-32" />
                </div>
                
                <div className='md:flex md:justify-between'>
                    <div className="flex flex-col md:flex-row md:items-center gap-6 relative">
                        <div className="w-24 h-24 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-4xl font-black text-brand-600 dark:text-brand-400 shadow-inner">
                            {student?.name?.charAt(0) ?? '?'}
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                                <h2 className="text-3xl mx-auto text-center md:mx-0 font-bold text-gray-900 dark:text-white leading-none">
                                    {student?.name ?? '—'}
                                </h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {displayedClasses.length > 0 ? (
                                    displayedClasses.map((cls: any) => (
                                        <span key={cls.id} className="inline-flex items-center gap-1.5 px-3 py-1 mx-auto md:mx-0 rounded-lg text-sm font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                                            {cls.name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm mx-auto md:mx-0 text-gray-500 dark:text-gray-400 italic text-center md:text-left">
                                        Belum terdaftar di kelas manapun
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className='hidden md:block'>
                        {viewMode === 'monthly' && (
                            <div className="text-[10px] text-center font-black uppercase bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-1 rounded tracking-tighter">
                            {getMonthName(selectedMonth as any)}
                            </div>
                        )}
                        {viewMode === 'semester' && (
                            <div className="text-[10px] text-center font-black uppercase bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-1 rounded tracking-tighter">
                               Semester {semester} <span className="mx-1">•</span> {academicYearName}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <div className="flex w-full bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('semester')}
                    className={`w-full px-4 py-2 text-sm rounded-md transition-colors ${viewMode === 'semester'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Semester
                  </button>
                  <button
                    onClick={() => setViewMode('monthly')}
                    className={`w-full px-4 py-2 text-sm rounded-md transition-colors ${viewMode === 'monthly'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Bulan
                  </button>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${canSeeMateri ? 'lg:grid-cols-2' : ''} gap-6`}>
                {/* Ringkasan Presensi */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                                <CalenderIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ringkasan Presensi</h3>
                                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Kehadiran Siswa</p>
                            </div>
                        </div>
                        <div className='block md:hidden'>
                            {viewMode === 'monthly' && (
                                <div className="text-[10px] text-center font-black uppercase bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-1 rounded tracking-tighter">
                                    {getMonthName(selectedMonth as any)}
                                </div>
                            )}
                            {viewMode === 'semester' && (
                                <div className="text-[10px] text-center font-black uppercase bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-1 rounded tracking-tighter">
                                    Semester {semester} <br /> {academicYearName}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <AttendanceStat label="Hadir" value={currentAttendance.hadir} variant="success" />
                        <AttendanceStat label="Izin" value={currentAttendance.izin} variant="info" />
                        <AttendanceStat label="Sakit" value={currentAttendance.sakit} variant="warning" />
                        <AttendanceStat label="Absen" value={currentAttendance.absen} variant="danger" />
                    </div>
                    
                    <div className="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Total Pertemuan</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">{currentAttendance.total}</span>
                    </div>
                </div>

                {/* Ringkasan Pencapaian Materi */}
                {canSeeMateri && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                                    <BookOpenIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pencapaian Materi</h3>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Progres Kurikulum</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-2xl font-black leading-none ${getRateStyle(currentMateri.percentage)}`}>
                                    {currentMateri.percentage}%
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Progress Bar */}
                            <div>
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                    <span>Tercapai</span>
                                    <span>{currentMateri.tuntas} dari {currentMateri.total} materi</span>
                                </div>
                                <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out ${getRateStyle(currentMateri.percentage, 'bar')}`}
                                        style={{ width: `${currentMateri.percentage}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center justify-center gap-1.5 w-full">
                                        <CheckCircleIcon className="w-3 h-3 text-green-500" />
                                        Nilai
                                    </div>
                                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                                        {currentMateri.avgNilai}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center justify-center gap-1.5 w-full">
                                        <TimeIcon className="w-3 h-3 text-blue-500" />
                                        Predikat
                                    </div>
                                    <div className={`text-2xl font-black ${getRateGrade(currentMateri.avgNilai).color}`}>
                                        {getRateGrade(currentMateri.avgNilai).grade}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function AttendanceStat({ label, value, variant }: { label: string; value: number; variant: 'success' | 'info' | 'warning' | 'danger' }) {
    const colors = {
        success: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800',
        info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
        warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800',
        danger: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
    }

    return (
        <div className={`p-4 rounded-2xl border ${colors[variant]} flex flex-col items-center justify-center transition-transform hover:scale-105 duration-200`}>
            <div className="text-3xl font-black mb-1">{value}</div>
            <div className="text-[10px] font-black uppercase tracking-tighter opacity-70">{label}</div>
        </div>
    )
}

function IkhtisarSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
            </div>
        </div>
    )
}
