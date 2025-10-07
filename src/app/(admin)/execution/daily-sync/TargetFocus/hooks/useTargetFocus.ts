import { useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { dailySyncKeys } from '@/lib/swr';
import { useTargetFocusStore } from '../stores/targetFocusStore';

interface UseTargetFocusOptions {
  selectedDate: string;
}

interface UseTargetFocusReturn {
  totalTimeTarget: number; // Total target in minutes
  totalTimeActual: number; // Total actual focus time in minutes
  totalSessionsTarget: number; // Total target sessions
  totalSessionsActual: number; // Total completed sessions
  progressPercentage: number; // Progress percentage for progress bar
  isLoading: boolean;
  error: string | null;
  updateTargetOptimistically: (itemId: string, newTarget: number) => void; // Function to update target optimistically
}

// Fetch daily plan items and their targets
async function getDailyPlanTargets(selectedDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { targets: [], totalTimeTarget: 0 };

  try {
    // First, get the daily plan
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .select('id, plan_date')
      .eq('plan_date', selectedDate)
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error when no data

    if (planError) {
      console.error('Error fetching daily plan:', planError);
      throw planError;
    }
    
    if (!plan) {
      return { targets: [], totalTimeTarget: 0 };
    }

    // Then get the daily plan items
    const { data: items, error: itemsError } = await supabase
      .from('daily_plan_items')
      .select(`
        id,
        item_id,
        item_type,
        daily_session_target,
        focus_duration
      `)
      .eq('daily_plan_id', plan.id);

    if (itemsError) {
      console.error('Error fetching daily plan items:', itemsError);
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return { targets: [], totalTimeTarget: 0 };
    }

    // Calculate total target
    const targets = items.map((item: any) => ({
      id: item.id,
      itemId: item.item_id,
      itemType: item.item_type,
      sessionTarget: item.daily_session_target || 1,
      focusDuration: item.focus_duration || 25, // Default 25 minutes
      totalTimeTarget: (item.daily_session_target || 1) * (item.focus_duration || 25)
    }));

    const totalTimeTarget = targets.reduce((sum, item) => sum + item.totalTimeTarget, 0);

    return { targets, totalTimeTarget };
  } catch (error) {
    console.error('Error fetching daily plan targets:', error);
    return { targets: [], totalTimeTarget: 0 };
  }
}

// Fetch actual focus time from activity logs
async function getActualFocusTime(selectedDate: string, taskIds: string[]) {
  if (taskIds.length === 0) {
    return 0;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return 0;
  }

  try {
    const { data: activityLogs, error } = await supabase
      .from('activity_logs')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .eq('local_date', selectedDate)
      .eq('type', 'FOCUS')
      .in('task_id', taskIds);

    if (error) {
      console.error('Error fetching focus time:', error);
      return 0;
    }

    const totalMinutes = activityLogs?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0;
    return totalMinutes;
  } catch (error) {
    console.error('Error in getActualFocusTime:', error);
    return 0;
  }
}

export function useTargetFocus({ selectedDate }: UseTargetFocusOptions): UseTargetFocusReturn {
  // Get Zustand store
  const { 
    targetsData, 
    totalTimeActual, 
    totalSessionsActual,
    setTargetsData,
    setTotalTimeActual,
    setTotalSessionsActual,
    updateTargetOptimistically 
  } = useTargetFocusStore();

  // Fetch daily plan targets
  const { 
    data: fetchedTargetsData, 
    error: targetsError, 
    isLoading: targetsLoading,
    mutate: mutateTargets
  } = useSWR(
    selectedDate ? dailySyncKeys.targetFocusData(selectedDate) : null,
    () => getDailyPlanTargets(selectedDate),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0, // No deduplication to ensure fresh data
      errorRetryCount: 3,
    }
  );

  // Update Zustand store when data changes
  useEffect(() => {
    if (fetchedTargetsData) {
      setTargetsData(fetchedTargetsData);
    }
  }, [fetchedTargetsData, setTargetsData]);

  // Get task IDs for focus time query
  const taskIds = targetsData?.targets?.map((item: any) => item.itemId) || [];

  // Fetch actual focus time
  const { 
    data: actualFocusTime = 0, 
    error: focusError, 
    isLoading: focusLoading,
    mutate: mutateFocus
  } = useSWR(
    selectedDate && taskIds.length > 0 
      ? dailySyncKeys.actualFocusTime(selectedDate, taskIds) 
      : null,
    () => getActualFocusTime(selectedDate, taskIds),
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      dedupingInterval: 0, // No deduplication to ensure fresh data
      errorRetryCount: 3,
    }
  );

  // Clear cache when date changes
  useEffect(() => {
    mutateTargets();
    mutateFocus();
  }, [selectedDate, mutateTargets, mutateFocus]);

  // Update actual focus time in Zustand store
  useEffect(() => {
    if (actualFocusTime !== undefined) {
      setTotalTimeActual(actualFocusTime);
      setTotalSessionsActual(Math.floor(actualFocusTime / 25));
    }
  }, [actualFocusTime, setTotalTimeActual, setTotalSessionsActual]);

  // Calculate derived values
  const result = useMemo(() => {
    // Reset to 0 if no data for the selected date
    if (!targetsData || !targetsData.targets || targetsData.targets.length === 0) {
      return {
        totalTimeTarget: 0,
        totalTimeActual: 0,
        totalSessionsTarget: 0,
        totalSessionsActual: 0,
        progressPercentage: 0,
      };
    }

    const totalTimeTarget = targetsData.totalTimeTarget || 0;
    const totalTimeActual = actualFocusTime || 0;

    // Calculate sessions from actual targets, not from time
    const totalSessionsTarget = targetsData.targets.reduce((sum, item) => sum + item.sessionTarget, 0);
    const totalSessionsActual = Math.floor(totalTimeActual / 25);
    // const totalSessionsTarget = 6;
    // const totalSessionsActual = 14;

    // Calculate progress percentage (capped at 100%)
    const progressPercentage = totalTimeTarget > 0 ? Math.min((totalTimeActual / totalTimeTarget) * 100, 100) : 0;

    return {
      totalTimeTarget,
      totalTimeActual,
      totalSessionsTarget,
      totalSessionsActual,
      progressPercentage,
    };
  }, [targetsData, actualFocusTime, selectedDate]);

  return {
    ...result,
    isLoading: targetsLoading || focusLoading,
    error: targetsError?.message || focusError?.message || null,
    updateTargetOptimistically,
  };
}
