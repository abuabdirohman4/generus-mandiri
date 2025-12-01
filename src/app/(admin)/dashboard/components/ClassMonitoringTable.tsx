'use client';

import { useMemo } from 'react';
import DataTable from '@/components/table/Table';
import { ClassMonitoringData } from '../actions';
import { PeriodType } from './PeriodTabs';
import { useUserProfile } from '@/stores/userProfileStore';
import { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils';
import { getStatusBgColor, getStatusColor } from '@/lib/percentages';

interface ClassMonitoringTableProps {
    data: ClassMonitoringData[];
    isLoading: boolean;
    period: PeriodType;
    customDateRange?: { start: string; end: string };
    classViewMode: 'separated' | 'combined';
}

// Date formatting helper functions
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatDateRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.getDate()} - ${endDate.getDate()} ${months[endDate.getMonth()]}`;
    } else {
        const startMonth = months[startDate.getMonth()].substring(0, 3);
        const endMonth = months[endDate.getMonth()].substring(0, 3);
        return `${startDate.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth}`;
    }
}

function getMonthName(dateStr: string): string {
    const date = new Date(dateStr);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[date.getMonth()];
}

export default function ClassMonitoringTable({
    data,
    isLoading,
    period,
    customDateRange,
    classViewMode
}: ClassMonitoringTableProps) {
    const { profile } = useUserProfile();

    // Calculate date range display based on period
    const dateRangeDisplay = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        switch (period) {
            case 'today':
                return formatDate(today);
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return formatDateRange(weekAgo.toISOString().split('T')[0], today);
            case 'month':
                return getMonthName(today);
            case 'custom':
                if (customDateRange) {
                    return formatDateRange(customDateRange.start, customDateRange.end);
                }
                return '';
            default:
                return '';
        }
    }, [period, customDateRange]);

    // Determine which organization columns to show based on user level
    const getOrganizationColumns = useMemo(() => {
        if (!profile) return [];

        // Admin Kelompok - no org columns
        if (isAdminKelompok(profile)) {
            return [];
        }

        // Admin Desa - show only Kelompok
        if (isAdminDesa(profile)) {
            return [{
                key: 'kelompok_name',
                label: 'Kelompok',
                sortable: true
            }];
        }

        // Admin Daerah - show Kelompok + Desa
        if (isAdminDaerah(profile)) {
            return [
                { key: 'kelompok_name', label: 'Kelompok', sortable: true },
                { key: 'desa_name', label: 'Desa', sortable: true }
            ];
        }

        // Superadmin - show all (Kelompok + Desa + Daerah)
        if (isSuperAdmin(profile)) {
            return [
                { key: 'kelompok_name', label: 'Kelompok', sortable: true },
                { key: 'desa_name', label: 'Desa', sortable: true },
                { key: 'daerah_name', label: 'Daerah', sortable: true }
            ];
        }

        return [];
    }, [profile]);

    // Build dynamic columns array
    const columns = useMemo(() => {
        const baseColumns = [
            {
                key: 'class_name',
                label: 'Kelas',
                sortable: true,
                widthMobile: '120px'
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

        // Add organization columns based on user level
        return [...baseColumns, ...getOrganizationColumns];
    }, [getOrganizationColumns]);

    // Use data directly - no transformation needed
    const tableData = useMemo(() => {
        if (!data) return [];
        return data;
    }, [data]);

    const renderCell = (column: any, item: any) => {
        // Handle organization columns (kelompok, desa, daerah)
        if (column.key === 'kelompok_name' || column.key === 'desa_name' || column.key === 'daerah_name') {
            return (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item[column.key] || '-'}
                </span>
            );
        }

        // Handle attendance rate with color coding
        if (column.key === 'attendance_rate') {
            // Show "Tidak ada siswa" for classes with no students
            if (item.student_count === 0) {
                return (
                    <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Tidak ada siswa
                    </span>
                );
            }

            return (
                <span className={`px-3 py-1 rounded-full font-medium ${getStatusColor(item.attendance_rate)} ${getStatusBgColor(item.attendance_rate)}`}>
                    {item.attendance_rate}%
                </span>
            );
        }

        return item[column.key];
    };

    if (isLoading) {
        // Calculate dynamic column count: base columns (3) + organization columns
        const columnCount = 3 + getOrganizationColumns.length;

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:border-gray-700 p-4">
                {/* Header Skeleton */}
                <div className="mb-4 flex justify-between items-center">
                    <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* Skeleton Table */}
                <div className="space-y-3">
                    {/* Table Header Skeleton - dynamic column count */}
                    <div className={`grid gap-4 pb-3 border-b border-gray-200 dark:border-gray-700`}
                        style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
                        {Array.from({ length: columnCount }).map((_, i) => (
                            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        ))}
                    </div>

                    {/* Skeleton Rows - dynamic column count */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`grid gap-4 py-3 border-b border-gray-100 dark:border-gray-800`}
                            style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
                            {Array.from({ length: columnCount }).map((_, j) => (
                                <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Footer Legend Skeleton */}
                <div className="mt-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:border-gray-700 p-4">
            <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Monitoring Kelas
                </h3>
                {/* <div className="text-sm text-gray-500 dark:text-gray-400">
                    {dateRangeDisplay}
                </div> */}
            </div>

            <DataTable
                columns={columns}
                data={tableData}
                renderCell={renderCell}
                searchable={true}
                pagination={true}
                itemsPerPageOptions={[10, 25, 50, 100]}
                defaultItemsPerPage={10}
                defaultSortColumn="class_name"
                defaultSortDirection="asc"
                searchPlaceholder="Cari kelas..."
                rowClassName={(item) => (!item.has_meeting || item.attendance_rate === 0) ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' : ''}
            />

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block w-3 h-3 bg-orange-50 border border-orange-200 rounded"></span>
                <span>Kelas belum ada pertemuan atau tingkat kehadiran 0% di periode ini</span>
            </div>
        </div>
    );
}
