'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUserProfileStore } from '@/stores/userProfileStore'

/**
 * Hook to track user presence via Supabase Realtime Presence.
 * Mounted in PreloadProvider so it runs on all admin pages.
 */
export function usePresence() {
  const { profile } = useUserProfileStore()
  const pathname = usePathname()
  const channelRef = useRef<any>(null)
  // Stable supabase client — dibuat sekali, tidak di render cycle
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!profile?.id) return

    const supabase = supabaseRef.current

    // Unsubscribe channel lama jika ada
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: profile.id } },
    })

    channelRef.current = channel

    channel.subscribe(async (status: string) => {
      if (status !== 'SUBSCRIBED') return
      await channel.track({
        user_id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        page_path: pathname,
        online_at: new Date().toISOString(),
      })
    })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  // Hanya re-subscribe jika profile berubah (login/logout)
  }, [profile?.id, profile?.full_name, profile?.role])

  // Re-track saat navigasi — update page_path tanpa re-subscribe
  useEffect(() => {
    if (!channelRef.current || !profile?.id) return
    channelRef.current.track({
      user_id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      page_path: pathname,
      online_at: new Date().toISOString(),
    })
  }, [pathname])
}
