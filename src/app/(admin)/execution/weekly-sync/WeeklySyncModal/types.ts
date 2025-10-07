// WeeklySyncModal Types
// Types specific to WeeklySyncModal functionality

import type { Quest, Milestone, HierarchicalItem, SelectedItem } from '../WeeklySyncClient/types';

export interface WeeklyFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedItems: SelectedItem[]) => void;
  year: number;
  initialSelectedItems?: SelectedItem[];
  existingSelectedIds?: Set<string>;
}

export interface ModalHeaderProps {
  onClose: () => void;
}

export interface ModalFooterProps {
  selectedItems: SelectedItem[];
  handleSelectAll: (hierarchicalData: Quest[]) => void;
  handleClearAll: () => void;
  handleExpandAll: () => void;
  handleCollapseAll: () => void;
  onClose: () => void;
  handleSave: () => void;
  loading: boolean;
  hierarchicalData: Quest[];
}

export interface MilestoneListProps {
  milestones: Milestone[];
  questId: string;
  expandedItems: Set<string>;
  existingSelectedIds: Set<string>;
  selectedItems: SelectedItem[];
  handleItemToggle: (itemId: string, itemType: 'QUEST' | 'MILESTONE' | 'TASK' | 'SUBTASK', subtasks?: HierarchicalItem[], parentTaskId?: string) => void;
  toggleExpanded: (itemId: string) => void;
}

export interface TaskListProps {
  tasks: (HierarchicalItem & { subtasks: HierarchicalItem[] })[];
  milestoneId: string;
  expandedItems: Set<string>;
  existingSelectedIds: Set<string>;
  selectedItems: SelectedItem[];
  handleItemToggle: (itemId: string, itemType: 'QUEST' | 'MILESTONE' | 'TASK' | 'SUBTASK', subtasks?: HierarchicalItem[], parentTaskId?: string) => void;
  toggleExpanded: (itemId: string) => void;
}

export interface SubtaskListProps {
  subtasks: HierarchicalItem[];
  taskId: string;
  expandedItems: Set<string>;
  existingSelectedIds: Set<string>;
  selectedItems: SelectedItem[];
  handleItemToggle: (itemId: string, itemType: 'QUEST' | 'MILESTONE' | 'TASK' | 'SUBTASK', subtasks?: HierarchicalItem[], parentTaskId?: string) => void;
}
