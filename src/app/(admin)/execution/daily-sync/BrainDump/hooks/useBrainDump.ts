import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { BrainDumpItem } from '../types';
import { 
  getBrainDumpByDate, 
  upsertBrainDump
} from '../actions/actions';
import { dataKeys } from '@/lib/swr';

export interface UseBrainDumpOptions {
  date: string;
  autoRefresh?: boolean;
}

export interface UseBrainDumpReturn {
  // Data
  brainDump: BrainDumpItem | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  saveBrainDump: (content: string) => Promise<BrainDumpItem | null>;
  refreshBrainDump: () => void;
  
  // State
  isSaving: boolean;
}

export function useBrainDump({ date, autoRefresh = true }: UseBrainDumpOptions): UseBrainDumpReturn {
  const [isSaving, setIsSaving] = useState(false);

  // SWR configuration
  const { data, error, isLoading, mutate } = useSWR(
    dataKeys.brainDump.byDate(date),
    () => getBrainDumpByDate(date),
    {
      revalidateOnFocus: autoRefresh,
      revalidateOnReconnect: autoRefresh,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      errorRetryCount: 3,
      refreshInterval: autoRefresh ? 30000 : 0, // 30 seconds if auto refresh enabled
    }
  );

  // Save brain dump (create or update)
  const saveBrainDump = useCallback(async (content: string): Promise<BrainDumpItem | null> => {
    setIsSaving(true);
    try {
      const brainDump = await upsertBrainDump({
        content: content || '',
        date
      });

      if (brainDump) {
        // Optimistic update
        mutate(brainDump, false);
      }

      return brainDump;
    } catch (error) {
      console.error('Error saving brain dump:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [date, mutate]);


  // Refresh brain dump
  const refreshBrainDump = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    // Data
    brainDump: data || null,
    isLoading,
    error: error?.message || null,
    
    // Actions
    saveBrainDump,
    refreshBrainDump,
    
    // State
    isSaving,
  };
}
