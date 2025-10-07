export interface BrainDumpItem {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface BrainDumpProps {
  date: string;
  onSave?: (content: string) => void;
  onLoad?: (date: string) => Promise<BrainDumpItem[]>;
}
