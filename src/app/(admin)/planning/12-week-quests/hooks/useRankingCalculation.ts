"use client";

import { useState, useEffect } from "react";
import type { Quest } from "./useQuestState";

export interface RankedQuest extends Quest {
  score: number;
}

/**
 * Custom hook for calculating quest rankings based on pairwise comparison results
 * Handles score calculation and ranking logic
 */
export function useRankingCalculation(
  quests: Quest[], 
  pairwiseResults: { [key: string]: string }, 
  initialQuests: { id?: string, title: string, label?: string }[]
) {
  const [ranking, setRanking] = useState<RankedQuest[] | null>(null);

  useEffect(() => {
    const filledQuests = quests.filter(q => q.title.trim() !== "");
    if (filledQuests.length < 2) {
      setRanking(null);
      return;
    }
    
    const scores: { [label: string]: number } = {};
    quests.forEach(q => { scores[q.label] = 0; });
    
    Object.values(pairwiseResults).forEach(winner => {
      if (scores[winner] !== undefined) scores[winner] += 1;
    });
    
    // Only rank quests that have titles
    const result = quests
      .filter(q => q.title.trim() !== "")
      .map((q) => {
        const initial = initialQuests.find(init => init.label === q.label);
        return {
          ...q,
          score: scores[q.label] || 0,
          id: initial?.id,
        };
      })
      .sort((a, b) => b.score - a.score);
    
    setRanking(result);
  }, [quests, pairwiseResults, initialQuests]);

  const getTopQuests = (count: number = 3) => {
    if (!ranking) return [];
    return ranking.slice(0, count);
  };

  const getQuestRank = (questLabel: string) => {
    if (!ranking) return -1;
    const found = ranking.find(r => r.label === questLabel);
    return found ? ranking.indexOf(found) + 1 : -1;
  };

  const isQuestInTopThree = (questLabel: string) => {
    const rank = getQuestRank(questLabel);
    return rank > 0 && rank <= 3;
  };

  return { 
    ranking,
    getTopQuests,
    getQuestRank,
    isQuestInTopThree
  };
}
