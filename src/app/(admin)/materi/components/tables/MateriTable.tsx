'use client';

import { type ReactNode } from 'react';
import DataTable from '@/components/table/Table';
import { MaterialItem, type Month } from '../../types';
import { getMonthName } from '../../types';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';

interface MateriTableProps {
    items: MaterialItem[];
    onEdit?: (item: MaterialItem) => void;
    onDelete?: (item: MaterialItem) => void;
    onView?: (item: MaterialItem) => void;
    selectedIds?: Set<string>;
    onToggleSelection?: (id: string) => void;
    onToggleAll?: (selected: boolean) => void;
    showTargetBadge?: boolean;
    selectedMonth?: number | null;
    monthsByItemId?: Record<string, number[]>;
    showClassColumn?: boolean;
    showMonthColumn?: boolean;
    columnToggle?: ReactNode;
}

export default function MateriTable({ items, onEdit, onDelete, onView, selectedIds, onToggleSelection, onToggleAll, showTargetBadge, selectedMonth, monthsByItemId = {}, showClassColumn = false, showMonthColumn = true, columnToggle }: MateriTableProps) {
    const allSelected = items.length > 0 && selectedIds && items.every(item => selectedIds.has(item.id));
    const someSelected = selectedIds && selectedIds.size > 0 && !allSelected;

    const columns = [
        ...(onEdit && onDelete && selectedIds && onToggleSelection ? [{
            key: 'selection',
            label: (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        // ref={input => {
                        //     if (input) input.indeterminate = !!someSelected;
                        // }}
                        onChange={(e) => onToggleAll?.(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            ),
            sortable: false,
            align: 'center' as const,
            width: '50px',
            widthMobile: '50px'
        }] : []),
        {
            key: 'name',
            label: 'NAMA MATERI',
            sortable: true,
            align: 'left' as const,
            width: '25rem',
            widthMobile: onEdit && onDelete ? '11rem' : '16rem',
            leftMargin: onEdit && onDelete ? 'pl-1' : 'pl-4'
        },
        ...(showClassColumn ? [{
            key: 'classes',
            label: 'KELAS',
            sortable: false,
            align: 'left' as const,
            width: '180px',
        }] : []),
        ...(showMonthColumn ? [{
            key: 'months',
            label: 'BULAN',
            sortable: false,
            align: 'left' as const,
            width: '180px',
        }] : []),
        ...(onEdit || onDelete
            ? [
                {
                    key: 'actions',
                    label: 'AKSI',
                    sortable: false,
                    align: 'center' as const,
                    width: onEdit && onDelete ? '50px' : '100px',
                }
            ]
            : [])
    ];

    const tableData = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        itemData: item
    }));

    const renderCell = (column: any, item: any) => {
        if (column.key === 'selection') {
            return (
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={selectedIds?.has(item.id)}
                        onChange={() => onToggleSelection?.(item.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            );
        }
        if (column.key === 'name') {
            return (
                <div className="py-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                    </div>
                    {item.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {item.description}
                        </div>
                    )}
                    {showTargetBadge && selectedMonth && (
                        <div className="mt-1">
                            <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded font-bold">
                                Target {getMonthName(selectedMonth as Month)}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        if (column.key === 'classes') {
            const classes = item.itemData?.classes || [];
            if (classes.length === 0) {
                return <span className="text-gray-400 dark:text-gray-600">—</span>;
            }

            return (
                <div className="flex flex-wrap gap-1">
                    {classes.map((cls: any) => (
                        <span 
                            key={cls.id} 
                            className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-800/30"
                        >
                            {cls.name}
                        </span>
                    ))}
                </div>
            );
        }
        if (column.key === 'months') {
            const months = monthsByItemId[item.id] || [];
            if (months.length === 0) {
                return <span className="text-gray-400 dark:text-gray-600">—</span>;
            }

            const getShortMonth = (m: number) => {
                const names: Record<number, string> = {
                    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun',
                    7: 'Jul', 8: 'Ags', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des'
                };
                return names[m] || m.toString();
            };

            const displayedMonths = months.slice(0, 3);
            const remainingCount = months.length - 3;

            return (
                <div className="flex flex-wrap gap-1">
                    {displayedMonths.map(m => (
                        <span 
                            key={m} 
                            className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800/30"
                        >
                            {getShortMonth(m)}
                        </span>
                    ))}
                    {remainingCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                            +{remainingCount}
                        </span>
                    )}
                </div>
            );
        }

        if (column.key === 'actions') {
            if (!onEdit && !onDelete) return null;

            return (
                <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onEdit?.(item.itemData)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                        title="Edit"
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onDelete?.(item.itemData)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Hapus"
                    >
                        <TrashBinIcon className="w-5 h-5" />
                    </button>
                </div>
            );
        }

        return item[column.key];
    };

    return (
        <DataTable
            columns={columns}
            data={tableData}
            renderCell={renderCell}
            searchable={false}
            pagination={true}
            defaultItemsPerPage={25}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onRowClick={(item) => onView?.(item.itemData)}
            rowClassName="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
            columnToggle={columnToggle}
        />
    );
}
