"use server";

import { createClient } from '@/lib/supabase/server';

// Ambil semua subtask untuk parent_task_id tertentu
export async function getSubtasksForTask(parent_task_id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, display_order, parent_task_id, milestone_id')
    .eq('parent_task_id', parent_task_id)
    .order('display_order', { ascending: true });
  
  if (error) {
    return [];
  }
  
  return data;
}
