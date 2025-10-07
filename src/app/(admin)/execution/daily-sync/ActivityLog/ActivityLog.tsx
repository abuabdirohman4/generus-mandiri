'use client';
import React, { useEffect, useState } from 'react';

import { useActivityStore } from '@/stores/activityStore';
import { useActivityLogs, ActivityLogItem } from './hooks/useActivityLogs';
import { formatTimeRange } from '@/lib/dateUtils';

interface ActivityLogProps {
  date: string;
  refreshKey?: number;
}

const ICONS = {
  FOCUS: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-brand-500"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#3b82f6" opacity="0.15"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  BREAK: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-amber-500"><rect x="4" y="8" width="16" height="8" rx="4" fill="#f59e42" opacity="0.15"/><path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  SHORT_BREAK: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-amber-500"><rect x="4" y="8" width="16" height="8" rx="4" fill="#f59e42" opacity="0.15"/><path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  LONG_BREAK: (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-amber-600"><rect x="2" y="7" width="20" height="10" rx="5" fill="#f59e42" opacity="0.15"/><path d="M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
};

// ✅ REMOVED: Using utility function instead

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

// Komponen untuk menampilkan journal entry
const JournalEntry: React.FC<{ log: ActivityLogItem }> = ({ log }) => {
  if (!log.what_done && !log.what_think) return null;

  return (
    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
      {log.what_done && (
        <>
          <div className="mb-2">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Apa yang diselesaikan:
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-2 border">
              {log.what_done}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Yang masih dipikirkan:
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded p-2 border">
              {log.what_think || '-'}
            </div>
          </div>
        </>
      )}
      
      {/* {log.what_think && (
      )} */}
    </div>
  );
};

// Komponen collapsible untuk setiap log item
const CollapsibleLogItem: React.FC<{ log: ActivityLogItem }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const icon = ICONS[log.type] || ICONS.BREAK;
  let title = '';
  if (log.type === 'FOCUS') {
    title = log.task_title ? `Fokus pada: ${log.task_title}` : 'Sesi Fokus';
  } else if (log.type === 'SHORT_BREAK') {
    title = 'Istirahat Pendek';
  } else if (log.type === 'LONG_BREAK') {
    title = 'Istirahat Panjang';
  } else {
    title = 'Istirahat';
  }

  const hasJournalEntry = log.what_done || log.what_think;

  return (
    <div className={`${isExpanded ? 'bg-blue-50 rounded-lg border border-blue-200' : ''} rounded px-2 py-1`}>
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 px-2 rounded transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Triangle indicator */}
        <div className="shrink-0">
          {hasJournalEntry ? (
            <svg 
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <div className="text-sm py-1 text-gray-500">
            {formatTimeRange(log.start_time, log.end_time)} &bull; {formatDuration(log.duration_minutes)}
          </div>
        </div>
      </div>
      
      {/* Collapsible content */}
      {isExpanded && hasJournalEntry && (
        <div className="mt-2 ml-6">
          <JournalEntry log={log} />
        </div>
      )}
    </div>
  );
};

const ActivityLog: React.FC<ActivityLogProps> = ({ date, refreshKey }) => {
  const [dynamicHeight, setDynamicHeight] = useState('');

  const lastActivityTimestamp = useActivityStore((state) => state.lastActivityTimestamp);
  
  // ✅ Use SWR for data fetching instead of manual useEffect
  const { logs, isLoading: loading, error } = useActivityLogs({
    date,
    refreshKey,
    lastActivityTimestamp,
  });
  
  // Calculate dynamic height based on Main Quest + Side Quest + Pomodoro Timer heights
  useEffect(() => {
    const calculateHeight = () => {
      try {
        // Check if screen size is md or above
        const isMdAndAbove = window.innerWidth >= 768;
        if (!isMdAndAbove) {
          return;
        }
        
        // Get Main Quest + Side Quest + Pomodoro Timer
        const mainQuestCard = document.querySelector('.main-quest-card');
        const sideQuestCard = document.querySelector('.side-quest-card');
        const workQuestCard = document.querySelector('.work-quest-card');
        const pomodoroTimer = document.querySelector('.pomodoro-timer');

        // Get viewport height
        const mainQuestHeight = mainQuestCard ? mainQuestCard.getBoundingClientRect().height : 0;
        const sideQuestHeight = sideQuestCard ? sideQuestCard.getBoundingClientRect().height : 0;
        const workQuestHeight = workQuestCard ? workQuestCard.getBoundingClientRect().height : 0;
        const pomodoroHeight = pomodoroTimer ? pomodoroTimer.getBoundingClientRect().height : 0;

        // Calculate heights
        const finalHeight = (mainQuestHeight + sideQuestHeight + workQuestHeight) - pomodoroHeight - 100;

        // Set dynamic height based on available space
        setDynamicHeight(`${finalHeight}px`);
        
      } catch (error) {
        console.warn('Error calculating dynamic height:', error);
      }
    };
    
    // Calculate height on mount and window resize
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    
    return () => window.removeEventListener('resize', calculateHeight);
  }, [date]); // Recalculate when date changes

  // Group logs by task_id
  const safeLogs = Array.isArray(logs) ? logs : [];
  const grouped = safeLogs.reduce((acc, log) => {
    if (!log.task_id) return acc;
    if (!acc[log.task_id]) {
      acc[log.task_id] = {
        title: log.task_title || 'Task',
        sessions: [],
        totalMinutes: 0,
      };
    }
    acc[log.task_id].sessions.push(log);
    acc[log.task_id].totalMinutes += log.duration_minutes;
    return acc;
  }, {} as Record<string, { title: string; sessions: ActivityLogItem[]; totalMinutes: number }>);
  const summary = Object.values(grouped);
  
  const formatTotal = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h} hrs${m > 0 ? ' ' + m + ' mins' : ''}` : `${m} mins`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 flex flex-col" style={{ height: dynamicHeight }}>
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-4">
            {/* Skeleton for 3 summary cards */}
            {Array.from({ length: 1 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 bg-white dark:bg-gray-800 animate-pulse">
                {/* Task title skeleton */}
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                
                {/* Sessions and duration skeleton */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                
                {/* Session list skeleton */}
                <div className="space-y-1 ml-2">
                  {Array.from({ length: 2 + (index % 3) }).map((_, sessionIndex) => (
                    <div key={`session-${sessionIndex}`} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-9"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                      </div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500 dark:text-red-400 text-center py-8">
            Error loading activity logs: {error}
          </div>
        ) : summary.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            Belum ada aktivitas tercatat hari ini.
          </div>
        ) : (
          <div className="space-y-4">
            {summary.map((item: { title: string; sessions: ActivityLogItem[]; totalMinutes: number }) => (
              <div key={`summary-${item.title}`} className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 bg-white dark:bg-gray-800">
                <div className="font-semibold text-gray-900 dark:text-gray-100 text-base mb-1">{item.title}</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block bg-brand-100 text-brand-700 px-2 py-1 rounded-full text-xs font-semibold">
                    {item.sessions.length} sessions
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-300">({formatTotal(item.totalMinutes)})</span>
                </div>
                <div className="space-y-1 ml-2">
                  {item.sessions.map((log: ActivityLogItem) => (
                    <CollapsibleLogItem key={log.id} log={log} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;