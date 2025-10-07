import React, { useState, useEffect, useRef } from 'react';
import Skeleton from '@/components/ui/skeleton/Skeleton';
import Button from '@/components/ui/button/Button';
import Checkbox from '@/components/form/input/Checkbox';
import { TaskSelectionModalProps } from '../types';

const MainQuestModal: React.FC<TaskSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  tasks, 
  selectedTasks, 
  onTaskToggle, 
  onSave, 
  isLoading,
  savingLoading = false,
  completedTodayCount = 0
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const isInitialLoad = useRef(true);
  
  // Cookie key untuk menyimpan expanded state
  const expandedKey = 'mainquest-modal-expanded';

  // Initialize state with data from localStorage
  const getInitialExpandedItems = (): Set<string> => {
    if (typeof window === 'undefined') return new Set<string>();
    
    try {
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

  // Initialize expanded state
  useEffect(() => {
    if (isOpen) {
      setExpandedItems(getInitialExpandedItems());
    }
  }, [isOpen]);

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

  const groupByGoalSlot = (tasks: any[]) => {
    const groups: Record<number, any[]> = {};
    tasks.forEach(task => {
      if (!groups[task.goal_slot]) {
        groups[task.goal_slot] = [];
      }
      groups[task.goal_slot].push(task);
    });
    return groups;
  };

  // Build hierarchical structure like HierarchicalGoalDisplay
  const buildHierarchy = (tasks: any[]) => {
    const hierarchy: { [key: string]: any } = {};
    const rootItems: any[] = [];
    
    // First, identify root items (items without parent_task_id)
    tasks.forEach(task => {
      if (!task.parent_task_id) {
        rootItems.push(task);
      }
    });

    // If no root items found (all items are subtasks), treat all items as root
    if (rootItems.length === 0) {
      tasks.forEach(task => {
        hierarchy[task.id] = {
          ...task,
          children: [],
          isExpanded: expandedItems.has(task.id)
        };
      });
    } else {
      // Build hierarchy for each root item
      rootItems.forEach(rootItem => {
        const children = tasks.filter(task => task.parent_task_id === rootItem.id);
        
        hierarchy[rootItem.id] = {
          ...rootItem,
          children: children.length > 0 ? children : [],
          isExpanded: expandedItems.has(rootItem.id)
        };
      });
    }

    return hierarchy;
  };

  // Toggle expanded state
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

  // Render item recursively like HierarchicalGoalDisplay
  const renderItem = (item: any, level: number = 0, isChild: boolean = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedTasks[item.id] || false;
    
    return (
      <div key={item.id} className="space-y-1">
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
                toggleExpanded(item.id);
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

          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onChange={() => onTaskToggle(item.id)}
            disabled={savingLoading}
          />
          
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

  if (!isOpen) return null;

  // Filter out tasks that are not available for selection
  // Tasks that were completed yesterday are already filtered out in getTasksForWeek
  // But we need to ensure tasks added today are still available
  const availableTasks = tasks.filter(task => {
    // Always show tasks that are currently selected (added today)
    if (selectedTasks[task.id]) {
      return true;
    }
    // Show all other available tasks (filtered by getTasksForWeek)
    return true;
  });

  const groupedTasks = groupByGoalSlot(availableTasks);
  const selectedCount = Object.values(selectedTasks).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Main Quest</h2>
            <p className="text-gray-700 font-medium">
              Selected : {selectedCount} Quest
            </p>

            {completedTodayCount > 0 && (
              <>
                <p className="text-gray-700 font-medium">
                  Done : {completedTodayCount} Quest
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Quest List */}
        {isLoading ? (
          <div className="space-y-6">
            {/* Skeleton for 2-3 goal slot groups */}
            {Array.from({ length: 1 }).map((_, groupIndex) => (
              <div key={`skeleton-group-${groupIndex}`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                {/* Goal slot title skeleton */}
                <Skeleton className="h-6 w-48 mb-4" />
                
                {/* Task items skeleton */}
                <div className="space-y-3">
                  {Array.from({ length: 3 + (groupIndex % 3) }).map((_, taskIndex) => (
                    <div key={`skeleton-task-${taskIndex}`} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                      {/* Checkbox skeleton */}
                      <Skeleton className="w-4 h-4 rounded" />
                      
                      {/* Task content skeleton */}
                      <div className="flex-1">
                        {/* Task title skeleton */}
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        {/* Task subtitle skeleton */}
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {Object.entries(groupedTasks).map(([goalSlot, slotTasks]) => {
              const hierarchy = buildHierarchy(slotTasks);
              const rootItems = Object.values(hierarchy);
              
              return (
                <div key={goalSlot} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4">Goal Mingguan {goalSlot}</h3>
                  <div className="space-y-2">
                    {rootItems.length > 0 ? (
                      rootItems.map((item: any) => renderItem(item))
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          Tidak ada task di goal slot ini
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Klik edit untuk menambahkan task
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            disabled={savingLoading}
            variant="outline"
            size="md"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={selectedCount === 0}
            loading={savingLoading}
            loadingText="Menyimpan..."
            variant="primary"
            size="md"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainQuestModal;
