'use client';

import useSWR from 'swr';
import { getAllDesa } from '@/app/(admin)/organisasi/actions/desa';

const fetcher = async () => {
  return await getAllDesa();
};

export function useDesa() {
  const { data, error, isLoading, mutate } = useSWR(
    'desa-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  );

  return {
    desa: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
