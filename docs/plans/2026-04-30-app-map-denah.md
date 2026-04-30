# App Map (Denah) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambahkan komponen `AppMap` ke halaman `/tracking` yang menampilkan grid semua halaman aplikasi beserta avatar user yang sedang berada di sana secara real-time.

**Architecture:** Satu komponen client-only `AppMap.tsx` yang consume `usePresenceStore` (sudah ada). Group `onlineUsers[]` by `page_path`, render tiap halaman sebagai kartu. Tidak ada perubahan backend, store, atau API.

**Tech Stack:** React 19, Next.js 15, Zustand (`usePresenceStore`), Tailwind CSS 4, `@ant-design/icons`

---

## Context Penting

- `usePresenceStore` di `src/stores/usePresenceStore.ts` expose `onlineUsers: OnlineUser[]`
- `OnlineUser` shape: `{ user_id, full_name, role, page_path, online_at }`
- `useUserProfileStore` expose `profile.id` untuk detect "diri sendiri"
- Halaman di-track via `page_path` yang sudah diisi oleh `usePresence` hook
- Icons: gunakan hanya `@ant-design/icons` — JANGAN `lucide-react`
- Date: gunakan `dayjs` — JANGAN `date-fns`

---

## Daftar Halaman (PAGE_MAP)

```typescript
const PAGE_MAP = [
  { path: '/home',          label: 'Home',         icon: 'HomeOutlined' },
  { path: '/absensi',       label: 'Absensi',      icon: 'CheckSquareOutlined' },
  { path: '/laporan',       label: 'Laporan',      icon: 'BarChartOutlined' },
  { path: '/users/siswa',   label: 'Siswa',        icon: 'TeamOutlined' },
  { path: '/users/guru',    label: 'Guru',         icon: 'UserOutlined' },
  { path: '/users/admin',   label: 'Admin',        icon: 'CrownOutlined' },
  { path: '/kelas',         label: 'Kelas',        icon: 'BookOutlined' },
  { path: '/organisasi',    label: 'Organisasi',   icon: 'ApartmentOutlined' },
  { path: '/rapot',         label: 'Rapot',        icon: 'FileTextOutlined' },
  { path: '/materi',        label: 'Materi',       icon: 'ReadOutlined' },
  { path: '/monitoring',    label: 'Monitoring',   icon: 'LineChartOutlined' },
  { path: '/kegiatan',      label: 'Kegiatan',     icon: 'CalendarOutlined' },
  { path: '/tahun-ajaran',  label: 'Tahun Ajaran', icon: 'FieldTimeOutlined' },
  { path: '/tracking',      label: 'Tracking',     icon: 'EyeOutlined' },
  { path: '/settings',      label: 'Pengaturan',   icon: 'SettingOutlined' },
]
```

---

### Task 1: Buat komponen `AppMap.tsx`

**Files:**
- Create: `src/app/(admin)/tracking/components/AppMap.tsx`

**Tidak ada test** — ini komponen presentational murni, tidak ada business logic.

**Step 1: Buat file dengan struktur dasar**

```tsx
'use client'

import {
  HomeOutlined, CheckSquareOutlined, BarChartOutlined,
  TeamOutlined, UserOutlined, CrownOutlined, BookOutlined,
  ApartmentOutlined, FileTextOutlined, ReadOutlined,
  LineChartOutlined, CalendarOutlined, FieldTimeOutlined,
  EyeOutlined, SettingOutlined, RadarChartOutlined,
} from '@ant-design/icons'
import { usePresenceStore } from '@/stores/usePresenceStore'
import { useUserProfileStore } from '@/stores/userProfileStore'

const PAGE_MAP = [
  { path: '/home',         label: 'Home',         Icon: HomeOutlined },
  { path: '/absensi',      label: 'Absensi',      Icon: CheckSquareOutlined },
  { path: '/laporan',      label: 'Laporan',      Icon: BarChartOutlined },
  { path: '/users/siswa',  label: 'Siswa',        Icon: TeamOutlined },
  { path: '/users/guru',   label: 'Guru',         Icon: UserOutlined },
  { path: '/users/admin',  label: 'Admin',        Icon: CrownOutlined },
  { path: '/kelas',        label: 'Kelas',        Icon: BookOutlined },
  { path: '/organisasi',   label: 'Organisasi',   Icon: ApartmentOutlined },
  { path: '/rapot',        label: 'Rapot',        Icon: FileTextOutlined },
  { path: '/materi',       label: 'Materi',       Icon: ReadOutlined },
  { path: '/monitoring',   label: 'Monitoring',   Icon: LineChartOutlined },
  { path: '/kegiatan',     label: 'Kegiatan',     Icon: CalendarOutlined },
  { path: '/tahun-ajaran', label: 'Tahun Ajaran', Icon: FieldTimeOutlined },
  { path: '/tracking',     label: 'Tracking',     Icon: EyeOutlined },
  { path: '/settings',     label: 'Pengaturan',   Icon: SettingOutlined },
]

export default function AppMap() {
  const onlineUsers = usePresenceStore((state) => state.onlineUsers)
  const { profile } = useUserProfileStore()
  const currentUserId = profile?.id

  // Group users by page_path
  // Catatan: user.page_path bisa '/users/siswa/123' — kita match prefix
  const usersByPage = PAGE_MAP.map((page) => ({
    ...page,
    users: onlineUsers.filter((u) =>
      u.page_path === page.path || u.page_path.startsWith(page.path + '/')
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
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
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
```

**Step 2: Verifikasi tidak ada error TypeScript**

```bash
npm run type-check 2>&1 | grep -i "appmap\|AppMap\|app-map" || echo "No errors for AppMap"
```

---

### Task 2: Pasang `AppMap` di halaman tracking

**Files:**
- Modify: `src/app/(admin)/tracking/page.tsx`

**Step 1: Baca file saat ini** — pastikan tahu posisi `<OnlinePresence />` sebelum edit.

**Step 2: Tambahkan import dan komponen**

Tambahkan import di bagian atas:
```tsx
import AppMap from './components/AppMap'
```

Tambahkan `<AppMap />` tepat di bawah `<OnlinePresence />`:
```tsx
{/* Real-time Presence */}
<OnlinePresence />

{/* Denah Aplikasi */}
<AppMap />
```

**Step 3: Verifikasi**

```bash
npm run type-check 2>&1 | grep -i "error" | head -20
```

Expected: tidak ada error baru.

---

## Verifikasi Manual (setelah implementasi)

1. Buka `/tracking` di browser
2. Pastikan grid 15 kartu halaman muncul
3. Login di browser/tab lain → avatar muncul di kartu halaman yang sedang dibuka
4. Navigasi ke halaman lain → avatar pindah ke kartu yang sesuai
5. Tutup tab → avatar hilang dari grid dalam beberapa detik
6. Kartu halaman yang kosong → tampil redup/grey, bukan disembunyikan

## Yang TIDAK Perlu Diubah

- `usePresenceStore.ts` — sudah cukup
- `usePresence.ts` — sudah cukup
- `OnlinePresence.tsx` — tetap ada, tidak diganti
- Tidak ada server action, API route, atau database baru
- Tidak ada package baru yang perlu diinstall
