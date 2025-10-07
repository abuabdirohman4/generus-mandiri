"use client";

import useSWR from "swr";
import { getSideQuests, updateSideQuestStatus } from '../actions/sideQuestActions';
import { SideQuest } from '../types';

export function useSideQuests() {
  const { 
    data: sideQuests = [], 
    error, 
    isLoading,
    mutate 
  } = useSWR(
    'side-quests',
    () => getSideQuests(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      errorRetryCount: 3,
    }
  );

  const toggleStatus = async (taskId: string, currentStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    try {
      const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
      await updateSideQuestStatus(taskId, newStatus);
      
      // Optimistic update
      mutate((currentData) => 
        (currentData || []).map(quest => 
          quest.id === taskId 
            ? { ...quest, status: newStatus, updated_at: new Date().toISOString() }
            : quest
        ), 
        false
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
      throw err;
    }
  };

  return {
    sideQuests,
    isLoading,
    error: error?.message,
    refetch: () => mutate(),
    toggleStatus
  };
}
