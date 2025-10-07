"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Add a side quest directly to daily plan
export async function addSideQuest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const title = formData.get('title')?.toString();
  const date = formData.get('date')?.toString();
  
  if (!title || !date) {
    throw new Error('Title and date are required');
  }

  try {
    // First, create a task for the side quest
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        type: 'SIDE_QUEST',
        status: 'TODO',
        milestone_id: null // Side quest tidak perlu milestone_id
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // Then add it to daily plan
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .upsert({ user_id: user.id, plan_date: date }, { onConflict: 'user_id,plan_date' })
      .select()
      .single();

    if (planError) throw planError;

    // Add to daily plan items with SIDE_QUEST type
    await supabase.from('daily_plan_items').insert({
      daily_plan_id: plan.id,
      item_id: task.id,
      item_type: 'SIDE_QUEST',
      status: 'TODO'
    });

    revalidatePath('/execution/daily-sync');
    return task;
  } catch (error) {
    console.error('Error adding side quest:', error);
    throw error;
  }
}
