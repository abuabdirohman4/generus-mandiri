"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Remove a weekly goal
export async function removeWeeklyGoal(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not found');

  try {
    const { error } = await supabase
      .from('weekly_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/execution/weekly-sync');
    return { success: true, message: 'Weekly goal removed successfully' };
  } catch (error) {
    console.error('Error removing weekly goal:', error);
    throw new Error('Failed to remove weekly goal');
  }
}

// Set weekly goal items for a specific slot
export async function setWeeklyGoalItems(data: {
  year: number;
  quarter: number;
  weekNumber: number;
  goalSlot: number;
  items: Array<{ id: string; type: 'QUEST' | 'MILESTONE' | 'TASK' | 'SUBTASK' }>;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');
    // First, check if weekly goal already exists for this slot
    const { data: existingGoal, error: checkError } = await supabase
      .from('weekly_goals')
      .select('id')
      .eq('user_id', user.id)
      .eq('year', data.year)
      .eq('week_number', data.weekNumber)
      .eq('goal_slot', data.goalSlot)
      .single();

    let weeklyGoal;
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingGoal) {
      // Update existing goal
      const { data: updatedGoal, error: updateError } = await supabase
        .from('weekly_goals')
        .update({
          quarter: data.quarter
        })
        .eq('id', existingGoal.id)
        .select('id')
        .single();
      
      if (updateError) throw updateError;
      weeklyGoal = updatedGoal;
    } else {
      // Insert new goal
      const { data: newGoal, error: insertError } = await supabase
        .from('weekly_goals')
        .insert({
          user_id: user.id,
          year: data.year,
          quarter: data.quarter,
          week_number: data.weekNumber,
          goal_slot: data.goalSlot
        })
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      weeklyGoal = newGoal;
    }

    // ✅ FIXED: Preserve existing status when updating goal items
    // First, get existing items with their status
    const { data: existingItems } = await supabase
      .from('weekly_goal_items')
      .select('item_id, status')
      .eq('weekly_goal_id', weeklyGoal.id);

    // Create a map of existing statuses
    const existingStatusMap = new Map();
    existingItems?.forEach(item => {
      existingStatusMap.set(item.item_id, item.status);
    });

    // Second, delete all existing goal items for this slot
    const { error: deleteError } = await supabase
      .from('weekly_goal_items')
      .delete()
      .eq('weekly_goal_id', weeklyGoal.id);

    if (deleteError) {
      throw deleteError;
    }

    if (data.items.length > 0) {
      // Remove duplicates from items array
      const uniqueItems = data.items.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );

      const goalItemsData = uniqueItems.map(item => ({
        weekly_goal_id: weeklyGoal.id,
        item_id: item.id,
        status: existingStatusMap.get(item.id) || 'TODO' // ✅ Preserve existing status or default to TODO
      }));

      const { error: insertError } = await supabase
        .from('weekly_goal_items')
        .insert(goalItemsData);

      if (insertError) {
        // If unique constraint violation, ignore it (item already exists)
        if (insertError.code === '23505') {
          // Some items already exist in this weekly goal, skipping duplicates
        } else {
          throw insertError;
        }
      }
    }

    revalidatePath('/execution/weekly-sync');
    return { success: true, message: 'Weekly goal items set successfully' };
  } catch (error) {
    console.error('Error setting weekly goal items:', error);
    throw new Error('Failed to set weekly goal items');
  }
}
