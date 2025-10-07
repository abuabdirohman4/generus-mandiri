import React, { useState } from 'react';
import Skeleton from '@/components/ui/skeleton/Skeleton';
import Spinner from '@/components/ui/spinner/Spinner';
import { useTaskSession } from '../hooks/useTaskSession';
import { TaskCardProps } from '../types';
import { playSound } from '@/lib/soundUtils';
import { useTimerStore } from '@/stores/timerStore';
import { useSoundStore } from '@/stores/soundStore';
import { useTargetFocusStore } from '../../TargetFocus/stores/targetFocusStore';

const TaskItemCardContent = ({ 
  item, 
  onStatusChange, 
  onSetActiveTask, 
  selectedDate,
  onTargetChange, 
  onFocusDurationChange, 
  completedSessions, 
  refreshKey, 
  forceRefreshTaskId 
}: TaskCardProps) => {
  const { completed, loading, target, savingTarget, handleTargetChange } = useTaskSession(
    item, 
    selectedDate || '', 
    completedSessions, 
    refreshKey, 
    forceRefreshTaskId
  );
  
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [optimisticFocusDuration, setOptimisticFocusDuration] = useState<number | null>(null);

  // Get active task from timer store
  const { activeTask, timerState } = useTimerStore();
  
  // Get task completion sound settings
  const { taskCompletionSettings } = useSoundStore();
  
  // Get target focus store for optimistic updates
  const { updateTargetOptimistically } = useTargetFocusStore();
  
  const isCompleted = (optimisticStatus || item.status) === 'DONE';
  const isActiveInTimer = activeTask?.id === item.item_id && (timerState === 'FOCUSING' || timerState === 'PAUSED');
  const isVisuallyDisabled = isCompleted || (activeTask && !isActiveInTimer); // Visual disable only - functionality remains normal
  
  return (
    <div className={`rounded-lg p-4 shadow-sm border mb-3 transition-all duration-200 ${
      isVisuallyDisabled 
        ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60' 
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      
      {/* Title and Checkbox */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onSetActiveTask ? (
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                isVisuallyDisabled 
                  ? 'bg-gray-100 text-gray-400' 
                  : `${isActiveInTimer 
                      ? 'bg-gray-50 text-orange-500 hover:bg-orange-100' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}`}
              onClick={() => onSetActiveTask({
                id: item.item_id,
                title: item.title || `Task ${item.item_id}`,
                item_type: item.item_type,
                focus_duration: item.focus_duration || 25
              })}
              title={
                isCompleted 
                  ? "Quest sudah selesai" 
                  : isActiveInTimer 
                    ? "Quest sedang aktif di timer" 
                    : activeTask 
                      ? "Ada quest lain yang sedang aktif di timer" 
                      : "Mulai Pomodoro"
              }
            >
              {isActiveInTimer ? (
                // Pause icon saat task sedang aktif di timer
                <svg width="35" height="35" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="9" fill="currentColor" className='text-orange-500' opacity="0.15"/>
                  <rect x="7" y="6" width="2" height="8" rx="1" fill="white" stroke="currentColor"/>
                  <rect x="11" y="6" width="2" height="8" rx="1" fill="white" stroke="currentColor"/>
                </svg>
              ) : (
                // Play icon saat task tidak aktif
                <svg width="35" height="35" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15"/>
                  <polygon points="8,6 14,10 8,14" fill="currentColor"/>
                </svg>
              )}
            </button>
          ) : null}
          <h4 className={`font-medium text-sm leading-tight ${
            isCompleted 
              ? 'text-gray-500 dark:text-gray-500 line-through' 
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            {item.title || `Task ${item.item_id}`}
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          {/* Dropdown untuk durasi fokus */}
          <div className="relative">
            <select
              value={optimisticFocusDuration || item.focus_duration || 25}
              onChange={async (e) => {
                const newDuration = parseInt(e.target.value);
                
                // Optimistic update - update UI immediately
                setOptimisticFocusDuration(newDuration);
                
                try {
                  await onFocusDurationChange(item.id, newDuration);
                  
                  // Clear optimistic state after successful update
                  setOptimisticFocusDuration(null);
                } catch (error) {
                  // Revert optimistic update on error
                  setOptimisticFocusDuration(null);
                  console.error('Error updating focus duration:', error);
                }
              }}
              className={`appearance-none h-8 pl-3 pr-8 text-xs font-medium border rounded-lg transition-all duration-200 ${
                isVisuallyDisabled
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {/* Testing option - only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <>
                  <option value={1} className="text-gray-700 dark:text-gray-200">1m</option>
                  <option value={5} className="text-gray-700 dark:text-gray-200">5m</option>
                </>
              )}
              <option value={25} className="text-gray-700 dark:text-gray-200">25m</option>
              <option value={60} className="text-gray-700 dark:text-gray-200">60m</option>
              <option value={90} className="text-gray-700 dark:text-gray-200">90m</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg 
                className="w-3 h-3 text-gray-400 dark:text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Custom Checkbox untuk status */}
          <div className="flex items-center">
            <button
              type="button"
                onClick={async () => {
                  const newStatus = isCompleted ? 'TODO' : 'DONE';
                  
                  // Play completion sound when marking as DONE
                  if (newStatus === 'DONE') {
                    try {
                      await playSound(taskCompletionSettings.soundId, taskCompletionSettings.volume);
                    } catch (error) {
                      console.warn('Failed to play completion sound:', error);
                    }
                  }
                  
                  // Optimistic update - update UI immediately
                  setOptimisticStatus(newStatus);
                  
                  try {
                    await onStatusChange(item.id, newStatus);
                    // Clear optimistic status after successful update
                    setOptimisticStatus(null);
                  } catch (error) {
                    // Revert optimistic update on error
                    setOptimisticStatus(null);
                    console.error('Error updating status:', error);
                  }
              }}
              className={`w-8 h-8 rounded focus:ring-2 cursor-pointer flex items-center justify-center transition-colors border border-gray-300 ${
                isVisuallyDisabled
                  ? 'bg-gray-100 text-gray-400 focus:ring-brand-400'
                  : ''
              }`}
            >
              {isCompleted && (
                <svg 
                  className="w-10 h-10" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quest & Target */}
      <div className="flex items-center justify-between">
        {item.quest_title && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {item.quest_title}
          </div>
        )}
        <div className="flex items-center space-x-1">
          <div className="flex items-center gap-1 text-xs">
            <button
              className={`px-1 text-lg disabled:opacity-50 ${
                isCompleted 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-500 hover:text-brand-600'
              }`}
              disabled={savingTarget || target <= 1 || isCompleted}
            onClick={() => {
              if (!isCompleted) {
                const newTarget = target - 1;
                
                // Optimistic update to progress bar via Zustand store
                updateTargetOptimistically(item.item_id, newTarget);
                
                // Update the actual target
                handleTargetChange(newTarget, onTargetChange);
              }
            }}
              aria-label="Kurangi target"
            >
              –
            </button>
            {loading ? (
              <span className="text-gray-400"><Skeleton className="w-4 h-4 rounded" /></span>
            ) : (
              <span className={`font-semibold ${
                isCompleted 
                  ? 'text-gray-400' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                ({completed} / {target})
              </span>
            )}
            <button
              className={`px-1 text-lg disabled:opacity-50 ${
                isCompleted 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-500 hover:text-brand-600'
              }`}
              disabled={savingTarget || isCompleted}
            onClick={() => {
              if (!isCompleted) {
                const newTarget = target + 1;
                
                // Optimistic update to progress bar via Zustand store
                updateTargetOptimistically(item.item_id, newTarget);
                
                // Update the actual target
                handleTargetChange(newTarget, onTargetChange);
              }
            }}
              aria-label="Tambah target"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskItemCard = TaskItemCardContent;

export default TaskItemCard;
