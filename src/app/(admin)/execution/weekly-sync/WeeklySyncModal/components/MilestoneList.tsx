import React from 'react';
import type { Milestone } from '../../WeeklySyncClient/types';
import { TaskList } from './TaskList';

import type { MilestoneListProps } from '../types';

export const MilestoneList: React.FC<MilestoneListProps> = ({ 
  milestones, 
  questId, 
  expandedItems, 
  existingSelectedIds, 
  selectedItems,
  handleItemToggle,
  toggleExpanded 
}) => {
  const expanded = expandedItems.has(questId);
  // Show all milestones, including those with already selected tasks
  // Also filter out milestones with empty or null titles
  const filteredMilestones = milestones.filter((milestone: any) => {
    const hasValidTitle = milestone.title && milestone.title.trim() !== '';
    return hasValidTitle;
  });
  
  
  if (filteredMilestones.length === 0) return null;
  
  return (
    <div
      className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'opacity-100' : 'max-h-0 opacity-0'}`}
      style={{ willChange: 'max-height, opacity' }}
    >
      <div className="ml-2 space-y-3">
        {filteredMilestones.map((milestone: any) => (
          <div key={milestone.id} className="border-l-2 border-gray-300 dark:border-gray-600 pl-4">
            <div className="flex items-center space-x-2 py-1">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {milestone.title}
              </span>
              {milestone.tasks && milestone.tasks.length > 0 ? (
                <button
                  onClick={() => toggleExpanded(milestone.id)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {expandedItems.has(milestone.id) ? '▼' : '▶'} Langkah
                </button>
              ) : null}
            </div>
            {milestone.tasks ? (
              <TaskList
                tasks={milestone.tasks}
                milestoneId={milestone.id}
                expandedItems={expandedItems}
                existingSelectedIds={existingSelectedIds}
                selectedItems={selectedItems}
                handleItemToggle={handleItemToggle}
                toggleExpanded={toggleExpanded}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
