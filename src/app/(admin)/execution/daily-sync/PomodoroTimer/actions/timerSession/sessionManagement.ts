"use server";

// Timer session management actions

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getDeviceId } from './deviceUtils';
import { logTimerEvent } from './timerEventActions';
import { cleanupAbandonedSessions } from './cleanupActions';

export async function saveTimerSession(sessionData: {
  taskId: string;
  taskTitle: string;
  sessionType: string;
  startTime: string;
  targetDuration: number;
  currentDuration: number;
  status: string;
  deviceId?: string;
  focusDuration?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Cleanup abandoned sessions first
    await cleanupAbandonedSessions();
    
    // First, try to find existing running session for this user and task
    const { data: existingSession, error: findError } = await supabase
      .from('timer_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', sessionData.taskId)
      .eq('status', 'FOCUSING')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let data, error;

    // Cleanup any abandoned sessions for this user and task before creating/updating
    if (!existingSession) {
      await supabase
        .from('timer_sessions')
        .update({ status: 'COMPLETED' })
        .eq('user_id', user.id)
        .eq('task_id', sessionData.taskId)
        .eq('status', 'FOCUSING');
    }

    if (existingSession) {
      // ✅ FIX: Validasi currentDuration tidak boleh lebih besar dari targetDuration
      const validCurrentDuration = Math.min(sessionData.currentDuration, sessionData.targetDuration);
      
      // Update existing session
      const result = await supabase
        .from('timer_sessions')
        .update({
          task_title: sessionData.taskTitle,
          session_type: sessionData.sessionType,
          start_time: sessionData.startTime,
          target_duration_seconds: sessionData.targetDuration,
          current_duration_seconds: validCurrentDuration, // ✅ Use validated duration
          status: sessionData.status,
          device_id: sessionData.deviceId || getDeviceId(), // ✅ Use provided deviceId or generate new one
          focus_duration: sessionData.focusDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSession.id)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // ✅ FIX: Validasi currentDuration tidak boleh lebih besar dari targetDuration
      const validCurrentDuration = Math.min(sessionData.currentDuration, sessionData.targetDuration);
      
      // Create new session
      const result = await supabase
        .from('timer_sessions')
        .insert({
          user_id: user.id,
          task_id: sessionData.taskId,
          task_title: sessionData.taskTitle,
          session_type: sessionData.sessionType,
          start_time: sessionData.startTime,
          target_duration_seconds: sessionData.targetDuration,
          current_duration_seconds: validCurrentDuration, // ✅ Use validated duration
          status: sessionData.status,
          device_id: sessionData.deviceId || getDeviceId(), // ✅ Use provided deviceId or generate new one
          focus_duration: sessionData.focusDuration,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      throw error;
    }

    // ✅ TAMBAHKAN: Log start event untuk session baru, sync event untuk session yang sudah ada
    if (!existingSession) {
      // New session - log start event
      await logTimerEvent(data.id, 'start', {
        taskId: sessionData.taskId,
        taskTitle: sessionData.taskTitle,
        startTime: sessionData.startTime,
        targetDuration: sessionData.targetDuration,
        sessionType: sessionData.sessionType
      }, sessionData.deviceId);
    } else {
      // Existing session - log sync event
      await logTimerEvent(data.id, 'sync', {
        currentDuration: sessionData.currentDuration,
        status: sessionData.status
      }, sessionData.deviceId);
    }

    revalidatePath('/execution/daily-sync');
    return data;
  } catch (error) {
    throw error;
  }
}

export async function getActiveTimerSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'FOCUSING')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[getActiveTimerSession] Exception:', error);
    throw error;
  }
}
