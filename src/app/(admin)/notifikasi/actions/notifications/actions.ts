'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient, createAuthClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { canSendNotification, isSuperAdmin } from '@/lib/accessControl'
import { logActivity } from '@/lib/activityLogger'
import { validateNotificationInput, resolveTargetScopeForSender, validateUpdateNotificationInput } from './logic'
import {
  insertNotification,
  insertRecipients,
  fetchRecipientProfileIds,
  fetchMyNotifications,
  countUnread,
  markRead,
  markAllRead,
  dismiss,
  fetchSentNotifications,
  fetchNotificationRecipients,
  deleteNotification as dbDeleteNotification,
  updateNotification as dbUpdateNotification,
  resetRecipientsUnread,
  fetchNotificationDetail,
} from './queries'
import type { SendNotificationInput, UpdateNotificationInput, NotificationTargetScope } from '@/types/notification'
import { isPromotionCtaNotification } from '@/lib/utils/notificationUtils'

export async function sendNotification(input: SendNotificationInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, message: 'Profil tidak ditemukan' }
    if (!canSendNotification(profile)) return { success: false, message: 'Tidak memiliki izin untuk mengirim notifikasi' }

    const validation = validateNotificationInput(input)
    if (!validation.ok) return { success: false, message: validation.error }

    const scopeResult = resolveTargetScopeForSender(profile, input.target)
    if (!scopeResult.ok) return { success: false, message: scopeResult.error }

    const adminClient = await createAdminClient()

    // Security guard: only superadmin may use daerah_ids (multi-daerah targeting)
    if (input.target.daerah_ids?.length && !isSuperAdmin(profile)) {
      return { success: false, message: 'Tidak memiliki izin memilih banyak daerah' }
    }

    // Security guard: Admin Daerah cannot send personal notif to users outside their daerah
    if (
      profile.role === 'admin' &&
      profile.daerah_id &&
      input.target.recipient_ids?.length
    ) {
      const { data: validProfiles } = await adminClient
        .from('profiles')
        .select('id')
        .in('id', input.target.recipient_ids)
        .eq('daerah_id', profile.daerah_id)
      const validCount = validProfiles?.length ?? 0
      if (validCount !== input.target.recipient_ids.length) {
        return { success: false, message: 'Ada penerima di luar daerah Anda' }
      }
    }

    // Resolve recipients
    const recipientIds = await fetchRecipientProfileIds(adminClient, scopeResult.scope!, user.id)
    if (recipientIds.length === 0) return { success: false, message: 'Tidak ada penerima ditemukan untuk scope yang dipilih' }

    // Insert notification
    const { data: notif, error: notifError } = await insertNotification(adminClient, {
      title: input.title.trim(),
      body: input.body.trim(),
      type: input.type ?? 'info',
      target_scope: scopeResult.scope!,
      sender_id: profile.id,
      sender_daerah_id: profile.daerah_id ?? null,
      sender_desa_id: profile.desa_id ?? null,
      sender_kelompok_id: profile.kelompok_id ?? null,
      action_url: input.action_url ?? null,
      action_label: input.action_label ?? null,
      display_config: input.display_config ?? null,
    })
    if (notifError || !notif) return { success: false, message: 'Gagal menyimpan notifikasi' }

    // Fan-out recipients
    const recipientRows = recipientIds.map((id: string) => ({
      notification_id: notif.id,
      recipient_id: id,
    }))
    await insertRecipients(adminClient, recipientRows)

    // Log activity
    await logActivity({
      userId: user.id,
      action: 'send_notification',
      entityType: 'notification',
      entityId: notif.id,
      entityLabel: input.title,
      metadata: { recipientCount: recipientIds.length, scope: scopeResult.scope },
    })

    revalidatePath('/notifikasi')
    return { success: true, data: { id: notif.id, recipientCount: recipientIds.length }, message: `Notifikasi berhasil dikirim ke ${recipientIds.length} pengguna` }
  } catch (error) {
    return { success: false, message: 'Terjadi kesalahan' }
  }
}

export async function getMyNotifications(opts: { limit?: number; onlyUnread?: boolean } = {}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, data: [], message: 'Tidak terautentikasi' }

    // Use profile id for recipient queries
    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, data: [], message: 'Profil tidak ditemukan' }

    // Read via admin client (filtered by recipient_id in query) to avoid RLS
    // edge-cases on the notifications/profiles joins. Auth + recipient_id filter
    // keep this scoped to the current user's own rows.
    const adminClient = await createAdminClient()
    const notifications = await fetchMyNotifications(adminClient, profile.id, opts)
    return { success: true, data: notifications, message: '' }
  } catch {
    return { success: false, data: [], message: 'Gagal mengambil notifikasi' }
  }
}

export async function getUnreadCount() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, data: 0, message: '' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, data: 0, message: '' }

    const adminClient = await createAdminClient()
    const count = await countUnread(adminClient, profile.id)
    return { success: true, data: count, message: '' }
  } catch {
    return { success: false, data: 0, message: '' }
  }
}

