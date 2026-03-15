/**
 * Class Type Definitions
 *
 * IMPORTANT: Single source of truth for class-related types.
 * Covers: Classes, ClassMasters, ClassMasterMappings
 *
 * Type hierarchy:
 * - ClassBase → Class → ClassWithMaster
 * - ClassMasterBase → ClassMaster
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base class type - minimal fields
 * Use for: Simple listings, IDs
 */
export interface ClassBase {
  id: string
  name: string
}

/**
 * Base class master type - minimal fields
 * Use for: Master data lookups
 */
export interface ClassMasterBase {
  id: string
  name: string
  sort_order: number
}

// ─── Extended Types ───────────────────────────────────────────────────────────

/**
 * Class with organizational hierarchy
 * Use for: Main class listings, filters
 */
export interface Class extends ClassBase {
  kelompok_id?: string | null
  kelompok?: {
    id: string
    name: string
    desa_id?: string
    desa?: {
      id: string
      name: string
      daerah_id?: string
      daerah?: {
        id: string
        name: string
      }
    }
  } | null
  created_at?: string
  updated_at?: string
  class_master_mappings?: Array<{
    class_master?: {
      id: string
      sort_order: number
      name?: string
    } | null
  }>
}

/**
 * Class with master mappings
 * Use for: Class management, master-class relationships
 */
export interface ClassWithMaster extends Class {
  class_master_mappings?: Array<{
    class_master_id?: string
    class_master?: ClassMaster | null
  }>
}

// ─── Full Types ───────────────────────────────────────────────────────────────

/**
 * Complete class master definition
 * Use for: Master data management
 *
 * Note: sort_order is optional to support contexts (e.g. materi domain) where
 * ClassMaster is returned without sort_order from Supabase queries.
 */
export interface ClassMaster extends ClassMasterBase {
  sort_order: number
  description?: string | null
  category_id?: string | null
  category?: {
    id: string
    code: string
    name: string
  } | null
  created_at?: string
  updated_at?: string
}

// ─── Request/Response ─────────────────────────────────────────────────────────

/**
 * Data for creating/updating class master
 */
export interface ClassMasterData {
  name: string
  sort_order: number
  description?: string | null
}

/**
 * Data for creating class
 */
export interface CreateClassData {
  name: string
  kelompok_id: string
}

// ─── Utility Types ────────────────────────────────────────────────────────────

/**
 * Simplified class data for helper functions
 * Use in: classHelpers.ts (isCaberawitClass, isTeacherClass, isSambungDesaEligible)
 * Note: kelompok_id is string | null | undefined because Supabase returns null for nullable
 */
export interface ClassData {
  name?: string
  kelompok_id?: string | null
  class_master_mappings?: Array<{
    class_master?: {
      id?: string
      name?: string
      category?: {
        id?: string
        code?: string
        name?: string
      }
    } | Array<{
      id?: string
      name?: string
      category?: {
        id?: string
        code?: string
        name?: string
      }
    }> | null
  }>
}

