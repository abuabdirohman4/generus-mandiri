"use client";

import React, { useState, useMemo } from 'react';
import ComponentCard from '@/components/common/ComponentCard';
import { toast } from 'sonner';
import { setWeeklyGoalItems, removeWeeklyGoal } from '../actions/weeklyGoalsActions';
import WeeklySyncModal from '../WeeklySyncModal/WeeklySyncModal';
import GoalRow from './components/GoalRow';
import { useWeeklyGoalsProgress, getSlotProgress } from './hooks/useWeeklyGoalsProgress';
import { useWeekCalculations } from '../WeeklySyncClient/hooks/useWeekCalculations';
import { getQuarterWeekRange, getWeekOfYear } from '@/lib/quarterUtils';
import type { WeeklyGoalsTableProps } from './types';

export default function WeeklySyncTable({ 
  goals = [], 
  goalProgress = {}, // Keep for backward compatibility, but will use client calculation
  onRefreshGoals, 
  ...props 
}: WeeklyGoalsTableProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ✅ Determine if this is current week or past week
  const isCurrentWeek = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
    
    // Use the same logic as useWeekCalculations
    const { getWeekOfYear, getQuarterWeekRange } = require('@/lib/quarterUtils');
    const currentWeekNumber = getWeekOfYear(today);
    const { startWeek, endWeek } = getQuarterWeekRange(currentYear, currentQuarter);
    const totalWeeks = endWeek - startWeek + 1;
    const weekInQuarter = Math.max(1, Math.min(totalWeeks, currentWeekNumber - startWeek + 1));
    const displayWeek = weekInQuarter;
    
    return props.year === currentYear && 
           props.quarter === currentQuarter && 
           props.weekNumber === displayWeek;
  };
  
  // 🚀 OPTIMIZED: Use client-side progress calculation
  const clientProgress = useWeeklyGoalsProgress(goals);

  const handleSlotClick = (slotNumber: number) => {
    setSelectedSlot(slotNumber);
    setIsModalOpen(true);
  };

  const handleModalSave = async (selectedItems: Array<{ id: string; type: 'QUEST' | 'MILESTONE' | 'TASK' | 'SUBTASK' }>) => {
    if (!selectedSlot) return;

    try {
      if (selectedItems.length === 0) {
        // Hapus goal mingguan untuk slot ini
        const goal = goals.find(goal => goal.goal_slot === selectedSlot);
        if (goal) {
          await removeWeeklyGoal(goal.id);
          toast.success('Goal mingguan berhasil dihapus!');
        }
      } else {
        await setWeeklyGoalItems({
          year: props.year,
          quarter: props.quarter,
          weekNumber: props.weekNumber,
          goalSlot: selectedSlot,
          items: selectedItems
        });
        toast.success('Goal mingguan berhasil disimpan!');
      }
      
      // FIXED: Always refresh goals after any operation
      if (onRefreshGoals) {
        onRefreshGoals();
      }
    } catch (error) {
      console.error('Error saving weekly goal:', error);
      toast.error('Gagal menyimpan goal mingguan');
    }
  };

  // Get all existing selected item IDs from other slots (for anti-duplication)
  const getExistingSelectedIds = (currentSlot: number) => {
    const existingIds = new Set<string>();
    goals.forEach(goal => {
      if (goal.goal_slot !== currentSlot) {
        goal.items.forEach(item => {
          existingIds.add(item.item_id);
        });
      }
    });
    
    
    return existingIds;
  };

  return (
    <>
      <ComponentCard title="" classNameHeader="!p-0">
        {/* Custom Header */}
        <div className="flex items-center justify-center my-4">
          <h2 className="text-center text-xl font-extrabold text-gray-900 dark:text-gray-100">
            3 Quest Week {props.weekNumber}
          </h2>
        </div>
        <table className="w-full">
          <tbody>
            {[1, 2, 3].map((slotNumber: number) => {
              const goal = goals.find(goal => goal.goal_slot === slotNumber);
              // 🚀 OPTIMIZED: Use client-side calculated progress
              const progress = getSlotProgress(clientProgress, slotNumber);

              return (
                <GoalRow
                  key={slotNumber}
                  slotNumber={slotNumber}
                  goal={goal}
                  progress={progress}
                  onSlotClick={handleSlotClick}
                  showCompletedTasks={!isCurrentWeek()} // ✅ Show completed tasks for past weeks, hide for current week
                  weekDate={goal?.weekDate} // ✅ Pass weekDate from goal data
                />
              );
            })}
          </tbody>
        </table>
      </ComponentCard>

      {/* Hierarchical Modal */}
      {selectedSlot ? (
        <WeeklySyncModal
          key={`modal-${selectedSlot}`} // Force re-render when slot changes
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSlot(null);
          }}
          onSave={handleModalSave}
          year={props.year}
          initialSelectedItems={(() => {
            const currentGoal = goals.find(goal => goal.goal_slot === selectedSlot);
            const items = currentGoal?.items || [];
            const mappedItems = items.map(item => ({ 
              id: item.item_id, // item_id adalah task ID dari database
              type: 'TASK' as const // Semua item di weekly_goal_items adalah TASK
            }));
            
            
            return mappedItems;
          })()}
          existingSelectedIds={getExistingSelectedIds(selectedSlot)}
        />
      ) : null}
    </>
  );
}
