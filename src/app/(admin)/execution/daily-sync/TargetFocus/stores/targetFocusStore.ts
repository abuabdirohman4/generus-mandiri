import { create } from 'zustand';

interface TargetFocusItem {
  itemId: string;
  itemType: string;
  sessionTarget: number;
  focusDuration: number;
  totalTimeTarget: number;
}

interface TargetFocusData {
  targets: TargetFocusItem[];
  totalTimeTarget: number;
}

interface TargetFocusStore {
  // Data
  targetsData: TargetFocusData | null;
  totalTimeActual: number;
  totalSessionsActual: number;
  
  // Actions
  setTargetsData: (data: TargetFocusData | null) => void;
  setTotalTimeActual: (time: number) => void;
  setTotalSessionsActual: (sessions: number) => void;
  
  // Optimistic update function
  updateTargetOptimistically: (itemId: string, newTarget: number) => void;
}

export const useTargetFocusStore = create<TargetFocusStore>((set, get) => ({
  // Initial state
  targetsData: null,
  totalTimeActual: 0,
  totalSessionsActual: 0,
  
  // Actions
  setTargetsData: (data) => set({ targetsData: data }),
  setTotalTimeActual: (time) => set({ totalTimeActual: time }),
  setTotalSessionsActual: (sessions) => set({ totalSessionsActual: sessions }),
  
  // Optimistic update function
  updateTargetOptimistically: (itemId: string, newTarget: number) => {
    const { targetsData } = get();
    
    if (!targetsData || !targetsData.targets) {
      return;
    }

    const updatedTargets = targetsData.targets.map((item) => {
      return item.itemId === itemId 
        ? { ...item, sessionTarget: newTarget, totalTimeTarget: newTarget * item.focusDuration }
        : item;
    });

    const newTotalTimeTarget = updatedTargets.reduce((sum, item) => sum + item.totalTimeTarget, 0);

    set({
      targetsData: {
        targets: updatedTargets,
        totalTimeTarget: newTotalTimeTarget
      }
    });
  },
}));
