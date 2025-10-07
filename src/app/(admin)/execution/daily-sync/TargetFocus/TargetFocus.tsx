'use client';
import React from 'react';
import { useTargetFocus } from './hooks/useTargetFocus';
import { useTargetFocusStore } from './stores/targetFocusStore';

interface TargetFocusProps {
  selectedDate: string;
}

interface TargetFocusContentProps {
  selectedDate: string;
  totalTimeTarget: number;
  totalTimeActual: number;
  totalSessionsTarget: number;
  totalSessionsActual: number;
  isLoading: boolean;
  error: string | null;
}

const TargetFocusContent: React.FC<TargetFocusContentProps> = ({ 
  selectedDate,
  totalTimeTarget, 
  totalTimeActual, 
  totalSessionsTarget,
  totalSessionsActual,
  isLoading, 
  error,
}) => {

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-red-500 dark:text-red-400 text-center">
          Error loading focus data: {error}
        </div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours} hrs` : `${hours} hrs ${mins} mins`;
  };

  const formatSessions = (sessions: number) => {
    return `${sessions} session${sessions !== 1 ? 's' : ''}`;
  };

  // Default max sessions target
  const maxSessionsTarget = 16;

  // Calculate progress percentages - actual sessions are independent of target
  const progressTotalSessionsActual = Math.min((totalSessionsActual / maxSessionsTarget) * 100, 100);
  
  // Calculate remaining space for target and max sessions
  const remainingSpace = Math.max(0, 100 - progressTotalSessionsActual);
  
  // If there's no target or target is very small, show only actual + max
  if (totalSessionsTarget === 0 || totalSessionsTarget < totalSessionsActual) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="text-gray-900 dark:text-gray-100">
            Total focus time: <span className="font-bold">{formatTime(totalTimeActual)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="flex h-full">
              {/* Actual sessions */}
              <div 
                className="bg-brand-500 flex items-center justify-end pr-2 text-white text-sm font-medium whitespace-nowrap overflow-hidden"
                style={{ width: `${Math.min(progressTotalSessionsActual, 100)}%` }}
              >
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span className="truncate">{formatSessions(totalSessionsActual)}</span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
              
              {/* Max Sessions */}
              {remainingSpace > 0 && (
                <div 
                  className="bg-gray-300 dark:bg-gray-600 flex items-center justify-end pr-2 text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap overflow-hidden"
                  style={{ width: `${remainingSpace}%` }}
                >
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <span className="truncate">{maxSessionsTarget}</span>
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Normal case: target is meaningful and larger than actual
  const remainingTargetSessions = Math.max(0, totalSessionsTarget - totalSessionsActual);
  const progressTotalSessionsTarget = Math.min((remainingTargetSessions / maxSessionsTarget) * 100, remainingSpace);
  
  const remainingMaxSessions = Math.max(0, maxSessionsTarget - totalSessionsTarget);
  const progressMaxSessionsTarget = Math.min((remainingMaxSessions / maxSessionsTarget) * 100, remainingSpace - progressTotalSessionsTarget);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-gray-900 dark:text-gray-100">
          Total focus time: <span className="font-bold">{formatTime(totalTimeActual)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Progress segments */}
          <div className="flex h-full">
            {/* Actual sessions */}
            <div 
              className="bg-brand-500 flex items-center justify-end pr-2 text-white text-sm font-medium whitespace-nowrap overflow-hidden"
              style={{ width: `${Math.min(progressTotalSessionsActual, 100)}%` }}
            >
              <span className="flex items-center gap-1 whitespace-nowrap">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="truncate">{formatSessions(totalSessionsActual)}</span>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
            
            {/* Target Sessions */}
            {totalSessionsActual < totalSessionsTarget && (
              <div 
                className="bg-gray-400 flex items-center justify-end pr-2 text-white text-sm font-medium whitespace-nowrap overflow-hidden"
                style={{ width: `${Math.min(progressTotalSessionsTarget, 100)}%` }}
              >
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="truncate">{totalSessionsTarget}</span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </span>
              </div>
            )}
            
            {/* Max Sessions */}
            {totalSessionsTarget < maxSessionsTarget && (
              <div 
                className="bg-gray-300 dark:bg-gray-600 flex items-center justify-end pr-2 text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap overflow-hidden"
                style={{ width: `${Math.min(progressMaxSessionsTarget, 100)}%` }}
              >
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="truncate">{maxSessionsTarget}</span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TargetFocus: React.FC<TargetFocusProps> = ({ selectedDate }) => {
  const { 
    totalTimeTarget, 
    totalTimeActual, 
    totalSessionsTarget,
    totalSessionsActual,
    isLoading, 
    error,
  } = useTargetFocus({ selectedDate });
  
  // Get Zustand store for optimistic updates
  const { updateTargetOptimistically } = useTargetFocusStore();
  
  
  return (
    <TargetFocusContent 
      selectedDate={selectedDate}
      totalTimeTarget={totalTimeTarget}
      totalTimeActual={totalTimeActual}
      totalSessionsTarget={totalSessionsTarget}
      totalSessionsActual={totalSessionsActual}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default TargetFocus;
