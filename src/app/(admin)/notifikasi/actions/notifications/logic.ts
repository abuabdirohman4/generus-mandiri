import type { UserProfile } from '@/types/user'
import type { NotificationTargetScope, SendNotificationInput, UpdateNotificationInput } from '@/types/notification'

export function validateNotificationInput(input: SendNotificationInput): { ok: boolean; error?: string } {
  if (!input.title?.trim()) return { ok: false, error: 'Judul tidak boleh kosong' }
  if (input.title.length > 200) return { ok: false, error: 'Judul maksimal 200 karakter' }
  if (!input.body?.trim()) return { ok: false, error: 'Isi pesan tidak boleh kosong' }
  if (input.body.length > 1000) return { ok: false, error: 'Isi pesan maksimal 1000 karakter' }
  if (input.target.recipient_ids !== undefined) {
    if (!Array.isArray(input.target.recipient_ids) || input.target.recipient_ids.length === 0) {
      return { ok: false, error: 'Pilih minimal 1 penerima untuk mode personal' }
    }
    if (input.target.recipient_ids.some(id => typeof id !== 'string' || !id)) {
      return { ok: false, error: 'ID penerima tidak valid' }
    }
  }
  if (input.target.daerah_ids !== undefined) {
    if (!Array.isArray(input.target.daerah_ids) || input.target.daerah_ids.length === 0) {
      return { ok: false, error: 'Pilih minimal 1 daerah' }
    }
    if (input.target.daerah_ids.some(id => typeof id !== 'string' || !id)) {
      return { ok: false, error: 'ID daerah tidak valid' }
    }
  }
  if (input.display_config) {
    const validModes = ['banner', 'modal', 'both']
    const validDismiss = ['free', 'acknowledge', 'cta_required']
    if (!validModes.includes(input.display_config.mode)) return { ok: false, error: 'Mode tampilan tidak valid' }
    if (!validDismiss.includes(input.display_config.dismiss)) return { ok: false, error: 'Mode dismiss tidak valid' }
    if (typeof input.display_config.showInList !== 'boolean') return { ok: false, error: 'showInList harus boolean' }
  }
  return { ok: true }
}

export function resolveTargetScopeForSender(
  profile: UserProfile,
  target: NotificationTargetScope
): { ok: boolean; scope?: NotificationTargetScope; error?: string } {
  if (profile.role === 'superadmin') {
    return { ok: true, scope: target }
  }
  if (profile.role === 'admin' && profile.daerah_id && !profile.desa_id && !profile.kelompok_id) {
    // For personal (recipient_ids), don't overwrite the scope — leave as-is with daerah_id attached for reference
    if (target.recipient_ids?.length) {
      return { ok: true, scope: { ...target, daerah_id: profile.daerah_id } }
    }
    return { ok: true, scope: { ...target, daerah_id: profile.daerah_id } }
  }
  return { ok: false, error: 'Tidak memiliki izin untuk mengirim notifikasi' }
}

export function buildRecipientProfileFilter(scope: NotificationTargetScope): {
  column: string | null
  value: string | null
  roles?: string[]
} {
  if (scope.kelompok_id) return { column: 'kelompok_id', value: scope.kelompok_id, roles: scope.roles }
  if (scope.desa_id) return { column: 'desa_id', value: scope.desa_id, roles: scope.roles }
  if (scope.daerah_id) return { column: 'daerah_id', value: scope.daerah_id, roles: scope.roles }
  return { column: null, value: null, roles: scope.roles }
}

export function validateUpdateNotificationInput(input: UpdateNotificationInput): { ok: boolean; error?: string } {
  if (!input.title?.trim()) return { ok: false, error: 'Judul tidak boleh kosong' }
  if (input.title.length > 200) return { ok: false, error: 'Judul maksimal 200 karakter' }
  if (!input.body?.trim()) return { ok: false, error: 'Isi pesan tidak boleh kosong' }
  if (input.body.length > 1000) return { ok: false, error: 'Isi pesan maksimal 1000 karakter' }
  return { ok: true }
}
