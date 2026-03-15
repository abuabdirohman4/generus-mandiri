/**
 * User Profile Type Definitions
 *
 * IMPORTANT: Single source of truth for user/profile types.
 * All other modules should import from here.
 *
 * Type hierarchy: UserProfileBase → UserProfileWithOrg → UserProfile
 */

// ─── Base Types ───────────────────────────────────────────────────────────────

/**
 * Base user profile - minimal fields
 * Use for: Permission checks, basic user operations
 */
export interface UserProfileBase {
  id: string
  role: string
}

// ─── Extended Types ───────────────────────────────────────────────────────────

/**
 * User profile with organizational hierarchy
 * Use for: Access control, filtering by organization
 */
export interface UserProfileWithOrg extends UserProfileBase {
  daerah_id?: string | null
  desa_id?: string | null
  kelompok_id?: string | null
  can_manage_materials?: boolean
}

// ─── Full Types ───────────────────────────────────────────────────────────────

/**
 * Complete user profile with all fields
 * Use for: Most common usage, full user context
 * Canonical definition - combines all variations from across codebase
 */
export interface UserProfile extends UserProfileWithOrg {
  full_name: string
  email?: string
  kelompok?: { id: string; name: string } | null
  desa?: { id: string; name: string } | null
  daerah?: { id: string; name: string } | null
  classes?: Array<{
    id: string
    name: string
    kelompok_id?: string | null
    kelompok?: { id: string; name: string } | null
  }>
  notification_badge?: {
    pending_transfer_requests?: number
  }
  permissions?: {
    can_archive_students?: boolean
    can_transfer_students?: boolean
    can_soft_delete_students?: boolean
    can_hard_delete_students?: boolean
  }
}

// ─── Aliases ──────────────────────────────────────────────────────────────────

/**
 * Alias for backward compatibility
 */
export type Profile = UserProfile

// ─── Store State ──────────────────────────────────────────────────────────────

/**
 * Zustand store state for user profile
 * Use in: userProfileStore.ts
 */
export interface UserProfileState {
  profile: UserProfile | null
  avatarUrl: string | null
  loading: boolean
  error: string | null
  isInitialized: boolean
  setProfile: (profile: UserProfile | null) => void
  setAvatarUrl: (avatarUrl: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearProfile: () => void
}
