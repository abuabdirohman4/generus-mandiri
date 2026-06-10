/**
 * Layer 1 — DB queries untuk notifications.
 * NO 'use server'. Terima supabase client sebagai parameter.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationTargetScope, NotificationWithStatus, NotificationSentSummary } from '@/types/notification'

// Insert a notification row, return it
export async function insertNotification(
  supabase: SupabaseClient,
  row: {
    title: string
    body: string
    type: string
    target_scope: NotificationTargetScope
    sender_id: string
    sender_daerah_id?: string | null
    sender_desa_id?: string | null
    sender_kelompok_id?: string | null
  }
) {
  return await supabase.from('notifications').insert(row).select().single()
}

// Bulk insert recipient rows
export async function insertRecipients(
  supabase: SupabaseClient,
  rows: { notification_id: string; recipient_id: string }[]
) {
  if (rows.length === 0) return { data: [], error: null }
  return await supabase.from('notification_recipients').insert(rows)
}

// Resolve profile IDs in scope (fans out by org hierarchy)
// Reuses pattern from naik-kelas/actions/classes/queries.ts resolveKelompokIdsInScope
export async function fetchRecipientProfileIds(
  supabase: SupabaseClient,
  scope: NotificationTargetScope,
  excludeUserId?: string
): Promise<string[]> {
  let query = supabase.from('profiles').select('id')

  // Apply org scope filter
  if (scope.kelompok_id) {
    query = query.eq('kelompok_id', scope.kelompok_id)
  } else if (scope.desa_id) {
    query = query.eq('desa_id', scope.desa_id)
  } else if (scope.daerah_id) {
    query = query.eq('daerah_id', scope.daerah_id)
  }
  // null/empty = all (superadmin broadcast)

  // Role filter
  if (scope.roles && scope.roles.length > 0) {
    query = query.in('role', scope.roles)
  }

  const { data, error } = await query
  if (error || !data) return []

  const ids = data.map((p: { id: string }) => p.id)
  if (excludeUserId) return ids.filter((id: string) => id !== excludeUserId)
  return ids
}

// Fetch notifications for a user (joined with recipient status)
export async function fetchMyNotifications(
  supabase: SupabaseClient,
  userId: string,
  opts: { limit?: number; onlyUnread?: boolean } = {}
): Promise<NotificationWithStatus[]> {
  const limit = opts.limit ?? 20

  let query = supabase
    .from('notification_recipients')
    .select(`
      is_read,
      read_at,
      is_dismissed,
      notifications!inner (
        id,
        title,
        body,
        type,
        created_at,
        sender:sender_id (
          full_name
        )
      )
    `)
    .eq('recipient_id', userId)
    .order('created_at', { referencedTable: 'notifications', ascending: false })
    .limit(limit)

  if (opts.onlyUnread) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.notifications.id,
    title: row.notifications.title,
    body: row.notifications.body,
    type: row.notifications.type,
    created_at: row.notifications.created_at,
    sender_name: row.notifications.sender?.full_name,
    is_read: row.is_read,
    read_at: row.read_at,
    is_dismissed: row.is_dismissed,
  }))
}

// Count unread notifications for a user
export async function countUnread(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notification_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)

  if (error) return 0
  return count ?? 0
}

// Mark specific notifications as read
export async function markRead(supabase: SupabaseClient, userId: string, ids: string[]) {
  if (ids.length === 0) return { error: null }
  return await supabase
    .from('notification_recipients')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .in('notification_id', ids)
}

// Mark all notifications as read for a user
export async function markAllRead(supabase: SupabaseClient, userId: string) {
  return await supabase
    .from('notification_recipients')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('is_read', false)
}

// Dismiss a notification (hide banner)
export async function dismiss(supabase: SupabaseClient, userId: string, notificationId: string) {
  return await supabase
    .from('notification_recipients')
    .update({ is_dismissed: true })
    .eq('recipient_id', userId)
    .eq('notification_id', notificationId)
}


// Fetch notifications sent by a user (sender's own broadcasts), with recipient count
export async function fetchSentNotifications(
  supabase: SupabaseClient,
  senderId: string,
  limit = 20
): Promise<NotificationSentSummary[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, created_at, notification_recipients(count)')
    .eq('sender_id', senderId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    created_at: row.created_at,
    recipient_count: row.notification_recipients?.[0]?.count ?? 0,
  }))
}
