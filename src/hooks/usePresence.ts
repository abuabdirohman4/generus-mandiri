'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUserProfileStore } from '@/stores/userProfileStore'

/**
 * Hook to track user presence and update last_seen_at status
 * Uses Supabase Presence for real-time and DB update for persistence
 */
export function usePresence() {
  const { profile } = useUserProfileStore()
  const pathname = usePathname()
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!profile?.id) return

    // Initialize presence channel
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: profile.id,
        },
      },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        // Handle presence state synchronization if needed in UI later
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return

        // Track current user presence
        await channel.track({
          user_id: profile.id,
          online_at: new Date().toISOString(),
          full_name: profile.full_name,
          role: profile.role,
          page_path: pathname,
        })
      })

    // Persist last_seen_at to database
    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', profile.id)
      } catch (error) {
        // Silent fail for background updates
      }
    }

    // Update immediately on mount and then periodically
    updateLastSeen()
    const interval = setInterval(updateLastSeen, 1000 * 60 * 5) // every 5 minutes

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [profile?.id, profile?.full_name, profile?.role, supabase])

  // Re-track presence when pathname changes
  useEffect(() => {
    if (!channelRef.current || !profile) return
    
    channelRef.current.track({
      user_id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      page_path: pathname,
      online_at: new Date().toISOString(),
    })
  }, [pathname, profile])
}
