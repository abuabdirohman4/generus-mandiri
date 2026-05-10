'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import InputFilter from '@/components/form/input/InputFilter'
import DataTable from '@/components/table/Table'
import { getAcademicYears, getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'
import { getMaterialCategories } from '@/app/(admin)/materi/actions/categories/actions'
import { getStudentMateriProgress, type StudentMateriProgressItem } from '../actions/materi'

interface MateriViewProps {
    studentId: string
}

export default function MateriView({ studentId }: MateriViewProps) {
    const [academicYears, setAcademicYears] = useState<{ value: string; label: string }[]>([])
    const [allCategories, setAllCategories] = useState<{ value: string; label: string }[]>([])
    const [selectedYearId, setSelectedYearId] = useState('')
    const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    useEffect(() => {
        Promise.all([
            getAcademicYears(),
            getActiveAcademicYear(),
            getMaterialCategories(),
        ]).then(([years, activeYear, categories]) => {
            setAcademicYears(years.map(y => ({ value: y.id, label: y.name })))
            setAllCategories(categories.map(c => ({ value: c.name, label: c.name })))
            if (activeYear) setSelectedYearId(activeYear.id)
        })
    }, [])

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

    // Flatten data
    const items = useMemo(() => {
        const grouped = data?.grouped ?? {}
        const allItems: StudentMateriProgressItem[] = []

        Object.values(grouped).forEach((catItems) => {
            allItems.push(...catItems)
        })

        return allItems
    }, [data])

    const categoryOptions = useMemo(() => {
        return [{ value: 'all', label: 'Semua Kategori' }, ...allCategories]
    }, [allCategories])

    // Filter items based on selected category
    const filteredItems = useMemo(() => {
        if (selectedCategory === 'all') return items
        return items.filter(item => item.category_name === selectedCategory)
    }, [items, selectedCategory])

    const columns = [
        { key: 'category_name', label: 'Kategori', sortable: true, align: 'left' as const, className: 'hidden sm:table-cell' },
        { key: 'material_name', label: 'Materi', sortable: true, align: 'left' as const },
        { key: 'type_name', label: 'Tipe', sortable: true, align: 'left' as const, className: 'hidden md:table-cell' },
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
            case 'nilai':
                if (row.nilai === null || row.nilai <= 0) return <span className="text-gray-400">—</span>
                return (
                    <div className="flex items-center justify-center gap-2 font-semibold">
                        <span className={`text-base ${row.colorClass}`}>
                            {row.nilai}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${row.colorClass.replace('text-', 'bg-').replace('-500', '-100 text-')}`}>
                            {row.grade}
                        </span>
                    </div>
                )
            default:
                return (row as any)[column.key]
        }
    }

    if (isLoading && items.length === 0) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filter Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Daftar Pencapaian Materi
                    </h3>
                    {items.length > 0 && (
                         <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800">
                            {items.filter(i => i.nilai !== null && i.nilai >= 70).length}/{items.length} tuntas
                        </div>
                    )}
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
