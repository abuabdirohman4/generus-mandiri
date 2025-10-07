import { useState, useEffect, useCallback } from 'react';
import { getHierarchicalData } from '../../actions/hierarchicalDataActions';
import type { Quest } from '../../WeeklySyncClient/types';
import { toast } from 'sonner';

export function useHierarchicalData(year: number, quarter: number, isOpen: boolean) {
  const [hierarchicalData, setHierarchicalData] = useState<Quest[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadHierarchicalData = useCallback(async () => {
    setDataLoading(true);
    try {
      const data = await getHierarchicalData(year, quarter);
      setHierarchicalData(data);
    } catch (error) {
      console.error('Error loading hierarchical data:', error);
      toast.error('Gagal memuat data hierarkis');
    } finally {
      setDataLoading(false);
    }
  }, [year, quarter]);

  useEffect(() => {
    if (isOpen) {
      loadHierarchicalData();
    }
  }, [isOpen, loadHierarchicalData]);

  return { hierarchicalData, dataLoading };
}
