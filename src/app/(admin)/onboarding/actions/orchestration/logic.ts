import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import type { UserProfile } from '@/types/user'

/**
 * Returns true if the user is allowed to access the onboarding wizard.
 * Only superadmin and admin daerah can create org structures.
 */
export function canOnboard(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  return isSuperAdmin(profile) || isAdminDaerah(profile)
  // return isSuperAdmin(profile)
}
