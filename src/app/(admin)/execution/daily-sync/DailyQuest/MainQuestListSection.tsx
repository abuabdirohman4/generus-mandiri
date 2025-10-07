import { useState } from 'react';
import TaskItemCard from './components/TaskItemCard';
import { TaskColumnProps } from './types';
import { EyeIcon, EyeCloseIcon } from '@/lib/icons';
import { useUIPreferencesStore } from '@/stores/uiPreferencesStore';

const MainQuestListSection = ({ 
  title, 
  items, 
  onStatusChange, 
  onSelectTasks, 
  onSetActiveTask, 
  selectedDate, 
  onTargetChange, 
  onFocusDurationChange, 
  completedSessions, 
  refreshSessionKey, 
  forceRefreshTaskId, 
  showAddQuestButton 
}: TaskColumnProps) => {
  const { showCompletedMainQuest, toggleShowCompletedMainQuest } = useUIPreferencesStore();
  const [isHovering, setIsHovering] = useState(false);

  // Filter items based on showCompletedMainQuest state
  const filteredItems = showCompletedMainQuest 
    ? items 
    : items.filter(item => item.status !== 'DONE');

  return (
    <div className="rounded-lg h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
        
        {/* Toggle Show/Hide Completed Button */}
        <div className="relative mr-9" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <button
            onClick={toggleShowCompletedMainQuest}
            className="mt-0.5 p-1.25 text-gray-500 rounded rounded-full hover:text-gray-900 hover:shadow-md transition-colors"
          >
            {showCompletedMainQuest ? (
              <EyeIcon className="w-5 h-5" />
            ) : (
              <EyeCloseIcon className="w-5 h-5" />
            )}
          </button>
          
          {/* Custom Tooltip with Arrow */}
          {/* {isHovering && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-20 shadow-lg">
              {showCompletedMainQuest ? 'Hide completed' : 'Show completed'}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800"></div>
            </div>
          )} */}
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <TaskItemCard
            key={item.id}
            item={item}
            onStatusChange={onStatusChange}
            onSetActiveTask={onSetActiveTask}
            selectedDate={selectedDate}
            onTargetChange={onTargetChange}
            onFocusDurationChange={onFocusDurationChange}
            completedSessions={completedSessions}
            refreshKey={refreshSessionKey?.[item.id]}
            forceRefreshTaskId={forceRefreshTaskId}
          />
        ))}
        {filteredItems.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="mb-6 py-8">
              {showCompletedMainQuest 
                ? 'Tidak ada main quest hari ini' 
                : 'Tidak ada main quest yang belum selesai'
              }
            </p>
            {onSelectTasks ? (
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => onSelectTasks?.([])}
                  className="w-full px-4 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors text-sm"
                >
                  Select Quest
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        
        {/* Tombol Select Quest di dalam card Main Quest - hanya muncul jika ada task */}
        {showAddQuestButton && filteredItems.length > 0 ? (
          <div className="flex justify-center mt-6">
            <button 
              className="w-full px-4 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors text-sm"
              onClick={() => onSelectTasks?.([])}
            >
              Select Quest
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MainQuestListSection;
