'use client'

import {
  HomeOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  BookOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  ReadOutlined,
  LineChartOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  EyeOutlined,
  SettingOutlined,
  RadarChartOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { usePresenceStore } from '@/stores/usePresenceStore'
import { useUserProfileStore } from '@/stores/userProfileStore'
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore'
import { useEffect, useRef, useState } from 'react'

const PAGE_MAP = [
  { path: '/home',          label: 'Home',         Icon: HomeOutlined },
  { path: '/presensi',       label: 'Presensi',      Icon: CheckSquareOutlined },
  { path: '/laporan',       label: 'Laporan',      Icon: BarChartOutlined },
  { path: '/users/siswa',   label: 'Siswa',        Icon: TeamOutlined },
  { path: '/users/guru',    label: 'Guru',         Icon: UserOutlined },
  { path: '/users/admin',   label: 'Admin',        Icon: CrownOutlined },
  { path: '/kelas',         label: 'Kelas',        Icon: BookOutlined },
  { path: '/organisasi',    label: 'Organisasi',   Icon: ApartmentOutlined },
  { path: '/rapot',         label: 'Rapot',        Icon: FileTextOutlined },
  { path: '/materi',        label: 'Materi',       Icon: ReadOutlined },
  { path: '/monitoring',    label: 'Monitoring',   Icon: LineChartOutlined },
  { path: '/kegiatan',      label: 'Kegiatan',     Icon: CalendarOutlined },
  { path: '/tahun-ajaran',  label: 'Tahun Ajaran', Icon: FieldTimeOutlined },
  { path: '/tracking',      label: 'Tracking',     Icon: EyeOutlined },
  { path: '/settings',      label: 'Pengaturan',   Icon: SettingOutlined },
]

// Warna avatar berdasarkan index user (agar setiap user punya warna unik)
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-indigo-500',
]

const AVATAR_RING_COLORS = [
  'ring-blue-400',
  'ring-green-400',
  'ring-purple-400',
  'ring-orange-400',
  'ring-pink-400',
  'ring-teal-400',
  'ring-red-400',
  'ring-indigo-400',
]

const RADAR_COLORS = [
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-teal-400',
  'bg-red-400',
  'bg-indigo-400',
]

function resolvePageIndex(pagePath: string): number {
  return PAGE_MAP.findIndex(
    (p) => pagePath === p.path || pagePath.startsWith(p.path + '/')
  )
}

interface AvatarPosition {
  x: number
  y: number
  pageIndex: number
}

