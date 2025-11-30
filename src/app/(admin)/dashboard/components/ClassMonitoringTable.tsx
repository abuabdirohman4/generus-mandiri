'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import DataTable from '@/components/table/Table';
import { ClassMonitoringData } from '../actions';
import { PeriodType } from './PeriodTabs';
import DashboardSkeleton from '@/components/ui/skeleton/DashboardSkeleton'; // Or use a simpler skeleton

interface ClassMonitoringTableProps {
    data: ClassMonitoringData[];
    isLoading: boolean;
    period: PeriodType; // Keep for display purposes if needed, or remove if unused
}

export default function ClassMonitoringTable({ data, isLoading, period }: ClassMonitoringTableProps) {
    const columns = [
        {
            key: 'class_name',
            label: 'Kelas',
            sortable: true
        },
        {
            key: 'organization',
            label: 'Organisasi',
            sortable: true
        },
        {
            key: 'meeting_count',
            label: 'Pertemuan',
            sortable: true,
            align: 'center' as const
        },
        {
            key: 'attendance_rate',
            label: 'Kehadiran',
            sortable: true,
            align: 'center' as const
        }
    ];

    // Transform data for table
    const tableData = useMemo(() => {
        if (!data) return [];
        return data.map(item => ({
            ...item,
            organization: item.kelompok_name || item.desa_name || item.daerah_name || '-'
        }));
    }, [data]);

    const renderCell = (column: any, item: any) => {
        if (column.key === 'organization') {
            return (
                <div className="flex flex-col text-xs">
                    {item.kelompok_name && <span className="font-medium">{item.kelompok_name}</span>}
                    {item.desa_name && <span className="text-gray-500">{item.desa_name}</span>}
                    {item.daerah_name && <span className="text-gray-400">{item.daerah_name}</span>}
                </div>
            );
        }
        if (column.key === 'attendance_rate') {
            return (
                <span className={`font-medium ${item.attendance_rate >= 75 ? 'text-emerald-600' :
                    item.attendance_rate >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                    }`}>
                    {item.attendance_rate}%
                </span>
            );
        }
        return item[column.key];
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Monitoring Kelas
                </h3>
                <div className="text-sm text-gray-500">
                    {tableData.length} Kelas
                </div>
            </div>

            <DataTable
                columns={columns}
                data={tableData}
                renderCell={renderCell}
                searchable={true}
                pagination={true}
                itemsPerPageOptions={[10, 25, 50, 100]}
                defaultItemsPerPage={10}
                searchPlaceholder="Cari kelas..."
                rowClassName={(item) => !item.has_meeting ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' : ''}
            />

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block w-3 h-3 bg-orange-50 border border-orange-200 rounded"></span>
                <span>Kelas belum ada pertemuan di periode ini</span>
            </div>
        </div>
    );
}
