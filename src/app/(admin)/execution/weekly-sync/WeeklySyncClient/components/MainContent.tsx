import React from 'react';
import { WeekSelector } from './WeekSelector';
import WeeklySyncTable from '../../WeeklySyncTable/WeeklySyncTable';
import ToDontListCard from '../../ToDontList/ToDontListCard';

// Memoized components
const MemoizedWeeklySyncTable = React.memo(WeeklySyncTable);
const MemoizedToDontListCard = React.memo(ToDontListCard);
const MemoizedWeekSelector = React.memo(WeekSelector);

import type { MainContentProps } from '../types';

export function MainContent({
  displayWeek,
  totalWeeks,
  isWeekDropdownOpen,
  setIsWeekDropdownOpen,
  handleSelectWeek,
  goPrevWeek,
  goNextWeek,
  quarter,
  year,
  mobileOptimizedGoals,
  processedProgress,
  processedRules,
  toDontListLoading,
  handleRefreshGoals,
  handleRefreshToDontList,
  dataSource
}: MainContentProps) {

  return (
    <div className="container mx-auto py-8 pt-0">
      {/* Header: Judul halaman kiri, navigasi minggu kanan */}
      <div className="md:flex justify-end mb-6">
        {/* <div>
           <h2 className="text-xl font-bold">
            Weekly Sync
            Weekly Sync Update 1.0 {loadingTime !== null ? ` (${loadingTime}s)` : ''}
          </h2> */}
          {/* {dataSource && (
            <div className={`text-xs font-medium mt-1 ${
              dataSource === 'ULTRA FAST RPC' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              📊 Data Source: {dataSource}
              {dataSource === 'ULTRA FAST RPC' && ' ⚡ (Optimized)'}
              {dataSource === 'WORKING FUNCTIONS' && ' 🔄 (Fallback)'}
              <button 
                onClick={() => window.location.reload()}
                className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                🔄 Force Refresh
              </button>
            </div>
          )} 
        </div> */}
        <MemoizedWeekSelector
          displayWeek={displayWeek}
          totalWeeks={totalWeeks}
          isWeekDropdownOpen={isWeekDropdownOpen}
          setIsWeekDropdownOpen={setIsWeekDropdownOpen}
          handleSelectWeek={handleSelectWeek}
          goPrevWeek={goPrevWeek}
          goNextWeek={goNextWeek}
        />
      </div>

      {/* Kolom 3 Quest Week */}
      <MemoizedWeeklySyncTable
        year={year}
        quarter={quarter}
        weekNumber={displayWeek}
        goals={mobileOptimizedGoals}
        goalProgress={processedProgress}
        onRefreshGoals={handleRefreshGoals}
      />
      
      {/* === To Don't List Card === */}
      {/* <MemoizedToDontListCard
        year={year}
        quarter={quarter}
        weekNumber={displayWeek}
        rules={processedRules}
        loading={toDontListLoading}
        onRefresh={handleRefreshToDontList}
      /> */}
    </div>
  );
}
