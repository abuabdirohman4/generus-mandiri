"use server";

// Cleanup actions for timer sessions

import { createClient } from '@/lib/supabase/server';

// Cleanup abandoned sessions (sessions that haven't been updated for more than 1 hour)
export async function cleanupAbandonedSessions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('timer_sessions')
      .update({ status: 'COMPLETED' })
      .eq('user_id', user.id)
      .eq('status', 'FOCUSING')
      .lt('updated_at', oneHourAgo);

    if (error) {
      console.error('[cleanupAbandonedSessions] Error:', error);
    }
  } catch (error) {
    console.error('[cleanupAbandonedSessions] Exception:', error);
  }
}
