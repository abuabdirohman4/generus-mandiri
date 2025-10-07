"use client";

import { useMemo } from 'react';
import { useMilestones, useTasks, useSubtasks } from '../../hooks/useMainQuestsSWR';

interface QuestProgress {
  totalMilestones: number;
  completedMilestones: number;
  totalTasks: number;
  completedTasks: number;
  totalSubtasks: number;
  completedSubtasks: number;
  overallProgress: number;
  milestoneProgress: number;
  taskProgress: number;
  subtaskProgress: number;
  isLoading: boolean;
}

/**
 * Hook to calculate comprehensive quest progress including milestones, tasks, and subtasks
 * This is a simplified version that focuses on milestone progress for better performance
 */
export function useQuestProgress(questId: string): QuestProgress {
  const { milestones, isLoading: milestonesLoading } = useMilestones(questId);
  
  // For now, we'll focus on milestone progress and use placeholder values for tasks/subtasks
  // This can be expanded later with more complex data fetching if needed

  // Calculate milestone progress
  const milestoneProgress = useMemo(() => {
    if (!milestones || milestones.length === 0) return { total: 0, completed: 0, percentage: 0 };
    
    const total = milestones.length;
    const completed = milestones.filter((milestone: any) => milestone.status === 'DONE').length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { total, completed, percentage };
  }, [milestones]);

  // For now, use placeholder values for tasks and subtasks
  // These can be calculated later with more complex data fetching
  const taskProgress = useMemo(() => {
    // Placeholder: assume 3 tasks per milestone
    const totalTasks = milestones ? milestones.length * 3 : 0;
    const completedTasks = 0; // This would be calculated from actual task data
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { total: totalTasks, completed: completedTasks, percentage };
  }, [milestones]);

  const subtaskProgress = useMemo(() => {
    // Placeholder: assume 2 subtasks per task
    const totalSubtasks = milestones ? milestones.length * 3 * 2 : 0;
    const completedSubtasks = 0; // This would be calculated from actual subtask data
    const percentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    
    return { total: totalSubtasks, completed: completedSubtasks, percentage };
  }, [milestones]);

  // Calculate overall progress (weighted average)
  const overallProgress = useMemo(() => {
    const milestoneWeight = 0.6; // 60% weight for milestones (primary focus)
    const taskWeight = 0.3;      // 30% weight for tasks
    const subtaskWeight = 0.1;   // 10% weight for subtasks
    
    const weightedProgress = 
      (milestoneProgress.percentage * milestoneWeight) +
      (taskProgress.percentage * taskWeight) +
      (subtaskProgress.percentage * subtaskWeight);
    
    return Math.round(weightedProgress);
  }, [milestoneProgress.percentage, taskProgress.percentage, subtaskProgress.percentage]);

  const isLoading = milestonesLoading;

  return {
    totalMilestones: milestoneProgress.total,
    completedMilestones: milestoneProgress.completed,
    totalTasks: taskProgress.total,
    completedTasks: taskProgress.completed,
    totalSubtasks: subtaskProgress.total,
    completedSubtasks: subtaskProgress.completed,
    overallProgress,
    milestoneProgress: milestoneProgress.percentage,
    taskProgress: taskProgress.percentage,
    subtaskProgress: subtaskProgress.percentage,
    isLoading,
  };
}

/**
 * Hook to calculate progress for a specific milestone and its tasks/subtasks
 */
export function useMilestoneProgress(milestoneId: string) {
  const { tasks, isLoading: tasksLoading } = useTasks(milestoneId);
  
  const taskProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return { total: 0, completed: 0, percentage: 0 };
    
    const total = tasks.length;
    const completed = tasks.filter((task: any) => task.status === 'DONE').length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { total, completed, percentage };
  }, [tasks]);

  // Calculate subtask progress for all tasks in this milestone
  const subtaskProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return { total: 0, completed: 0, percentage: 0 };
    
    // This would need to be calculated by fetching subtasks for each task
    // For now, return placeholder values
    return { total: 0, completed: 0, percentage: 0 };
  }, [tasks]);

  return {
    taskProgress,
    subtaskProgress,
    isLoading: tasksLoading,
  };
}
