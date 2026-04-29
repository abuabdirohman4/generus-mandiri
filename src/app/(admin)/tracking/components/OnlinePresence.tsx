'use client'

import { TeamOutlined } from '@ant-design/icons'
import { usePresenceStore } from '@/stores/usePresenceStore'
import { useUserProfileStore } from '@/stores/userProfileStore'
import { useEffect } from 'react'

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
  '/tracking': 'Tracking',
  '/monitoring': 'Monitoring',
  '/organisasi': 'Organisasi',
  '/settings': 'Pengaturan',
}

export default function OnlinePresence() {
  const onlineUsers = usePresenceStore((state) => state.onlineUsers)
  const setDebug = usePresenceStore((state) => state.setDebug)
  const { profile } = useUserProfileStore()
  const currentUserId = profile?.id

  // Aktifkan debug mode hanya saat di halaman Tracking
  useEffect(() => {
    setDebug(true)
    return () => setDebug(false)
  }, [setDebug])

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
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
          User Online Saat Ini
          <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full text-[10px]">
            {onlineUsers.length}
          </span>
        </h3>
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      </div>
      
      <div className="flex flex-wrap gap-3">
        {onlineUsers.map((user: any) => {
          const pathLabel = PAGE_LABELS[user.page_path] || user.page_path || 'Unknown'
          const isMe = user.user_id === currentUserId
          
          return (
            <div 
              key={user.user_id}
              className={`flex items-center gap-2 border rounded-full py-1.5 px-4 transition-all hover:bg-gray-100 dark:hover:bg-gray-900 ${
                isMe 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border ${
                isMe 
                ? 'bg-blue-600 text-white border-blue-700' 
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
              }`}>
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {user.full_name} {isMe && <span className="text-[10px] text-blue-500 ml-1">(Anda)</span>}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">Sedang di {pathLabel}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
