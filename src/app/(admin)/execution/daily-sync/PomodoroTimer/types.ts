export interface TimerSettings {
  enabled: boolean;
  soundId: string;
  volume: number;
}

export interface ActiveTask {
  id: string;
  title: string;
  item_type: string;
  focus_duration?: number;
}

export interface TimerSession {
  id: string;
  task_id: string;
  task_title: string;
  session_type: string;
  start_time: string;
  end_time?: string; // Optional - only set when timer is completed
  target_duration_seconds: number;
  current_duration_seconds: number;
  status: string;
  device_id: string;
  updated_at: string;
}
