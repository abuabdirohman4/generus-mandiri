'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import InputFilter from '@/components/form/input/InputFilter'
import DataTable from '@/components/table/Table'
import { getStudentMateriProgress, type StudentMateriProgressItem } from '../actions/materi'
import { getRateGrade } from '@/lib/percentages'
import { getMonthName, getSemesterMonths } from '@/app/(admin)/materi/types'
import { useMateriMetadata } from '../../hooks/useMateriMetadata'

interface MateriViewProps {
    studentId: string
}

export default function MateriView({ studentId }: MateriViewProps) {
    const [selectedYearId, setSelectedYearId] = useState('')
    const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>(() => {
        const month = new Date().getMonth() // 0-11
        return month >= 6 ? '1' : '2' // Jul-Dec is Semester 1, Jan-Jun is Semester 2
    })
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedMonth, setSelectedMonth] = useState<string>('all')

    useEffect(() => {
        setSelectedMonth('all')
    }, [selectedSemester])
    const { academicYears, allCategories, activeYear, isLoading: isLoadingMetadata } = useMateriMetadata()

    useEffect(() => {
        if (activeYear && !selectedYearId) {
            setSelectedYearId(activeYear.id)
        }
    }, [activeYear, selectedYearId])

    const swrKey = selectedYearId
        ? `student-materi-${studentId}-${selectedYearId}-${selectedSemester}`
        : null

    const { data, isLoading } = useSWR(
        swrKey,
        () => getStudentMateriProgress(studentId, selectedYearId, Number(selectedSemester)),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            keepPreviousData: true,
        }
    )

    const categoryOptions = useMemo(() => {
        return [{ value: 'all', label: 'Semua Kategori' }, ...allCategories]
    }, [allCategories])

    const monthOptions = useMemo(() => {
        const months = getSemesterMonths(Number(selectedSemester) as any)
        return [
            { value: 'all', label: 'Semua Bulan' },
            ...months.map(m => ({ value: m.toString(), label: getMonthName(m as any) }))
        ]
    }, [selectedSemester])

    // Filter items based on month first
    const monthFilteredItems = useMemo(() => {
        const allProgress = data?.allProgress ?? []
        if (selectedMonth === 'all') return allProgress
        const monthNum = Number(selectedMonth)
        return allProgress.filter(item => item.months.includes(monthNum))
    }, [data, selectedMonth])

    // Filter items based on selected category
    const filteredItems = useMemo(() => {
        if (selectedCategory === 'all') return monthFilteredItems
        return monthFilteredItems.filter(item => item.category_name === selectedCategory)
    }, [monthFilteredItems, selectedCategory])

    // Calculate Stats based on monthFilteredItems (or filteredItems?)
    // User said "nilainya tergantung filter bulan nya"
    const stats = useMemo(() => {
        const targetItems = filteredItems
        if (targetItems.length === 0) return null

        const scoredItems = targetItems.filter(i => i.nilai !== null && i.nilai > 0)
        const totalNilai = scoredItems.reduce((acc, curr) => acc + (curr.nilai || 0), 0)
        const avgNilai = scoredItems.length > 0 ? Math.round(totalNilai / scoredItems.length) : 0
        const gradeInfo = getRateGrade(avgNilai)
        
        const tuntasCount = targetItems.filter(i => i.nilai !== null && i.nilai >= 70).length
        const belumTuntasCount = targetItems.length - tuntasCount
        const pencapaian = Math.round((tuntasCount / targetItems.length) * 100)
        const pencapaianInfo = getRateGrade(pencapaian)

        return {
            totalNilai,
            avgNilai,
            grade: gradeInfo.grade,
            gradeColor: gradeInfo.color,
            gradeBg: gradeInfo.bg,
            tuntasCount,
            belumTuntasCount,
            totalCount: targetItems.length,
            pencapaian,
            pencapaianColor: pencapaianInfo.color
        }
    }, [filteredItems])

    const columns = [
        { key: 'category_name', label: 'Kategori', sortable: true, align: 'left' as const, className: 'hidden sm:table-cell' },
        { key: 'type_name', label: 'Materi', sortable: true, align: 'left' as const, className: 'hidden md:table-cell' },
        { key: 'material_name', label: 'Sub Materi', sortable: true, align: 'left' as const },
        { key: 'nilai', label: 'Nilai', sortable: true, align: 'center' as const },
    ]

    const renderCell = (column: any, row: StudentMateriProgressItem) => {
        switch (column.key) {
            case 'category_name':
                return <span className="text-gray-500 dark:text-gray-400 font-medium">{row.category_name}</span>
            case 'material_name':
                return (
                    <div>
                        <div className="font-medium text-gray-900 dark:text-white">{row.material_name}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase sm:hidden">{row.category_name}</div>
                    </div>
                )
            case 'type_name':
                return <span className="text-gray-400 dark:text-gray-500 text-xs uppercase">{row.type_name}</span>
            case 'nilai': {
                if (row.nilai === null || row.nilai <= 0) return <span className="text-gray-400">—</span>
                const gradeInfo = getRateGrade(row.nilai)
                return (
                    <div className="flex items-center justify-center gap-2 font-semibold">
                       <span className="text-gray-700 dark:text-gray-300">
                        {/* <span className={`text-base ${row.colorClass}`}> */}
                        {/* <span className="text-base text-gray-900 dark:text-white"> */}
                            {row.nilai}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-black ${gradeInfo.bg} ${gradeInfo.color}`}>
                            {gradeInfo.grade}
                        </span>
                    </div>
                )
            }
            default:
                return (row as any)[column.key]
        }
    }

    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const isInitializing = academicYears.length === 0 || allCategories.length === 0 || !selectedYearId || isLoadingMetadata

    if (isInitializing || (isLoading && (data?.allProgress ?? []).length === 0)) {
        return (
            <div className="space-y-4 animate-pulse mx-auto px-0 pb-28 md:pb-0">
                <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                    ))}
                </div>
                <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
        )
    }

    return (
        <div className="space-y-4 mx-auto px-0 pb-28 md:pb-0">
            {/* Filter Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter Materi</span>
                    </div>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <div className={`transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="p-4 border-t border-gray-50 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InputFilter
                            id="year-filter"
                            label="Tahun Ajaran"
                            value={selectedYearId}
                            onChange={setSelectedYearId}
                            options={academicYears}
                            placeholder="Pilih Tahun"
                            compact
                        />
                        <InputFilter
                            id="semester-filter"
                            label="Semester"
                            value={selectedSemester}
                            onChange={(v) => setSelectedSemester(v as '1' | '2')}
                            options={[
                                { value: '1', label: 'Semester 1' },
                                { value: '2', label: 'Semester 2' },
                            ]}
                            compact
                        />
                        <InputFilter
                            id="category-filter"
                            label="Kategori"
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            options={categoryOptions}
                            placeholder="Semua Kategori"
                            compact
                        />
                        <InputFilter
                            id="month-filter"
                            label="Bulan"
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            options={monthOptions}
                            placeholder="Semua Bulan"
                            compact
                        />
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nilai</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgNilai}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Predikat</div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-lg font-black ${stats.gradeBg} ${stats.gradeColor}`}>
                                {stats.grade}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pencapaian</div>
                        <div className="flex items-end gap-1">
                            <span className={`text-2xl font-bold ${stats.pencapaianColor}`}>{stats.pencapaian}%</span>
                            <span className="text-xs text-gray-400 mb-1"></span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sub Materi</div>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.tuntasCount}/{stats.totalCount}</span>
                            <span className="text-xs text-gray-400 mb-1">tercapai</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Daftar Pencapaian Materi
                    </h3>
                </div>

                <DataTable
                    columns={columns}
                    data={filteredItems}
                    renderCell={renderCell}
                    pagination={true}
                    searchable={true}
                    searchPlaceholder="Cari materi..."
                    defaultItemsPerPage={10}
                    className="border-none shadow-none"
                    getRowId={(row: any) => row.material_item_id}
                    defaultSortColumn="category_name"
                    defaultSortDirection="asc"
                    emptyMessage="Belum ada data pencapaian materi"
                />
            </div>
        </div>
    )
}
