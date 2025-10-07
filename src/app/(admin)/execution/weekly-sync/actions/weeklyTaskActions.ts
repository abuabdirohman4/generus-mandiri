"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateWeeklyTaskStatus(
  taskId: string,
  goalSlot: number,
  status: 'TODO' | 'IN_PROGRESS' | 'DONE',
  weekDate?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('update_task_and_daily_plan_status', {
      p_task_id: taskId,
      p_status: status,
      p_user_id: user.id,
      p_goal_slot: goalSlot,
      p_date: weekDate || new Date().toISOString().split('T')[0], // Use provided weekDate or today's date
      p_daily_plan_item_id: null // Not used for weekly sync
    });

    if (error) {
      throw error;
    }

    // Revalidate multiple paths to ensure cross-page synchronization
    revalidatePath('/execution/weekly-sync');
    revalidatePath('/planning/main-quests');
    revalidatePath('/execution/daily-sync');
    return data;
  } catch (error) {
    console.error("Error in updateWeeklyTaskStatus:", error);
    throw error;
  }
}
