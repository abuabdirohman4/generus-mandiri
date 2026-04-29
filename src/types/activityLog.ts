/**
 * Activity Log types for audit system
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string
  user_id: string | null
  user_role: string | null
  org_daerah_id: string | null
  org_desa_id: string | null
  org_kelompok_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  metadata: Record<string, unknown>
  page_path: string | null
  created_at: string
}

// ─── Extended Types ───────────────────────────────────────────────────────────

export interface ActivityLogWithProfile extends ActivityLog {
  profiles: {
    full_name: string
    username: string
    role: string
  } | null
}

// ─── Enums & Unions ───────────────────────────────────────────────────────────

export type LogAction =
  // Siswa
  | 'create_student'
  | 'update_student'
  | 'soft_delete_student'
  | 'hard_delete_student'
  | 'transfer_student'
  | 'archive_student'
  // Guru
  | 'create_teacher'
  | 'update_teacher'
  | 'delete_teacher'
  | 'reset_teacher_password'
  | 'assign_class_teacher'
  | 'unassign_class_teacher'
  // Admin
  | 'create_admin'
  | 'update_admin'
  | 'delete_admin'
  | 'reset_admin_password'
  // Absensi
  | 'save_attendance'
  | 'delete_attendance'
  | 'create_meeting'
  | 'delete_meeting'
  // Rapot
  | 'input_grade'
  | 'bulk_upsert_grade'
  | 'publish_rapot'
  | 'create_rapot_template'
  // Materi
  | 'create_material'
  | 'update_material'
  | 'delete_material'
  | 'assign_material_to_class'
  | 'update_monthly_target'
  // Kegiatan
  | 'create_activity_type'
  | 'update_activity_type'
  | 'delete_activity_type'
  // Organisasi
  | 'create_daerah'
  | 'update_daerah'
  | 'delete_daerah'
  | 'create_desa'
  | 'update_desa'
  | 'delete_desa'
  | 'create_kelompok'
  | 'update_kelompok'
  | 'delete_kelompok'
  // Kelas
  | 'create_class'
  | 'update_class'
  | 'delete_class'
  // Tahun Ajaran
  | 'create_academic_year'
  | 'update_academic_year'
  | 'delete_academic_year'
  | 'update_academic_year_status'
  // Monitoring
  | 'update_monitoring_data'
  // Navigation
  | 'open_page'
  // Auth
  | 'login'
  | 'logout'
  | 'change_password'
  | 'update_security_settings'

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface LogActivityParams {
  userId: string
  action: LogAction | string
  entityType?: string
  entityId?: string
  entityLabel?: string
  metadata?: Record<string, unknown>
  pagePath?: string
}
