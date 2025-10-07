export interface WorkQuestProject {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  created_at: string;
  updated_at: string;
  tasks: WorkQuestTask[];
}

export interface WorkQuestTask {
  id: string;
  parent_task_id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  created_at: string;
  updated_at: string;
}

// Legacy interface for backward compatibility
export interface WorkQuest extends WorkQuestProject {}
export interface WorkQuestSubtask extends WorkQuestTask {}

export interface WorkQuestProjectFormData {
  title: string;
}

export interface WorkQuestTaskFormData {
  title: string;
  description?: string;
}

// Legacy interfaces for backward compatibility
export interface WorkQuestFormData extends WorkQuestProjectFormData {
  description?: string;
  subtasks: WorkQuestSubtaskFormData[];
}

export interface WorkQuestSubtaskFormData extends WorkQuestTaskFormData {}

export interface WorkQuestProjectListProps {
  projects: WorkQuestProject[];
  onEditProject: (project: WorkQuestProject) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string, formData: WorkQuestTaskFormData) => void;
  onEditTask: (projectId: string, task: WorkQuestTask) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onToggleProjectStatus: (projectId: string, status: 'TODO' | 'DONE') => void;
  onToggleTaskStatus: (taskId: string, status: 'TODO' | 'DONE') => void;
}

export interface WorkQuestProjectFormProps {
  initialData?: WorkQuestProject | null;
  onSubmit: (data: WorkQuestProjectFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export interface WorkQuestTaskFormProps {
  projectId: string;
  initialData?: WorkQuestTask | null;
  onSubmit: (data: WorkQuestTaskFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

// Legacy interfaces for backward compatibility
export interface WorkQuestListProps extends WorkQuestProjectListProps {
  workQuests: WorkQuest[];
  onEdit: (quest: WorkQuest) => void;
  onDelete: (id: string) => void;
}

export interface WorkQuestFormProps {
  initialData?: WorkQuest | null;
  onSubmit: (data: WorkQuestFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export interface WorkQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  workQuest?: WorkQuest | null;
  onSave: (data: WorkQuestFormData) => void;
}
