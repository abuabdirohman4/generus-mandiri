"use server";

// Server-side timer calculation actions

import { createClient } from '@/lib/supabase/server';
import { logTimerEvent } from './timerEventActions';
import { completeTimerSession } from './sessionCompletion';

// ✅ SERVER-SIDE TIMER: Calculate actual elapsed time from start_time
// FIXED: Auto-complete timer when target duration is exceeded
// 
// CORRECT LOGIC:
// - Timer 25 min: Start 10:00, Close 10:05, Resume 11:05 → COMPLETED (25 min) ✅
// - Timer 60 min: Start 10:00, Close 10:30, Resume 11:30 → COMPLETED (60 min) ✅  
// - Timer 90 min: Start 10:00, Close 10:45, Resume 11:45 → COMPLETED (90 min) ✅
//
// HOW IT WORKS:
// 1. Calculate actual elapsed time since start
// 2. If elapsed >= target duration → Mark as COMPLETED with target duration
// 3. If elapsed < target duration → Use conservative approach for remaining time
// 4. Auto-complete prevents timer from running beyond intended duration
export async function calculateActualElapsedTime(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Get session data
    const { data: session, error } = await supabase
      .from('timer_sessions')
      .select('start_time, target_duration_seconds, status, current_duration_seconds')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (error || !session) {
      throw new Error('Session not found');
    }

    // ✅ FIX: Check if timer should be completed based on actual elapsed time
    const now = new Date();
    const timeSinceStart = Math.floor((now.getTime() - new Date(session.start_time).getTime()) / 1000);
    const targetDuration = session.target_duration_seconds;
    
    // ✅ CRITICAL FIX: If actual elapsed time >= target duration, timer should be completed
    if (timeSinceStart >= targetDuration) {
      // Timer should be completed - return target duration
      return {
        actualElapsedSeconds: timeSinceStart,
        cappedElapsedSeconds: targetDuration, // ✅ Use target duration, not actual elapsed
        shouldComplete: true, // ✅ Mark as should complete
        status: session.status,
        lastKnownDuration: session.current_duration_seconds || 0,
        timeSinceLastUpdate: timeSinceStart
      };
    }
    
    // ✅ FIX: Use actual elapsed time for accurate timer display
    // This ensures timer shows correct time when app is reopened
    const newDuration = Math.min(timeSinceStart, targetDuration);
    
    return {
      actualElapsedSeconds: timeSinceStart,
      cappedElapsedSeconds: newDuration,
      shouldComplete: newDuration >= session.target_duration_seconds,
      status: session.status,
      lastKnownDuration: session.current_duration_seconds || 0,
      timeSinceLastUpdate: timeSinceStart
    };
  } catch (error) {
    console.error('[calculateActualElapsedTime] Error:', error);
    throw error;
  }
}

// ✅ SERVER-SIDE TIMER: Update session with actual elapsed time
export async function updateSessionWithActualTime(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Calculate actual elapsed time
    const { actualElapsedSeconds, cappedElapsedSeconds, shouldComplete } = await calculateActualElapsedTime(sessionId);
    
    if (shouldComplete) {
      // Complete the session
      await completeTimerSession(sessionId);
      return { completed: true, elapsedSeconds: actualElapsedSeconds };
    } else {
      // Update with actual elapsed time
      const { error } = await supabase
        .from('timer_sessions')
        .update({
          current_duration_seconds: cappedElapsedSeconds,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Log the update event
      await logTimerEvent(sessionId, 'sync', {
        actualElapsedSeconds,
        cappedElapsedSeconds,
        source: 'server-side-calculation'
      });

      return { completed: false, elapsedSeconds: cappedElapsedSeconds };
    }
  } catch (error) {
    console.error('[updateSessionWithActualTime] Error:', error);
    throw error;
  }
}
