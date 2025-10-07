// WeeklySyncClient Types
// Types specific to WeeklySyncClient functionality

import type { Rule } from '../ToDontList/types';

// Used in: WeeklySyncClient, MainContent component, useWeeklySync hook
export interface GoalItem {
  id: string;
  item_id: string;
  // item_type removed since we deleted that column from weekly_goal_items
  title: string;
  status: string;
  display_order?: number;
  priority_score?: number;
  quest_id?: string;
  milestone_id?: string;
  parent_task_id?: string;
  parent_quest_id?: string;
  parent_quest_title?: string;
  parent_quest_priority_score?: number;
}

// Used in: WeeklySyncClient, MainContent component, useWeeklySync hook
export interface WeeklyGoal {
  id: string;
  goal_slot: number;
  items: GoalItem[];
  weekDate?: string;
}

// Used in: WeeklySyncClient, WeekSelector component, useWeeklySync hook
export interface HierarchicalItem {
  id: string;
  title: string;
  status?: string;
  subtasks?: HierarchicalItem[];
}

// Used in: WeeklySyncClient, MainContent component, useWeeklySync hook
export interface SelectedItem {
  id: string;
  type: 'QUEST' | 'MILESTONE' | 'TASK' | 'SUBTASK';
}

// Used in: WeeklySyncClient, WeekSelector component, useWeeklySync hook
export interface Milestone {
  id: string;
  title: string;
  tasks?: (HierarchicalItem & { subtasks: HierarchicalItem[] })[];
}

// Used in: WeeklySyncClient, WeekSelector component, useWeeklySync hook
export interface Quest {
  id: string;
  title: string;
  milestones?: Milestone[];
}

// Used in: MainContent component, useWeeklySync hook, progress calculations
export interface ProgressData {
  completed: number;
  total: number;
  percentage: number;
}

// Used in: MainContent component, useWeeklySync hook, progress calculations
export interface WeeklyGoalsProgress {
  [slotNumber: number]: ProgressData;
}

export interface MainContentProps {
  // Week navigation
  displayWeek: number;
  totalWeeks: number;
  isWeekDropdownOpen: boolean;
  setIsWeekDropdownOpen: (value: boolean) => void;
  handleSelectWeek: (weekIdx: number) => void;
  goPrevWeek: () => void;
  goNextWeek: () => void;
  
  // Data
  year: number;
  quarter: number;
  mobileOptimizedGoals: WeeklyGoal[];
  processedProgress: any;
  processedRules: Rule[];
  
  // Loading states
  toDontListLoading: boolean;
  
  // Handlers
  handleRefreshGoals: () => void;
  handleRefreshToDontList: () => void;
  
  // Data source indicator
  dataSource?: string;
}

export interface WeekSelectorProps {
  displayWeek: number;
  totalWeeks: number;
  isWeekDropdownOpen: boolean;
  setIsWeekDropdownOpen: (value: boolean) => void;
  handleSelectWeek: (weekIdx: number) => void;
  goPrevWeek: () => void;
  goNextWeek: () => void;
}
