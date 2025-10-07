import { useState, useCallback } from 'react';

export function useSubtaskState() {
  const [focusSubtaskId, setFocusSubtaskId] = useState<string | null>(null);
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});

  // 🔧 FIX: Create stable setter functions to prevent unnecessary re-renders
  const stableSetFocusSubtaskId = useCallback((id: string | null) => {
    setFocusSubtaskId(id);
  }, []);

  const stableSetDraftTitles = useCallback((updater: React.SetStateAction<Record<string, string>>) => {
    setDraftTitles(updater);
  }, []);

  return {
    focusSubtaskId,
    setFocusSubtaskId: stableSetFocusSubtaskId,
    draftTitles,
    setDraftTitles: stableSetDraftTitles
  };
}
