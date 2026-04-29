'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useUserProfileStore } from '@/stores/userProfileStore'
import { usePresenceStore } from '@/stores/usePresenceStore'

/**
 * Hook to manage user presence tracking via Zustand store.
 * This hook is responsible for initializing the connection and updating
 * the user's current location (pathname) in the Realtime Presence metadata.
 */
export function usePresence() {
  const { profile } = useUserProfileStore()
  const pathname = usePathname()
  const { initializePresence, updatePath } = usePresenceStore()

  // Inisialisasi koneksi saat profil tersedia
  useEffect(() => {
    if (profile?.id) {
      initializePresence(profile)
    }
  }, [profile?.id, initializePresence])

  // Update metadata saat navigasi halaman
  useEffect(() => {
    if (profile?.id) {
      updatePath(profile, pathname)
    }
  }, [pathname, profile, updatePath])
}
