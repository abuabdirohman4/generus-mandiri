"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function getActivityLogById(activityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, what_done, what_think, created_at')
      .eq('id', activityId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[getActivityLogById] Supabase error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[getActivityLogById] Exception:', error);
    throw error;
  }
}

export async function updateActivityJournal(activityId: string, whatDone: string, whatThink: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .update({
        what_done: whatDone.trim() || null,
        what_think: whatThink.trim() || null,
      })
      .eq('id', activityId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[updateActivityJournal] Supabase error:', error);
      throw error;
    }

    revalidatePath('/execution/daily-sync');
    return data;
  } catch (error) {
    console.error('[updateActivityJournal] Exception:', error);
    throw error;
  }
}

export async function logActivityWithJournal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const taskId = formData.get('taskId')?.toString();
  const sessionType = formData.get('sessionType')?.toString() as 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
  const date = formData.get('date')?.toString();
  const startTime = formData.get('startTime')?.toString();
  const endTime = formData.get('endTime')?.toString();
  const whatDone = formData.get('whatDone')?.toString();
  const whatThink = formData.get('whatThink')?.toString();

  if (!taskId || !sessionType || !date || !startTime || !endTime) {
    console.error('[logActivityWithJournal] Missing required fields', { taskId, sessionType, date, startTime, endTime });
    throw new Error('Missing required fields');
  }

  // Kalkulasi durasi dinamis (dibulatkan, minimal 1 menit)
  const durationInSeconds = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
  const durationInMinutes = Math.max(1, Math.round(durationInSeconds / 60));

  try {
    // Check for duplicate session first
    const { data: existingSession } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .eq('start_time', startTime)
      .eq('end_time', endTime)
      .single();

    if (existingSession) {
      console.log('[logActivityWithJournal] Duplicate session detected, skipping insert');
      return existingSession;
    }

    const { data: activity, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        task_id: taskId,
        type: sessionType,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationInMinutes,
        local_date: date,
        what_done: whatDone || null,
        what_think: whatThink || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[logActivityWithJournal] Supabase error:', error);
      throw error;
    }
    
    revalidatePath('/execution/daily-sync');
    return activity;
  } catch (error) {
    console.error('[logActivityWithJournal] Exception:', error);
    throw error;
  }
}
