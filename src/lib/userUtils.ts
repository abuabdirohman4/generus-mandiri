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

/**
 * Check if user has admin privileges (admin or superadmin)
 */
export function isAdmin(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin'
}

/**
 * Check if user has superadmin privileges
 */
export function isSuperAdmin(role: string | undefined): boolean {
  return role === 'superadmin'
}

/**
 * Check if user is admin at daerah level
 */
export function isAdminDaerah(userProfile: any): boolean {
  return userProfile?.role === 'admin' && !!userProfile?.daerah_id && !userProfile?.desa_id
}

/**
 * Check if user is admin at desa level
 */
export function isAdminDesa(userProfile: any): boolean {
  return userProfile?.role === 'admin' && !!userProfile?.desa_id && !userProfile?.kelompok_id
}

/**
 * Check if user is admin at kelompok level
 */
export function isAdminKelompok(userProfile: any): boolean {
  return userProfile?.role === 'admin' && !!userProfile?.kelompok_id
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
