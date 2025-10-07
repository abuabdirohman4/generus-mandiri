"use client";

import { useState, useEffect } from "react";
import type { Quest } from './useQuestState';

/**
 * Custom hook for managing pairwise comparison state and localStorage persistence
 * Handles pairwise results storage, retrieval, and management
 */
export function usePairwiseComparison(quests: Quest[], year: number, quarter: number, initialPairwiseResults: { [key: string]: string }) {
  const localKey = `better-planner-pairwise-${year}-Q${quarter}`;
  const [pairwiseResults, setPairwiseResults] = useState<{ [key: string]: string }>({});
  const [hasPairwiseChanges, setHasPairwiseChanges] = useState(false);
  const [lastSavedPairwiseState, setLastSavedPairwiseState] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Prioritize server data over localStorage
    if (initialPairwiseResults && Object.keys(initialPairwiseResults).length > 0) {
      setPairwiseResults(initialPairwiseResults);
      setLastSavedPairwiseState(initialPairwiseResults);
      setHasPairwiseChanges(false);
    } else {
      // Fallback to localStorage only if no server data
      try {
        const saved = localStorage.getItem(localKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Object.keys(parsed).length > 0) {
            setPairwiseResults(parsed);
            setLastSavedPairwiseState(parsed);
            setHasPairwiseChanges(false);
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [initialPairwiseResults, localKey]);

  useEffect(() => {
    // Only save to localStorage if we have data and it's different from server data
    if (Object.keys(pairwiseResults).length > 0) {
      try {
        localStorage.setItem(localKey, JSON.stringify(pairwiseResults));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [pairwiseResults, localKey]);

  const handlePairwiseClick = (row: number, col: number, winner: 'row' | 'col') => {
    // Ensure quests array is valid before accessing elements
    if (row < 0 || row >= quests.length || col < 0 || col >= quests.length) {
      return;
    }
    
    // Only allow comparison if both quests have titles
    if (!quests[row].title.trim() || !quests[col].title.trim()) {
      return;
    }
    
    const key = `${quests[row].label}-${quests[col].label}`;
    setPairwiseResults(prev => {
      const newResults = {
        ...prev,
        [key]: winner === 'row' ? quests[row].label : quests[col].label
      };
      
      // Check if there are changes compared to last saved state
      const hasChanges = Object.keys(newResults).some(resultKey => 
        newResults[resultKey] !== lastSavedPairwiseState[resultKey]
      ) || Object.keys(lastSavedPairwiseState).some(resultKey => 
        lastSavedPairwiseState[resultKey] !== newResults[resultKey]
      );
      
      setHasPairwiseChanges(hasChanges);
      return newResults;
    });
  };

  const handleReset = () => {
    setPairwiseResults({});
    setLastSavedPairwiseState({});
    setHasPairwiseChanges(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(localKey);
    }
  };

  const getCompletionPercentage = () => {
    const totalComparisons = (quests.length * (quests.length - 1)) / 2;
    const completedComparisons = Object.keys(pairwiseResults).length;
    return totalComparisons > 0 ? (completedComparisons / totalComparisons) * 100 : 0;
  };

  // Check if there are any pairwise comparisons made
  const hasAnyPairwiseComparisons = () => {
    return Object.keys(pairwiseResults).length > 0;
  };

  // Mark current pairwise state as saved (after successful commit)
  const markPairwiseAsSaved = () => {
    setLastSavedPairwiseState({...pairwiseResults});
    setHasPairwiseChanges(false);
  };

  return {
    pairwiseResults,
    setPairwiseResults,
    handlePairwiseClick,
    handleReset,
    localKey,
    getCompletionPercentage,
    hasPairwiseChanges,
    hasAnyPairwiseComparisons,
    markPairwiseAsSaved
  };
}
