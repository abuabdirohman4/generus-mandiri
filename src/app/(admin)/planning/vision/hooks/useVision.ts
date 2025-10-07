import useSWR from 'swr';

import { getVisions } from '@/app/(admin)/planning/vision/actions';
import { visionKeys } from '@/lib/swr';

export interface Vision {
  life_area: string;
  vision_3_5_year?: string;
  vision_10_year?: string;
}

/**
 * Custom hook for fetching visions
 * ✅ OPTIMIZED: Conservative settings for better performance
 */
export function useVisions() {
  const { 
    data: visions = [], 
    error, 
    isLoading,
    mutate 
  } = useSWR(
    visionKeys.list(),
    () => getVisions(),
    {
      revalidateOnFocus: false, // ✅ Disabled aggressive revalidation
      revalidateIfStale: false, // ✅ Disabled stale revalidation
      dedupingInterval: 10 * 60 * 1000, // ✅ 10 minutes - already optimized
      errorRetryCount: 1, // ✅ Reduced retry count
    }
  );

  return {
    visions,
    error,
    isLoading,
    mutate,
  };
} 