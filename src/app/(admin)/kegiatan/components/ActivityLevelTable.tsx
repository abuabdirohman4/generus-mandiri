'use client'

import DataTable from '@/components/table/Table'
import TableActions from '@/components/table/TableActions'
import { PencilIcon } from '@/lib/icons'
import type { ActivityLevel } from '@/types/activityType'

interface ActivityLevelTableProps {
  data: ActivityLevel[]
  onEdit: (item: ActivityLevel) => void
}

export default function ActivityLevelTable({ data, onEdit }: ActivityLevelTableProps) {
  const columns = [
    { key: 'sort_order', label: 'No', align: 'center' as const, sortable: true },
    { key: 'name', label: 'Nama', sortable: true },
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'actions', label: 'Aksi', align: 'center' as const, sortable: false },
  ]

  const renderCell = (column: { key: string }, item: ActivityLevel) => {
    if (column.key === 'sort_order') {
      return item.sort_order
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
          ]}
        />
      )
    }

    return item[column.key as keyof ActivityLevel]
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="text-center py-12">
          <div className="text-4xl text-gray-300 dark:text-gray-600 mb-4">—</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Belum ada tingkat kegiatan
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Data tingkat kegiatan belum tersedia
          </p>
        </div>
      </div>
    )
  }

  return <DataTable columns={columns} data={data} renderCell={renderCell} />
}
