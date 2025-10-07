"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { updateWeeklyTaskStatus } from '../actions/weeklyTaskActions';

export function useWeeklyTaskManagement() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { mutate } = useSWRConfig();

  const toggleTaskStatus = async (
    taskId: string,
    goalSlot: number,
    currentStatus: string,
    weekDate?: string
  ) => {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    
    setLoading(prev => ({ ...prev, [taskId]: true }));
    
    try {
      // Optimistic update - update UI immediately
      await mutate(
        (key) => {
          // Match weekly sync SWR keys
          return Array.isArray(key) && 
                 key[0] === 'weekly-sync' && 
                 typeof key[1] === 'number' && 
                 typeof key[2] === 'number' && 
                 typeof key[3] === 'number';
        },
        (currentData: any) => {
          if (!currentData?.goals) return currentData;
          
          // Update the specific task status in the goals data
          const updatedGoals = currentData.goals.map((goal: any) => {
            if (goal.goal_slot === goalSlot) {
              const updatedItems = goal.items.map((item: any) => {
                if (item.item_id === taskId) {
                  return { ...item, status: newStatus };
                }
                return item;
              });
              return { ...goal, items: updatedItems };
            }
            return goal;
          });
          
          return { ...currentData, goals: updatedGoals };
        },
        { revalidate: false } // Don't revalidate immediately, we'll do it after API call
      );
      
      // Call the API
      await updateWeeklyTaskStatus(taskId, goalSlot, newStatus as 'TODO' | 'DONE', weekDate);
      
      // ✅ CRITICAL: Revalidate related caches for cross-page synchronization
      await mutate(
        (key) => {
          if (Array.isArray(key)) {
            // Invalidate daily-sync and other caches without revalidation
            return key[0] === 'daily-sync' || 
                   key[0] === 'quests' ||
                   key[0] === 'milestones' ||
                   key[0] === 'tasks';
          }
          return false;
        },
        undefined,
        { revalidate: true }
      );
      
      const statusText = newStatus === 'DONE' ? 'Selesai' : 'Belum Selesai';
      toast.success(`Status tugas diubah menjadi: ${statusText}`);
      
      return newStatus;
    } catch (error) {
      console.error('Error updating task status:', error);
      
      // Revert optimistic update on error - restore original status
      await mutate(
        (key) => {
          return Array.isArray(key) && 
                 key[0] === 'weekly-sync' && 
                 typeof key[1] === 'number' && 
                 typeof key[2] === 'number' && 
                 typeof key[3] === 'number';
        },
        (currentData: any) => {
          if (!currentData?.goals) return currentData;
          
          // Revert to original status
          const revertedGoals = currentData.goals.map((goal: any) => {
            if (goal.goal_slot === goalSlot) {
              const revertedItems = goal.items.map((item: any) => {
                if (item.item_id === taskId) {
                  return { ...item, status: currentStatus }; // Revert to original status
                }
                return item;
              });
              return { ...goal, items: revertedItems };
            }
            return goal;
          });
          
          return { ...currentData, goals: revertedGoals };
        },
        { revalidate: false } // Don't revalidate, just revert the optimistic update
      );
      
      toast.error('Gagal mengubah status tugas. Silakan coba lagi.');
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const isTaskLoading = (taskId: string) => loading[taskId] || false;

  return {
    toggleTaskStatus,
    isTaskLoading
  };
}
