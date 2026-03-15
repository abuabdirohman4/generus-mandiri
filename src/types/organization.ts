/**
 * Organization Type Definitions
 *
 * IMPORTANT: Single source of truth for organizational hierarchy.
 * Hierarchy: Daerah (Region) → Desa (Village) → Kelompok (Group)
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base organization fields
 */
export interface OrganizationBase {
  id: string
  name: string
}

// ─── Daerah (Region) ──────────────────────────────────────────────────────────

/**
 * Daerah (Region) - minimal fields (without timestamps)
 * Use for: Select queries that don't include timestamps, filters, dropdowns
 */
export type DaerahBase = OrganizationBase

/**
 * Daerah (Region) - complete with timestamps
 * Use for: Full record operations, updates, detailed views
 */
export interface Daerah extends OrganizationBase {
  created_at: string
  updated_at: string
}

/**
 * Daerah with statistics
 * Use for: Dashboard, analytics
 */
export interface DaerahWithStats extends Daerah {
  total_desa: number
  total_kelompok: number
  total_classes: number
  total_students: number
}

// ─── Desa (Village) ───────────────────────────────────────────────────────────

/**
 * Desa (Village) - minimal fields (without timestamps)
 * Use for: Select queries that don't include timestamps, filters, dropdowns
 */
export interface DesaBase extends OrganizationBase {
  daerah_id: string
  daerah?: DaerahBase
}

/**
 * Desa (Village) - complete with timestamps
 * Use for: Full record operations, updates, detailed views
 */
export interface Desa extends OrganizationBase {
  daerah_id: string
  daerah?: Daerah
  created_at: string
  updated_at: string
}

/**
 * Desa with statistics
 * Use for: Dashboard, analytics
 */
export interface DesaWithStats extends Desa {
  total_kelompok: number
  total_classes: number
  total_students: number
}

// ─── Kelompok (Group) ─────────────────────────────────────────────────────────

/**
 * Kelompok (Group) - minimal fields (without timestamps)
 * Use for: Select queries that don't include timestamps, filters, dropdowns
 */
export interface KelompokBase extends OrganizationBase {
  desa_id: string
  desa?: DesaBase
}

/**
 * Kelompok (Group) - complete with timestamps
 * Use for: Full record operations, updates, detailed views
 */
export interface Kelompok extends OrganizationBase {
  desa_id: string
  desa?: Desa
  created_at: string
  updated_at: string
}

/**
 * Kelompok with statistics
 * Use for: Dashboard, analytics
 */
export interface KelompokWithStats extends Kelompok {
  total_classes: number
  total_students: number
}

// ─── Request/Response ─────────────────────────────────────────────────────────

export interface CreateDaerahData {
  name: string
}

export interface CreateDesaData {
  name: string
  daerah_id: string
}

export interface CreateKelompokData {
  name: string
  desa_id: string
}
