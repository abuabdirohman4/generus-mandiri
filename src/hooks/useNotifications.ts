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

type ListResult = Awaited<ReturnType<typeof getMyNotifications>>
type CountResult = Awaited<ReturnType<typeof getUnreadCount>>

// Patch matching notification rows in the SWR cache shape ({ success, data: [], message })
function patchList(
  prev: ListResult | undefined,
  ids: Set<string>,
  patch: Partial<NotificationWithStatus>
): ListResult | undefined {
  if (!prev?.data) return prev
  return { ...prev, data: prev.data.map(n => ids.has(n.id) ? { ...n, ...patch } : n) }
}

// Derive the unread badge from a (possibly optimistic) list, same rule as unreadCount
function countFromList(list: ListResult | undefined): CountResult | undefined {
  if (!list?.data) return undefined
  const unread = list.data.filter(
    n => (n.display_config ?? DEFAULT_DISPLAY_CONFIG).showInList !== false && !n.is_read
  ).length
  return { success: true, data: unread, message: '' } as CountResult
}

export function useNotifications() {
  const { data: listData, mutate: mutateList, isLoading } = useSWR(
    NOTIFICATIONS_LIST_KEY,
    () => getMyNotifications({ limit: 20 }),
    {
      refreshInterval: 0, // sm-kt2j: notif ~monthly cadence, polling was pure egress waste
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const { data: countData, mutate: mutateCount } = useSWR(
    NOTIFICATIONS_UNREAD_KEY,
    () => getUnreadCount(),
    {
      refreshInterval: 0, // sm-kt2j: notif ~monthly cadence, polling was pure egress waste
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const allNotifications: NotificationWithStatus[] = listData?.data ?? []
  // showInList=false = hanya tampil sebagai banner/modal, tidak masuk inbox
  const notifications = allNotifications.filter(n => (n.display_config ?? DEFAULT_DISPLAY_CONFIG).showInList !== false)
  // unread count hanya dari notifikasi yg showInList (yang ada di inbox)
  const unreadCount: number = notifications.filter(n => !n.is_read).length

  async function markRead(ids: string[]) {
    const idSet = new Set(ids)
    const patch = { is_read: true } as Partial<NotificationWithStatus>
    const listPromise = mutateList(
      async () => {
        const res = await markNotificationRead(ids)
        if (!res?.success) throw new Error(res?.message || 'markRead failed')
        return patchList(listData, idSet, patch)
      },
      {
        optimisticData: (prev: ListResult | undefined) => patchList(prev, idSet, patch)!,
        rollbackOnError: true,
        revalidate: false,
        populateCache: true,
      }
    )
    mutateCount((prev) => countFromList(patchList(listData, idSet, patch)) ?? prev, { revalidate: false })
    try { await listPromise } catch { mutateCount() }
  }

  async function markAllRead() {
    const patchAll = (prev: ListResult | undefined): ListResult | undefined => {
      if (!prev?.data) return prev
      return { ...prev, data: prev.data.map(n => ({ ...n, is_read: true })) }
    }
    const listPromise = mutateList(
      async () => {
        const res = await markAllNotificationsRead()
        if (!res?.success) throw new Error(res?.message || 'markAllRead failed')
        return patchAll(listData)
      },
      {
        optimisticData: (prev: ListResult | undefined) => patchAll(prev)!,
        rollbackOnError: true,
        revalidate: false,
        populateCache: true,
      }
    )
    mutateCount(() => ({ success: true, data: 0, message: '' } as CountResult), { revalidate: false })
    try { await listPromise } catch { mutateCount() }
  }

  async function dismiss(notificationId: string) {
    const ids = new Set([notificationId])
    const patch = { is_dismissed: true, is_read: true } as Partial<NotificationWithStatus>
    // Tracked-mutation optimistic update: SWR discards any in-flight revalidation
    // that resolves during the mutation, so a stale is_dismissed=false fetch can't
    // overwrite the optimistic state. revalidate:false drops the stale read-after-write.
    const listPromise = mutateList(
      async () => {
        const res = await dismissNotification(notificationId)
        if (!res?.success) throw new Error(res?.message || 'dismiss failed')
        return patchList(listData, ids, patch)
      },
      {
        optimisticData: (prev: ListResult | undefined) => patchList(prev, ids, patch)!,
        rollbackOnError: true,
        revalidate: false,
        populateCache: true,
      }
    )
    mutateCount((prev) => countFromList(patchList(listData, ids, patch)) ?? prev, { revalidate: false })
    try { await listPromise } catch { mutateCount() }
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
