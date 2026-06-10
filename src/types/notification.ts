/**
 * Notification domain types for in-app broadcast system (sm-69c)
 */

// ─── Scope ────────────────────────────────────────────────────────────────────

export interface NotificationTargetScope {
  daerah_id?: string | null
  desa_id?: string | null
  kelompok_id?: string | null
  roles?: string[] // empty/undefined = all roles in scope
}

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface NotificationBase {
  id: string
  title: string
  body: string
  type: string
  created_at: string
}

// ─── Extended Types ───────────────────────────────────────────────────────────

export interface Notification extends NotificationBase {
  target_scope: NotificationTargetScope
  sender_id: string
  sender_daerah_id?: string | null
  sender_desa_id?: string | null
  sender_kelompok_id?: string | null
}

// Row combined for recipient UI (join with notification_recipients)
export interface NotificationWithStatus extends NotificationBase {
  is_read: boolean
  read_at: string | null
  is_dismissed: boolean
  sender_name?: string
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning'

export interface SendNotificationInput {
  title: string
  body: string
  type?: NotificationType
  target: NotificationTargetScope
}

// ─── Sent (sender's own broadcasts) ───────────────────────────────────────────

export interface NotificationSentSummary {
  id: string
  title: string
  body: string
  type: string
  created_at: string
  recipient_count: number
}
