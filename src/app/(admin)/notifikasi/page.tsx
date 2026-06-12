'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useNotifications } from '@/hooks/useNotifications'
import { useUserProfile } from '@/stores/userProfileStore'
import { canSendNotification } from '@/lib/accessControl'
import { getSentNotifications, deleteNotification, updateNotification, getNotificationRecipients } from './actions'
import Button from '@/components/ui/button/Button'
import Spinner from '@/components/ui/spinner/Spinner'
import KirimBroadcastForm from './components/KirimBroadcastForm'
import type { NotificationSentSummary, NotificationRecipientStatus } from '@/types/notification'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import RichTextEditor from '@/components/ui/rich-text-editor/RichTextEditor'
import { stripHtml } from '@/lib/htmlText'

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

type NotifVariant = 'info' | 'success' | 'warning'

function resolveVariant(type: string): NotifVariant {
  if (type === 'success') return 'success'
  if (type === 'warning') return 'warning'
  return 'info'
}

const VARIANT_STYLES: Record<NotifVariant, {
  border: string
  bg: string
  iconColor: string
  icon: React.ReactNode
}> = {
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    iconColor: 'text-blue-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    border: 'border-l-green-500',
    bg: 'bg-green-50 dark:bg-green-900/10',
    iconColor: 'text-green-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/10',
    iconColor: 'text-amber-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
}

