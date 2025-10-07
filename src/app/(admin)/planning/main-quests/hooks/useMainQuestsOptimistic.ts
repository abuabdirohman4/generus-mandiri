"use client";

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { taskKeys, milestoneKeys } from '@/lib/swr';
import { updateMainQuestTask, updateMainQuestSubtask } from '../actions/mainQuestsRPCActions';

/**
 * Hook for optimistic updates in Main Quests
 */
export function useMainQuestsOptimistic() {
  const { mutate } = useSWRConfig();

  /**
   * Optimistic update for task title
   */
  const updateTaskTitle = useCallback(async (
    taskId: string,
    milestoneId: string,
    newTitle: string,
    currentTitle: string,
    displayOrder: number
  ) => {
    // Optimistic update - update UI immediately
    await mutate(
      taskKeys.mainQuests(milestoneId),
      (currentData: any) => {
        if (!currentData) return currentData;
        return currentData.map((task: any) => 
          task.id === taskId ? { ...task, title: newTitle } : task
        );
      },
      { revalidate: false }
    );

    try {
      // Call API
      await updateMainQuestTask(taskId, newTitle, 'TODO', displayOrder);
      
      // Show success toast
      toast.success('Task title updated successfully');
    } catch (error) {
      // Revert optimistic update on error
      await mutate(
        taskKeys.mainQuests(milestoneId),
        (currentData: any) => {
          if (!currentData) return currentData;
          return currentData.map((task: any) => 
            task.id === taskId ? { ...task, title: currentTitle } : task
          );
        },
        { revalidate: false }
      );
      
      toast.error('Failed to update task title');
      throw error;
    }
  }, [mutate]);

  /**
   * Optimistic update for task status
   */
  const toggleTaskStatus = useCallback(async (
    taskId: string,
    milestoneId: string,
    currentStatus: 'TODO' | 'DONE',
    title: string,
    displayOrder: number
  ) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    
    // Optimistic update - update UI immediately
    await mutate(
      taskKeys.mainQuests(milestoneId),
      (currentData: any) => {
        if (!currentData) return currentData;
        return currentData.map((task: any) => 
          task.id === taskId ? { ...task, status: newStatus } : task
        );
      },
      { revalidate: false }
    );

    try {
      // Call API
      await updateMainQuestTask(taskId, title, newStatus, displayOrder);
      
      // Show success toast
      const statusText = newStatus === 'DONE' ? 'completed' : 'marked as todo';
      toast.success(`Task ${statusText} successfully`);
    } catch (error) {
      // Revert optimistic update on error
      await mutate(
        taskKeys.mainQuests(milestoneId),
        (currentData: any) => {
          if (!currentData) return currentData;
          return currentData.map((task: any) => 
            task.id === taskId ? { ...task, status: currentStatus } : task
          );
        },
        { revalidate: false }
      );
      
      toast.error('Failed to update task status');
      throw error;
    }
  }, [mutate]);

  /**
   * Optimistic update for subtask title
   */
  const updateSubtaskTitle = useCallback(async (
    taskId: string,
    parentTaskId: string,
    milestoneId: string,
    newTitle: string,
    currentTitle: string,
    displayOrder: number
  ) => {
    // Optimistic update for subtasks
    await mutate(
      taskKeys.subtasks(parentTaskId),
      (currentData: any) => {
        if (!currentData) return currentData;
        return currentData.map((subtask: any) => 
          subtask.id === taskId ? { ...subtask, title: newTitle } : subtask
        );
      },
      { revalidate: false }
    );

    try {
      // Call API
      await updateMainQuestSubtask(taskId, newTitle, 'TODO', displayOrder);
      
      // Show success toast
      toast.success('Subtask title updated successfully');
    } catch (error) {
      // Revert optimistic update on error
      await mutate(
        taskKeys.subtasks(parentTaskId),
        (currentData: any) => {
          if (!currentData) return currentData;
          return currentData.map((subtask: any) => 
            subtask.id === taskId ? { ...subtask, title: currentTitle } : subtask
          );
        },
        { revalidate: false }
      );
      
      toast.error('Failed to update subtask title');
      throw error;
    }
  }, [mutate]);

  /**
   * Optimistic update for subtask status
   */
  const toggleSubtaskStatus = useCallback(async (
    taskId: string,
    parentTaskId: string,
    currentStatus: 'TODO' | 'DONE',
    title: string,
    displayOrder: number
  ) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    
    // Optimistic update for subtasks
    await mutate(
      taskKeys.subtasks(parentTaskId),
      (currentData: any) => {
        if (!currentData) return currentData;
        return currentData.map((subtask: any) => 
          subtask.id === taskId ? { ...subtask, status: newStatus } : subtask
        );
      },
      { revalidate: false }
    );

    try {
      // Call API
      await updateMainQuestSubtask(taskId, title, newStatus, displayOrder);
      
      // Show success toast
      const statusText = newStatus === 'DONE' ? 'completed' : 'marked as todo';
      toast.success(`Subtask ${statusText} successfully`);
    } catch (error) {
      // Revert optimistic update on error
      await mutate(
        taskKeys.subtasks(parentTaskId),
        (currentData: any) => {
          if (!currentData) return currentData;
          return currentData.map((subtask: any) => 
            subtask.id === taskId ? { ...subtask, status: currentStatus } : subtask
          );
        },
        { revalidate: false }
      );
      
      toast.error('Failed to update subtask status');
      throw error;
    }
  }, [mutate]);

  return {
    updateTaskTitle,
    toggleTaskStatus,
    updateSubtaskTitle,
    toggleSubtaskStatus,
  };
}
