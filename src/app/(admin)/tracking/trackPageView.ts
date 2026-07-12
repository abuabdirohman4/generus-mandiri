'use server'

import { createClient, createAuthClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activityLogger'

/**
 * Server action to track page views
 * Uses getUser() to verify session from the server side
 */
export async function trackPageView(pagePath: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Gunakan getUser() untuk verifikasi session yang aman (tidak bisa dipalsukan client)
    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    
    if (!user) return // Tidak ada session, skip logging

    // Fire-and-forget: jangan await agar tidak memblokir navigasi
    void logActivity({
      userId: user.id,
      action: 'open_page',
      entityType: 'page',
      pagePath,
    })
  } catch (error) {
    // Non-critical operation: jangan throw error ke client
    if (process.env.NODE_ENV === 'development') {
      console.error('Error tracking page view:', error)
    }
  }
}
