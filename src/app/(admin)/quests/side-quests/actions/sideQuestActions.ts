"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SideQuest } from "../types";

export async function getSideQuests(): Promise<SideQuest[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'SIDE_QUEST')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching side quests:', error);
    return [];
  }
}

export async function updateSideQuestStatus(taskId: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE'): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('tasks')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    revalidatePath('/quests/side-quests');
  } catch (error) {
    console.error('Error updating side quest status:', error);
    throw error;
  }
}
