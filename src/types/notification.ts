/**
 * Notification domain types for in-app broadcast system (sm-69c)
 */

// ─── Display Config ───────────────────────────────────────────────────────────

export type NotificationDisplayMode = 'banner' | 'modal' | 'both'
export type NotificationDismissMode = 'free' | 'acknowledge' | 'cta_required'

export interface NotificationDisplayConfig {
  mode: NotificationDisplayMode
  dismiss: NotificationDismissMode
  showInList: boolean
}

export const DEFAULT_DISPLAY_CONFIG: NotificationDisplayConfig = {
  mode: 'banner',
  dismiss: 'free',
  showInList: true,
}

// ─── Scope ────────────────────────────────────────────────────────────────────


export interface NotificationTargetScope {
  daerah_id?: string | null
  daerah_ids?: string[] // superadmin multi-daerah; takes priority over daerah_id when set
  desa_id?: string | null
  kelompok_id?: string | null
  roles?: string[] // empty/undefined = all roles in scope
  recipient_ids?: string[] // personal: skip org resolve, send directly to these profile IDs
}

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface NotificationBase {
  id: string
  title: string
  body: string
  type: string
  created_at: string
  edited_at?: string | null
  action_url?: string | null
  action_label?: string | null
  display_config?: NotificationDisplayConfig | null
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
  display_config?: NotificationDisplayConfig
  action_url?: string | null
  action_label?: string | null
  excluded_ids?: string[] // recipient IDs to exclude from scope-resolved list
}

// ─── Edit / Update ────────────────────────────────────────────────────────────

export interface UpdateNotificationInput {
  title: string
  body: string
  type?: NotificationType
}

// ─── Sent (sender's own broadcasts) ───────────────────────────────────────────

export interface NotificationSentSummary {
  id: string
  title: string
  body: string
  type: string
  created_at: string
  edited_at: string | null
  recipient_count: number
  read_count: number
  dismissed_count: number
  display_config?: NotificationDisplayConfig | null
  sender_name?: string // only populated for superadmin view
}

// Per-recipient status for sender's read-receipt view
export interface NotificationRecipientStatus {
  recipient_id: string
  full_name: string
  is_read: boolean
  read_at: string | null
  is_dismissed: boolean
}
