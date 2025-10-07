"use client";
import React, { useState, useEffect } from "react";

import DailySyncSkeleton from '@/components/ui/skeleton/DailySyncSkeleton';
import { useWeekManagement } from './DateSelector/hooks/useWeekManagement';
import { useTimerManagement } from './PomodoroTimer/hooks/useTimerManagement';
import { useGlobalTimer } from './PomodoroTimer/hooks/useGlobalTimer';
import { useDailyPlanManagement } from './DailyQuest/hooks/useDailyPlanManagement';
import WeekSelector from './DateSelector/WeekSelector';
import DaySelector from './DateSelector/DaySelector';
import BrainDumpSection from './BrainDump/BrainDumpSection';
import ActivityLog from './ActivityLog/ActivityLog';
import PomodoroTimer from './PomodoroTimer/PomodoroTimer';
import DailySyncClient from './DailyQuest/DailySyncClient';
import { getWeekDates, getLocalDateString } from '@/lib/dateUtils';
import OneMinuteJournalModal from './Journal/OneMinuteJournalModal';
import { useJournal } from './Journal/hooks/useJournal';
import CollapsibleCard from '@/components/common/CollapsibleCard';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';
import TargetFocus from "./TargetFocus/TargetFocus";

export default function DailySyncPage() {
  const {
    year,
    quarter,
    currentWeek,
    weekCalculations,
    isWeekDropdownOpen,
    setIsWeekDropdownOpen,
    getDefaultDayIndexForWeek,
    goPrevWeek,
    goNextWeek,
    handleSelectWeek
  } = useWeekManagement();

  const weekDates = getWeekDates(currentWeek);
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => getDefaultDayIndexForWeek(currentWeek));
  const selectedDate = weekDates[selectedDayIdx];
  const selectedDateStr = getLocalDateString(selectedDate);

  const { displayWeek, totalWeeks } = weekCalculations;
  const { loading, initialLoading, dailyPlan, mutate } = useDailyPlanManagement(year, displayWeek, selectedDateStr);

  // Journal modal hook
  const {
    isJournalModalOpen,
    pendingActivityData,
    closeJournalModal,
    saveJournal,
    openJournalModal,
    isRetrying,
    retryCount,
  } = useJournal();

  const { handleSetActiveTask, activityLogRefreshKey } = useTimerManagement(selectedDateStr, openJournalModal);
  
  // Card collapse states
  const { cardCollapsed, toggleCardCollapsed } = useUIPreferencesStore();
  
  // Global timer - hanya ada 1 interval untuk seluruh aplikasi
  useGlobalTimer();

  useEffect(() => {
    setSelectedDayIdx(getDefaultDayIndexForWeek(currentWeek));
  }, [currentWeek]);

  const handleGoPrevWeek = () => {
    const defaultDayIdx = goPrevWeek();
    setSelectedDayIdx(defaultDayIdx);
  };

  const handleGoNextWeek = () => {
    const defaultDayIdx = goNextWeek();
    setSelectedDayIdx(defaultDayIdx);
  };

  const handleSelectWeekWithDay = (weekIdx: number) => {
    const defaultDayIdx = handleSelectWeek(weekIdx);
    setSelectedDayIdx(defaultDayIdx);
  };

  return (
    <div className="mx-auto">
      {initialLoading ? (
        <DailySyncSkeleton />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-6 gap-4">
            <WeekSelector
              displayWeek={displayWeek}
              totalWeeks={totalWeeks}
              isWeekDropdownOpen={isWeekDropdownOpen}
              setIsWeekDropdownOpen={setIsWeekDropdownOpen}
              handleSelectWeek={handleSelectWeekWithDay}
              goPrevWeek={handleGoPrevWeek}
              goNextWeek={handleGoNextWeek}
            />
            <DaySelector
              weekDates={weekDates}
              selectedDayIdx={selectedDayIdx}
              setSelectedDayIdx={setSelectedDayIdx}
            />
          </div>
          {loading ? (
            <DailySyncSkeleton />
          ) : (
            <>
              {/* Target Focus Component */}
              <div className="block md:hidden mt-4 mb-6">
                <TargetFocus selectedDate={selectedDateStr} />
              </div>

              <div className="block md:hidden mb-6">
                <CollapsibleCard
                  isCollapsed={cardCollapsed.pomodoroTimer}
                  onToggle={() => toggleCardCollapsed('pomodoroTimer')}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-5 shadow-sm border border-gray-200 dark:border-gray-700 relative">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">Pomodoro Timer</h3>
                    <PomodoroTimer />
                  </div>
                </CollapsibleCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <DailySyncClient
                    year={year}
                    weekNumber={displayWeek}
                    selectedDate={selectedDateStr}
                    onSetActiveTask={handleSetActiveTask}
                    dailyPlan={dailyPlan}
                    loading={loading}
                    refreshSessionKey={{}}
                    forceRefreshTaskId={null}
                  />
                </div>
                <div className="flex flex-col gap-6">
                  <div className="hidden md:block">
                    <TargetFocus selectedDate={selectedDateStr} />
                  </div>
                  <div className="hidden md:block">
                    <CollapsibleCard
                      isCollapsed={cardCollapsed.pomodoroTimer}
                      onToggle={() => toggleCardCollapsed('pomodoroTimer')}
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-5 shadow-sm border border-gray-200 dark:border-gray-700 pomodoro-timer relative">
                        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100">Pomodoro Timer</h3>
                        <PomodoroTimer />
                      </div>
                    </CollapsibleCard>
                  </div>
                  <CollapsibleCard
                    isCollapsed={cardCollapsed.activityLog}
                    onToggle={() => toggleCardCollapsed('activityLog')}
                    className="h-full flex flex-col"
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 pt-5 shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
                      <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-gray-100">Log Activity</h3>
                      <div className="flex-1">
                        <ActivityLog date={selectedDateStr} refreshKey={activityLogRefreshKey} />
                      </div>
                    </div>
                  </CollapsibleCard>
                </div>
              </div>
              <BrainDumpSection date={selectedDateStr} />
            </>
          )}
        </>
      )}

      {/* One Minute Journal Modal */}
      <OneMinuteJournalModal
        isOpen={isJournalModalOpen}
        onClose={closeJournalModal}
        onSave={async (whatDone: string, whatThink: string) => {
          await saveJournal({ whatDone, whatThink });
        }}
        taskTitle={pendingActivityData?.taskTitle}
        duration={pendingActivityData?.duration || 0}
        isRetrying={isRetrying}
        retryCount={retryCount}
      />
    </div>
  );
}