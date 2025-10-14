'use client';

import useSWR from 'swr';
import { getAllTeachers } from '@/app/(admin)/users/guru/actions';

const fetcher = async () => {
  return await getAllTeachers();
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
