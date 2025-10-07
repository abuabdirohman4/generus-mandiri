"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Update task using RPC function for atomic operations
 */
export async function updateMainQuestTask(
  taskId: string,
  title: string,
  status: 'TODO' | 'DONE',
  displayOrder: number
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('update_main_quests', {
      p_task_id: taskId,
      p_title: title,
      p_status: status,
      p_display_order: displayOrder,
      p_user_id: user.id,
    });

    if (error) {
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to update task');
    }

    // Revalidate Main Quests page
    revalidatePath('/planning/main-quests');
    
    return {
      success: true,
      task: data.task,
      milestoneId: data.milestone_id,
      questId: data.quest_id,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create new task using RPC function
 */
export async function createMainQuestTask(
  milestoneId: string,
  title: string,
  displayOrder: number
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // For now, use the existing addTask function
    // TODO: Create create_main_quests RPC function
    const formData = new FormData();
    formData.append('milestone_id', milestoneId);
    formData.append('title', title);
    formData.append('display_order', String(displayOrder));

    const { addTask } = await import('./taskActions');
    const result = await addTask(formData);

    // Revalidate Main Quests page
    revalidatePath('/planning/main-quests');
    
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete task using RPC function
 */
export async function deleteMainQuestTask(taskId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // For now, use the existing deleteTask function
    // TODO: Create delete_main_quests RPC function
    const { deleteTask } = await import('./taskActions');
    const result = await deleteTask(taskId);

    // Revalidate Main Quests page
    revalidatePath('/planning/main-quests');
    
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Update subtask using RPC function
 */
export async function updateMainQuestSubtask(
  taskId: string,
  title: string,
  status: 'TODO' | 'DONE',
  displayOrder: number
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use the same RPC function for subtasks
    const { data, error } = await supabase.rpc('update_main_quests', {
      p_task_id: taskId,
      p_title: title,
      p_status: status,
      p_display_order: displayOrder,
      p_user_id: user.id,
    });

    if (error) {
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to update subtask');
    }

    // Revalidate multiple paths to ensure all data is fresh
    revalidatePath('/planning/main-quests');
    revalidatePath('/execution/weekly-sync'); // Also revalidate weekly sync
    revalidatePath('/execution/daily-sync');  // Also revalidate daily sync
    
    return {
      success: true,
      task: data.task,
      milestoneId: data.milestone_id,
      questId: data.quest_id,
    };
  } catch (error) {
    throw error;
  }
}
