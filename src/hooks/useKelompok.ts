'use client';

import useSWR from 'swr';
import { getAllKelompok } from '@/app/(admin)/organisasi/actions/kelompok';

const fetcher = async () => {
  const fetchWithTimeout = (promise: Promise<any>, timeoutMs = 30000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ])
  }

  try {
    const result = await fetchWithTimeout(getAllKelompok(), 30000)
    return result || []
  } catch (error: any) {
    console.error('useKelompok - Fetch error:', error)
    return []
  }
};

export function useKelompok() {
  const { data, error, isLoading, mutate } = useSWR(
    'kelompok-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        console.error('useKelompok SWR Error:', error)
      }
    }
  );

  return {
    kelompok: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
