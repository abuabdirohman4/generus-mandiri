"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function logActivity(formData: FormData) {
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
    console.error('[logActivity] Missing required fields', { taskId, sessionType, date, startTime, endTime });
    throw new Error('Missing required fields');
  }

  // ✅ FIX: Calculate actual elapsed time with proper rounding
  const startTimeDate = new Date(startTime);
  const endTimeDate = new Date(endTime);
  const durationInSeconds = Math.floor((endTimeDate.getTime() - startTimeDate.getTime()) / 1000);
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
      console.log('[logActivity] Duplicate session detected, skipping insert');
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
      console.error('[logActivity] Supabase error:', error);
      throw error;
    }
    
    revalidatePath('/execution/daily-sync');
    return activity;
  } catch (error) {
    console.error('[logActivity] Exception:', error);
    throw error;
  }
} 

export async function getTodayActivityLogs(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const user_id = user.id;

  // Query semua activity_logs milik user pada tanggal lokal tsb
  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', user_id)
    .eq('local_date', date)
    .order('start_time', { ascending: false });

  if (error) throw error;
  if (!logs || logs.length === 0) return [];

  // Untuk setiap log, traverse ke atas untuk ambil task, milestone, quest
  const logsWithHierarchy = await Promise.all(
    logs.map(async (log) => {
      let task_title = null;
      let task_type = null;
      let milestone_id = null;
      let milestone_title = null;
      let quest_id = null;
      let quest_title = null;

      if (log.task_id) {
        // Ambil task
        const { data: task } = await supabase
          .from('tasks')
          .select('id, title, type, milestone_id')
          .eq('id', log.task_id)
          .single();
        if (task) {
          task_title = task.title;
          task_type = task.type;
          milestone_id = task.milestone_id;
        }
        // Ambil milestone jika ada
        if (milestone_id) {
          const { data: milestone } = await supabase
            .from('milestones')
            .select('id, title, quest_id')
            .eq('id', milestone_id)
            .single();
          if (milestone) {
            milestone_title = milestone.title;
            quest_id = milestone.quest_id;
          }
          // Ambil quest jika ada
          if (quest_id) {
            const { data: quest } = await supabase
              .from('quests')
              .select('id, title')
              .eq('id', quest_id)
              .single();
            if (quest) {
              quest_title = quest.title;
            }
          }
        }
      }
      return {
        ...log,
        task_title,
        task_type,
        milestone_id,
        milestone_title,
        quest_id,
        quest_title,
      };
    })
  );

  return logsWithHierarchy;
}

