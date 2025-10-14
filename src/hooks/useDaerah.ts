'use client';

import useSWR from 'swr';
import { getAllDaerah } from '@/app/(admin)/organisasi/actions/daerah';

const fetcher = async () => {
  return await getAllDaerah();
};

export function useDaerah() {
  const { data, error, isLoading, mutate } = useSWR(
    'daerah-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  );

  return {
    daerah: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
