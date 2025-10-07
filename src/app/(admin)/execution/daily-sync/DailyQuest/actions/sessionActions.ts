"use server";

import { createClient } from '@/lib/supabase/server';

export async function countCompletedSessions(dailyPlanItemId: string, date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // Ambil item_id dari daily_plan_items
    const { data: dailyPlanItem, error: itemError } = await supabase
      .from('daily_plan_items')
      .select('item_id')
      .eq('id', dailyPlanItemId)
      .single();
    if (itemError) throw itemError;
    const itemId = dailyPlanItem?.item_id;
    if (!itemId) throw new Error('Item ID not found');

    // Hitung jumlah sesi FOCUS di activity_logs untuk item_id dan local_date
    const { count, error: countError } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('task_id', itemId)
      .eq('type', 'FOCUS')
      .eq('local_date', date);
    if (countError) throw countError;
    return count || 0;
  } catch (error) {
    console.error('Error counting completed sessions:', error);
    throw error;
  }
}
