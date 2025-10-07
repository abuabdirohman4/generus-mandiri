"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useQuarterStore } from "@/stores/quarterStore";
import { usePerformanceMonitor } from "@/lib/performanceUtils";
import { getQuarterWeekRange, getDateFromWeek, getWeekOfYear } from "@/lib/quarterUtils";

// Custom hooks
import { useWeeklySyncData } from "./hooks/useWeeklySync";
import { useWeekCalculations } from "./hooks/useWeekCalculations";

// Components
import { MainContent } from "./components/MainContent";
import WeeklySyncSkeleton from "@/components/ui/skeleton/WeeklySyncSkeleton";

export default function WeeklySyncClient() {
  // 🚀 OPTIMIZED: Performance monitoring
  usePerformanceMonitor('WeeklySyncClient');
  
  const [refreshFlag, setRefreshFlag] = useState(0);
  const { year, quarter } = useQuarterStore();
  
  // Memoize today to prevent infinite loops
  const today = useMemo(() => new Date(), []);
  
  // Check if today falls within the selected quarter
  const isTodayInQuarter = useMemo(() => {
    const { startWeek, endWeek } = getQuarterWeekRange(year, quarter);
    const todayWeek = getWeekOfYear(today);
    return todayWeek >= startWeek && todayWeek <= endWeek;
  }, [year, quarter, today]);
  
  // 🚀 OPTIMIZED: Single week calculation with memoization
  const [currentWeek, setCurrentWeek] = useState(() => {
    if (isTodayInQuarter) {
      // If today is in the selected quarter, use today's week
      const day = today.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      return monday;
    } else {
      // If today is not in the selected quarter, use first week of quarter
      const { startWeek } = getQuarterWeekRange(year, quarter);
      const weekStartDate = getDateFromWeek(year, startWeek, 1);
      const day = weekStartDate.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(weekStartDate);
      monday.setDate(weekStartDate.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      return monday;
    }
  });
  
  // Update currentWeek when quarter changes
  useEffect(() => {
    if (isTodayInQuarter) {
      // If today is in the selected quarter, use today's week
      const day = today.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentWeek(monday);
    } else {
      // If today is not in the selected quarter, use first week of quarter
      const { startWeek } = getQuarterWeekRange(year, quarter);
      const weekStartDate = getDateFromWeek(year, startWeek, 1);
      const day = weekStartDate.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      const monday = new Date(weekStartDate);
      monday.setDate(weekStartDate.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentWeek(monday);
    }
  }, [year, quarter, isTodayInQuarter, today]);
  
  // 🚀 OPTIMIZED: Single week calculations call - always use current week
  const weekCalculations = useWeekCalculations(
    currentWeek, 
    year, 
    quarter, 
    undefined // Always undefined - use current week like Daily Sync
  );
  
  // Week navigation state
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  // REMOVED: selectedWeekInQuarter - now always use current week like Daily Sync
  
  // 🚀 OPTIMIZED: Week navigation handlers - now updates currentWeek directly
  const handleSelectWeek = useCallback((weekIdx: number) => {
    const { startWeek } = weekCalculations;
    const weekNumber = startWeek + weekIdx - 1;
    const weekStartDate = getDateFromWeek(year, weekNumber, 1);
    const day = weekStartDate.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(weekStartDate);
    monday.setDate(weekStartDate.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeek(monday);
    // REMOVED: setSelectedWeekInQuarter - now always use current week
  }, [weekCalculations.startWeek, year]);

  const goPrevWeek = useCallback(() => {
    if (weekCalculations.displayWeek <= 1) return;
    const prev = new Date(currentWeek);
    prev.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(prev);
    // REMOVED: setSelectedWeekInQuarter - now always use current week
  }, [weekCalculations.displayWeek, currentWeek.getTime()]);
  
  const goNextWeek = useCallback(() => {
    if (weekCalculations.displayWeek >= weekCalculations.totalWeeks) return;
    const next = new Date(currentWeek);
    next.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(next);
    // REMOVED: setSelectedWeekInQuarter - now always use current week
  }, [weekCalculations.displayWeek, weekCalculations.totalWeeks, currentWeek.getTime()]);

  // 🚀 OPTIMIZED: Data fetching with progressive loading
  const {
    mobileOptimizedGoals,
    processedProgress,
    processedRules,
    ultraFastLoading,
    ultraFastError,
    handleRefreshGoals,
    handleRefreshToDontList,
    mutateUltraFast,
    dataSource
  } = useWeeklySyncData(currentWeek, year, quarter, weekCalculations);
  
  // Simple error handling
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Error handling effect
  useEffect(() => {
    if (ultraFastError) {
      const errorMessage = ultraFastError.message || 'Failed to load data';
      setError(errorMessage);
      
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [ultraFastError]);

  // Retry logic
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
    mutateUltraFast();
  }, [mutateUltraFast]);

  // Enhanced refresh handlers with refresh flag
  const enhancedHandleRefreshGoals = () => {
    handleRefreshGoals();
    setRefreshFlag(f => f + 1);
  };
  
  const enhancedHandleRefreshToDontList = () => {
    handleRefreshToDontList();
    setRefreshFlag(f => f + 1);
  };

  // Error state - simple inline error display
  // if (error) {
  //   return (
  //     <div className="container mx-auto py-8 pt-0">
  //       <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
  //         <div className="flex items-center">
  //           <div className="text-red-600 dark:text-red-400 mr-3">
  //             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  //             </svg>
  //           </div>
  //           <div>
  //             <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error Loading Data</h3>
  //             <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
  //             <div className="mt-2 flex gap-2">
  //               <button 
  //                 onClick={handleRetry}
  //                 className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
  //               >
  //                 Try Again ({retryCount}/3)
  //               </button>
  //               <button 
  //                 onClick={() => window.location.reload()}
  //                 className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
  //               >
  //                 Refresh Page
  //               </button>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Loading state - using WeeklySyncSkeleton
  if (ultraFastLoading || (!mobileOptimizedGoals || mobileOptimizedGoals.length === 0)) {
    return (
      <div className="container mx-auto py-8 pt-0">
        <WeeklySyncSkeleton />
      </div>
    );
  }

  // Main content
  return (
    <MainContent
      displayWeek={weekCalculations.displayWeek}
      totalWeeks={weekCalculations.totalWeeks}
      isWeekDropdownOpen={isWeekDropdownOpen}
      setIsWeekDropdownOpen={setIsWeekDropdownOpen}
      handleSelectWeek={handleSelectWeek}
      goPrevWeek={goPrevWeek}
      goNextWeek={goNextWeek}
      year={year}
      quarter={quarter}
      mobileOptimizedGoals={mobileOptimizedGoals}
      processedProgress={processedProgress}
      processedRules={processedRules}
      toDontListLoading={ultraFastLoading}
      handleRefreshGoals={enhancedHandleRefreshGoals}
      handleRefreshToDontList={enhancedHandleRefreshToDontList}
      dataSource={dataSource}
    />
  );
}