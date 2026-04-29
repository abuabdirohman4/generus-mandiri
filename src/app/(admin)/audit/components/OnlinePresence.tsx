'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TeamOutlined } from '@ant-design/icons'

const PAGE_LABELS: Record<string, string> = {
  '/home': 'Dashboard',
  '/absensi': 'Absensi',
  '/laporan': 'Laporan',
  '/users/siswa': 'Data Siswa',
  '/users/guru': 'Data Guru',
  '/users/admin': 'Data Admin',
  '/kelas': 'Kelas',
  '/rapot': 'Rapot',
  '/materi': 'Materi',
  '/audit': 'Audit',
  '/monitoring': 'Monitoring',
  '/organisasi': 'Organisasi',
  '/settings': 'Pengaturan',
}

export default function OnlinePresence() {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: { presence: { key: 'audit-observer' } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Deduplicate users by user_id
        const stateValues = Object.values(state).flat()
        const uniqueUsersMap = new Map()
        
        stateValues.forEach((u: any) => {
          if (u.user_id) {
            uniqueUsersMap.set(u.user_id, u)
          }
        })
        
        setOnlineUsers(Array.from(uniqueUsersMap.values()))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (onlineUsers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-2">
          <TeamOutlined className="text-gray-400 dark:text-gray-500" />
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tidak ada user online</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <TeamOutlined className="text-green-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">User Online Saat Ini</h3>
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse ml-2" />
      </div>
      
      <div className="flex flex-wrap gap-3">
        {onlineUsers.map((user: any) => {
          const pathLabel = PAGE_LABELS[user.page_path] || user.page_path || 'Unknown'
          return (
            <div 
              key={user.user_id}
              className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-full py-1.5 px-4 transition-all hover:bg-gray-100 dark:hover:bg-gray-900"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{user.full_name}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">Sedang di {pathLabel}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
