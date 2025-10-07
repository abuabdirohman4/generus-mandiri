"use server";

// Timer session completion actions

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logTimerEvent } from './timerEventActions';

export async function completeTimerSession(sessionId: string, deviceId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('[completeTimerSession] Session fetch error:', sessionError);
      throw sessionError;
    }

    // ✅ CRITICAL: Validate and correct session duration before completion
    const now = new Date();
    const startTime = new Date(session.start_time);
    const actualElapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    // Update session with correct duration if there's a significant difference
    if (Math.abs(actualElapsedSeconds - session.current_duration_seconds) > 5) {
      await supabase
        .from('timer_sessions')
        .update({ 
          current_duration_seconds: actualElapsedSeconds,
          updated_at: now.toISOString()
        })
        .eq('id', sessionId);
    }

    // ✅ FIX: Check if activity log already exists to prevent duplicates
    const { data: existingLog } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', session.task_id)
      .eq('start_time', session.start_time)
      .maybeSingle();

    if (!existingLog) {
      // ✅ CRITICAL FIX: Always calculate actual elapsed time from database timestamps
      const endTime = new Date().toISOString();
      const startTimeDate = new Date(session.start_time);
      const endTimeDate = new Date(endTime);
      const actualDurationSeconds = Math.floor((endTimeDate.getTime() - startTimeDate.getTime()) / 1000);
      const actualDurationMinutes = Math.max(1, Math.round(actualDurationSeconds / 60));
      
      // Only create activity log if it doesn't exist
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          task_id: session.task_id,
          type: session.session_type,
          start_time: session.start_time,
          end_time: endTime,
          duration_minutes: actualDurationMinutes,
          local_date: new Date().toISOString().slice(0, 10)
        });

      if (logError) {
        console.error('[completeTimerSession] Activity log error:', logError);
        throw logError;
      }
    } else {
      console.log('[completeTimerSession] Activity log already exists, skipping creation');
    }

    // Mark session as completed with end_time
    const endTime = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('timer_sessions')
      .update({ 
        status: 'COMPLETED',
        end_time: endTime,
        updated_at: endTime
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('[completeTimerSession] Update error:', updateError);
      throw updateError;
    }

    // ✅ FIX: Recompute accurate duration from start_time and end_time
    const startTimeDate = new Date(session.start_time);
    const endTimeDate = new Date(endTime);
    const actualDurationSeconds = Math.floor((endTimeDate.getTime() - startTimeDate.getTime()) / 1000);
    
    // Update with accurate duration
    await supabase
      .from('timer_sessions')
      .update({ 
        current_duration_seconds: actualDurationSeconds
      })
      .eq('id', sessionId);

    console.log(`✅ Timer completed: ${actualDurationSeconds}s (target: ${session.target_duration_seconds}s)`);

    // ✅ FIX: Check if stop event already exists to prevent duplicates
    const { data: existingStopEvent } = await supabase
      .from('timer_events')
      .select('id')
      .eq('session_id', sessionId)
      .eq('event_type', 'stop')
      .maybeSingle();

    if (!existingStopEvent) {
      // Only log stop event if it doesn't exist
      await logTimerEvent(sessionId, 'stop', {
        finalDuration: session.current_duration_seconds,
        completed: true
      }, deviceId);
    } else {
      console.log('[completeTimerSession] Stop event already exists, skipping creation');
    }

    revalidatePath('/execution/daily-sync');
    return { success: true };
  } catch (error) {
    console.error('[completeTimerSession] Exception:', error);
    throw error;
  }
}
