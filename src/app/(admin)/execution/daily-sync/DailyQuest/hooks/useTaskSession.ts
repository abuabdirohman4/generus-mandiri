import React from 'react';
import { DailyPlanItem } from '../types';

export function useTaskSession(
  item: DailyPlanItem, 
  selectedDate: string, 
  completedSessions: Record<string, number>,
  refreshKey?: number, 
  forceRefreshTaskId?: string | null
) {
  const [target, setTarget] = React.useState(item.daily_session_target ?? 1);
  const [savingTarget, setSavingTarget] = React.useState(false);

  // Get completed sessions from optimized data (no additional API call)
  const completedCount = completedSessions[item.id] || 0;

  // Update target when item changes
  React.useEffect(() => {
    setTarget(item.daily_session_target ?? 1);
  }, [item.daily_session_target]);

  const handleTargetChange = async (newTarget: number, onTargetChange?: (itemId: string, newTarget: number) => void) => {
    if (newTarget < 1) return;
    setSavingTarget(true);
    setTarget(newTarget);
    try {
      // TODO: Implement updateDailySessionTarget function
      console.log('Target change:', item.id, newTarget);
      if (onTargetChange) onTargetChange(item.id, newTarget);
    } finally {
      setSavingTarget(false);
    }
  };

  return {
    completed: completedCount,
    loading: false, // No loading state needed - data comes from optimized hook
    target,
    savingTarget,
    handleTargetChange
  };
}
