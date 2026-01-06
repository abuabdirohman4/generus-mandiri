'use client';

import useSWR from 'swr';
import { getDashboard, Dashboard, DashboardFilters } from '@/app/(admin)/dashboard/actions';

export function useDashboard(filters?: DashboardFilters) {
  const fetcher = async (): Promise<Dashboard> => {
    return await getDashboard(filters);
  };

  // Generate dynamic SWR key based on filters to invalidate cache when filters change
  const swrKey = filters && (filters.daerahId || filters.desaId || filters.kelompokId || filters.classId || filters.gender)
    ? `dashboard-stats-${JSON.stringify(filters)}`
    : 'dashboard-stats';

  const { data, error, isLoading, mutate } = useSWR<Dashboard>(
    swrKey,
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
