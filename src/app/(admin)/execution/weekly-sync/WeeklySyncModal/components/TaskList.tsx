import React, { useEffect, useState } from 'react';
import { SubtaskList } from './SubtaskList';
import Checkbox from '@/components/form/input/Checkbox';

import type { TaskListProps } from '../types';

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  milestoneId, 
  expandedItems, 
  existingSelectedIds, 
  selectedItems, 
  handleItemToggle, 
  toggleExpanded 
}) => {
  const expanded = expandedItems.has(milestoneId);
  const [localSelectedItems, setLocalSelectedItems] = useState(selectedItems);

  // Sync local state with selectedItems
  useEffect(() => {
    setLocalSelectedItems(selectedItems);
  }, [selectedItems]);
  // Show all tasks that are not done, OR are already selected (even if DONE)
  // Also filter out tasks with empty or null titles
  const filteredTasks = tasks.filter((task: any) => {
    const hasValidTitle = task.title && task.title.trim() !== '';
    const isNotDone = task.status !== 'DONE';
    const isAlreadySelected = localSelectedItems.some(item => item.id === task.id && item.type === 'TASK');
    const isInExistingSelection = existingSelectedIds.has(task.id);
    
    return hasValidTitle && (isNotDone || isAlreadySelected || isInExistingSelection);
  });
  
  
  if (filteredTasks.length === 0) return null;
  
  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'opacity-100' : 'max-h-0 opacity-0'}`}
      style={{ willChange: 'max-height, opacity' }}
    >
      <div className="ml-2 space-y-2">
        {filteredTasks.map((task: any) => {
          const isInCurrentSelection = localSelectedItems.some(item => item.id === task.id && item.type === 'TASK');
          const isInExistingSelection = existingSelectedIds.has(task.id);
          const isChecked = isInCurrentSelection || isInExistingSelection;
          
          // Check if any subtasks are selected elsewhere (for hierarchy conflict prevention)
          const hasConflictingSubtasks = task.subtasks?.some((subtask: any) => existingSelectedIds.has(subtask.id));
          
          return (
            <div key={task.id} className="border-l-2 border-gray-00 dark:border-gray-700 pl-4">
              <div className="flex items-center space-x-2 py-1">
                <Checkbox
                  checked={isChecked}
                  onChange={() => {
                    handleItemToggle(task.id, 'TASK', task.subtasks || []);
                  }}
                  disabled={hasConflictingSubtasks}
                />
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {task.title}
                  </span>
                  {/* {task.subtasks && task.subtasks.length > 0 && (
                    <span className={`text-xs ${
                      hasConflictingSubtasks 
                        ? 'text-red-500 dark:text-red-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      ({task.subtasks.length} subtasks)
                      {hasConflictingSubtasks && ' - Konflik!'}
                    </span>
                  )} */}
                </div>
              {task.subtasks && task.subtasks.length > 0 ? (
                <button
                  onClick={() => toggleExpanded(task.id)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {expandedItems.has(task.id) ? '▼' : '▶'} Quests
                </button>
              ) : null}
            </div>
            {task.subtasks ? (
              <SubtaskList
                subtasks={task.subtasks}
                taskId={task.id}
                expandedItems={expandedItems}
                existingSelectedIds={existingSelectedIds}
                selectedItems={selectedItems}
                handleItemToggle={handleItemToggle}
              />
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );
};