export async function getSentNotifications(opts: { limit?: number } = {}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, data: [], message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, data: [], message: 'Profil tidak ditemukan' }
    if (!canSendNotification(profile)) return { success: false, data: [], message: 'Tidak memiliki izin' }

    const adminClient = await createAdminClient()
    const sent = await fetchSentNotifications(adminClient, profile.id, opts.limit ?? 20, isSuperAdmin(profile))
    return { success: true, data: sent, message: '' }
  } catch {
    return { success: false, data: [], message: 'Gagal mengambil riwayat terkirim' }
  }
}

export async function getNotificationRecipients(notificationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, data: [], message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, data: [], message: 'Profil tidak ditemukan' }
    if (!canSendNotification(profile)) return { success: false, data: [], message: 'Tidak memiliki izin' }

    const adminClient = await createAdminClient()
    const recipients = await fetchNotificationRecipients(adminClient, notificationId, profile.id, isSuperAdmin(profile))
    return { success: true, data: recipients, message: '' }
  } catch {
    return { success: false, data: [], message: 'Gagal mengambil daftar penerima' }
  }
}

export async function markNotificationRead(ids: string[]) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, message: 'Profil tidak ditemukan' }

    await markRead(supabase, profile.id, ids)
    return { success: true, message: '' }
  } catch {
    return { success: false, message: 'Gagal menandai notifikasi' }
  }
}

export async function markAllNotificationsRead() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, message: 'Profil tidak ditemukan' }

    await markAllRead(supabase, profile.id)
    revalidatePath('/notifikasi')
    return { success: true, message: 'Semua notifikasi ditandai telah dibaca' }
  } catch {
    return { success: false, message: 'Gagal menandai notifikasi' }
  }
}

export async function dismissNotification(notificationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, message: 'Profil tidak ditemukan' }

    await dismiss(supabase, profile.id, notificationId)
    return { success: true, message: '' }
  } catch {
    return { success: false, message: 'Gagal menutup notifikasi' }
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, message: 'Profil tidak ditemukan' }
    if (!canSendNotification(profile)) return { success: false, message: 'Tidak memiliki izin' }

    const adminClient = await createAdminClient()
    const { error } = await dbDeleteNotification(adminClient, notificationId, profile.id, isSuperAdmin(profile))
    if (error) return { success: false, message: 'Gagal menghapus notifikasi' }

    revalidatePath('/notifikasi')
    return { success: true, message: 'Notifikasi berhasil dihapus' }
  } catch {
    return { success: false, message: 'Terjadi kesalahan' }
  }
}

export async function updateNotification(notificationId: string, input: UpdateNotificationInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, message: 'Profil tidak ditemukan' }
    if (!canSendNotification(profile)) return { success: false, message: 'Tidak memiliki izin' }

    const validation = validateUpdateNotificationInput(input)
    if (!validation.ok) return { success: false, message: validation.error }

    const adminClient = await createAdminClient()

    const { error } = await dbUpdateNotification(adminClient, notificationId, profile.id, input, isSuperAdmin(profile))
    if (error) return { success: false, message: 'Gagal memperbarui notifikasi' }

    // Reset all recipients to unread so they see the updated content
    await resetRecipientsUnread(adminClient, notificationId)

    revalidatePath('/notifikasi')
    return { success: true, message: 'Notifikasi berhasil diperbarui' }
  } catch {
    return { success: false, message: 'Terjadi kesalahan' }
  }
}

export async function getNotificationDetail(notificationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, data: null, message: 'Tidak terautentikasi' }

    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, data: null, message: 'Profil tidak ditemukan' }

    const adminClient = await createAdminClient()
    const notif = await fetchNotificationDetail(adminClient, notificationId, profile.id)
    if (!notif) return { success: false, data: null, message: 'Notifikasi tidak ditemukan' }

    // Mark as read
    await markRead(adminClient, profile.id, [notificationId])

    return { success: true, data: notif, message: '' }
  } catch {
    return { success: false, data: null, message: 'Gagal mengambil detail notifikasi' }
  }
}

export async function previewRecipientCount(target: NotificationTargetScope) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user) return { success: false, count: 0 }

    const profile = await getCurrentUserProfile()
    if (!profile || !canSendNotification(profile)) return { success: false, count: 0 }

    const scopeResult = resolveTargetScopeForSender(profile, target)
    if (!scopeResult.ok) return { success: false, count: 0 }

    const adminClient = await createAdminClient()
    const ids = await fetchRecipientProfileIds(adminClient, scopeResult.scope!, user.id)
    return { success: true, count: ids.length }
  } catch {
    return { success: false, count: 0 }
  }
}

export async function dismissPromotionCtaNotifications() {
  try {
    const { success, data: notifications } = await getMyNotifications({ onlyUnread: false })
    if (!success || !notifications) return { success: false, message: 'Gagal mengambil notifikasi' }

    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, message: 'Profil tidak ditemukan' }

    let dismissedCount = 0
    for (const notif of notifications) {
      if (!notif.is_dismissed && isPromotionCtaNotification(notif)) {
        await dismiss(supabase, profile.id, notif.id)
        dismissedCount++
      }
    }
    
    return { success: true, count: dismissedCount, message: '' }
  } catch (error) {
    return { success: false, message: 'Terjadi kesalahan saat dismiss notifikasi naik kelas' }
  }
}

