/**
 * Material Type Definitions
 *
 * IMPORTANT: Single source of truth for educational material types.
 * All other modules should import from here.
 *
 * Note: ClassMaster references should import from '@/types/class'
 */

// ─── Category & Type ──────────────────────────────────────────────────────────

/**
 * Material category (top-level grouping)
 * Use for: Category management
 */
export interface MaterialCategory {
  id: string
  name: string
  description: string | null
  display_order: number
  created_at: string
  updated_at: string
}

/**
 * Material type (sub-category under MaterialCategory)
 * Use for: Type management within categories
 */
export interface MaterialType {
  id: string
  category_id: string
  name: string
  description: string | null
  display_order: number
  created_at: string
  updated_at: string
  category?: MaterialCategory
}

// ─── Material Items ───────────────────────────────────────────────────────────

/**
 * Individual material item
 * Use for: Content management, class assignments
 */
export interface MaterialItem {
  id: string
  material_type_id: string
  name: string
  description: string | null
  content: string | null
  created_at: string
  updated_at: string
  material_type?: MaterialType
  classes?: Array<{
    id: string
    name: string
    semester?: number | null
    category?: {
      id: string
      code: string
      name: string
    }
  }>
}

/**
 * Junction between material items and class masters
 * Use for: Class-material mapping management
 */
export interface MaterialItemClass {
  id: string
  material_item_id: string
  class_master_id: string
  semester: number | null
  created_at: string
  updated_at: string
  material_item?: MaterialItem
  class_master?: {
    id: string
    name: string
    semester?: number | null
    category?: {
      id: string
      code: string
      name: string
    }
  }
}

// ─── Day Material Assignments ─────────────────────────────────────────────────

/**
 * Daily material schedule assignment
 * Use for: Weekly/monthly schedule planning
 */
export interface DayMaterialAssignment {
  id: string
  class_master_id: string
  semester: number
  month: number
  week: number
  day_of_week: number
  material_type_id: string
  notes: string | null
  created_at: string
  updated_at: string
  material_type?: MaterialType
  items?: DayMaterialItem[]
}

/**
 * Item within a day material assignment
 */
export interface DayMaterialItem {
  id: string
  assignment_id: string
  material_item_id: string
  display_order: number
  custom_content: string | null
  created_at: string
  updated_at: string
  material_item?: MaterialItem
}

// ─── Utility Types ────────────────────────────────────────────────────────────

export type Semester = 1 | 2
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type Week = 1 | 2 | 3 | 4
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6
