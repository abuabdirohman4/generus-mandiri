"use client";

import { useState, useEffect } from "react";

const QUEST_LABELS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'
];

export interface Quest {
  id?: string;
  label: string;
  title: string;
  type?: 'PERSONAL' | 'WORK';
  // Continuity tracking fields
  source_quest_id?: string;
  is_continuation?: boolean;
  continuation_strategy?: string;
  continuation_date?: string;
}

/**
 * Custom hook for managing quest state and input handling
 * Handles quest initialization, updates, and validation
 */
export function useQuestState(initialQuests: { id?: string, title: string, label?: string }[]) {
  const [quests, setQuests] = useState<Quest[]>(
    QUEST_LABELS.map(label => ({ label, title: "", type: 'PERSONAL' as const }))
  );
  const [highlightEmpty, setHighlightEmpty] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<Quest[]>([]);

  useEffect(() => {
    if (initialQuests && initialQuests.length > 0) {
      const padded = QUEST_LABELS.map((label) => {
        const q = initialQuests.find(q => q.label === label);
        return q ? { id: q.id, label: label, title: q.title, type: 'PERSONAL' as const } : { label, title: "", type: 'PERSONAL' as const };
      });
      setQuests(padded);
      setLastSavedState(padded); // Set initial saved state
      setHasUnsavedChanges(false);
    } else {
      // Only reset if we don't have any quests with titles
      setQuests(prev => {
        const hasTitles = prev.some(q => q.title.trim() !== "");
        if (hasTitles) {
          return prev; // Keep existing data
        }
        const emptyQuests = QUEST_LABELS.map(label => ({ label, title: "", type: 'PERSONAL' as const }));
        setLastSavedState(emptyQuests);
        setHasUnsavedChanges(false);
        return emptyQuests;
      });
    }
  }, [initialQuests?.length, initialQuests?.map(q => `${q.id}-${q.title}`).join(',')]);

  const handleQuestTitleChange = (idx: number, value: string) => {
    setQuests(qs => {
      const next = [...qs];
      next[idx] = { 
        ...next[idx], 
        title: value,
        // Preserve the original ID if it exists
        id: next[idx].id
      };
      return next;
    });
    setHighlightEmpty(false);
    
    // Check if there are unsaved changes
    setQuests(prev => {
      const hasChanges = prev.some((quest, index) => {
        const savedQuest = lastSavedState[index];
        return !savedQuest || quest.title !== savedQuest.title;
      });
      setHasUnsavedChanges(hasChanges);
      return prev;
    });
  };

  const validateQuests = () => {
    const filledQuests = quests.filter(q => q.title.trim() !== "");
    if (filledQuests.length === 0) {
      setHighlightEmpty(true);
      return false;
    }
    return true;
  };

  const getFilledQuests = () => quests.filter(q => q.title.trim() !== "");

  const importQuests = (importedQuests: Quest[]) => {
    setQuests(prev => {
      const newQuests = [...prev];
      
      // Find empty slots from top to bottom
      const emptySlots: number[] = [];
      for (let i = 0; i < newQuests.length; i++) {
        if (!newQuests[i].title.trim()) {
          emptySlots.push(i);
        }
      }
      
      // Check if we have enough empty slots
      if (emptySlots.length < importedQuests.length) {
        console.warn(`Tidak bisa import ${importedQuests.length} quest. Hanya ada ${emptySlots.length} slot kosong.`);
        return prev; // Return unchanged if not enough slots
      }
      
      // Fill empty slots with imported quests
      importedQuests.forEach((imported, idx) => {
        const slotIndex = emptySlots[idx];
        if (slotIndex !== undefined) {
          newQuests[slotIndex] = {
            id: undefined, // Will be generated when saved
            label: newQuests[slotIndex].label, // Keep original label (A, B, C, etc.)
            title: imported.title,
            type: 'PERSONAL' as const,
            // Continuity tracking fields
            source_quest_id: imported.id, // Original quest ID from previous quarter
            is_continuation: true,
            continuation_strategy: 'copy',
            continuation_date: new Date().toISOString()
          };
        }
      });
      
      return newQuests;
    });
    
    // Mark as having unsaved changes after import
    setQuests(prev => {
      const hasChanges = prev.some((quest, index) => {
        const savedQuest = lastSavedState[index];
        return !savedQuest || quest.title !== savedQuest.title;
      });
      setHasUnsavedChanges(hasChanges);
      return prev;
    });
    
    setHighlightEmpty(false);
  };

  const clearAllQuests = () => {
    const emptyQuests = QUEST_LABELS.map(label => ({ label, title: "", type: 'PERSONAL' as const }));
    setQuests(emptyQuests);
    setLastSavedState(emptyQuests);
    setHasUnsavedChanges(false);
    setHighlightEmpty(false);
  };

  // Mark current state as saved
  const markAsSaved = () => {
    setLastSavedState([...quests]);
    setHasUnsavedChanges(false);
  };

  // Check if there are any new quest inputs (not just changes to existing ones)
  const hasNewQuestInputs = () => {
    return quests.some(quest => quest.title.trim() !== "" && !quest.id);
  };

  // Check if there are any quest inputs at all
  const hasAnyQuestInputs = () => {
    return quests.some(quest => quest.title.trim() !== "");
  };

  return {
    quests,
    setQuests,
    highlightEmpty,
    setHighlightEmpty,
    handleQuestTitleChange,
    validateQuests,
    getFilledQuests,
    importQuests,
    clearAllQuests,
    hasUnsavedChanges,
    markAsSaved,
    hasNewQuestInputs,
    hasAnyQuestInputs,
    QUEST_LABELS
  };
}
