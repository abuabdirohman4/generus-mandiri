"use server";

// Timer session control actions (pause, resume)

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logTimerEvent } from './timerEventActions';

export async function pauseTimerSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { error } = await supabase
      .from('timer_sessions')
      .update({ 
        status: 'PAUSED',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[pauseTimerSession] Supabase error:', error);
      throw error;
    }

    // Log pause event
    await logTimerEvent(sessionId, 'pause', {
      paused: true,
      timestamp: new Date().toISOString()
    });

    revalidatePath('/execution/daily-sync');
    return { success: true };
  } catch (error) {
    console.error('[pauseTimerSession] Exception:', error);
    throw error;
  }
}

export async function resumeTimerSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { error } = await supabase
      .from('timer_sessions')
      .update({ 
        status: 'FOCUSING',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[resumeTimerSession] Supabase error:', error);
      throw error;
    }

    // Log resume event
    await logTimerEvent(sessionId, 'resume', {
      resumed: true,
      timestamp: new Date().toISOString()
    });

    revalidatePath('/execution/daily-sync');
    return { success: true };
  } catch (error) {
    console.error('[resumeTimerSession] Exception:', error);
    throw error;
  }
}
