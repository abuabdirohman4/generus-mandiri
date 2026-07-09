'use client';

import useSWR from 'swr';
import { getAllAdmins } from '@/app/(admin)/users/admin/actions';

const fetcher = async () => {
  const result = await getAllAdmins();
  if (!result.success) throw new Error(result.message || 'Gagal memuat data admin');
  return result.data;
};

export function useAdmins() {
  const { data, error, isLoading, mutate } = useSWR(
    'admins-list',
    fetcher,
    {
      revalidateOnFocus: false, // sm-kt2j: full-list payload was re-fetched on every focus, dominant egress cost
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
