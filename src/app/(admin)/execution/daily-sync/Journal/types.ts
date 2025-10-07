export interface JournalEntry {
  id: string;
  what_done: string | null;
  what_think: string | null;
  created_at: string;
  updated_at: string;
}

export interface OneMinuteJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (whatDone: string, whatThink: string) => Promise<void>;
  taskTitle?: string;
  duration: number;
  isRetrying?: boolean;
  retryCount?: number;
}

export interface JournalData {
  whatDone: string;
  whatThink: string;
}
