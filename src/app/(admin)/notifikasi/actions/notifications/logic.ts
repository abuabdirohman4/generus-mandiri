import type { UserProfile } from '@/types/user'
import type { NotificationTargetScope, SendNotificationInput } from '@/types/notification'

export function validateNotificationInput(input: SendNotificationInput): { ok: boolean; error?: string } {
  if (!input.title?.trim()) return { ok: false, error: 'Judul tidak boleh kosong' }
  if (input.title.length > 200) return { ok: false, error: 'Judul maksimal 200 karakter' }
  if (!input.body?.trim()) return { ok: false, error: 'Isi pesan tidak boleh kosong' }
  if (input.body.length > 1000) return { ok: false, error: 'Isi pesan maksimal 1000 karakter' }
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
