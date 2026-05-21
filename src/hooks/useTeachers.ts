'use client';

import useSWR from 'swr';
import { getAllTeachers } from '@/app/(admin)/users/guru/actions';

const fetcher = async () => {
  const result = await getAllTeachers();
  if (!result.success) throw new Error(result.message || 'Gagal memuat data guru');
  return result.data;
};

export function useTeachers() {
  const { data, error, isLoading, mutate } = useSWR(
    'teachers-list',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  );

  return {
    teachers: data,
    isLoading,
    error: error?.message,
    mutate
  };
}
