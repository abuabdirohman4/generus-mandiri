'use client'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/id'
import { 
  DownOutlined, 
  UpOutlined, 
  UserOutlined, 
  AuditOutlined, 
  ContainerOutlined, 
  ClockCircleOutlined 
} from '@ant-design/icons'
import { useState, Fragment } from 'react'
import type { ActivityLog } from '@/types/activityLog'

dayjs.extend(relativeTime)
dayjs.locale('id')

interface AuditTableProps {
  logs: (ActivityLog & { profile: { full_name: string, username: string } })[]
}

export default function AuditTable({ logs }: AuditTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (action.includes('update')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    if (action.includes('delete')) return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (action.includes('archive')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <th className="px-6 py-4">Waktu</th>
              <th className="px-6 py-4">Pengguna</th>
              <th className="px-6 py-4">Aksi</th>
              <th className="px-6 py-4">Entitas</th>
              <th className="px-6 py-4 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  Tidak ada log ditemukan
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <Fragment key={log.id}>
                  <tr 
                    className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <ClockCircleOutlined className="text-gray-400 dark:text-gray-500" />
                        {dayjs(log.created_at).format('DD MMM YYYY, HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/10 dark:bg-blue-500/10 border border-blue-600/20 dark:border-blue-500/20 text-xs font-bold text-blue-600 dark:text-blue-400">
                          {log.profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{log.profile?.full_name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">@{log.profile?.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <ContainerOutlined className="text-gray-400 dark:text-gray-500" />
                          {log.entity_type || '-'}
                        </span>
                        {log.entity_label && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-5 italic">
                            "{log.entity_label}"
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors">
                        {expandedId === log.id ? <UpOutlined /> : <DownOutlined />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-gray-50/50 dark:bg-gray-900/30">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 p-4 shadow-inner">
                          <h4 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Metadata Lengkap</h4>
                          <pre className="text-xs text-blue-600 dark:text-blue-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                          <div className="mt-4 flex gap-4 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
                             <span>ID Entitas: {log.entity_id || 'N/A'}</span>
                             <span>Path: {log.page_path || 'N/A'}</span>
                             <span>Role: {log.user_role || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
