"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSideQuests } from "@/app/(admin)/quests/side-quests/hooks/useSideQuests";
import { SideQuest } from "@/app/(admin)/quests/side-quests/types";
import { EyeIcon, EyeCloseIcon } from "@/lib/icons";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";

interface SideQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedQuests: SideQuest[]) => void;
  selectedCount?: number;
  completedTodayCount?: number;
  existingSideQuests?: string[]; // Array of existing side quest IDs for today
}

const SideQuestModal: React.FC<SideQuestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedCount = 0,
  completedTodayCount = 0,
  existingSideQuests = [],
}) => {
  const { sideQuests, isLoading, error } = useSideQuests();
  const [selectedTasks, setSelectedTasks] = useState<SideQuest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  
  // Initialize state with data from localStorage
  const getInitialExpandedItems = (): Set<string> => {
    if (typeof window === 'undefined') return new Set<string>();
    
    try {
      const expandedKey = 'sidequest-modal-expanded';
      const saved = localStorage.getItem(expandedKey);
      if (saved) {
        const expandedArray: string[] = JSON.parse(saved);
        return new Set(expandedArray);
      }
    } catch (error) {
      console.warn('Failed to load initial expanded state:', error);
    }
    return new Set<string>();
  };

  const [expandedItems, setExpandedItems] = useState<Set<string>>(getInitialExpandedItems);
  const isInitialLoad = useRef(true);
  
  // Cookie key untuk menyimpan expanded state
  const expandedKey = 'sidequest-modal-expanded';

  // Save expanded state to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return; // Skip saving during initial load
    }
    
    try {
      const expandedArray = Array.from(expandedItems);
      localStorage.setItem(expandedKey, JSON.stringify(expandedArray));
    } catch (error) {
      console.warn('Failed to save expanded state to localStorage:', error);
    }
  }, [expandedItems, expandedKey]);

  // Filter side quests based on search term and completed status
  const filteredSideQuests = sideQuests.filter(quest => {
    const matchesSearch = quest.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quest.description?.toLowerCase().includes(searchTerm.toLowerCase());
    // const matchesCompleted = showCompleted || quest.status !== 'DONE';
    const matchesCompleted = quest.status === 'TODO';
    return matchesSearch && matchesCompleted;
  });

  // Toggle expanded state
  const toggleExpanded = (questId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
      }
      return newSet;
    });
  };

  // Handle task selection
  const handleTaskToggle = (quest: SideQuest) => {
    setSelectedTasks(prev => {
      const isSelected = prev.some(task => task.id === quest.id);
      if (isSelected) {
        return prev.filter(task => task.id !== quest.id);
      } else {
        return [...prev, quest];
      }
    });
  };

  // Handle save
  const handleSave = () => {
    onSave(selectedTasks);
    onClose();
  };

  // Initialize selected tasks based on existing side quests
  useEffect(() => {
    if (isOpen && sideQuests.length > 0) {
      const existingQuests = sideQuests.filter(quest => 
        existingSideQuests.includes(quest.id)
      );
      setSelectedTasks(existingQuests);
    }
  }, [isOpen, sideQuests, existingSideQuests]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTasks([]);
      setSearchTerm("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Main Quest</h2>
            <p className="text-gray-700 font-medium">
              Selected : {selectedCount} Quest
            </p>

            {completedTodayCount > 0 && (
              <>
                <p className="text-gray-700 font-medium">
                  Done : {completedTodayCount} Quest
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Toggle */}
        {/* <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search side quests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`p-2 rounded-md transition-colors ${
              showCompleted
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
            title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
          >
            {showCompleted ? (
              <EyeIcon className="w-5 h-5" />
            ) : (
              <EyeCloseIcon className="w-5 h-5" />
            )}
          </button>
        </div> */}

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : filteredSideQuests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || !showCompleted
                  ? 'No side quests match your filters' 
                  : 'No side quests available'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSideQuests.map((quest) => {
                const isExpanded = expandedItems.has(quest.id);
                const isSelected = selectedTasks.some(task => task.id === quest.id);
                
                return (
                  <div key={quest.id} className="space-y-1">
                    <div
                      className={`group relative flex items-center space-x-3 py-2 text-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded ${
                        quest.status === 'DONE' 
                          ? 'opacity-75' 
                          : ''
                      }`}
                    >
                      {/* Expand/Collapse Button */}
                      <button
                        // onClick={(e) => {
                        //   e.stopPropagation();
                        //   toggleExpanded(quest.id);
                        // }}
                        className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      >
                        {/* <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div> */}
                        <svg
                          className={`w-3 h-3 transition-all duration-300 ease-in-out ${
                            isExpanded ? 'rotate-90 scale-110' : 'rotate-0 scale-100'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Selection Checkbox */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleTaskToggle(quest)}
                        />
                      </div>
                      
                      {/* Quest Title */}
                      <span className={`flex-1 text-sm font-medium ${
                        quest.status === 'DONE' 
                          ? 'text-gray-500 dark:text-gray-400 line-through' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {quest.title || 'Untitled Task'}
                      </span>
                    </div>
                    
                    {/* Expanded Content with Smooth Animation */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded 
                          ? 'max-h-96 opacity-100 transform translate-y-0' 
                          : 'max-h-0 opacity-0 transform -translate-y-2'
                      }`}
                    >
                      <div className="ml-6 space-y-2 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                        {quest.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {quest.description}
                          </p>
                        )}
                        {quest.due_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Due: {new Date(quest.due_date).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-500">
                          <span>Created: {quest.created_at ? new Date(quest.created_at).toLocaleDateString() : 'Unknown'}</span>
                          <span>Updated: {quest.updated_at ? new Date(quest.updated_at).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={selectedTasks.length === 0}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SideQuestModal;
