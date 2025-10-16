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
  isAdmin
} from './accessControl'

// Legacy function for backward compatibility (takes role string instead of profile)
export function isAdminLegacy(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin'
}

/**
 * Clear all SWR cache when user logs out
 */
export function clearUserCache() {
  if (typeof window !== 'undefined') {
    // Clear SWR cache from localStorage
    localStorage.removeItem('swr-cache')
    
    // Clear user profile store
    localStorage.removeItem('user-profile-storage')
    
    // Force reload to clear all in-memory caches
    window.location.reload()
  }
}
