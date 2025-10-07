"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { GoalItem } from '../../WeeklySyncClient/types';
import type { HorizontalGoalDisplayProps } from '../types';
import { useWeeklyTaskManagement } from '../../hooks/useWeeklyTaskManagement';

const questColors = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
  'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-700',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border border-orange-200 dark:border-orange-700',
];

export default function HierarchicalGoalDisplay({ items, onClick, slotNumber, showCompletedTasks, weekDate }: HorizontalGoalDisplayProps) {
  // Initialize state with data from localStorage
  const getInitialExpandedItems = (): Set<string> => {
    if (typeof window === 'undefined') return new Set<string>();
    
    try {
      const expandedKey = `hierarchical-expanded-slot-${slotNumber}`;
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
  const { toggleTaskStatus, isTaskLoading } = useWeeklyTaskManagement();
  const isInitialLoad = useRef(true);
  
  // Cookie key untuk menyimpan expanded state
  const expandedKey = `hierarchical-expanded-slot-${slotNumber}`;

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

  // Filter items based on showCompletedTasks state
  const filteredItems = showCompletedTasks 
    ? items 
    : items.filter(item => item.status !== 'DONE');

  // Build hierarchical structure
  const buildHierarchy = (items: GoalItem[]) => {
    const hierarchy: { [key: string]: any } = {};
    const rootItems: GoalItem[] = [];
    
    // First, identify root items (items without parent_task_id)
    items.forEach(item => {
      if (!item.parent_task_id) {
        rootItems.push(item);
      }
    });

    // If no root items found (all items are subtasks), treat all items as root
    if (rootItems.length === 0) {
      items.forEach(item => {
        hierarchy[item.item_id] = {
          ...item,
          children: [],
          isExpanded: expandedItems.has(item.item_id)
        };
      });
    } else {
      // Build hierarchy for each root item
      rootItems.forEach(rootItem => {
        const children = items.filter(item => item.parent_task_id === rootItem.item_id);
        
        hierarchy[rootItem.item_id] = {
          ...rootItem,
          children: children.length > 0 ? children : [],
          isExpanded: expandedItems.has(rootItem.item_id)
        };
      });
    }

    return hierarchy;
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const renderItem = (item: any, level: number = 0, isChild: boolean = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.item_id);
    const colorClass = questColors[(slotNumber-1)%questColors.length];
    
    return (
      <div key={item.id} className="space-y-1">
        {/* border-l-2 border-gray-00 dark:border-gray-700 pl-4 */}
        <div
          className={`group relative flex items-center space-x-3 py-1 text-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
            level > 0 ? 'ml-9 border-l-2 border-gray-200 dark:border-gray-600' : ''
          } ${
            item.status === 'DONE' 
              ? 'opacity-75' 
              : ''
          }`}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(item.item_id);
              }}
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
          )}
          
          {/* Spacer for items without children */}
          {!hasChildren && <div className="w-2 h-2" />}

          {/* Interactive Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskStatus(item.item_id, slotNumber, item.status, weekDate);
            }}
            disabled={isTaskLoading(item.item_id)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
              item.status === 'DONE' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600' 
                : 'border-gray-300 dark:border-gray-500 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            } ${isTaskLoading(item.item_id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isTaskLoading(item.item_id) ? (
              <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
            ) : item.status === 'DONE' ? (
              <svg 
                className="w-2.5 h-2.5 text-white" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : null}
          </button>
          
          {/* Task Title */}
          <span className={`flex-1 text-sm font-medium ${
            item.status === 'DONE' 
              ? 'text-gray-500 dark:text-gray-400 line-through' 
              : 'text-gray-900 dark:text-white'
          }`}>
            {item.title || 'Untitled Task'}
          </span>
          
          {/* Children Count Indicator */}
          {hasChildren && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({item.children.length})
            </span>
          )}
        </div>
        
        {/* Render Children with Smooth Animation */}
        {hasChildren && (
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded 
                ? 'max-h-96 opacity-100 transform translate-y-0' 
                : 'max-h-0 opacity-0 transform -translate-y-2'
            }`}
          >
            <div className="space-y-1">
              {item.children.map((child: any) => 
                renderItem(child, level + 1, true)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const hierarchy = buildHierarchy(filteredItems);
  const rootItems = Object.values(hierarchy);

  return (
    <>
      {rootItems.length > 0 ? (
        <div className="space-y-2">
          {rootItems.map((item: any) => renderItem(item))}
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1">
            {showCompletedTasks 
              ? 'Tidak ada task di goal slot ini' 
              : 'Tidak ada task yang belum selesai'
            }
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Klik edit untuk menambahkan task
          </p>
        </div>
      )}
    </>
  );
}
