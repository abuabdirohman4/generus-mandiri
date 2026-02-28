'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Get current user ID for cache key generation
 * This ensures cache keys are user-specific
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch (error) {
    console.error('Error getting current user ID:', error)
    return null
  }
}

// Re-export from accessControl.ts for backward compatibility
export {
  isSuperAdmin,
  isAdminDaerah,
  isAdminDesa,
  isAdminKelompok,
  isTeacher,
  isAdmin,
  isMaterialCoordinator,
  canManageMaterials,
  shouldShowDaerahFilter,
  shouldShowDesaFilter,
  shouldShowKelompokFilter,
  shouldShowKelasFilter,
  getRequiredOrgFields,
  getAutoFilledOrgValues,
  canAccessFeature,
  getDataFilter,
  isTeacherKelompok,
  isTeacherDesa,
  isTeacherDaerah,
  getTeacherScope,
  canTeacherAccessStudent,
  type UserProfile
} from './accessControl'

// Legacy function for backward compatibility (takes role string instead of profile)
export function isAdminLegacy(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin'
}

/**
 * Clear all SWR cache when user logs out
 * @param shouldReload - Whether to reload page after clearing cache (default: true)
 */
export function clearUserCache(shouldReload = true) {
  if (typeof window !== 'undefined') {
    // Clear SWR cache from localStorage
    localStorage.removeItem('swr-cache')

    // Clear user profile store
    localStorage.removeItem('user-profile-storage')

    // Clear siswa store (filters and class selection)
    localStorage.removeItem('siswa-storage')

    // Clear laporan store (report filters)
    localStorage.removeItem('laporan-storage')

    // Clear attendance store (attendance data)
    localStorage.removeItem('attendance-storage')

    // Clear absensi UI store (class filters)
    localStorage.removeItem('absensi-ui-store')

    // Clear dashboard store (dashboard filters)
    localStorage.removeItem('dashboard-storage')

    // Clear materi store (materi filters and view mode)
    localStorage.removeItem('materi-storage')

    // Force reload to clear all in-memory caches (unless explicitly disabled)
    if (shouldReload) {
      // Prevent SWRProvider's beforeunload handler from re-saving stale cache
      sessionStorage.setItem('swr-cache-suppress-persist', 'true');
      window.location.reload()
    }
  }
}

/**
 * Clear SWR cache without reloading page
 * Use this when user logs in to ensure fresh data
 * This function only clears SWR cache, not other stores
 */
export function clearSWRCache() {
  if (typeof window !== 'undefined') {
    // Clear SWR cache from localStorage
    localStorage.removeItem('swr-cache')
    
    // Clear SWR cache timestamp if exists
    localStorage.removeItem('swr-cache-timestamp')
    
    // Note: We don't reload the page here to allow smooth login flow
    // SWR will automatically fetch fresh data on next useSWR call
  }
}
