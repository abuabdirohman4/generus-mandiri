"use client";

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import HorizontalGoalDisplay from './HorizontalGoalDisplay';
import HierarchicalGoalDisplay from './HierarchicalGoalDisplay';
import ProgressIndicator from './ProgressIndicator';
import { EyeIcon, EyeCloseIcon } from '@/lib/icons';
import type { GoalRowProps } from '../types';

export default function GoalRow({ slotNumber, goal, progress, onSlotClick, showCompletedTasks, weekDate }: GoalRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isHierarchicalView, setIsHierarchicalView] = useState(true);
  const [showCompletedTasksSlot, setShowCompletedTasksSlot] = useState(showCompletedTasks);
  const [isHovering, setIsHovering] = useState(false);
  
  // Cookie key untuk menyimpan state
  const cookieKey = `weekly-goal-slot-${slotNumber}-expanded`;
  const showCompletedKey = `weekly-goal-slot-${slotNumber}-show-completed`;
  
  // Set client flag untuk SSR compatibility
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Load state dari cookies saat component mount (hanya di client)
  useEffect(() => {
    if (!isClient) return;
    
    const savedState = getCookie(cookieKey);
    if (savedState !== null) {
      setIsExpanded(savedState === 'true');
    }
    
    // ✅ FIXED: Load from cookies first, then use props as fallback
    // This ensures user preference is preserved across refreshes
    const savedShowCompleted = getCookie(showCompletedKey);
    if (savedShowCompleted !== null) {
      // Use cookie value if available (user preference)
      setShowCompletedTasksSlot(savedShowCompleted === 'true');
    } else if (showCompletedTasks !== undefined) {
      // Use props value only if no cookie exists
      setShowCompletedTasksSlot(showCompletedTasks);
    }
  }, [cookieKey, showCompletedKey, isClient, showCompletedTasks]);
  
  // Save state ke cookies saat state berubah (hanya di client)
  useEffect(() => {
    if (!isClient) return;
    
    setCookie(cookieKey, isExpanded.toString(), 7); // Expire dalam 7 hari
  }, [isExpanded, cookieKey, isClient]);
  
  // Save showCompletedTasks state ke cookies
  useEffect(() => {
    if (!isClient) return;
    
    setCookie(showCompletedKey, showCompletedTasksSlot.toString(), 7); // Expire dalam 7 hari
  }, [showCompletedTasksSlot, showCompletedKey, isClient]);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  const toggleShowCompletedTasks = () => {
    setShowCompletedTasksSlot(!showCompletedTasksSlot);
  };
  
  // Helper functions untuk cookies
  const setCookie = (name: string, value: string, days: number) => {
    if (typeof window === 'undefined') return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  };
  
  const getCookie = (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  };

  const renderGoalContent = () => {
    if (goal && goal.items.length > 0) {
      return (
        <div className="space-y-3">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* View Mode Toggle and Edit Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsHierarchicalView(true)}
                    className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                      isHierarchicalView 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setIsHierarchicalView(false)}
                    className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                      !isHierarchicalView 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    List
                  </button>
                </div>
                
                {/* Eye Icon and Edit Button */}
                <div className="flex items-center space-x-2">
                  {/* Eye Icon for Show/Hide Completed Tasks */}
                  <div className="relative" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShowCompletedTasks();
                      }}
                      className="p-1.5 text-gray-500 rounded-full hover:text-gray-900 hover:shadow-md transition-colors"
                    >
                      {showCompletedTasksSlot ? (
                        <EyeIcon className="w-5 h-5" />
                      ) : (
                        <EyeCloseIcon className="w-5 h-5" />
                      )}
                    </button>
                    
                    {/* Custom Tooltip with Arrow */}
                    {isHovering && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-20 shadow-lg">
                        {showCompletedTasksSlot ? 'Hide completed' : 'Show completed'}
                        {/* Arrow pointing down */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Edit Button */}
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onSlotClick(slotNumber)}
                    className="flex items-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </Button>
                </div>
              </div>

              {/* Task Display */}
              {isHierarchicalView ? (
                <HierarchicalGoalDisplay
                  items={goal.items}
                  onClick={() => onSlotClick(slotNumber)}
                  slotNumber={slotNumber}
                  showCompletedTasks={showCompletedTasksSlot}
                  weekDate={goal.weekDate}
                />
              ) : (
                <HorizontalGoalDisplay
                  items={goal.items}
                  onClick={() => onSlotClick(slotNumber)}
                  slotNumber={slotNumber}
                  showCompletedTasks={showCompletedTasksSlot}
                  weekDate={goal.weekDate}
                />
              )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Belum ada fokus mingguan
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
            Klik tombol di bawah untuk menambahkan quest
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSlotClick(slotNumber)}
            className="flex items-center space-x-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Tetapkan Fokus</span>
          </Button>
        </div>
      );
    }
  };

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      {/* Mobile Layout - Collapsible Card */}
      <td className="p-4 md:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Card Header with Collapse Button */}
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 ease-in-out"
          >
            <div className="flex-1 text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Weekly Quest {slotNumber}
              </h3>
            </div>
            <div className="flex items-center">
              <svg
                className={`w-5 h-5 text-gray-500 transition-all duration-300 ease-in-out ${
                  isExpanded ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Collapsible Goal Content */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded 
                ? 'opacity-100 transform translate-y-0' 
                : 'max-h-0 opacity-0 transform -translate-y-2'
            }`}
          >
            <div className="px-4 py-4">
              {/* Progress Indicator */}
              <div className="flex-shrink-0">
                <ProgressIndicator progress={progress} slotNumber={slotNumber}/>
                <p className="mt-2 mb-3 text-center text-sm">
                  {progress.completed}/{progress.total} completed
                </p>
              </div>

              {/* Goal Content */}
              <div className="flex-1">
                {renderGoalContent()}
              </div>
            </div>
          </div>
        </div>
      </td>
      
      {/* Desktop Layout - Collapsible Card */}
      <td className="py-4 px-4 hidden md:table-cell" colSpan={2}>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Card Header with Collapse Button */}
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center justify-between px-7 py-4 bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 ease-in-out"
          >
            <div className="flex-1 text-left">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Weekly Quest {slotNumber}
              </h3>
            </div>
            <div className="flex items-center">
              <svg
                className={`w-5 h-5 text-gray-500 transition-all duration-300 ease-in-out ${
                  isExpanded ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Collapsible Goal Content */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded 
                ? 'opacity-100 transform translate-y-0' 
                : 'max-h-0 opacity-0 transform -translate-y-2'
            }`}
          >
            <div className="px-6 py-4">
              {/* Progress Indicator and Goal Content - Side by side */}
              <div className="flex items-center space-x-6">
                {/* Goal Content */}
                <div className="flex-1">
                  {renderGoalContent()}
                </div>
                
                {/* Progress Indicator */}
                <div className="flex-shrink-0">
                  <ProgressIndicator progress={progress} slotNumber={slotNumber}/>
                  <p className="mt-2 text-center text-sm">
                    {progress.completed}/{progress.total} completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}