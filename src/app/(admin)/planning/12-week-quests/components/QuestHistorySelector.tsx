"use client";

import { useState } from "react";
import Button from '@/components/ui/button/Button';
import ComponentCard from '@/components/common/ComponentCard';
import Checkbox from '@/components/form/input/Checkbox';
import type { Quest } from "../hooks/useQuestState";
import type { QuestHistoryItem } from "../hooks/useQuestHistory";

interface QuestHistorySelectorProps {
  questHistory: QuestHistoryItem[];
  isLoading: boolean;
  onSelectQuests: (quests: Quest[]) => void;
  onClose: () => void;
  availableSlots?: number;
}

export default function QuestHistorySelector({
  questHistory,
  isLoading,
  onSelectQuests,
  onClose,
  availableSlots = 10
}: QuestHistorySelectorProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());

  const handleSelectQuests = () => {
    if (!selectedQuarter || selectedQuests.size === 0) return;
    
    const [year, quarter] = selectedQuarter.split('-').map(Number);
    const historyItem = questHistory.find(
      item => item.year === year && item.quarter === quarter
    );
    
    if (historyItem) {
      const questsToImport = historyItem.quests.filter(quest => 
        selectedQuests.has(quest.label)
      );
      
      // Check if we have enough available slots
      if (questsToImport.length > availableSlots) {
        // This should be handled by parent component, but just in case
        return;
      }
      
      onSelectQuests(questsToImport);
      onClose();
    }
  };

  const handleQuestToggle = (questLabel: string, event?: React.MouseEvent | React.ChangeEvent) => {
    // Prevent double toggle when clicking checkbox
    if (event) {
      event.stopPropagation();
    }
    
    setSelectedQuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questLabel)) {
        newSet.delete(questLabel);
      } else {
        newSet.add(questLabel);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!selectedQuarter) return;
    
    const [year, quarter] = selectedQuarter.split('-').map(Number);
    const historyItem = questHistory.find(
      item => item.year === year && item.quarter === quarter
    );
    
    if (historyItem) {
      const allLabels = historyItem.quests.map(q => q.label);
      setSelectedQuests(new Set(allLabels));
    }
  };

  const handleDeselectAll = () => {
    setSelectedQuests(new Set());
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Memuat riwayat quest...</p>
          </div>
        </div>
      </div>
    );
  }

  if (questHistory.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Tidak Ada Riwayat Quest
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Belum ada quest dari quarter sebelumnya yang bisa digunakan.
            </p>
            <Button onClick={onClose} variant="outline" className="w-full">
              Tutup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-300 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pilih Quest dari Quarter Sebelumnya
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Slot kosong tersedia: {availableSlots} quest
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {questHistory.map((item) => (
            <div
              key={`${item.year}-${item.quarter}`}
              className={`border rounded-lg p-4 transition-colors ${
                selectedQuarter === `${item.year}-${item.quarter}`
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Quarter Header */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  setSelectedQuarter(`${item.year}-${item.quarter}`);
                  setSelectedQuests(new Set()); // Reset selection when changing quarter
                }}
              >
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {item.quarterString}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {item.questCount} quest tersedia
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedQuarter === `${item.year}-${item.quarter}`}
                    onChange={() => {
                      setSelectedQuarter(`${item.year}-${item.quarter}`);
                      setSelectedQuests(new Set());
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
              </div>
              
              {/* Quest Selection (only show if this quarter is selected) */}
              {selectedQuarter === `${item.year}-${item.quarter}` && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900 dark:text-white">
                      Pilih Quest yang Ingin Digunakan:
                    </h5>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        disabled={selectedQuests.size >= availableSlots}
                      >
                        Pilih Semua
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        Batal Pilih
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {item.quests.map((quest, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center p-2 rounded border transition-colors ${
                          selectedQuests.has(quest.label)
                            ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <Checkbox
                          checked={selectedQuests.has(quest.label)}
                          onChange={() => {
                            setSelectedQuests(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(quest.label)) {
                                newSet.delete(quest.label);
                              } else {
                                newSet.add(quest.label);
                              }
                              return newSet;
                            });
                          }}
                          disabled={!selectedQuests.has(quest.label) && selectedQuests.size >= availableSlots}
                        />
                        <div 
                          className="flex-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded py-1 ml-2 -my-1 transition-colors"
                          onClick={() => handleQuestToggle(quest.label)}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            <span className="text-blue-600 dark:text-blue-400">{quest.label}.</span> {quest.title}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedQuests.size > 0 && (
                    <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                      {selectedQuests.size} quest dipilih
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            onClick={handleSelectQuests}
            variant="primary"
            className="flex-1"
            disabled={!selectedQuarter || selectedQuests.size === 0}
          >
            {selectedQuests.size > 0 
              ? `Gunakan ${selectedQuests.size} Quest` 
              : 'Gunakan Quest Ini'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
