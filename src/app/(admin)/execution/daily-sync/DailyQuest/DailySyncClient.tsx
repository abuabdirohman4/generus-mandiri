"use client";
import React from "react";

import DailySyncSkeleton from '@/components/ui/skeleton/DailySyncSkeleton';
import { useDailyPlanManagement } from './hooks/useDailyPlanManagement';
import MainQuestListSection from './MainQuestListSection';
import SideQuestListSection from './SideQuestListSection';
import WorkQuestListSection from './WorkQuestListSection';
import MainQuestModal from './components/MainQuestModal';
import WorkQuestModal from './components/WorkQuestModal';
import { groupItemsByType } from "./utils/groupItemsByType";
import { DailySyncClientProps } from './types';
import CollapsibleCard from '@/components/common/CollapsibleCard';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';

const DailySyncClient: React.FC<DailySyncClientProps> = ({ 
  year, 
  weekNumber, 
  selectedDate, 
  onSetActiveTask, 
  dailyPlan, 
  loading, 
  refreshSessionKey, 
  forceRefreshTaskId 
}) => {
  const { cardCollapsed, toggleCardCollapsed } = useUIPreferencesStore();
  
  const {
    dailyPlan: hookDailyPlan,
    weeklyTasks: hookWeeklyTasks,
    completedSessions,
    loading: hookLoading,
    selectedTasks,
    setShowModal,
    modalLoading,
    savingLoading,
    handleOpenModal,
    handleTaskToggle,
    handleSaveSelection,
    handleStatusChange,
    handleAddSideQuest,
    handleTargetChange,
    handleFocusDurationChange,
    // Work Quest state (unified)
    modalState,
    selectedWorkQuests,
  } = useDailyPlanManagement(year, weekNumber, selectedDate);

  // Use hook data
  const effectiveDailyPlan = hookDailyPlan || dailyPlan;
  const effectiveWeeklyTasks = hookWeeklyTasks;
  const effectiveLoading = hookLoading || loading;

  if (effectiveLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-16">
        <DailySyncSkeleton />
      </div>
    );
  }

  const groupedItems = groupItemsByType(effectiveDailyPlan?.daily_plan_items);

  return (
    <div className="mx-auto relative">
      <div className="flex flex-col gap-6">
        <CollapsibleCard
          isCollapsed={cardCollapsed.mainQuest}
          onToggle={() => toggleCardCollapsed('mainQuest')}
          className="main-quest-card"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <MainQuestListSection
              title="Main Quest"
              items={groupedItems['MAIN_QUEST']}
              onStatusChange={handleStatusChange}
              onSelectTasks={() => handleOpenModal('main')}
              onSetActiveTask={onSetActiveTask}
              selectedDate={selectedDate}
              onTargetChange={handleTargetChange}
              onFocusDurationChange={handleFocusDurationChange}
              completedSessions={completedSessions}
              refreshSessionKey={refreshSessionKey}
              forceRefreshTaskId={forceRefreshTaskId}
              showAddQuestButton={true}
            />
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          isCollapsed={cardCollapsed.workQuest}
          onToggle={() => toggleCardCollapsed('workQuest')}
          className="work-quest-card"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <WorkQuestListSection
              title="Work Quest"
              items={groupedItems['WORK_QUEST'] || []}
              onStatusChange={handleStatusChange}
              onSelectTasks={() => handleOpenModal('work')}
              onSetActiveTask={onSetActiveTask}
              selectedDate={selectedDate}
              onTargetChange={handleTargetChange}
              onFocusDurationChange={handleFocusDurationChange}
              completedSessions={completedSessions}
              refreshSessionKey={refreshSessionKey}
              forceRefreshTaskId={forceRefreshTaskId}
              showAddQuestButton={true}
            />
          </div>
        </CollapsibleCard>
        
        <CollapsibleCard
          isCollapsed={cardCollapsed.sideQuest}
          onToggle={() => toggleCardCollapsed('sideQuest')}
          className="side-quest-card"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <SideQuestListSection
              title="Side Quest"
              items={groupedItems['SIDE_QUEST']}
              onStatusChange={handleStatusChange}
              onAddSideQuest={handleAddSideQuest}
              onSelectTasks={(newItems) => handleSaveSelection(newItems, true)}
              onSetActiveTask={onSetActiveTask}
              selectedDate={selectedDate}
              onTargetChange={handleTargetChange}
              onFocusDurationChange={handleFocusDurationChange}
              completedSessions={completedSessions}
              refreshSessionKey={refreshSessionKey}
              forceRefreshTaskId={forceRefreshTaskId}
            />
          </div>
        </CollapsibleCard>
      </div>
      
      <MainQuestModal
        isOpen={modalState.showModal && modalState.modalType === 'main'}
        onClose={() => setShowModal(false)}
        tasks={effectiveWeeklyTasks}
        selectedTasks={selectedTasks}
        onTaskToggle={(taskId) => handleTaskToggle(taskId, 'main')}
        onSave={() => {
          const selectedItems = Object.entries(selectedTasks)
            .filter(([, selected]) => selected)
            .map(([taskId]) => ({
              item_id: taskId,
              item_type: 'MAIN_QUEST'
            }));
          
          handleSaveSelection(selectedItems, true);
        }}
        isLoading={modalLoading}
        savingLoading={savingLoading}
        completedTodayCount={groupedItems.MAIN_QUEST?.filter((item: any) => item.status === 'DONE').length || 0}
      />

      <WorkQuestModal
        isOpen={modalState.showModal && modalState.modalType === 'work'}
        onClose={() => setShowModal(false)}
        selectedTasks={selectedWorkQuests}
        onTaskToggle={(taskId) => handleTaskToggle(taskId, 'work')}
        onSave={() => {
          const workQuestItems = selectedWorkQuests.map(taskId => ({
            item_id: taskId,
            item_type: 'WORK_QUEST'
          }));
          
          handleSaveSelection(workQuestItems, true);
        }}
        isLoading={modalLoading}
        savingLoading={savingLoading}
        completedTodayCount={groupedItems.WORK_QUEST?.filter((item: any) => item.status === 'DONE').length || 0}
      />
    </div>
  );
};

export default DailySyncClient;
