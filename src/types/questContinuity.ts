// Quest Continuity Types
// Types untuk tracking quest, task, dan milestone continuity across quarters

export interface QuestContinuity {
  source_quest_id?: string;
  is_continuation: boolean;
  continuation_strategy?: 'incomplete_tasks_only' | 'all_tasks' | 'custom';
  continuation_date?: string;
}

export interface TaskContinuity {
  source_task_id?: string;
  is_continuation: boolean;
  continuation_date?: string;
}

export interface MilestoneContinuity {
  source_milestone_id?: string;
  is_continuation: boolean;
  continuation_date?: string;
}

// Extended Quest interface with continuity tracking
export interface QuestWithContinuity {
  id?: string;
  title: string;
  label?: string;
  description?: string;
  motivation?: string;
  type?: 'PERSONAL' | 'WORK';
  is_committed?: boolean;
  year: number;
  quarter: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  priority_score?: number;
  
  // Continuity tracking fields
  source_quest_id?: string;
  is_continuation: boolean;
  continuation_strategy?: 'incomplete_tasks_only' | 'all_tasks' | 'custom';
  continuation_date?: string;
}

// Extended Task interface with continuity tracking
export interface TaskWithContinuity {
  id?: string;
  user_id?: string;
  milestone_id?: string;
  title: string;
  type?: 'MAIN_QUEST' | 'WORK' | 'SIDE_QUEST' | 'LEARNING' | 'SUBTASK';
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  due_date?: string;
  scheduled_date?: string;
  created_at?: string;
  updated_at?: string;
  parent_task_id?: string;
  display_order?: number;
  
  // Continuity tracking fields
  source_task_id?: string;
  is_continuation: boolean;
  continuation_date?: string;
}

// Extended Milestone interface with continuity tracking
export interface MilestoneWithContinuity {
  id?: string;
  quest_id?: string;
  title: string;
  display_order?: number;
  created_at?: string;
  
  // Continuity tracking fields
  source_milestone_id?: string;
  is_continuation: boolean;
  continuation_date?: string;
}

// Quest History Item with editing capabilities
export interface EditableQuestHistoryItem {
  year: number;
  quarter: number;
  quarterString: string;
  quests: QuestWithContinuity[];
  questCount: number;
}

// Quest editing state
export interface QuestEditState {
  isEditing: boolean;
  editedTitle: string;
  originalTitle: string;
}

// Continuity strategy options
export const CONTINUITY_STRATEGIES = {
  INCOMPLETE_TASKS_ONLY: 'incomplete_tasks_only',
  ALL_TASKS: 'all_tasks',
  CUSTOM: 'custom'
} as const;

export type ContinuityStrategy = typeof CONTINUITY_STRATEGIES[keyof typeof CONTINUITY_STRATEGIES];
