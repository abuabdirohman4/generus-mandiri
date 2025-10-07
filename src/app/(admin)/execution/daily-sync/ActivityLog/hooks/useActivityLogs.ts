import { useEffect } from 'react';
import useSWR from 'swr';
import { getTodayActivityLogs } from '../actions/activityLoggingActions';
import { dailySyncKeys } from '@/lib/swr';

export interface ActivityLogItem {
  id: string;
  type: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK' | 'BREAK';
  task_id?: string;
  task_title?: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  milestone_id?: string;
  milestone_title?: string | null;
  quest_id?: string;
  quest_title?: string | null;
  what_done?: string | null;
  what_think?: string | null;
}

export interface UseActivityLogsOptions {
  date: string;
  refreshKey?: number;
  lastActivityTimestamp?: number;
}

export interface UseActivityLogsReturn {
  logs: ActivityLogItem[];
  isLoading: boolean;
  error: string | null;
  mutate: () => void;
  updateLogJournal: (logId: string, whatDone: string, whatThink: string) => void;
}

export function useActivityLogs({ 
  date, 
  refreshKey, 
  lastActivityTimestamp 
}: UseActivityLogsOptions): UseActivityLogsReturn {
  const { 
    data: logs = [], 
    error, 
    isLoading,
    mutate 
  } = useSWR(
    // ✅ FIX: Use stable key that only changes with date
    dailySyncKeys.activityLogs(date),
    () => getTodayActivityLogs(date),
    {
      revalidateOnFocus: true, // ✅ ENABLED - Allow revalidation on focus for fresh data
      revalidateIfStale: true, // ✅ ENABLED - Allow revalidation of stale data
      revalidateOnReconnect: true,
      dedupingInterval: 10 * 1000, // ✅ 10 seconds for very fresh activity data
      errorRetryCount: 3,
      // Keep previous data while revalidating for smooth UX
      keepPreviousData: true,
    }
  );

  // ✅ NEW: Manual revalidation when refreshKey or lastActivityTimestamp changes
  useEffect(() => {
    if (refreshKey || lastActivityTimestamp) {
      // Trigger revalidation when there's new activity
      mutate();
    }
  }, [refreshKey, lastActivityTimestamp, mutate]);

  // ✅ NEW: Optimistic update for journal data
  const updateLogJournal = (logId: string, whatDone: string, whatThink: string) => {
    mutate(
      (currentLogs) => {
        if (!currentLogs) return currentLogs;
        
        return currentLogs.map((log) => 
          log.id === logId 
            ? { ...log, what_done: whatDone, what_think: whatThink }
            : log
        );
      },
      false // Don't revalidate immediately
    );
  };

  return {
    logs,
    isLoading,
    error: error?.message || null,
    mutate,
    updateLogJournal,
  };
}
