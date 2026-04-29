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
  
  // Gunakan singleton client
  const supabase = createClient()

  useEffect(() => {
    if (!profile?.id) return

    // Bersihkan channel lama jika ada
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: profile.id } },
    })

    channelRef.current = channel

    const handleTrack = async () => {
      // VALIDASI: Jangan track jika data belum lengkap
      if (!profile?.id || !profile?.full_name) {
        console.warn('usePresence: Missing profile data, skipping track')
        return
      }

      try {
        const payload = {
          user_id: profile.id,
          full_name: profile.full_name,
          role: profile.role || 'user',
          page_path: pathname,
          online_at: new Date().toISOString(),
        }
        
        console.log('usePresence: Tracking payload:', payload)
        await channel.track(payload)
      } catch (err) {
        console.error('Error tracking presence:', err)
      }
    }

    channel.subscribe(async (status: string) => {
      console.log(`usePresence: Channel status for ${profile.id}:`, status)
      if (status === 'SUBSCRIBED') {
        await handleTrack()
      }
    })

    return () => {
      if (channel) {
        console.log(`usePresence: Unsubscribing tracker for ${profile.id}`)
        channel.unsubscribe()
        channelRef.current = null
      }
    }
  // Re-subscribe hanya jika ID user berubah (login/logout)
  }, [profile?.id])

  // Re-track saat navigasi tanpa re-subscribe
  useEffect(() => {
    const channel = channelRef.current
    // Pastikan channel sudah joined dan profile data lengkap
    if (!channel || channel.state !== 'joined' || !profile?.id || !profile?.full_name) return
    
    channel.track({
      user_id: profile.id,
      full_name: profile.full_name,
      role: profile.role || 'user',
      page_path: pathname,
      online_at: new Date().toISOString(),
    })
  }, [pathname, profile?.id, profile?.full_name, profile?.role])
}
