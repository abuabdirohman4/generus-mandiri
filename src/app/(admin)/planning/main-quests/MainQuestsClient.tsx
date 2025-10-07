"use client";
import { useState } from "react";

import ComponentCard from '@/components/common/ComponentCard';
import MainQuestsSkeleton from '@/components/ui/skeleton/MainQuestsSkeleton';
import { useQuarterStore } from '@/stores/quarterStore';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';
import { EyeIcon, EyeCloseIcon } from '@/lib/icons';

import Quest from './Quest';
import { useMainQuests } from './hooks/useMainQuestsSWR';

export default function MainQuestsClient() {
  const { year, quarter } = useQuarterStore();
  const { quests, isLoading } = useMainQuests(year, quarter);
  const [activeTab, setActiveTab] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  // UI Preferences untuk hide/show completed tasks - gunakan state yang terpisah untuk planning
  const { showCompletedMainQuest, toggleShowCompletedMainQuest } = useUIPreferencesStore();

  if (isLoading) {
    return (
        <MainQuestsSkeleton />
    );
  }

  if (!quests || quests.length === 0) {
    return (
      <ComponentCard title="Belum ada Main Quest" className="mb-4">
        <p className="text-gray-600">Belum ada Main Quest yang di-commit untuk kuartal ini.</p>
      </ComponentCard>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-0">
      <div className="mb-6">
        {/* Header dengan Toggle Button */}
        <div className="flex justify-center mb-4">
          {/* <div className="flex-1"></div> */}
          <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Main Quests
          </h1>
          {/* <div className="flex-1 flex justify-end"> */}
            {/* Toggle Show/Hide Completed Button */}
            <div className="relative" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
              <button
                onClick={toggleShowCompletedMainQuest}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {showCompletedMainQuest ? (
                  <EyeIcon className="w-5 h-5" />
                ) : (
                  <EyeCloseIcon className="w-5 h-5" />
                )}
              </button>
              
              {/* Tooltip */}
              {isHovering && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
                  {showCompletedMainQuest ? 'Sembunyikan task selesai' : 'Tampilkan task selesai'}
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800"></div>
                </div>
              )}
            </div>
          {/* </div> */}
        </div>

        {/* Mobile: Horizontal scroll, Desktop: Centered */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-evenly w-full md:w-auto">
            <div className="flex min-w-max md:min-w-max w-full md:w-auto">
              {quests.map((quest, idx) => (
                <button
                  key={quest.id}
                  className={`px-3 py-2 -mb-px font-medium border-b-2 transition-colors duration-200 focus:outline-none whitespace-nowrap text-sm md:text-base md:px-4 flex-1 md:flex-none ${activeTab === idx ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 
                    'border-transparent text-gray-500 dark:text-gray-400'}`}
                  onClick={() => setActiveTab(idx)}
                >
                  <span className="hidden sm:inline">HIGH FOCUS GOAL</span>
                  <span className="sm:hidden">HFG</span>
                  <span className="ml-1">#{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          {quests.map((quest, idx) => (
            <div key={quest.id} style={{ display: activeTab === idx ? 'block' : 'none' }}>
              <Quest quest={quest} showCompletedTasks={showCompletedMainQuest} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 