export default function AppMap() {
  const onlineUsers = usePresenceStore((state) => state.onlineUsers)
  const { profile } = useUserProfileStore()
  const currentUserId = profile?.id
  const isCollapsed = useUIPreferencesStore((state) => state.cardCollapsed.appMap)
  const toggleCardCollapsed = useUIPreferencesStore((state) => state.toggleCardCollapsed)

  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [avatarPositions, setAvatarPositions] = useState<Record<string, AvatarPosition>>({})
  const initializedRef = useRef<Set<string>>(new Set())

  // Buat stable color index per user_id
  const userColorMap = useRef<Record<string, number>>({})
  onlineUsers.forEach((user, i) => {
    if (userColorMap.current[user.user_id] === undefined) {
      userColorMap.current[user.user_id] = Object.keys(userColorMap.current).length % AVATAR_COLORS.length
    }
  })

  const getCardCenter = (pageIndex: number): { x: number; y: number } | null => {
    const card = cardRefs.current[pageIndex]
    const container = containerRef.current
    if (!card || !container) return null
    const cardRect = card.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return {
      x: cardRect.left - containerRect.left + cardRect.width / 2,
      y: cardRect.top - containerRect.top + cardRect.height / 2,
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setAvatarPositions((prev) => {
        const next = { ...prev }
        onlineUsers.forEach((user) => {
          const pageIndex = resolvePageIndex(user.page_path)
          if (pageIndex === -1) return
          const center = getCardCenter(pageIndex)
          if (!center) return

          const usersOnSamePage = onlineUsers.filter(
            (u) => resolvePageIndex(u.page_path) === pageIndex
          )
          const userIndexOnPage = usersOnSamePage.findIndex(
            (u) => u.user_id === user.user_id
          )
          const offsetX = (userIndexOnPage - (usersOnSamePage.length - 1) / 2) * 30

          next[user.user_id] = {
            x: center.x + offsetX,
            y: center.y + 22,
            pageIndex,
          }
          initializedRef.current.add(user.user_id)
        })

        Object.keys(next).forEach((userId) => {
          if (!onlineUsers.find((u) => u.user_id === userId)) {
            delete next[userId]
            initializedRef.current.delete(userId)
            delete userColorMap.current[userId]
          }
        })

        return next
      })
    }, 50)

    return () => clearTimeout(timer)
  }, [onlineUsers])

  useEffect(() => {
    const handleResize = () => {
      setAvatarPositions((prev) => {
        if (Object.keys(prev).length === 0) return prev
        const next = { ...prev }
        onlineUsers.forEach((user) => {
          const pageIndex = resolvePageIndex(user.page_path)
          if (pageIndex === -1) return
          const center = getCardCenter(pageIndex)
          if (!center || !next[user.user_id]) return
          next[user.user_id] = { ...next[user.user_id], x: center.x, y: center.y + 22 }
        })
        return next
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [onlineUsers])

  const totalOnline = onlineUsers.length
  const activePageIndices = new Set(
    onlineUsers.map((u) => resolvePageIndex(u.page_path)).filter((i) => i !== -1)
  )

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <button
        onClick={() => toggleCardCollapsed('appMap')}
        className={`flex items-center justify-between w-full group ${isCollapsed ? '' : 'mb-5'}`}
      >
        <div className="flex items-center gap-2">
          <RadarChartOutlined className="text-gray-500 dark:text-gray-400 text-base" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">
            Denah Aplikasi
          </h3>
          {totalOnline > 0 && (
            <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-green-200 dark:border-green-800">
              {totalOnline} online
            </span>
          )}
        </div>
        <DownOutlined
          className="text-gray-400 dark:text-gray-500 text-xs transition-transform duration-300 group-hover:text-gray-600 dark:group-hover:text-gray-300"
          style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Collapsible content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isCollapsed ? 0 : 2000, opacity: isCollapsed ? 0 : 1 }}
      >

      {/* Relative container untuk overlay avatar */}
      <div ref={containerRef} className="relative">
        {/* Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {PAGE_MAP.map(({ path, label, Icon }, index) => {
            const isActive = activePageIndices.has(index)
            return (
              <div
                key={path}
                ref={(el) => { cardRefs.current[index] = el }}
                className={`relative flex flex-col items-center justify-start gap-2 rounded-xl p-4 border transition-all duration-300 min-h-[90px] ${
                  isActive
                    ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <Icon
                  className={`text-xl mt-1 ${
                    isActive
                      ? 'text-gray-800 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold text-center leading-tight ${
                    isActive
                      ? 'text-gray-800 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {label}
                </span>
                {/* Placeholder space untuk avatar */}
                <div className="h-7" />
              </div>
            )
          })}
        </div>

        {/* Avatar overlay */}
        {onlineUsers.map((user) => {
          const pos = avatarPositions[user.user_id]
          const isMe = user.user_id === currentUserId
          const isInitialized = initializedRef.current.has(user.user_id)
          const colorIndex = userColorMap.current[user.user_id] ?? 0
          const avatarBg = isMe ? 'bg-blue-600' : AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
          const radarBg = isMe ? 'bg-blue-400' : RADAR_COLORS[colorIndex % RADAR_COLORS.length]

          if (!pos) return null

          return (
            <div
              key={user.user_id}
              title={`${user.full_name}${isMe ? ' (Anda)' : ''}`}
              className="absolute flex flex-col items-center gap-0.5 pointer-events-none z-10"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
                transition: isInitialized
                  ? 'left 900ms cubic-bezier(0.45, 0, 0.55, 1), top 900ms cubic-bezier(0.45, 0, 0.55, 1)'
                  : 'none',
              }}
            >
              {/* Radar ripple rings */}
              <div className="relative flex items-center justify-center">
                {/* Ring terluar — paling lambat, paling transparan */}
                <span
                  className={`absolute rounded-full ${radarBg} opacity-20 animate-ping`}
                  style={{ width: 36, height: 36, animationDuration: '1s', animationDelay: '0.4s' }}
                />
                {/* Ring tengah */}
                <span
                  className={`absolute rounded-full ${radarBg} opacity-30 animate-ping`}
                  style={{ width: 28, height: 28, animationDuration: '1s', animationDelay: '0.2s' }}
                />
                {/* Avatar lingkaran */}
                <div
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white z-10 ${avatarBg} ring-2 ring-white dark:ring-gray-800`}
                >
                  {user.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      </div>{/* end collapsible */}
    </div>
  )
}
