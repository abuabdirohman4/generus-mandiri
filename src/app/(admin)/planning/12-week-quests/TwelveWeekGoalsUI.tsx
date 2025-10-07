import { useState } from "react";
import TwelveWeekGoalsSkeleton from "@/components/ui/skeleton/TwelveWeekGoalsSkeleton";
import { useSidebar } from '@/stores/sidebarStore';
import { toast } from 'sonner';
import { 
  useQuestState, 
  usePairwiseComparison, 
  useRankingCalculation, 
  useQuestOperations,
  useQuestHistory,
  type Quest,
  type RankedQuest 
} from "./hooks";
import { useQuarterStore } from "@/stores/quarterStore";
import QuestHistorySelector from "./components/QuestHistorySelector";
import QuestInputSection from "./components/QuestInputSection";
import PairwiseMatrix from "./components/PairwiseMatrix";
import ActionButtons from "./components/ActionButtons";


export default function TwelveWeekGoalsUI({ 
  initialQuests = [], 
  initialPairwiseResults = {}, 
  loading = false 
}: { 
  initialQuests?: { id?: string, title: string, label?: string }[], 
  initialPairwiseResults?: { [key: string]: string }, 
  loading?: boolean 
}) {
  const { isExpanded } = useSidebar();
  const { year, quarter } = useQuarterStore();

  // Use separated hooks
  const { 
    quests, 
    setQuests,
    highlightEmpty, 
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
  } = useQuestState(initialQuests);
  
  const { 
    pairwiseResults, 
    handlePairwiseClick, 
    handleReset, 
    localKey,
    getCompletionPercentage,
    hasPairwiseChanges,
    hasAnyPairwiseComparisons,
    markPairwiseAsSaved
  } = usePairwiseComparison(quests, year, quarter, initialPairwiseResults);
  
  const { 
    ranking,
    getTopQuests,
    getQuestRank,
    isQuestInTopThree
  } = useRankingCalculation(quests, pairwiseResults, initialQuests);
  
  const { 
    handleSaveQuests, 
    handleCommit 
  } = useQuestOperations(year, quarter, quests, initialQuests, setQuests, markPairwiseAsSaved);

  // Quest history hook
  const { 
    questHistory, 
    isLoading: isLoadingHistory, 
    hasQuestHistory 
  } = useQuestHistory(year, quarter);

  // Quest history state - MUST be before conditional return
  const [showQuestHistory, setShowQuestHistory] = useState(false);
  const [importedQuests, setImportedQuests] = useState<Set<number>>(new Set());
  const [editingQuests, setEditingQuests] = useState<Set<number>>(new Set());
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return <TwelveWeekGoalsSkeleton />;
  }

  const handlePairwiseClickWithQuests = (row: number, col: number, winner: 'row' | 'col') => {
    handlePairwiseClick(row, col, winner);
  };

  const handleCommitWithParams = async () => {
    setIsSubmitting(true);
    try {
      await handleCommit(pairwiseResults, ranking, localKey);
    } finally {
      // Don't set isSubmitting to false immediately if redirecting
      // Let the redirect handle the loading state
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  const handleSaveWithValidation = async () => {
    if (validateQuests()) {
      setIsSaving(true);
      try {
        await handleSaveQuests();
        markAsSaved(); // Mark changes as saved after successful save
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleImportQuests = (importedQuestsList: Quest[]) => {
    // Find empty slots before importing
    const emptySlots: number[] = [];
    for (let i = 0; i < quests.length; i++) {
      if (!quests[i].title.trim()) {
        emptySlots.push(i);
      }
    }
    
    // Check if we have enough empty slots
    if (emptySlots.length < importedQuestsList.length) {
      toast.error(`Tidak bisa import ${importedQuestsList.length} quest. Hanya ada ${emptySlots.length} slot kosong. Kosongkan beberapa quest terlebih dahulu.`);
      setShowQuestHistory(false);
      return;
    }
    
    // Import quests to state only (no database save yet)
    importQuests(importedQuestsList);
    
    // Track which slots were filled with imported quests
    const importedIndices = new Set<number>();
    importedQuestsList.forEach((_, idx) => {
      const slotIndex = emptySlots[idx];
      if (slotIndex !== undefined) {
        importedIndices.add(slotIndex);
      }
    });
    setImportedQuests(importedIndices);
    
    toast.success(`${importedQuestsList.length} quest berhasil diimport!`);
    setShowQuestHistory(false);
  };

  const handleEditToggle = (idx: number) => {
    setEditingQuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full max-w-none bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row">
      <QuestInputSection
        quests={quests}
        ranking={ranking}
        highlightEmpty={highlightEmpty}
        onQuestChange={handleQuestTitleChange}
        onSave={handleSaveWithValidation}
        onShowHistory={() => setShowQuestHistory(true)}
        hasQuestHistory={hasQuestHistory}
        isLoadingHistory={isLoadingHistory}
        importedQuests={importedQuests}
        onEditToggle={handleEditToggle}
        editingQuests={editingQuests}
        isSaving={isSaving}
        hasNewInputs={hasNewQuestInputs()}
        hasAnyInputs={hasAnyQuestInputs()}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      <div className="w-full md:w-2/3 pb-6 md:pb-8 flex flex-col">
        <PairwiseMatrix
          quests={quests}
          pairwiseResults={pairwiseResults}
          onPairwiseClick={handlePairwiseClickWithQuests}
          isExpanded={isExpanded}
          hasAnyComparisons={hasAnyPairwiseComparisons()}
        />
        <ActionButtons 
          onReset={handleReset} 
          onCommit={handleCommitWithParams} 
          isSubmitting={isSubmitting}
          hasUnsavedChanges={hasUnsavedChanges}
          hasAnyPairwiseComparisons={hasAnyPairwiseComparisons()}
        />
      </div>
      
      {/* Quest History Modal */}
      {showQuestHistory && (
        <QuestHistorySelector
          questHistory={questHistory}
          isLoading={isLoadingHistory}
          onSelectQuests={handleImportQuests}
          onClose={() => setShowQuestHistory(false)}
          availableSlots={quests.filter(q => !q.title.trim()).length}
        />
      )}
    </div>
  );
} 