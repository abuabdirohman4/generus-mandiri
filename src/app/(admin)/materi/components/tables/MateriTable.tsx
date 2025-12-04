'use client';

import DataTable from '@/components/table/Table';
import { MaterialItem } from '../../types';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';

interface MateriTableProps {
    items: MaterialItem[];
    onEdit?: (item: MaterialItem) => void;
    onDelete?: (item: MaterialItem) => void;
    onView?: (item: MaterialItem) => void;
    selectedIds?: Set<string>;
    onToggleSelection?: (id: string) => void;
    onToggleAll?: (selected: boolean) => void;
}

export default function MateriTable({ items, onEdit, onDelete, onView, selectedIds, onToggleSelection, onToggleAll }: MateriTableProps) {
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
            width: '30rem',
            widthMobile: onEdit && onDelete ? '11rem' : '16rem',
            leftMargin: onEdit && onDelete ? 'pl-1' : 'pl-4'
        },
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
        />
    );
}
