'use client';

import useSWR from 'swr';
import { getDashboard, Dashboard } from '@/app/(admin)/dashboard/actions';
import { getCurrentUserId } from '@/lib/userUtils';

const fetcher = async (): Promise<Dashboard> => {
  return await getDashboard();
};

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR<Dashboard>(
    'dashboard-stats',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
    }
  );

  return {
    stats: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
