'use client'

import { useMemo } from 'react'
import DataTable from '@/components/table/Table'
import type { MateriReportRow } from '../actions/reports/materiQueries'

interface MateriDataTableProps {
    rows: MateriReportRow[]
    isLoading: boolean
}

function getCompletionColor(percentage: number) {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

export default function MateriDataTable({ rows, isLoading }: MateriDataTableProps) {
    const columns = useMemo(() => [
        {
            key: 'material_name',
            label: 'Materi',
            sortable: true,
            align: 'left' as const,
        },
        {
            key: 'material_type_name',
            label: 'Tipe',
            sortable: true,
            align: 'left' as const,
            className: 'hidden sm:table-cell',
        },
        {
            key: 'tuntas_count',
            label: 'Progress',
            sortable: true,
            align: 'center' as const,
        },
        {
            key: 'percentage',
            label: '%',
            sortable: true,
            align: 'center' as const,
        },
        {
            key: 'avg_nilai',
            label: 'Avg Nilai',
            sortable: true,
            align: 'center' as const,
            className: 'hidden md:table-cell',
        }
    ], [])

    const renderCell = (column: any, row: MateriReportRow) => {
        switch (column.key) {
            case 'material_name':
                return <span className="font-medium text-gray-900 dark:text-white">{row.material_name}</span>
            
            case 'material_type_name':
                return <span className="text-gray-500 dark:text-gray-400">{row.material_type_name}</span>
            
            case 'tuntas_count':
                return (
                    <span className="text-gray-600 dark:text-gray-300">
                        {row.tuntas_count}/{row.total_students}
                    </span>
                )
            
            case 'percentage':
                return (
                    <span className={`font-semibold ${getCompletionColor(row.percentage)}`}>
                        {row.percentage}%
                    </span>
                )
            
            case 'avg_nilai':
                return (
                    <span className="text-gray-500 dark:text-gray-400">
                        {row.avg_nilai > 0 ? row.avg_nilai : '—'}
                    </span>
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Detail Pencapaian per Materi
            </h3>
            <DataTable
                columns={columns}
                data={rows}
                renderCell={renderCell}
                pagination={true}
                searchable={true}
                searchPlaceholder="Cari materi..."
                defaultItemsPerPage={10}
                className="border-none shadow-none"
                getRowId={(row) => row.material_item_id}
                defaultSortColumn="material_type_name"
                defaultSortDirection="desc"
            />
        </div>
    )
}