function SkeletonItem() {
  return (
    <div className="flex items-start gap-3 p-4 animate-pulse border-l-4 border-l-gray-200 dark:border-l-gray-700">
      <div className="mt-0.5 h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
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

function RecipientsList({ notificationId, isCtaRequired }: { notificationId: string; isCtaRequired: boolean }) {
  const { data, isLoading } = useSWR(
    `notifications:recipients:${notificationId}`,
    () => getNotificationRecipients(notificationId),
    { revalidateOnFocus: false }
  )
  const recipients: NotificationRecipientStatus[] = data?.data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <Spinner size={14} colorClass="border-gray-400" />
        <span>Memuat penerima...</span>
      </div>
    )
  }

  if (recipients.length === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">Tidak ada data penerima.</p>
  }

  return (
    <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
      {recipients.map(r => {
        const status = isCtaRequired
          ? (r.is_dismissed
              ? { label: 'Sudah ditindak', cls: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' }
              : { label: 'Belum ditindak', cls: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' })
          : (r.is_read
              ? { label: 'Sudah baca', cls: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20' }
              : { label: 'Belum baca', cls: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' })
        return (
          <li key={r.recipient_id} className="flex items-center justify-between pr-3 py-1.5 text-xs">
            <span className="text-gray-700 dark:text-gray-300 truncate">{r.full_name}</span>
            <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
              {status.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function NotifikasiPage() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead, dismiss, mutate } = useNotifications()
  const { profile } = useUserProfile()
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('received')
  const [editingNotif, setEditingNotif] = useState<NotificationSentSummary | null>(null)
  const [editForm, setEditForm] = useState({ title: '', body: '', type: 'info' as string })
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const router = useRouter()

  const handleOpenDetail = useCallback((id: string, isRead: boolean) => {
    if (!isRead) markRead([id])
    setNavigatingId(id)
    router.push(`/notifikasi/${id}`)
  }, [router, markRead])

  const canSend = profile ? canSendNotification(profile) : false

  const { data: sentRes, isLoading: sentLoading, mutate: mutateSent } = useSWR(
    canSend && activeTab === 'sent' ? 'notifications:sent' : null,
    () => getSentNotifications()
  )
  const sentNotifications = sentRes?.data ?? []

  const handleFormSuccess = () => {
    setShowForm(false)
    mutate()
    mutateSent()
  }

  const handleDelete = async (id: string) => {
    setDeleteLoadingId(id)
    const res = await deleteNotification(id)
    setDeleteLoadingId(null)
    if (res.success) {
      setConfirmDeleteId(null)
      mutateSent()
    }
  }

  const handleEditStart = (notif: NotificationSentSummary) => {
    setEditingNotif(notif)
    setEditForm({ title: notif.title, body: notif.body, type: notif.type })
  }

  const handleEditSave = async () => {
    if (!editingNotif) return
    setEditLoading(true)
    const res = await updateNotification(editingNotif.id, {
      title: editForm.title,
      body: editForm.body,
      type: editForm.type as 'info' | 'success' | 'warning',
    })
    setEditLoading(false)
    if (res.success) {
      setEditingNotif(null)
      mutateSent()
      mutate()
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8 space-y-4">
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
              <Button variant="outline" size="sm" onClick={() => markAllRead()}>
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
                {notifications.map(notif => {
                  const variant = resolveVariant(notif.type)
                  const vs = VARIANT_STYLES[variant]
                  return (
                    <li key={notif.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(notif.id, notif.is_read)}
                        disabled={navigatingId === notif.id}
                        className={`relative flex w-full text-left items-start gap-3 p-4 pl-4 border-l-4 transition-colors hover:brightness-95 dark:hover:brightness-110 ${vs.border} ${!notif.is_read ? vs.bg : 'bg-white dark:bg-gray-900'}`}
                      >
                        {/* Type icon */}
                        <div className={`mt-0.5 shrink-0 ${vs.iconColor}`}>
                          {vs.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-start gap-2">
                            <p className={`text-sm font-semibold leading-snug flex-1 ${!notif.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="mt-1 block h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {stripHtml(notif.body)}
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

                        {/* Dismiss X */}
                        {/* <button
                          type="button"
                          onClick={e => { e.stopPropagation(); dismiss(notif.id) }}
                          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
                          title="Tutup"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button> */}

                        {/* Loading spinner saat navigasi */}
                        {navigatingId === notif.id && (
                          <span className="absolute top-1/2 right-3 -translate-y-1/2">
                            <Spinner size={16} colorClass="border-gray-400" />
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
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
                {sentNotifications.map(sent => {
                  const variant = resolveVariant(sent.type)
                  const vs = VARIANT_STYLES[variant]
                  return (
                    <li key={sent.id} className={`border-l-4 ${vs.border} ${vs.bg}`}>
                      {editingNotif?.id === sent.id ? (
                        <div className="p-4 space-y-3">
                          <input
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                            value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Judul"
                          />
                          <RichTextEditor
                            value={editForm.body}
                            onChange={val => setEditForm(f => ({ ...f, body: val }))}
                            placeholder="Isi pesan"
                            rows={5}
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="primary" onClick={handleEditSave} disabled={editLoading}>
                              {editLoading ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingNotif(null)}>
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                          <div className={`mt-0.5 shrink-0 ${vs.iconColor}`}>
                            {vs.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                              {sent.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {stripHtml(sent.body)}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                              {sent.sender_name && (
                                <>
                                  <span className="text-gray-600 dark:text-gray-300">{sent.sender_name}</span>
                                  <span aria-hidden="true">·</span>
                                </>
                              )}
                              <span>Terkirim {sent.recipient_count}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-green-600 dark:text-green-400">Dibaca {sent.read_count}</span>
                              {sent.display_config?.dismiss === 'cta_required' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-blue-600 dark:text-blue-400">Selesai {sent.dismissed_count}</span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span>{formatRelativeTime(sent.created_at)}</span>
                              {sent.edited_at && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="italic">diedit</span>
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedId(prev => prev === sent.id ? null : sent.id)}
                              className="mt-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {expandedId === sent.id ? 'Sembunyikan penerima' : 'Lihat penerima'}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditStart(sent)}
                              className="text-xs px-2 py-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sent.id)}
                              disabled={deleteLoadingId === sent.id}
                              className="text-xs px-2 py-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                              {deleteLoadingId === sent.id ? '...' : 'Hapus'}
                            </button>
                          </div>
                          </div>
                          {expandedId === sent.id && (
                            <div className="ml-9 mt-2">
                              <RecipientsList notificationId={sent.id} isCtaRequired={sent.display_config?.dismiss === 'cta_required'} />
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Hapus Notifikasi"
        message="Notifikasi ini akan dihapus dari semua inbox penerima."
        confirmText="Hapus"
        isDestructive
        isLoading={deleteLoadingId !== null}
      />
    </div>
  )
}
