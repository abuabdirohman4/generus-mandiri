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

  const notifications: NotificationWithStatus[] = listData?.data ?? []
  const unreadCount: number = countData?.data ?? 0

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
    await dismissNotification(notificationId)
    mutateList()
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    dismiss,
    mutate: () => { mutateList(); mutateCount() },
  }
}
