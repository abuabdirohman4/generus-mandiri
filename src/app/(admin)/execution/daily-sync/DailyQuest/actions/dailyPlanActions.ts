"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';

export async function setDailyPlan(date: string, selectedItems: { item_id: string; item_type: string }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const user_id = user.id;

  try {
    // Upsert daily_plans
    const { data: plan, error: upsertError } = await supabase
      .from('daily_plans')
      .upsert({ user_id: user_id, plan_date: date }, { onConflict: 'user_id,plan_date' })
      .select()
      .single();

    if (upsertError) throw upsertError;
    const daily_plan_id = plan.id;

    // Get existing items to preserve their status and type
    const { data: existingItems } = await supabase
      .from('daily_plan_items')
      .select('item_id, status, item_type, daily_session_target, focus_duration')
      .eq('daily_plan_id', daily_plan_id);

    // Create a map of existing items for quick lookup
    const existingItemsMap = new Map();
    existingItems?.forEach(item => {
      existingItemsMap.set(item.item_id, item);
    });

    // Get the item types from selectedItems to determine what to delete
    const itemTypesToUpdate = [...new Set(selectedItems.map(item => item.item_type))];
    
    // Delete only existing items of the same types as selectedItems
    if (itemTypesToUpdate.length > 0) {
      await supabase
        .from('daily_plan_items')
        .delete()
        .eq('daily_plan_id', daily_plan_id)
        .in('item_type', itemTypesToUpdate);
    }

    // Insert new items with preserved status and type
    if (selectedItems.length > 0) {
      const itemsToInsert = selectedItems.map((item) => {
        const existingItem = existingItemsMap.get(item.item_id);
        return { 
          ...item, 
          daily_plan_id,
          status: existingItem?.status || 'TODO', // Preserve existing status
          daily_session_target: existingItem?.daily_session_target || 1, // Preserve existing target
          focus_duration: existingItem?.focus_duration || 25 // Default 25 minutes
        };
      });
      await supabase.from('daily_plan_items').insert(itemsToInsert);
    }

    // ✅ CRITICAL: Revalidate all daily sync related paths
    revalidatePath('/execution/daily-sync');
    revalidatePath('/execution');
    
    return { success: true };
  } catch (error) {
    console.error('Error setting daily plan:', error);
    throw error;
  }
}

export async function updateDailyPlanItemFocusDuration(dailyPlanItemId: string, focusDuration: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const { error } = await supabase
      .from('daily_plan_items')
      .update({ focus_duration: focusDuration })
      .eq('id', dailyPlanItemId);

    if (error) throw error;

    // ✅ CRITICAL: Revalidate daily sync paths to ensure UI updates
    revalidatePath('/execution/daily-sync');
    revalidatePath('/execution');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating focus duration:', error);
    throw error;
  }
}

export async function updateDailyPlanItemAndTaskStatus(
  dailyPlanItemId: string, 
  taskId: string, 
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
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
      p_goal_slot: null, // Not used for daily sync
      p_date: new Date().toISOString().split('T')[0],
      p_daily_plan_item_id: dailyPlanItemId
    });

    if (error) {
      throw error;
    }

    // ✅ CRITICAL: Revalidate multiple paths to ensure cross-page synchronization
    revalidatePath('/execution/daily-sync');
    revalidatePath('/execution');
    revalidatePath('/planning/main-quests');
    revalidatePath('/execution/weekly-sync');
    
    return data;
  } catch (error) {
    console.error("Error in updateDailyPlanItemAndTaskStatus:", error);
    throw error;
  }
}
