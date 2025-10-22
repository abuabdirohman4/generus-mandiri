import useSWR from 'swr';
import { getAllClassMasters } from '@/app/(admin)/kelas/actions/masters';

export function useClassMasters() {
  const { data, error, isLoading, mutate } = useSWR(
    'class-masters',
    getAllClassMasters,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  return {
    masters: data || [],
    isLoading,
    error,
    mutate
  };
}
