'use client'

import useSWR from 'swr'
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from '@/app/(admin)/notifikasi/actions'
import type { NotificationWithStatus } from '@/types/notification'
import { DEFAULT_DISPLAY_CONFIG } from '@/types/notification'

const NOTIFICATIONS_LIST_KEY = 'notifications:list'
const NOTIFICATIONS_UNREAD_KEY = 'notifications:unread'

export function useNotifications() {
  const { data: listData, mutate: mutateList, isLoading } = useSWR(
    NOTIFICATIONS_LIST_KEY,
    () => getMyNotifications({ limit: 20 }),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  )

  const { data: countData, mutate: mutateCount } = useSWR(
    NOTIFICATIONS_UNREAD_KEY,
    () => getUnreadCount(),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  )

  const allNotifications: NotificationWithStatus[] = listData?.data ?? []
  // showInList=false = hanya tampil sebagai banner/modal, tidak masuk inbox
  const notifications = allNotifications.filter(n => (n.display_config ?? DEFAULT_DISPLAY_CONFIG).showInList !== false)
  // unread count hanya dari notifikasi yg showInList (yang ada di inbox)
  const unreadCount: number = notifications.filter(n => !n.is_read).length

  async function markRead(ids: string[]) {
    await markNotificationRead(ids)
    mutateList()
    mutateCount()
  }

  async function markAllRead() {
    await markAllNotificationsRead()
    mutateList()
    mutateCount()
  }

  async function dismiss(notificationId: string) {
    // Optimistic: hide banner instantly, sync to server in background
    mutateList(
      (prev) => {
        if (!prev?.data) return prev
        return {
          ...prev,
          data: prev.data.map(n =>
            n.id === notificationId ? { ...n, is_dismissed: true, is_read: true } : n
          ),
        }
      },
      { revalidate: false }
    )
    mutateCount()
    dismissNotification(notificationId).then(() => { mutateList(); mutateCount() })
  }

  return {
    notifications,        // filtered: showInList=true only (for dropdown + list + banner)
    allNotifications,     // unfiltered: includes showInList=false (for modal)
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    dismiss,
    mutate: () => { mutateList(); mutateCount() },
  }
}
