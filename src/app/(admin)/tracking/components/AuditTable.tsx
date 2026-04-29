'use client'

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/id'
import { 
  DownOutlined, 
  UpOutlined, 
  ClockCircleOutlined, 
  LeftOutlined
} from '@ant-design/icons'
import { useState, Fragment } from 'react'
import type { ActivityLog } from '@/types/activityLog'
import DataTable from '@/components/table/Table'

dayjs.extend(relativeTime)
dayjs.locale('id')

interface AuditTableProps {
  logs: (ActivityLog & { profile: { full_name: string, username: string } })[]
}

const PAGE_LABELS: Record<string, string> = {
  '/home': 'Home',
  '/dashboard': 'Dashboard',
  '/absensi': 'Absensi',
  '/laporan': 'Laporan',
  '/users/siswa': 'Siswa',
  '/users/guru': 'Guru',
  '/users/admin': 'Admin',
  '/kelas': 'Kelas',
  '/rapot': 'Rapot',
  '/materi': 'Materi',
  '/tracking': 'Tracking',
  '/monitoring': 'Monitoring',
  '/organisasi': 'Organisasi',
  '/tahun-ajaran': 'Tahun Ajaran',
  '/kegiatan': 'Kegiatan',
  '/settings': 'Pengaturan',
}

export default function AuditTable({ logs }: AuditTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getPageLabel = (path: string | null) => {
    if (!path) return '-'
    const match = Object.keys(PAGE_LABELS)
      .sort((a, b) => b.length - a.length)
      .find(key => path.startsWith(key))
    
    return match ? PAGE_LABELS[match] : path
  }

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (action.includes('update')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    if (action.includes('delete')) return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (action.includes('archive')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    if (action === 'open_page') return 'bg-emerald-100/10 text-emerald-500 border-emerald-500/20'
    if (action === 'login' || action === 'logout') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  const columns = [
    { key: 'created_at', label: 'Waktu', sortable: true },
    { key: 'full_name', label: 'Pengguna', sortable: true },
    { key: 'action', label: 'Aksi', sortable: true },
    { key: 'page_path', label: 'Halaman / Objek', sortable: true },
    { key: 'details', label: 'Detail', align: 'center' as const, sortable: false }
  ]

  const renderCell = (column: any, log: any, index: number, isExpanded: boolean) => {
    switch (column.key) {
      case 'created_at':
        return (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <ClockCircleOutlined className="text-gray-400 dark:text-gray-500" />
            {dayjs(log.created_at).format('DD MMM YYYY, HH:mm:ss')}
          </div>
        )
      case 'full_name':
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/10 dark:bg-blue-500/10 border border-blue-600/20 dark:border-blue-500/20 text-xs font-bold text-blue-600 dark:text-blue-400">
              {log.profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{log.profile?.full_name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">@{log.profile?.username}</span>
            </div>
          </div>
        )
      case 'action':
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getActionColor(log.action)}`}>
            {log.action.replace(/_/g, ' ').toUpperCase()}
          </span>
        )
      case 'page_path':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
              {log.action === 'open_page' ? (
                getPageLabel(log.page_path)
              ) : (
                log.entity_type || '-'
              )}
            </span>
            {log.entity_label && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                "{log.entity_label}"
              </span>
            )}
          </div>
        )
      case 'details':
        return (
          <div className="text-gray-400 dark:text-gray-500 text-center">
            <LeftOutlined className={`text-xs transition-transform duration-300 ${isExpanded ? '-rotate-90' : ''}`} />
          </div>
        )
      default:
        return null
    }
  }

  const renderExpandedRow = (log: any) => {
    return (
      <div className="p-4 px-6 bg-blue-50/30 dark:bg-blue-900/10 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Metadata Lengkap
          </h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-white dark:bg-gray-900/50 p-3 border border-gray-100 dark:border-gray-800 shadow-sm">
            <pre className="text-[11px] text-gray-700 dark:text-blue-300 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-75">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-y-3 text-[11px]">
                <div className="text-gray-500 uppercase tracking-tighter">ID Entitas</div>
                <div className="font-mono text-gray-900 dark:text-gray-200">{log.entity_id || 'N/A'}</div>
                
                <div className="text-gray-500 uppercase tracking-tighter">Path</div>
                <div className="font-mono text-gray-900 dark:text-gray-200">{log.page_path || 'N/A'}</div>
                
                <div className="text-gray-500 uppercase tracking-tighter">Role</div>
                <div className="font-medium text-gray-900 dark:text-gray-200">{log.user_role || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <DataTable 
        columns={columns}
        data={logs.map(log => ({
          ...log,
          full_name: log.profile?.full_name // Untuk search/sort di DataTable
        }))}
        renderCell={renderCell}
        searchable={true}
        pagination={true}
        expandable={true}
        renderExpandedRow={renderExpandedRow}
        defaultSortColumn="created_at"
        defaultSortDirection="desc"
        searchPlaceholder="Cari log aktivitas..."
      />
    </div>
  )
}
