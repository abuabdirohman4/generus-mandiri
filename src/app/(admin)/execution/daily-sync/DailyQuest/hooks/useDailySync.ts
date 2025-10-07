import useSWR from 'swr';

import { getTasksForWeek } from '../actions/weeklyTasksActions';
import { dailySyncKeys } from '@/lib/swr';

/**
 * Custom hook for fetching tasks for week selection
 * Fallback for when ultra-fast hook doesn't work
 */
export function useTasksForWeek(year: number, weekNumber: number, selectedDate?: string) {
  const { 
    data: tasks = [], 
    error, 
    isLoading,
    mutate 
  } = useSWR(
    dailySyncKeys.tasksForWeek(year, weekNumber, selectedDate),
    () => getTasksForWeek(year, weekNumber, selectedDate),
    {
      revalidateOnFocus: true, // ✅ ENABLED - Allow revalidation on focus for fresh data
      revalidateIfStale: true, // ✅ ENABLED - Allow revalidation of stale data
      revalidateOnReconnect: true,
      dedupingInterval: 30 * 1000, // ✅ REDUCED - 30 seconds for fresher data
      errorRetryCount: 3,
    }
  );

  return {
    tasks,
    error,
    isLoading,
    mutate,
  };
} 