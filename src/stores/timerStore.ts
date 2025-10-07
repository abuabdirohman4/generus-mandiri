import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playTimerCompleteSound, playSound, stopCurrentSound, playFocusSoundLoop } from '@/lib/soundUtils';
import { useSoundStore } from './soundStore';

// Global completion lock to prevent multiple completions
let completionInProgress = false;
let lastCompletedTaskId: string | null = null;
let lastCompletionTime = 0;

export type TimerState = 'IDLE' | 'FOCUSING' | 'PAUSED' | 'BREAK';

export interface Task {
  id: string;
  title: string;
  item_type: string;
  focus_duration?: number; // Durasi fokus dalam menit
}

interface SessionCompleteData {
  taskId: string;
  taskTitle: string;
  duration: number;
  type: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
  startTime: string;
  endTime: string;
  completed?: boolean; // ✅ Add completed flag for auto-completion
}

interface TimerStoreState {
  timerState: TimerState;
  secondsElapsed: number;
  activeTask: Task | null;
  sessionCount: number;
  breakType: 'SHORT' | 'LONG' | null;
  lastSessionComplete: SessionCompleteData | null;
  startTime: string | null;
  isProcessingCompletion: boolean;
  focusSoundPlaying: boolean;
  startFocusSession: (task: Task) => void;
  startBreak: (type: 'SHORT' | 'LONG') => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  setLastSessionComplete: (data: SessionCompleteData | null) => void;
  setProcessingCompletion: (isProcessing: boolean) => void;
  incrementSeconds: () => void;
  resumeFromDatabase: (sessionData: {
    taskId: string;
    taskTitle: string;
    startTime: string;
    currentDuration: number;
    status: string;
    focus_duration?: number;
  }) => void;
  startFocusSound: () => Promise<void>;
  stopFocusSound: () => void;
  completeTimerFromDatabase: (sessionData: {
    taskId: string;
    taskTitle: string;
    startTime: string;
    duration: number;
    status: string;
  }) => void;
}

// Durasi default (detik)
const FOCUS_DURATION = 25 * 60; // 25 menit default
const SHORT_BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;

