'use client'

import { useMemo } from 'react'
import DataTable from '@/components/table/Table'
import { useLaporanStore } from '@/stores/laporanStore'
import type { MateriReportRow, MateriSiswaRow } from '../actions/reports/materiQueries'
import { getRateGrade, getRateStyle } from '@/lib/percentages'
import Link from 'next/link'
import { ReportIcon } from '@/lib/icons'

interface MateriDataTableProps {
    rows: MateriReportRow[]
    siswaRows?: MateriSiswaRow[]
    isLoading: boolean
}

export default function MateriDataTable({ rows, siswaRows = [], isLoading }: MateriDataTableProps) {
    const { materiViewMode: viewMode, setMateriViewMode: onViewModeChange } = useLaporanStore()
    const columns = useMemo(() => {
        if (viewMode === 'per_siswa') {
            return [
                { key: 'actions', label: 'Detail', align: 'center' as const, width: '24' },
                { key: 'student_name', label: 'Nama Siswa', sortable: true, align: 'left' as const },
                { key: 'percentage', label: 'Tercapai', sortable: true, align: 'center' as const },
                { key: 'avg_nilai', label: 'Nilai', sortable: true, align: 'center' as const, className: 'hidden md:table-cell' },
            ]
        }
        return [
            {
                key: 'material_name',
                label: 'Sub Materi',
                sortable: true,
                align: 'left' as const,
            },
            {
                key: 'material_type_name',
                label: 'Materi',
                sortable: true,
                align: 'left' as const,
                className: 'hidden sm:table-cell',
            },
            {
                key: 'percentage',
                label: 'Tercapai',
                sortable: true,
                align: 'center' as const,
            },
            {
                key: 'avg_nilai',
                label: 'Nilai',
                sortable: true,
                align: 'center' as const,
                className: 'hidden md:table-cell',
            }
        ]
    }, [viewMode])

    const renderCell = (column: any, row: any) => {
        if (viewMode === 'per_siswa') {
            switch (column.key) {
                case 'actions':
                    return (
                        <Link
                            href={`/users/siswa/${row.student_id}/materi`}
                            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 block"
                            title="Lihat Pencapaian Materi"
                        >
                            <ReportIcon className="w-6 h-6 mx-auto" />
                        </Link>
                    )
                case 'student_name':
                    return <span className="font-medium text-gray-900 dark:text-white">{row.student_name}</span>
                case 'percentage':
                    return (
                        <div className="flex items-center justify-center gap-1.5 font-semibold">
                            <span className={getRateStyle(row.percentage)}>{row.percentage}%</span>
                            <span className="text-gray-400">({row.tuntas_count}/{row.total_materials})</span>
                        </div>
                    )
                case 'avg_nilai':
                    if (row.avg_nilai <= 0) return <span className="text-gray-400">—</span>
                    const { grade, style: gradeStyle } = getRateGrade(row.avg_nilai)
                    return (
                        <div className="flex items-center justify-center gap-2 font-semibold">
                            <span className="text-gray-700 dark:text-gray-300">{row.avg_nilai}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-black ${gradeStyle}`}>{grade}</span>
                        </div>
                    )
                default:
                    return (row as any)[column.key]
            }
        }

        // Default per_materi view
        switch (column.key) {
            case 'material_name':
                return <span className="font-medium text-gray-900 dark:text-white">{row.material_name}</span>
            
            case 'material_type_name':
                return <span className="text-gray-500 dark:text-gray-400">{row.material_type_name}</span>
            
            case 'percentage':
                const colorClass = getRateStyle(row.percentage)
                return (
                    <div className="flex items-center justify-center gap-1.5 font-semibold">
                        <span className={colorClass}>
                            {row.percentage}%
                        </span>
                        <span className="text-gray-400">
                            ({row.tuntas_count}/{row.total_students})
                        </span>
                    </div>
                )
            
            case 'avg_nilai':
                if (row.avg_nilai <= 0) return <span className="text-gray-400">—</span>;
                const { grade, style: gradeStyle } = getRateGrade(row.avg_nilai);
                return (
                    <div className="flex items-center justify-center gap-2 font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">
                            {row.avg_nilai}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-black ${gradeStyle}`}>
                            {grade}
                        </span>
                    </div>
                )
            
            default:
                return (row as any)[column.key]
        }
    }

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="animate-pulse p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {viewMode === 'per_siswa' ? 'Detail Pencapaian per Siswa' : 'Detail Pencapaian per Materi'}
                </h3>
                
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-auto">
                    <button
                        onClick={() => onViewModeChange('per_siswa')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'per_siswa'
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Per Siswa
                    </button>
                    <button
                        onClick={() => onViewModeChange('per_materi')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'per_materi'
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Per Materi
                    </button>
                </div>
            </div>
            <DataTable
                columns={columns}
                data={viewMode === 'per_siswa' ? siswaRows : rows}
                renderCell={renderCell}
                pagination={true}
                searchable={true}
                searchPlaceholder={viewMode === 'per_siswa' ? 'Cari siswa...' : 'Cari materi...'}
                defaultItemsPerPage={10}
                className="border-none shadow-none"
                getRowId={viewMode === 'per_siswa' ? (row: any) => row.student_id : (row: any) => row.material_item_id}
                defaultSortColumn={viewMode === 'per_siswa' ? 'percentage' : 'material_type_name'}
                defaultSortDirection="desc"
            />
        </div>
    )
}
