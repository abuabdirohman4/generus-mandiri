/**
 * Activity Type & Level Type Definitions
 * DB-driven replacement for hardcoded MEETING_TYPES
 */

export interface ActivityTypeBase {
  id: string
  code: string
  name: string
}

export interface ActivityType extends ActivityTypeBase {
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ActivityLevelBase {
  id: string
  code: string
  name: string
}

export interface ActivityLevel extends ActivityLevelBase {
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeacherActivityType {
  id: string
  teacher_id: string
  activity_type_id: string
  activity_type?: ActivityTypeBase
  created_at: string
}

export interface CreateActivityTypeData {
  code: string
  name: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

export interface UpdateActivityTypeData {
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}
