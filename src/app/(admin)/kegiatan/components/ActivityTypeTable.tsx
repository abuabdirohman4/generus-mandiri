'use client'

import DataTable from '@/components/table/Table'
import TableActions from '@/components/table/TableActions'
import { PencilIcon, TrashBinIcon } from '@/lib/icons'
import type { ActivityType } from '@/types/activityType'

interface ActivityTypeTableProps {
  data: ActivityType[]
  onEdit: (item: ActivityType) => void
  onDelete: (item: ActivityType) => void
}

export default function ActivityTypeTable({ data, onEdit, onDelete }: ActivityTypeTableProps) {
  const columns = [
    { key: 'sort_order', label: 'No', align: 'center' as const, sortable: true },
    { key: 'name', label: 'Nama', sortable: true },
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'is_active', label: 'Status', align: 'center' as const, sortable: false },
    { key: 'actions', label: 'Aksi', align: 'center' as const, sortable: false },
  ]

  const renderCell = (column: { key: string }, item: ActivityType) => {
    if (column.key === 'sort_order') {
      return item.sort_order
    }

    if (column.key === 'is_active') {
      return item.is_active ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Aktif
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          Nonaktif
        </span>
      )
    }

    if (column.key === 'actions') {
      return (
        <TableActions
          actions={[
            {
              id: 'edit',
              icon: PencilIcon,
              onClick: () => onEdit(item),
              title: 'Edit',
              color: 'indigo',
            },
            {
              id: 'delete',
              icon: TrashBinIcon,
              onClick: () => onDelete(item),
              title: 'Hapus',
              color: 'red',
            },
          ]}
        />
      )
    }

    return item[column.key as keyof ActivityType]
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="text-center py-12">
          <div className="text-4xl text-gray-300 dark:text-gray-600 mb-4">—</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Belum ada tipe kegiatan
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Mulai dengan menambahkan tipe kegiatan pertama
          </p>
        </div>
      </div>
    )
  }

  return <DataTable columns={columns} data={data} renderCell={renderCell} />
}
