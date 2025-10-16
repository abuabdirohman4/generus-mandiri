'use client';

import useSWR from 'swr';
import { getAllKelompok } from '@/app/(admin)/organisasi/actions/kelompok';

const fetcher = async () => {
  return await getAllKelompok();
};

export function useKelompok() {
  const { data, error, isLoading, mutate } = useSWR(
    'kelompok-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  );

  return {
    kelompok: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
