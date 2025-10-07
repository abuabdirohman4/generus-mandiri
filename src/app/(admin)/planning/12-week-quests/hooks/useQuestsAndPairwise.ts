import useSWR from 'swr';

import { getAllQuestsForQuarter, getPairwiseResults } from '../actions';

/**
 * Custom hook for fetching both quests and pairwise results
 * ✅ OPTIMIZED: Single SWR hook for both data types
 */
export function useQuestsAndPairwise(year: number, quarter: number) {
  const swrKey = ['quests-and-pairwise-optimized', year, quarter];
  
  const { 
    data = { quests: [], pairwiseResults: {} }, 
    error, 
    isLoading,
    mutate 
  } = useSWR(
    swrKey,
    async () => {
      // ✅ BATCH API CALLS - Get both data types in parallel
      const [quests, pairwiseResults] = await Promise.all([
        getAllQuestsForQuarter(year, quarter),
        getPairwiseResults(year, quarter)
      ]);
      
      return { quests, pairwiseResults };
    },
    {
      revalidateOnFocus: true, // ✅ Enable revalidation on focus
      revalidateIfStale: true, // ✅ Enable revalidation if stale
      dedupingInterval: 30 * 1000, // ✅ 30 seconds - shorter cache
      errorRetryCount: 3, // ✅ Standard retry count
      keepPreviousData: true, // Keep previous data while revalidating
      refreshInterval: 0, // No automatic refresh
    }
  );


  return {
    quests: data.quests,
    pairwiseResults: data.pairwiseResults,
    error,
    isLoading,
    mutate,
  };
} 