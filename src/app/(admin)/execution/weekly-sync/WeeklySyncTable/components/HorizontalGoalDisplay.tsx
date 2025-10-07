"use client";

import React from 'react';
import type { GoalItem } from '../../WeeklySyncClient/types';
import type { HorizontalGoalDisplayProps } from '../types';
import { useWeeklyTaskManagement } from '../../hooks/useWeeklyTaskManagement';

const questColors = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
  'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-700',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border border-orange-200 dark:border-orange-700',
];

export default function HorizontalGoalDisplay({ items, onClick, slotNumber, showCompletedTasks, weekDate }: HorizontalGoalDisplayProps) {
  const { toggleTaskStatus, isTaskLoading } = useWeeklyTaskManagement();
  // Filter items based on showCompletedTasks state
  const filteredItems = showCompletedTasks 
    ? items 
    : items.filter(item => item.status !== 'DONE');

  // Group items by parent quest with improved logic
  const groupItemsByQuest = (items: GoalItem[]) => {
    const groups: { [questId: string]: GoalItem[] } = {};
    const questItems: { [questId: string]: GoalItem } = {};
    const taskItems: { [taskId: string]: GoalItem } = {};
    
    // First pass: collect all items and identify quest and task items
    items.forEach(item => {
      // Since we removed item_type, all items in weekly_goal_items are MAIN_QUEST
      taskItems[item.item_id] = item;
      const questId = item.parent_quest_id || item.item_id;
      if (!groups[questId]) {
        groups[questId] = [];
      }
      groups[questId].push(item);
    });

    // Second pass: apply grouping logic
    const result: { [questId: string]: GoalItem[] } = {};
    
    Object.keys(groups).forEach(questId => {
      const groupItems = groups[questId];
      const questItem = questItems[questId];
      
      // If this is a quest with children
      if (questItem && groupItems.length > 1) {
        const children = groupItems.filter(item => item.item_id !== questId);
        const allChildrenSelected = children.every(item => item.status === 'DONE');
        
        if (allChildrenSelected) {
          // Hide parent if all children are selected
          result[questId] = children;
        } else {
          // Show parent with its selection state
          result[questId] = groupItems;
        }
      } else {
        // Handle Task/Subtask relationships
        const processedItems: GoalItem[] = [];
        
        groupItems.forEach(item => {
          // Since we removed item_type, all items are MAIN_QUEST
          if (!item.parent_task_id) {
            // Check if this task has subtasks
            const subtasks = groupItems.filter(subtask => 
              subtask.parent_task_id === item.item_id
            );
            
            if (subtasks.length > 0) {
              const allSubtasksSelected = subtasks.every(subtask => subtask.status === 'DONE');
              
              if (allSubtasksSelected) {
                // Hide task if all subtasks are selected
                processedItems.push(...subtasks);
              } else {
                // Show task even if some subtasks are selected
                processedItems.push(item);
                processedItems.push(...subtasks);
              }
            } else {
              // Task has no subtasks, add normally
              processedItems.push(item);
            }
          } else {
            // Add subtask items
            processedItems.push(item);
          }
        });
        
        result[questId] = processedItems;
      }
    });
    
    return result;
  };

  const groupedItems = groupItemsByQuest(filteredItems);
  const sortedQuestIds = Object.keys(groupedItems).sort((a, b) => {
    const aPriority = filteredItems.find(item => (item.parent_quest_id || item.item_id) === a)?.parent_quest_priority_score ?? 0;
    const bPriority = filteredItems.find(item => (item.parent_quest_id || item.item_id) === b)?.parent_quest_priority_score ?? 0;
    return bPriority - aPriority;
  });

  return (
      <>
        {sortedQuestIds.length > 0 ? (
          sortedQuestIds.map((questId, questIndex) => {
            const questItems = groupedItems[questId];
            const colorClass = questColors[(slotNumber-1)%questColors.length];
            
            return (
              questItems.map((item) => (
                <span
                  key={item.id}
                  className="group relative flex items-center space-x-3 rounded-lg p-2 text-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {/* Top row: Checkbox + Label */}
                    {/* Interactive Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(item.item_id, slotNumber, item.status, weekDate);
                      }}
                      disabled={isTaskLoading(item.item_id)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        item.status === 'DONE' 
                          ? 'opacity-75 bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600' 
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
                  
                    {/* Bottom row: Text */}
                    <span className={`flex-1 text-sm font-medium ${
                      item.status === 'DONE' 
                        ? 'opacity-75 text-gray-500 dark:text-gray-400 line-through' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.title}
                    </span>
                </span>
              ))
            );
          })
        ) : (
          <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
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
