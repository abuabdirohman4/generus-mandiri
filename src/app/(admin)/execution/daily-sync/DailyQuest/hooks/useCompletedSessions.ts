import { useMemo } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { dailySyncKeys } from '@/lib/swr';

interface CompletedSessionsOptions {
  selectedDate: string;
  dailyPlanItems: Array<{ id: string; item_id: string; item_type: string }>;
}

// Fetch completed sessions for all daily plan items
async function getCompletedSessions(selectedDate: string, dailyPlanItems: Array<{ id: string; item_id: string; item_type: string }>) {
  if (!dailyPlanItems.length) return {};

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  try {
    // Get all task IDs from daily plan items
    const taskIds = dailyPlanItems
      .filter(item => item.item_type === 'MAIN_QUEST' || item.item_type === 'SIDE_QUEST' || item.item_type === 'WORK_QUEST')
      .map(item => item.item_id);

    if (taskIds.length === 0) return {};

    // Query activity_logs for FOCUS sessions on the selected date
    const { data: activityLogs, error } = await supabase
      .from('activity_logs')
      .select('task_id, type')
      .eq('user_id', user.id)
      .eq('local_date', selectedDate)
      .eq('type', 'FOCUS')
      .in('task_id', taskIds);

    if (error) {
      console.error('Error fetching completed sessions:', error);
      return {};
    }

    // Count sessions per task
    const sessionCounts: Record<string, number> = {};
    
    // Initialize all daily plan items with 0
    dailyPlanItems.forEach(item => {
      sessionCounts[item.id] = 0;
    });

    // Count actual sessions
    activityLogs?.forEach(log => {
      // Find the daily plan item that corresponds to this task
      const dailyPlanItem = dailyPlanItems.find(item => item.item_id === log.task_id);
      if (dailyPlanItem) {
        sessionCounts[dailyPlanItem.id] = (sessionCounts[dailyPlanItem.id] || 0) + 1;
      }
    });

    return sessionCounts;
  } catch (error) {
    console.error('Error in getCompletedSessions:', error);
    return {};
  }
}

export function useCompletedSessions({ selectedDate, dailyPlanItems }: CompletedSessionsOptions) {
  const taskIds = dailyPlanItems
    .filter(item => item.item_type === 'MAIN_QUEST' || item.item_type === 'SIDE_QUEST' || item.item_type === 'WORK_QUEST')
    .map(item => item.item_id);

  const { data: completedSessions = {}, error, isLoading } = useSWR(
    selectedDate && taskIds.length > 0 
      ? dailySyncKeys.allCompletedSessions(taskIds, selectedDate)
      : null,
    () => getCompletedSessions(selectedDate, dailyPlanItems),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10 * 1000, // 10 seconds for fresh data
      errorRetryCount: 3,
    }
  );

  return {
    completedSessions,
    isLoading,
    error: error?.message || null,
  };
}
