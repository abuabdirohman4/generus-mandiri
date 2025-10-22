import useSWR from 'swr';
import { getAllClassesByKelompok } from '@/app/(admin)/kelas/actions/classes';

export function useKelas() {
  const { data, error, isLoading, mutate } = useSWR(
    'all-classes',
    getAllClassesByKelompok,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  return {
    kelas: data || [],
    isLoading,
    error,
    mutate
  };
}



