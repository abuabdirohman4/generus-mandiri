'use client';

import useSWR from 'swr';
import { getAllDesa } from '@/app/(admin)/organisasi/actions/desa';

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
    const result = await fetchWithTimeout(getAllDesa(), 30000)
    return result || []
  } catch (error: any) {
    console.error('useDesa - Fetch error:', error)
    return []
  }
};

export function useDesa() {
  const { data, error, isLoading, mutate } = useSWR(
    'desa-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        console.error('useDesa SWR Error:', error)
      }
    }
  );

  return {
    desa: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
