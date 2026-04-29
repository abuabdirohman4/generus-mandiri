'use client'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/id'
import DataTable from '@/components/table/Table'

dayjs.extend(relativeTime)
dayjs.locale('id')

interface UserSummary {
  id: string
  full_name: string
  username: string
  role: string
  last_active: string | null
  total_actions_30d: number
}

interface UserSummaryTableProps {
  data: UserSummary[]
}

/**
 * Component to display user activity summary for the last 30 days
 */
export default function UserSummaryTable({ data }: UserSummaryTableProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'teacher':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getActionColor = (count: number) => {
    if (count === 0) return 'text-gray-500'
    if (count < 10) return 'text-orange-400 font-bold'
    return 'text-green-400 font-bold'
  }

  const columns = [
    { key: 'full_name', label: 'Nama', sortable: true },
    { key: 'username', label: 'Username', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'last_active', label: 'Terakhir Aktif', sortable: true },
    { key: 'total_actions_30d', label: 'Aksi 30 Hari', align: 'center' as const, sortable: true },
  ]

  const renderCell = (column: any, user: UserSummary) => {
    switch (column.key) {
      case 'full_name':
        return <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{user.full_name}</span>
      case 'username':
        return <span className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</span>
      case 'role':
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(user.role)}`}>
            {user.role}
          </span>
        )
      case 'last_active':
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {user.last_active 
              ? dayjs(user.last_active).fromNow()
              : 'Belum pernah aktif'}
          </span>
        )
      case 'total_actions_30d':
        return (
          <span className={`text-sm text-center ${getActionColor(user.total_actions_30d)}`}>
            {user.total_actions_30d}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full">
      <DataTable 
        columns={columns}
        data={data}
        renderCell={renderCell}
        searchable={true}
        pagination={true}
        defaultSortColumn="last_active"
        defaultSortDirection="desc"
        searchPlaceholder="Cari pengguna..."
      />
    </div>
  )
}
