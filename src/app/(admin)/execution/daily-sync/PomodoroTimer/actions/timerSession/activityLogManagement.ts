"use server";

// Activity log management actions

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ✅ FIX: Get activity log ID for a specific session
export async function getActivityLogId(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Get session info first
    const { data: session, error: sessionError } = await supabase
      .from('timer_sessions')
      .select('task_id, start_time')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError) {
      console.error('[getActivityLogId] Session error:', sessionError);
      throw sessionError;
    }

    // Find activity log for this session
    const { data: activityLog, error: logError } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', session.task_id)
      .eq('start_time', session.start_time)
      .maybeSingle();

    if (logError) {
      console.error('[getActivityLogId] Log error:', logError);
      throw logError;
    }

    return activityLog?.id || null;
  } catch (error) {
    console.error('[getActivityLogId] Exception:', error);
    throw error;
  }
}

// ✅ FIX: Handle multiple journal inputs from different devices
export async function updateActivityLogJournal(logId: string, whatDone: string, whatThink: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Update existing activity log with journal data
    const { error } = await supabase
      .from('activity_logs')
      .update({
        what_done: whatDone,
        what_think: whatThink,
      })
      .eq('id', logId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[updateActivityLogJournal] Error:', error);
      throw error;
    }

    revalidatePath('/execution/daily-sync');
    return { success: true };
  } catch (error) {
    console.error('[updateActivityLogJournal] Exception:', error);
    throw error;
  }
}
