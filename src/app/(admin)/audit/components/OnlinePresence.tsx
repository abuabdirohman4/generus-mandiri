'use client'

import { useEffect, useRef, useState } from 'react'
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
  
  // Gunakan singleton client
  const supabase = createClient()

  useEffect(() => {
    // Subscribe ke channel yang sama dengan Tracker
    // Kita tidak memberikan 'key' di sini agar tidak menabrak track() milik usePresence
    const channel = supabase.channel('online-users')

    console.log('OnlinePresence: Attaching listener to shared channel...')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('Raw Presence State:', state)
        
        const stateValues = Object.values(state).flat()
        const uniqueUsersMap = new Map()
        
        stateValues.forEach((u: any) => {
          if (u && u.user_id) {
            const existing = uniqueUsersMap.get(u.user_id)
            if (!existing || (u.online_at && (!existing.online_at || new Date(u.online_at) > new Date(existing.online_at)))) {
              uniqueUsersMap.set(u.user_id, u)
            }
          }
        })
        
        const finalUsers = Array.from(uniqueUsersMap.values())
        console.log('Processed Online Users:', finalUsers)
        setOnlineUsers(finalUsers)
      })

    // Hanya panggil subscribe jika channel belum dalam status joined
    if (channel.state !== 'joined') {
      channel.subscribe((status) => {
        console.log('OnlinePresence Subscription Status:', status)
      })
    } else {
      console.log('OnlinePresence: Channel already joined by Tracker')
      // Trigger sync manual sekali di awal jika sudah joined
      const state = channel.presenceState()
      const stateValues = Object.values(state).flat()
      const uniqueUsersMap = new Map()
      stateValues.forEach((u: any) => {
        if (u && u.user_id) {
          const existing = uniqueUsersMap.get(u.user_id)
          if (!existing || (u.online_at && (!existing.online_at || new Date(u.online_at) > new Date(existing.online_at)))) {
            uniqueUsersMap.set(u.user_id, u)
          }
        }
      })
      setOnlineUsers(Array.from(uniqueUsersMap.values()))
    }

    return () => {
      // JANGAN unsubscribe di sini karena akan mematikan Tracker global (Singleton Client)
      console.log('OnlinePresence: Detaching listener (keeping channel alive for Tracker)')
    }
  }, [])

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
