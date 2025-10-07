// Main timer persistence hook - optimized and modular

import { useEffect } from 'react';
import { useTimer, useTimerStore } from '@/stores/timerStore';
import { getActiveTimerSession } from '../actions/timerSessionActions';
import { getGlobalState } from './globalState';
import { useAutoSave } from './useTimerPersistence/useAutoSave';
import { useRecovery } from './useTimerPersistence/useRecovery';
import { useOnlineStatus } from './useTimerPersistence/useOnlineStatus';
import { useBrowserEvents } from './useTimerPersistence/useBrowserEvents';
import { useRealtimeSync } from './useTimerPersistence/useRealtimeSync';
import { useTimerActions } from './useTimerPersistence/useTimerActions';
import { isTimerEnabledInDev } from '@/lib/timerDevUtils';

export function useTimerPersistence() {
  const { 
    timerState, 
    activeTask, 
    startTime
  } = useTimer();

  // ✅ DEV CONTROL: Check if timer is enabled in development
  const isTimerEnabled = isTimerEnabledInDev();

  // Initialize all sub-hooks only if timer is enabled
  const { debouncedSave } = useAutoSave();
  const { isRecovering } = useRecovery();
  const { isOnline } = useOnlineStatus();
  const { 
    handleTimerComplete, 
    handleTimerPause, 
    handleTimerResume 
  } = useTimerActions();

  // Setup browser events only if timer is enabled
  useBrowserEvents({ debouncedSave });

  // Setup real-time sync only if timer is enabled
  useRealtimeSync();

  // ✅ DEV CONTROL: Only run timer logic if enabled
  // Clear timer state when stopped
  useEffect(() => {
    if (!isTimerEnabled) return;
    
    if (timerState === 'IDLE' && activeTask && startTime) {
      useTimerStore.getState().stopTimer();
    }
  }, [timerState, activeTask, startTime, isTimerEnabled]);

  // Validate session during recovery
  useEffect(() => {
    if (!isTimerEnabled) return;
    
    const { recoveryCompleted, recoveryInProgress } = getGlobalState();
    
    if (recoveryCompleted && !isRecovering && timerState === 'FOCUSING' && activeTask && startTime && recoveryInProgress) {
      const checkSession = async () => {
        try {
          const activeSession = await getActiveTimerSession();
          if (!activeSession) {
            useTimerStore.getState().stopTimer();
          }
        } catch (error) {
          console.error('❌ Failed to check session:', error);
        }
      };
      checkSession();
    }
  }, [isRecovering, timerState, activeTask, startTime, isTimerEnabled]);

  // Save on page visibility change
  useEffect(() => {
    if (!isTimerEnabled) return;
    
    const { recoveryInProgress, recoveryCompleted } = getGlobalState();
    
    const handleVisibilityChange = () => {
      if (document.hidden && timerState === 'FOCUSING' && activeTask && startTime && !recoveryInProgress && recoveryCompleted) {
        debouncedSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState, activeTask, startTime, debouncedSave, isTimerEnabled]);

  // ✅ FIX: Use global state for isRecovering to ensure consistency across all hooks
  const { recoveryInProgress } = getGlobalState();
  const isRecoveringFromGlobal = recoveryInProgress;

  return {
    isOnline,
    isRecovering: isRecoveringFromGlobal,
    handleTimerComplete,
    handleTimerPause,
    handleTimerResume
  };
}

// Re-export utilities for external use
export { resetTimerPersistence } from './globalState';
export { getClientDeviceId } from './deviceUtils';
