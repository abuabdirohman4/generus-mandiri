'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useNotifications } from '@/hooks/useNotifications'
import { useUserProfile } from '@/stores/userProfileStore'
import { canSendNotification } from '@/lib/accessControl'
import { getSentNotifications } from './actions'
import Button from '@/components/ui/button/Button'
import KirimBroadcastForm from './components/KirimBroadcastForm'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays === 1) return 'Kemarin'
  if (diffDays < 7) return `${diffDays} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SkeletonItem() {
  return (
    <div className="flex items-start gap-3 p-4 animate-pulse">
      <div className="mt-1 h-2 w-2 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    </div>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <svg
        className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
      <p className="text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
    </div>
  )
}

type TabKey = 'received' | 'sent'

export default function NotifikasiPage() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead, mutate } = useNotifications()
  const { profile } = useUserProfile()
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('received')

  const canSend = profile ? canSendNotification(profile) : false

  // Sent history — only fetched for senders, when the tab is active
  const { data: sentRes, isLoading: sentLoading, mutate: mutateSent } = useSWR(
    canSend && activeTab === 'sent' ? 'notifications:sent' : null,
    () => getSentNotifications()
  )
  const sentNotifications = sentRes?.data ?? []

  const handleMarkAllRead = async () => {
    await markAllRead()
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    mutate()
    mutateSent()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifikasi</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {unreadCount} belum dibaca
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'received' && unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Tandai semua dibaca
            </Button>
          )}
          {canSend && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(prev => !prev)}
            >
              {showForm ? 'Tutup Form' : 'Kirim Notifikasi'}
            </Button>
          )}
        </div>
      </div>

      {/* Broadcast form */}
      {canSend && showForm && (
        <KirimBroadcastForm onSuccess={handleFormSuccess} />
      )}

      {/* Tabs (sender only) */}
      {canSend && (
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'received'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Diterima
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'sent'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Riwayat Terkirim
          </button>
        </div>
      )}

      {/* Received list */}
      {activeTab === 'received' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonItem key={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              title="Belum ada notifikasi"
              subtitle="Notifikasi yang kamu terima akan muncul di sini."
            />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map(notif => (
                <li
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) {
                      markRead([notif.id])
                    }
                  }}
                  className={`flex items-start gap-3 p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    !notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  {/* Unread indicator */}
                  <div className="mt-1.5 flex-shrink-0">
                    {!notif.is_read ? (
                      <span className="block h-2 w-2 rounded-full bg-blue-500" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        !notif.is_read
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      {notif.sender_name && (
                        <>
                          <span>{notif.sender_name}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>{formatRelativeTime(notif.created_at)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Sent history (sender only) */}
      {canSend && activeTab === 'sent' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {sentLoading ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonItem key={i} />
              ))}
            </div>
          ) : sentNotifications.length === 0 ? (
            <EmptyState
              title="Belum ada broadcast terkirim"
              subtitle="Notifikasi yang kamu kirim akan muncul di sini."
            />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {sentNotifications.map(sent => (
                <li key={sent.id} className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug text-gray-900 dark:text-white">
                      {sent.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {sent.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <span>Terkirim ke {sent.recipient_count} pengguna</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(sent.created_at)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