export const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
      timerState: 'IDLE',
      secondsElapsed: 0,
      activeTask: null,
      sessionCount: 0,
      breakType: null,
      lastSessionComplete: null,
      startTime: null,
      isProcessingCompletion: false,
      focusSoundPlaying: false,

      startFocusSession: (task: Task) => {
        set({
          activeTask: task,
          timerState: 'FOCUSING',
          secondsElapsed: 0,
          breakType: null,
          startTime: new Date().toISOString(),
        });
        // Start focus sound
        get().startFocusSound().catch(console.error);
      },

      startBreak: (type: 'SHORT' | 'LONG') => {
        // Stop focus sound when starting break
        get().stopFocusSound();
        set({
          timerState: 'BREAK',
          breakType: type,
          secondsElapsed: 0,
          startTime: new Date().toISOString(),
        });
      },

      pauseTimer: () => {
        set({ timerState: 'PAUSED' });
        // Stop focus sound when pausing
        get().stopFocusSound();
      },

      resumeTimer: () => {
        const state = get();
        const newState = state.breakType ? 'BREAK' : 'FOCUSING';
        set({ timerState: newState });
        
        // Start focus sound when resuming focus session
        if (newState === 'FOCUSING') {
          get().startFocusSound().catch(console.error);
        }
      },

      stopTimer: () => {
        const state = get();
        // Stop focus sound when stopping timer
        get().stopFocusSound();
        
        if (state.timerState === 'FOCUSING' && state.activeTask && state.secondsElapsed > 0) {
          const now = new Date();
          const endTime = now.toISOString();
          // Use actual startTime from store, not calculated
          const startTime = state.startTime || new Date(now.getTime() - state.secondsElapsed * 1000).toISOString();
          set({
            lastSessionComplete: {
              taskId: state.activeTask.id,
              taskTitle: state.activeTask.title,
              duration: Math.round(state.secondsElapsed),
              type: 'FOCUS',
              startTime,
              endTime
            },
            timerState: 'IDLE',
            secondsElapsed: 0,
            activeTask: null,
            breakType: null,
            startTime: null, // Clear startTime
          });
        } else {
          set({
            timerState: 'IDLE',
            secondsElapsed: 0,
            activeTask: null,
            breakType: null,
            startTime: null, // Clear startTime
          });
        }
      },

      resetTimer: () => {
        // Stop focus sound when resetting timer
        get().stopFocusSound();
        set({
          timerState: 'IDLE',
          secondsElapsed: 0,
          breakType: null,
          activeTask: null,
        });
      },

      setLastSessionComplete: (data: SessionCompleteData | null) => set({ lastSessionComplete: data }),

      setProcessingCompletion: (isProcessing: boolean) => set({ isProcessingCompletion: isProcessing }),

      incrementSeconds: () => set((state) => {
        const newSeconds = Math.round(state.secondsElapsed + 1);
        
        // Get focus duration from active task or use default
        // focus_duration is stored in minutes, convert to seconds
        const focusDuration = state.activeTask?.focus_duration 
          ? state.activeTask.focus_duration * 60
          : FOCUS_DURATION;
        
        // Auto-stop logic
        if (state.timerState === 'FOCUSING' && newSeconds >= focusDuration) {
          if (state.activeTask) {
            const now = new Date();
            const endTime = now.toISOString();
            // Use actual startTime from store, not calculated
            const startTime = state.startTime || new Date(now.getTime() - focusDuration * 1000).toISOString();
            
            // Stop focus sound when timer completes
            get().stopFocusSound();
            
            // Play completion sound
            const soundSettings = useSoundStore.getState().settings;
            if (soundSettings.soundId !== 'none') {
              playTimerCompleteSound(
                soundSettings.soundId,
                soundSettings.volume,
                state.activeTask.title
              ).catch(console.error);
            }
            
            // ✅ FIX: Complete timer session in database
            // This will be handled by useTimerManagement hook
            // We just need to trigger the completion
            
            return {
              lastSessionComplete: {
                taskId: state.activeTask.id,
                taskTitle: state.activeTask.title,
                duration: Math.round(focusDuration),
                type: 'FOCUS',
                startTime,
                endTime
              },
              timerState: 'IDLE' as TimerState,
              sessionCount: state.sessionCount + 1,
              secondsElapsed: 0,
              activeTask: null,
              breakType: null,
            };
          }
          return {
            timerState: 'IDLE' as TimerState,
            sessionCount: state.sessionCount + 1,
            secondsElapsed: 0,
            activeTask: null,
            breakType: null,
          };
        } else if (state.timerState === 'BREAK' && state.breakType === 'SHORT' && newSeconds >= SHORT_BREAK_DURATION) {
          // Stop focus sound when short break completes
          get().stopFocusSound();
          return {
            timerState: 'IDLE' as TimerState,
            breakType: null,
            secondsElapsed: 0,
          };
        } else if (state.timerState === 'BREAK' && state.breakType === 'LONG' && newSeconds >= LONG_BREAK_DURATION) {
          // Stop focus sound when long break completes
          get().stopFocusSound();
          return {
            timerState: 'IDLE' as TimerState,
            breakType: null,
            secondsElapsed: 0,
          };
        }
        
        return { secondsElapsed: newSeconds };
      }),

      resumeFromDatabase: (sessionData) => {
        const timerState = sessionData.status === 'PAUSED' ? 'PAUSED' : 'FOCUSING';
        set({
          activeTask: {
            id: sessionData.taskId,
            title: sessionData.taskTitle,
            item_type: 'MAIN_QUEST',
            focus_duration: sessionData.focus_duration
          },
          timerState,
          secondsElapsed: sessionData.currentDuration,
          startTime: sessionData.startTime,
          breakType: null,
        });
        
        // Start focus sound when resuming focus session from database
        if (timerState === 'FOCUSING') {
          get().startFocusSound().catch(console.error);
        }
      },

      completeTimerFromDatabase: async (sessionData) => {
        const now = Date.now();
        
        // ✅ FIX: Prevent multiple completions for the same task
        if (completionInProgress || 
            (lastCompletedTaskId === sessionData.taskId && (now - lastCompletionTime) < 5000)) {
          console.log('🔇 Timer completion already in progress or recently completed, skipping...');
          return;
        }
        
        // Set completion lock
        completionInProgress = true;
        lastCompletedTaskId = sessionData.taskId;
        lastCompletionTime = now;
        
        try {
          // Stop focus sound when completing timer from database
          get().stopFocusSound();
          
          // ✅ FIX: Play completion sound when timer completes from database
          try {
            // Load fresh settings from server to ensure we have the latest sound settings
            const { getSoundSettings } = await import('@/app/(admin)/settings/profile/actions/userProfileActions');
            const serverSettings = await getSoundSettings();
            if (serverSettings.soundId !== 'none') {
              console.log('playTimerCompleteSound 1');
              await playTimerCompleteSound(
                serverSettings.soundId,
                serverSettings.volume,
                sessionData.taskTitle
              );
            }
          } catch (error) {
            console.error('🎵 Error playing timer completion sound:', error);
            // Fallback to local settings
            const soundSettings = useSoundStore.getState().settings;
            if (soundSettings.soundId !== 'none') {
              await playTimerCompleteSound(
                soundSettings.soundId,
                soundSettings.volume,
                sessionData.taskTitle
              ).catch(console.error);
            }
          }
        } finally {
          // Release completion lock after 3 seconds
          setTimeout(() => {
            completionInProgress = false;
          }, 3000);
        }
        
        set({
          lastSessionComplete: {
            taskId: sessionData.taskId,
            taskTitle: sessionData.taskTitle,
            type: 'FOCUS',
            startTime: sessionData.startTime,
            endTime: new Date().toISOString(), // ✅ Add endTime
            duration: sessionData.duration,
            completed: true
          },
          timerState: 'IDLE' as TimerState,
          secondsElapsed: 0,
          activeTask: null,
          startTime: null,
          breakType: null,
        });
      },

      startFocusSound: async () => {
        console.log('🎵 startFocusSound called');
        
        if (get().focusSoundPlaying) {
          console.log('🎵 Focus sound already playing, skipping');
          return;
        }
        
        try {
          // Load fresh settings from server
          const { getSoundSettings } = await import('@/app/(admin)/settings/profile/actions/userProfileActions');
          const serverSettings = await getSoundSettings();
          
          console.log('🎵 Fresh focus sound settings from server:', {
            focusSoundId: serverSettings.focusSoundId,
            volume: serverSettings.volume
          });
          
          if (serverSettings.focusSoundId !== 'none') {
            console.log('🎵 Starting focus sound with fresh settings');
            set({ focusSoundPlaying: true });
            // Play focus sound in loop for ticking clock
            await playFocusSoundLoop(serverSettings.focusSoundId, serverSettings.volume);
          } else {
            console.log('🎵 Focus sound disabled in server settings');
          }
        } catch (error) {
          console.error('🎵 Error loading focus sound settings:', error);
          // Fallback to local settings
          const { focusSettings } = useSoundStore.getState();
          if (focusSettings.soundId !== 'none') {
            console.log('🎵 Fallback to local focus sound settings:', focusSettings);
            set({ focusSoundPlaying: true });
            await playFocusSoundLoop(focusSettings.soundId, focusSettings.volume);
          }
        }
      },

      stopFocusSound: () => {
        if (get().focusSoundPlaying) {
          set({ focusSoundPlaying: false });
          stopCurrentSound();
        }
      },
    }),
    {
      name: 'timer-storage',
      partialize: (state) => ({
        timerState: state.timerState,
        secondsElapsed: state.secondsElapsed,
        activeTask: state.activeTask,
        sessionCount: state.sessionCount,
        breakType: state.breakType,
        startTime: state.startTime,
      }),
    }
  )
);

// Hook for easier usage
export const useTimer = () => {
  const store = useTimerStore();
  return store;
};

// Development helper to reset timer state
export const resetTimerState = () => {
  useTimerStore.getState().resetTimer();
  useTimerStore.getState().setLastSessionComplete(null);
};

// Make it available in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).resetTimerState = resetTimerState;
}
