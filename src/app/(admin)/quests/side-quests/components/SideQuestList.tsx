"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSideQuests } from "../hooks/useSideQuests";
import { SideQuest } from "../types";
import { EyeIcon, EyeCloseIcon } from "@/lib/icons";
import Checkbox from "@/components/form/input/Checkbox";

const SideQuestList: React.FC = () => {
  const { sideQuests, isLoading, error, toggleStatus } = useSideQuests();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  
  // Initialize state with data from localStorage
  const getInitialExpandedItems = (): Set<string> => {
    if (typeof window === 'undefined') return new Set<string>();
    
    try {
      const expandedKey = 'sidequest-expanded';
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
  const expandedKey = 'sidequest-expanded';

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
    const matchesCompleted = showCompleted || quest.status !== 'DONE';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari side quest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`p-2 rounded-md transition-colors ${
            showCompleted
              ? 'bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/30'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
          title={showCompleted ? 'Sembunyikan task yang sudah selesai' : 'Tampilkan task yang sudah selesai'}
        >
          {showCompleted ? (
            <EyeIcon className="w-5 h-5" />
          ) : (
            <EyeCloseIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Side Quest List */}
      {filteredSideQuests.length === 0 ? (
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || !showCompleted
              ? 'Tidak ada side quest yang sesuai dengan filter' 
              : 'Belum ada side quest'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSideQuests.map((quest) => {
            const isExpanded = expandedItems.has(quest.id);
            
            return (
              <div key={quest.id} className="space-y-1">
                <div
                  className={`group relative flex items-center space-x-3 py-2 text-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded`}
                >
                  {/* Expand/Collapse Button */}
                  <button
                    // onClick={(e) => {
                    //   e.stopPropagation();
                    //   toggleExpanded(quest.id);
                    // }}
                    className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
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

                  {/* Status Toggle Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={quest.status === 'DONE'}
                      onChange={() => toggleStatus(quest.id, quest.status || 'TODO')}
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
  );
};

export default SideQuestList;
