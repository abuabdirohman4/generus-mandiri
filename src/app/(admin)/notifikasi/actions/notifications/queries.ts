/**
 * Layer 1 — DB queries untuk notifications.
 * NO 'use server'. Terima supabase client sebagai parameter.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationTargetScope, NotificationWithStatus, NotificationSentSummary, UpdateNotificationInput, NotificationDisplayConfig, NotificationRecipientStatus } from '@/types/notification'
import { DEFAULT_DISPLAY_CONFIG } from '@/types/notification'

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
    action_url?: string | null
    action_label?: string | null
    display_config?: NotificationDisplayConfig | null
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
  // Personal: recipient_ids provided directly, skip org resolve
  if (scope.recipient_ids?.length) {
    const ids = scope.recipient_ids
    if (excludeUserId) return ids.filter((id: string) => id !== excludeUserId)
    return ids
  }

  let query = supabase.from('profiles').select('id')

  // Apply org scope filter
  if (scope.daerah_ids?.length) {
    query = query.in('daerah_id', scope.daerah_ids)
  } else if (scope.kelompok_id) {
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
        edited_at,
        action_url,
        action_label,
        display_config,
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
    edited_at: row.notifications.edited_at ?? null,
    action_url: row.notifications.action_url ?? null,
    action_label: row.notifications.action_label ?? null,
    display_config: (row.notifications.display_config as NotificationDisplayConfig | null) ?? DEFAULT_DISPLAY_CONFIG,
  })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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


// Fetch notifications sent by a user (or all, for superadmin), with recipient count
export async function fetchSentNotifications(
  supabase: SupabaseClient,
  senderId: string,
  limit = 20,
  isSuperadmin = false
): Promise<NotificationSentSummary[]> {
  let query = supabase
    .from('notifications')
    .select('id, title, body, type, created_at, edited_at, display_config, sender:sender_id(full_name), notification_recipients(is_read, is_dismissed)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!isSuperadmin) {
    query = query.eq('sender_id', senderId)
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row: any) => {
    const recipients: { is_read: boolean; is_dismissed: boolean }[] = row.notification_recipients ?? []
    const rawSender = row.sender
    const senderName = Array.isArray(rawSender) ? rawSender[0]?.full_name : rawSender?.full_name
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      type: row.type ?? 'info',
      created_at: row.created_at,
      edited_at: row.edited_at ?? null,
      recipient_count: recipients.length,
      read_count: recipients.filter(r => r.is_read).length,
      dismissed_count: recipients.filter(r => r.is_dismissed).length,
      display_config: (row.display_config as NotificationDisplayConfig | null) ?? DEFAULT_DISPLAY_CONFIG,
      sender_name: isSuperadmin ? (senderName ?? undefined) : undefined,
    }
  })
}

// Fetch per-recipient status for a sent notification (sender only, or superadmin)
export async function fetchNotificationRecipients(
  supabase: SupabaseClient,
  notificationId: string,
  senderId: string,
  isSuperadmin = false
): Promise<NotificationRecipientStatus[]> {
  // Verify ownership (superadmin bypasses)
  let ownershipQ = supabase.from('notifications').select('id').eq('id', notificationId)
  if (!isSuperadmin) ownershipQ = ownershipQ.eq('sender_id', senderId)
  const { data: notif } = await ownershipQ.single()
  if (!notif) return []

  const { data, error } = await supabase
    .from('notification_recipients')
    .select('recipient_id, is_read, read_at, is_dismissed, profiles:recipient_id(full_name)')
    .eq('notification_id', notificationId)
    .order('is_read', { ascending: true })

  if (error || !data) return []

  return data.map((row: any) => ({
    recipient_id: row.recipient_id,
    full_name: row.profiles?.full_name ?? 'Tidak diketahui',
    is_read: row.is_read,
    read_at: row.read_at ?? null,
    is_dismissed: row.is_dismissed,
  }))
}

// Hard delete a notification (sender only, or superadmin — cascades to notification_recipients)
export async function deleteNotification(supabase: SupabaseClient, notificationId: string, senderId: string, isSuperadmin = false) {
  let q = supabase.from('notifications').delete().eq('id', notificationId)
  if (!isSuperadmin) q = q.eq('sender_id', senderId)
  return await q
}

// Update notification title/body/type and set edited_at
export async function updateNotification(
  supabase: SupabaseClient,
  notificationId: string,
  senderId: string,
  input: UpdateNotificationInput,
  isSuperadmin = false
) {
  let q = supabase
    .from('notifications')
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      type: input.type ?? 'info',
      edited_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
  if (!isSuperadmin) q = q.eq('sender_id', senderId)
  return await q.select().single()
}

// Reset all recipients to unread after an edit
export async function resetRecipientsUnread(supabase: SupabaseClient, notificationId: string) {
  return await supabase
    .from('notification_recipients')
    .update({ is_read: false, read_at: null, is_dismissed: false })
    .eq('notification_id', notificationId)
}

// Fetch single notification detail for a recipient (marks as read should happen at action layer)
export async function fetchNotificationDetail(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
): Promise<(import('@/types/notification').NotificationWithStatus & { action_url: string | null; action_label: string | null }) | null> {
  const { data, error } = await supabase
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
        edited_at,
        action_url,
        action_label,
        display_config,
        sender:sender_id (
          full_name
        )
      )
    `)
    .eq('recipient_id', userId)
    .eq('notification_id', notificationId)
    .single()

  if (error || !data) return null

  const row = data as any
  return {
    id: row.notifications.id,
    title: row.notifications.title,
    body: row.notifications.body,
    type: row.notifications.type,
    created_at: row.notifications.created_at,
    edited_at: row.notifications.edited_at ?? null,
    action_url: row.notifications.action_url ?? null,
    action_label: row.notifications.action_label ?? null,
    display_config: (row.notifications.display_config as NotificationDisplayConfig | null) ?? DEFAULT_DISPLAY_CONFIG,
    sender_name: row.notifications.sender?.full_name,
    is_read: row.is_read,
    read_at: row.read_at,
    is_dismissed: row.is_dismissed,
  }
}
