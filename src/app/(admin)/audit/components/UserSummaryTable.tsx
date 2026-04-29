'use client'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/id'

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

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Terakhir Aktif</th>
              <th className="px-6 py-4 text-right">Aksi 30 Hari</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  Tidak ada data user ditemukan
                </td>
              </tr>
            ) : (
              data.sort((a, b) => b.total_actions_30d - a.total_actions_30d).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{user.full_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {user.last_active 
                        ? dayjs(user.last_active).fromNow()
                        : 'Belum pernah aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className={`text-sm ${getActionColor(user.total_actions_30d)}`}>
                      {user.total_actions_30d}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
