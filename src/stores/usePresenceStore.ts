'use client'

import { create } from 'zustand'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface OnlineUser {
  user_id: string
  full_name: string
  role: string
  page_path: string
  online_at: string
}

interface PresenceState {
  onlineUsers: OnlineUser[]
  connectionStatus: string
  isDebug: boolean
  setDebug: (debug: boolean) => void
  initializePresence: (user: any) => Promise<void>
  updatePath: (user: any, path: string) => Promise<void>
  cleanup: () => void
}

let realtimeChannel: RealtimeChannel | null = null
let lastTrackedPath: string | null = null

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: [],
  connectionStatus: 'DISCONNECTED',
  isDebug: false,

  setDebug: (debug) => set({ isDebug: debug }),

  initializePresence: async (user) => {
    if (!user?.id) return
    if (realtimeChannel) return

    const supabase = createClient()
    const { isDebug } = get()
    
    if (isDebug) console.log('[PresenceStore] Initializing shared channel...')

    realtimeChannel = supabase.channel('online-users')

    realtimeChannel
      .on('presence', { event: 'sync' }, () => {
        if (!realtimeChannel) return
        
        const state = realtimeChannel.presenceState()
        const { isDebug } = get()
        
        if (isDebug) {
          console.log('[PresenceStore] RAW Presence State:', state)
        }
        
        const stateValues = Object.values(state).flat() as any[]
        const uniqueUsersMap = new Map<string, OnlineUser>()
        
        stateValues.forEach((u) => {
          if (u && u.user_id) {
            const existing = uniqueUsersMap.get(u.user_id)
            if (!existing || (u.online_at && (!existing.online_at || new Date(u.online_at) > new Date(existing.online_at)))) {
              uniqueUsersMap.set(u.user_id, u)
            }
          }
        })
        
        const finalUsers = Array.from(uniqueUsersMap.values())
        if (isDebug) console.log('[PresenceStore] Sync result (unique users):', finalUsers.length)
        set({ onlineUsers: finalUsers })
      })

    realtimeChannel.subscribe(async (status) => {
      set({ connectionStatus: status })
      const { isDebug } = get()
      if (isDebug) console.log(`[PresenceStore] Connection Status: ${status}`)
      
      if (status === 'SUBSCRIBED' && user?.id) {
        const currentPath = window.location.pathname
        lastTrackedPath = currentPath
        
        if (isDebug) console.log(`[PresenceStore] Sending track for ${user.full_name}`)
        await realtimeChannel!.track({
          user_id: user.id,
          full_name: user.full_name,
          role: user.role || 'user',
          page_path: currentPath,
          online_at: new Date().toISOString(),
        })
      }
    })
  },

  updatePath: async (user, path) => {
    if (realtimeChannel && realtimeChannel.state === 'joined' && user?.id && lastTrackedPath !== path) {
      const { isDebug } = get()
      if (isDebug) console.log(`[PresenceStore] Path changed to: ${path}, updating presence...`)
      
      lastTrackedPath = path
      await realtimeChannel.track({
        user_id: user.id,
        full_name: user.full_name,
        role: user.role || 'user',
        page_path: path,
        online_at: new Date().toISOString(),
      })
    }
  },

  cleanup: () => {
    if (realtimeChannel) {
      const { isDebug } = get()
      if (isDebug) console.log('[PresenceStore] Cleaning up global channel...')
      
      const supabase = createClient()
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
      lastTrackedPath = null
      set({ onlineUsers: [], connectionStatus: 'DISCONNECTED' })
    }
  }
}))
