'use client';

import useSWR from 'swr';
import { getAllDaerah } from '@/app/(admin)/organisasi/actions/daerah';

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
    const result = await fetchWithTimeout(getAllDaerah(), 30000)
    return result || []
  } catch (error: any) {
    console.error('useDaerah - Fetch error:', error)
    return []
  }
};

export function useDaerah() {
  const { data, error, isLoading, mutate } = useSWR(
    'daerah-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        console.error('useDaerah SWR Error:', error)
      }
    }
  );

  return {
    daerah: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
