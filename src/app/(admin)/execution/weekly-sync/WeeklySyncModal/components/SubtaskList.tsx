import React from 'react';
import Checkbox from '@/components/form/input/Checkbox';
import type { SubtaskListProps } from '../types';

export const SubtaskList: React.FC<SubtaskListProps> = ({ 
  subtasks, 
  taskId, 
  expandedItems, 
  existingSelectedIds, 
  selectedItems, 
  handleItemToggle 
}) => {
  const expanded = expandedItems.has(taskId);
  // Show all subtasks that are not done, including already selected ones
  // Also filter out subtasks with empty or null titles
  const filteredSubtasks = subtasks.filter((subtask: any) => {
    const hasValidTitle = subtask.title && subtask.title.trim() !== '';
    const isNotDone = subtask.status !== 'DONE';
    
    return hasValidTitle && isNotDone;
  });
  
  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'opacity-100' : 'max-h-0 opacity-0'}`}
      style={{ willChange: 'max-height, opacity' }}
    >
      <div className="ml-2 space-y-2">
        {filteredSubtasks.map((subtask: any) => {
          const parentTaskSelected = selectedItems.some(item => item.id === taskId && item.type === 'TASK');
          const isInCurrentSelection = selectedItems.some(item => item.id === subtask.id && (item.type === 'SUBTASK' || item.type === 'TASK'));
          const isInExistingSelection = existingSelectedIds.has(subtask.id);
          const isParentSelectedElsewhere = existingSelectedIds.has(taskId);
          const isChecked = isInCurrentSelection || isInExistingSelection || parentTaskSelected;
          const isDisabled = isParentSelectedElsewhere || parentTaskSelected || isInExistingSelection;
          
          return (
            <div key={subtask.id} className="border-l-2 border-gray-100 dark:border-gray-700 pl-4">
              <div className="flex items-center space-x-2 py-1">
                <Checkbox
                  checked={isChecked}
                  onChange={() => {
                    handleItemToggle(subtask.id, 'SUBTASK', [], taskId);
                  }}
                  disabled={isDisabled}
                />
                <span className={`text-sm ${
                  isDisabled 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {subtask.title}
                  {/* {isParentSelectedElsewhere && (
                    <span className="ml-2 text-xs text-red-500 dark:text-red-400">
                      (Selected)
                    </span>
                  )} */}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
