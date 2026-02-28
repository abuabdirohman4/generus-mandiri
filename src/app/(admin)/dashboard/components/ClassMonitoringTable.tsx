'use client';

import { useMemo } from 'react';
import DataTable from '@/components/table/Table';
import { ClassMonitoringData } from '../actions';
import { PeriodType } from './PeriodTabs';
import { useUserProfile } from '@/stores/userProfileStore';
import { isSuperAdmin, isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils';
import { getStatusBgColor, getStatusColor } from '@/lib/percentages';
import { useDashboardStore } from '../stores/dashboardStore';
import ComparisonChart from './ComparisonChart';
import { aggregateMonitoringData } from '../utils/aggregateMonitoringData';

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
    const { filters, setFilter } = useDashboardStore();
    const viewMode = filters.comparisonViewMode;

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

    // Build dynamic columns array based on comparison level
    const columns = useMemo(() => {
        const comparisonLevel = filters.comparisonLevel;

        // For class level: show class columns (current behavior)
        if (comparisonLevel === 'class') {
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
        } else {
            // For organizational levels: show entity name + kehadiran only
            const entityLabel = comparisonLevel === 'kelompok' ? 'Kelompok' :
                               comparisonLevel === 'desa' ? 'Desa' : 'Daerah';

            return [
                {
                    key: 'name',
                    label: entityLabel,
                    sortable: true,
                    widthMobile: '150px'
                },
                {
                    key: 'attendance_rate',
                    label: 'Kehadiran',
                    sortable: true,
                    align: 'center' as const
                }
            ];
        }
    }, [filters.comparisonLevel, getOrganizationColumns]);

    // Transform data based on comparison level
    const tableData = useMemo(() => {

        if (!data) return [];

        const comparisonLevel = filters.comparisonLevel;

        // For class level: use raw data
        if (comparisonLevel === 'class') {
            return data;
        } else {
            // For organizational levels: aggregate using shared utility
            const aggregated = aggregateMonitoringData(data, comparisonLevel, {
                kelompok: filters.kelompok,
                kelas: filters.kelas,
                desa: filters.desa,
                daerah: filters.daerah
            });
            return aggregated;
        }
    }, [data, filters.comparisonLevel, filters.kelompok, filters.kelas, filters.desa, filters.daerah]);

    const renderCell = (column: any, item: any) => {
        // Handle entity name (class_name or aggregated 'name')
        if (column.key === 'class_name' || column.key === 'name') {
            return (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item[column.key]}
                </span>
            );
        }

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
            // Show "Tidak ada siswa" for classes with no students (only for class-level)
            if (filters.comparisonLevel === 'class' && item.student_count === 0) {
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

    // Dynamic search placeholder based on comparison level
    const searchPlaceholder = useMemo(() => {
        const comparisonLevel = filters.comparisonLevel;
        return comparisonLevel === 'class' ? 'Cari kelas...' :
               comparisonLevel === 'kelompok' ? 'Cari kelompok...' :
               comparisonLevel === 'desa' ? 'Cari desa...' : 'Cari daerah...';
    }, [filters.comparisonLevel]);

    if (isLoading) {
        // Calculate dynamic column count based on comparison level
        const comparisonLevel = filters.comparisonLevel;
        const columnCount = comparisonLevel === 'class'
            ? 3 + getOrganizationColumns.length  // Class + Pertemuan + Kehadiran + Org columns
            : 2;  // Entity name + Kehadiran

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
        <>
            {/* View Mode Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-sm dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Monitoring Kehadiran
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilter('comparisonViewMode', 'table')}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="hidden sm:inline">Tabel</span>
                        </button>
                        <button
                            onClick={() => setFilter('comparisonViewMode', 'chart')}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                viewMode === 'chart'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="hidden sm:inline">Grafik</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm dark:border-gray-700 p-4">
                    {/* Empty state for "Per Kelas" with no classes selected */}
                    {filters.comparisonLevel === 'class' && (!filters.kelas || filters.kelas.length === 0) ? (
                        <div className="h-80 flex items-center justify-center">
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                                    Pilih Kelas
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Pilih minimal 1 kelas di filter untuk melihat data.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <DataTable
                                columns={columns}
                                data={tableData}
                                renderCell={renderCell}
                                searchable={true}
                                pagination={true}
                                itemsPerPageOptions={[10, 25, 50, 100]}
                                defaultItemsPerPage={10}
                                defaultSortColumn={filters.comparisonLevel === 'class' ? 'class_name' : 'name'}
                                defaultSortDirection="asc"
                                searchPlaceholder={searchPlaceholder}
                                rowClassName={(item) => {
                                    // Only apply warning styling for class-level view
                                    if (filters.comparisonLevel === 'class') {
                                        return (!item.has_meeting || item.attendance_rate === 0)
                                            ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500'
                                            : '';
                                    }
                                    return '';
                                }}
                            />

                            {/* Legend - only show for class-level view */}
                            {filters.comparisonLevel === 'class' && (
                                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                                    <span className="inline-block w-3 h-3 bg-orange-50 border border-orange-200 rounded"></span>
                                    <span>Kelas belum ada pertemuan atau tingkat kehadiran 0% di periode ini</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Chart View */}
            {viewMode === 'chart' && (
                <ComparisonChart
                    monitoringData={data || []}
                    comparisonLevel={filters.comparisonLevel}
                    filters={{
                        kelompok: filters.kelompok,
                        kelas: filters.kelas,
                        desa: filters.desa,
                        daerah: filters.daerah
                    }}
                    isLoading={isLoading}
                />
            )}
        </>
    );
}
