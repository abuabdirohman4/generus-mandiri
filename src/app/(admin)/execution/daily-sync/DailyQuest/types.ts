import { setDailyPlan } from './actions/dailyPlanActions';

export interface DailyPlan {
  id: string;
  plan_date: string;
  daily_plan_items?: DailyPlanItem[];
}

export interface DailyPlanItem {
  id: string;
  item_id: string;
  item_type: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  title?: string;
  quest_title?: string;
  daily_session_target?: number;
  focus_duration?: number;
}

export interface DailySyncClientProps {
  year: number;
  weekNumber: number;
  selectedDate: string;
  onSetActiveTask?: (task: { id: string; title: string; item_type: string; focus_duration?: number }) => void;
  dailyPlan: DailyPlan | null;
  loading: boolean;
  refreshSessionKey?: Record<string, number>;
  forceRefreshTaskId?: string | null;
}

export interface TaskColumnProps {
  title: string;
  items: DailyPlanItem[];
  onStatusChange: (itemId: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => Promise<void>;
  onAddSideQuest?: (title: string) => void;
  onSelectTasks?: (newItems: { item_id: string; item_type: string; }[]) => void;
  onSetActiveTask?: (task: { id: string; title: string; item_type: string; focus_duration?: number }) => void;
  selectedDate?: string;
  onTargetChange?: (itemId: string, newTarget: number) => Promise<void>;
  onFocusDurationChange: (itemId: string, duration: number) => Promise<void>;
  completedSessions: Record<string, number>;
  refreshSessionKey?: Record<string, number>;
  forceRefreshTaskId?: string | null;
  showAddQuestButton?: boolean;
}

export interface TaskCardProps {
  item: DailyPlanItem;
  onStatusChange: (itemId: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => Promise<void>;
  onSetActiveTask?: (task: { id: string; title: string; item_type: string; focus_duration?: number }) => void;
  selectedDate?: string;
  onTargetChange?: (itemId: string, newTarget: number) => Promise<void>;
  onFocusDurationChange: (itemId: string, duration: number) => Promise<void>;
  completedSessions: Record<string, number>;
  refreshKey?: number;
  forceRefreshTaskId?: string | null;
}

export interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: WeeklyTaskItem[];
  selectedTasks: Record<string, boolean>;
  onTaskToggle: (taskId: string) => void;
  onSave: () => void;
  isLoading: boolean; // Loading untuk konten (skeleton)
  savingLoading?: boolean; // Loading untuk button (spinner)
  completedTodayCount?: number; // Jumlah tugas yang sudah selesai hari ini
}

export interface WeeklyTaskItem {
  id: string;
  type: 'MAIN_QUEST' | 'WORK' | 'SIDE_QUEST' | 'LEARNING';
  title: string;
  status: string;
  quest_title: string;
  goal_slot: number;
  parent_task_id?: string | null;
}

export interface SideQuestFormProps {
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

export interface SideQuestItem {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  item_type: string;
  focus_duration?: number;
}
