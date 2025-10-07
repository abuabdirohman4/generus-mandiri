export interface SideQuest {
  id: string;
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SideQuestFormData {
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date?: string;
}

export interface SideQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  sideQuest?: SideQuest;
  onSave: (data: SideQuestFormData) => void;
}
