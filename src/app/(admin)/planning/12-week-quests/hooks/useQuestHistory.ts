"use client";

import useSWR from 'swr';
import { getAllQuestsForQuarter } from "../actions";
import type { Quest } from "./useQuestState";
import type { QuestWithContinuity } from "@/types/questContinuity";

export interface QuestHistoryItem {
  year: number;
  quarter: number;
  quarterString: string;
  quests: Quest[];
  questCount: number;
}

/**
 * Custom hook for fetching quest history from previous quarters
 * Uses SWR for efficient caching and revalidation
 */
export function useQuestHistory(currentYear: number, currentQuarter: number) {
  const swrKey = ['quest-history', currentYear, currentQuarter];
  
  const { 
    data: questHistory = [], 
    error, 
    isLoading,
    isValidating,
    mutate
  } = useSWR(
    swrKey,
    async () => {
      const startTime = performance.now();
      
      // Generate quarter list for parallel fetching
      const quartersToFetch = [];
      for (let i = 1; i <= 4; i++) {
        let year = currentYear;
        let quarter = currentQuarter - i;
        
        // Handle year rollover
        if (quarter <= 0) {
          quarter += 4;
          year -= 1;
        }
        
        quartersToFetch.push({ year, quarter });
      }
      
      // ✅ PARALLEL API CALLS - Much faster!
      const questPromises = quartersToFetch.map(({ year, quarter }) => 
        getAllQuestsForQuarter(year, quarter).then(quests => ({
          year,
          quarter,
          quests: quests || []
        }))
      );
      
      const questResults = await Promise.all(questPromises);
      const endTime = performance.now();
      
      // Debug logging for performance monitoring
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 Quest History fetched in ${(endTime - startTime).toFixed(2)}ms for Q${currentQuarter} ${currentYear}`);
      }
      
      // Process results
      const history: QuestHistoryItem[] = [];
      questResults.forEach(({ year, quarter, quests }) => {
        if (quests.length > 0) {
          const questsWithLabels = quests.map(q => ({
            id: q.id,
            label: q.label || '',
            title: q.title
          }));
          
          history.push({
            year,
            quarter,
            quarterString: `Q${quarter} ${year}`,
            quests: questsWithLabels,
            questCount: questsWithLabels.length
          });
        }
      });
      
      return history;
    },
    {
      revalidateOnFocus: false, // Don't revalidate on focus for quest history
      revalidateIfStale: false, // Don't revalidate if stale - quest history rarely changes
      dedupingInterval: 15 * 60 * 1000, // 15 minutes deduping - longer cache
      errorRetryCount: 2, // Retry twice on error
      keepPreviousData: true, // Keep previous data while revalidating
      refreshInterval: 0, // No automatic refresh
      revalidateOnReconnect: false, // Don't revalidate on reconnect
      loadingTimeout: 5000, // 5 second timeout for loading
    }
  );

  const getQuestsFromQuarter = (year: number, quarter: number): Quest[] => {
    const historyItem = questHistory.find(
      item => item.year === year && item.quarter === quarter
    );
    return historyItem?.quests || [];
  };

  const hasQuestHistory = questHistory.length > 0;

  // Manual revalidation function
  const refreshQuestHistory = () => {
    mutate(undefined, { revalidate: true });
  };

  return {
    questHistory,
    isLoading: isLoading || isValidating, // Show loading during validation too
    error: error?.message || null,
    getQuestsFromQuarter,
    hasQuestHistory,
    refreshQuestHistory
  };
}
