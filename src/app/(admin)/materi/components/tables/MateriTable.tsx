'use client';

import DataTable from '@/components/table/Table';
import { MaterialItem } from '../../types';
import { PencilIcon, TrashBinIcon } from '@/lib/icons';

interface MateriTableProps {
    items: MaterialItem[];
    onEdit?: (item: MaterialItem) => void;
    onDelete?: (item: MaterialItem) => void;
}

export default function MateriTable({ items, onEdit, onDelete }: MateriTableProps) {
    const columns = [
        {
            key: 'name',
            label: 'NAMA MATERI',
            sortable: true,
            align: 'left' as const,
            width: '30rem',
            widthMobile: '16rem',
            leftMargin: 'pl-4'
        },
        ...(onEdit || onDelete
            ? [
                  {
                      key: 'actions',
                      label: 'AKSI',
                      sortable: false,
                      align: 'center' as const,
                      width: '100px'
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
        if (column.key === 'name') {
            return (
                <div className="py-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                    </div>
                    {item.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
        // <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-5">
        <DataTable
            columns={columns}
            data={tableData}
            renderCell={renderCell}
            pagination={false}
            searchable={false}
            defaultItemsPerPage={25}
            itemsPerPageOptions={[10, 25, 50, 100]}
        />
        // </div>
    );
}
