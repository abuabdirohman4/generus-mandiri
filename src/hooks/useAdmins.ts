'use client';

import useSWR from 'swr';
import { getAllAdmins } from '@/app/(admin)/users/admin/actions';

const fetcher = async () => {
  return await getAllAdmins();
};

export function useAdmins() {
  const { data, error, isLoading, mutate } = useSWR(
    'admins-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  );

  return {
    admins: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
