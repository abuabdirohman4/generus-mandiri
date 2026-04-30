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
} from '@ant-design/icons'
import { usePresenceStore } from '@/stores/usePresenceStore'
import { useUserProfileStore } from '@/stores/userProfileStore'

const PAGE_MAP = [
  { path: '/home',          label: 'Home',         Icon: HomeOutlined },
  { path: '/absensi',       label: 'Absensi',      Icon: CheckSquareOutlined },
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

export default function AppMap() {
  const onlineUsers = usePresenceStore((state) => state.onlineUsers)
  const { profile } = useUserProfileStore()
  const currentUserId = profile?.id

  // Group users by page, matching prefix so '/users/siswa/123' maps to '/users/siswa'
  const usersByPage = PAGE_MAP.map((page) => ({
    ...page,
    users: onlineUsers.filter(
      (u) => u.page_path === page.path || u.page_path.startsWith(page.path + '/')
    ),
  }))

  const totalOnline = onlineUsers.length

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <RadarChartOutlined className="text-blue-500" />
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">
          Denah Aplikasi
        </h3>
        {totalOnline > 0 && (
          <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            {totalOnline} online
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {usersByPage.map(({ path, label, Icon, users }) => {
          const hasUsers = users.length > 0
          return (
            <div
              key={path}
              className={`relative flex flex-col items-center gap-2 rounded-xl p-3 border transition-all ${
                hasUsers
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-50'
              }`}
            >
              {/* Page Icon */}
              <Icon
                className={`text-xl ${
                  hasUsers
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              />

              {/* Page Label */}
              <span
                className={`text-[10px] font-semibold text-center leading-tight ${
                  hasUsers
                    ? 'text-gray-700 dark:text-gray-200'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {label}
              </span>

              {/* User Avatars */}
              {hasUsers && (
                <div className="flex flex-wrap justify-center gap-1 mt-1">
                  {users.map((user) => {
                    const isMe = user.user_id === currentUserId
                    return (
                      <div
                        key={user.user_id}
                        title={`${user.full_name}${isMe ? ' (Anda)' : ''}`}
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold border cursor-default ${
                          isMe
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                        }`}
                      >
                        {user.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
