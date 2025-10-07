import { create } from 'zustand';

interface ActivityState {
  lastActivityTimestamp: number;
  triggerRefresh: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  lastActivityTimestamp: Date.now(),
  triggerRefresh: () => set({ lastActivityTimestamp: Date.now() }),
})); 