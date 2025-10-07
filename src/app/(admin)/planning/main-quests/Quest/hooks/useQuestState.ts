import { useState, useEffect } from 'react';
import { getQuests } from '../../actions/questActions';

interface Quest {
  id: string;
  title: string;
  motivation?: string;
}

export function useQuestState(year: number, quarter: number) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch quests on mount and when year/quarter changes
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getQuests(year, quarter, true);
        setQuests(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch quests'));
        setQuests([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuests();
  }, [year, quarter]);

  return {
    quests,
    error,
    isLoading,
  };
}