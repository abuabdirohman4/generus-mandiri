import React from 'react';
import { useQuestProgress } from '../hooks/useQuestProgress';

interface QuestProgressBarProps {
  questId: string;
  className?: string;
}

export default function QuestProgressBar({ questId, className = '' }: QuestProgressBarProps) {
  const {
    totalMilestones,
    completedMilestones,
    totalTasks,
    completedTasks,
    totalSubtasks,
    completedSubtasks,
    overallProgress,
    milestoneProgress,
    taskProgress,
    subtaskProgress,
    isLoading,
  } = useQuestProgress(questId);

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    if (progress >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600 dark:text-green-400';
    if (progress >= 60) return 'text-blue-600 dark:text-blue-400';
    if (progress >= 40) return 'text-yellow-600 dark:text-yellow-400';
    if (progress >= 20) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-2 px-4 border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      {/* <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Progress Quest
        </h3>
        <div className={`text-2xl font-bold ${getProgressTextColor(overallProgress)}`}>
          {overallProgress}%
        </div>
      </div> */}

      {/* Overall Progress Bar */}
      {/* <div className="mb-6"> */}
        {/* <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Progress Keseluruhan</span>
          <span>{overallProgress}%</span>
        </div> */}
        <div className="flex items-center w-full">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-out ${getProgressColor(overallProgress)}`}
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          <div className="ml-3 text-sm font-medium">{overallProgress}%</div>
        </div>
      {/* </div> */}

      {/* Detailed Progress */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> */}
        {/* Milestones Progress */}
        {/* <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Milestones
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedMilestones}/{totalMilestones}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${milestoneProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {milestoneProgress.toFixed(1)}% selesai
          </div>
        </div> */}

        {/* Tasks Progress */}
        {/* <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tasks
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : 'Belum ada data'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${taskProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {totalTasks > 0 ? `${taskProgress.toFixed(1)}% selesai` : 'Data akan muncul setelah milestone dibuat'}
          </div>
        </div> */}

        {/* Subtasks Progress */}
        {/* <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subtasks
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks}` : 'Belum ada data'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-1">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${subtaskProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {totalSubtasks > 0 ? `${subtaskProgress.toFixed(1)}% selesai` : 'Data akan muncul setelah task dibuat'}
          </div>
        </div> */}
      {/* </div> */}

      {/* Summary */}
      {/* <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Total Item:</span>
          <span>
            {totalMilestones > 0 ? (
              <>
                {totalMilestones} milestones
                {totalTasks > 0 && `, ${totalTasks} tasks`}
                {totalSubtasks > 0 && `, ${totalSubtasks} subtasks`}
                {' '}({completedMilestones + completedTasks + completedSubtasks} selesai)
              </>
            ) : (
              'Belum ada milestone'
            )}
          </span>
        </div>
      </div> */}
    </div>
  );
}
