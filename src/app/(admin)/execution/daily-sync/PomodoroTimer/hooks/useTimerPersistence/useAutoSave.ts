// Auto-save logic for timer persistence

import { useEffect, useCallback } from 'react';
import { useTimer, useTimerStore } from '@/stores/timerStore';
import { saveTimerSession, getActiveTimerSession } from '../../actions/timerSessionActions';
import { getClientDeviceId } from '../deviceUtils';
import { getGlobalState, setGlobalLastSaveTime, setGlobalIsSaving } from '../globalState';
import { isTimerEnabledInDev } from '@/lib/timerDevUtils';

export function useAutoSave() {
  const { 
    timerState, 
    activeTask, 
    secondsElapsed, 
    startTime,
    breakType 
  } = useTimer();

  // Debounced save function with global state
  const debouncedSave = useCallback(async () => {
    // ✅ DEV CONTROL: Don't save if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      return;
    }
    
    const { isSaving } = getGlobalState();
    
    if (isSaving || !activeTask || !startTime) {
      return;
    }
    
    const now = Date.now();
    if (now - getGlobalState().lastSaveTime < 5000) { // Prevent saves within 5 seconds
      return;
    }
    
    setGlobalIsSaving(true);
    setGlobalLastSaveTime(now);
    
    try {
      // ✅ FIX: Validasi session sebelum save
      const existingSession = await getActiveTimerSession();
      const deviceId = getClientDeviceId();
      
      if (existingSession && existingSession.task_id === activeTask.id) {
        // Session sudah ada, update saja
        await saveTimerSession({
          taskId: activeTask.id,
          taskTitle: activeTask.title,
          sessionType: 'FOCUS',
          startTime: startTime,
          targetDuration: (activeTask.focus_duration || 25) * 60,
          currentDuration: secondsElapsed,
          status: timerState,
          deviceId: deviceId,
          focusDuration: activeTask.focus_duration
        });
      } else {
        // Session belum ada, buat baru
        await saveTimerSession({
          taskId: activeTask.id,
          taskTitle: activeTask.title,
          sessionType: 'FOCUS',
          startTime: startTime,
          targetDuration: (activeTask.focus_duration || 25) * 60,
          currentDuration: secondsElapsed,
          status: timerState,
          deviceId: deviceId,
          focusDuration: activeTask.focus_duration
        });
      }
    } catch (error) {
      console.error('❌ Failed to save timer session:', error);
    } finally {
      setGlobalIsSaving(false);
    }
  }, [activeTask, startTime, secondsElapsed, timerState]);

  // Auto-save dengan interval berdasarkan environment
  useEffect(() => {
    // ✅ DEV CONTROL: Don't auto-save if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      return;
    }
    
    const { recoveryInProgress, recoveryCompleted } = getGlobalState();
    
    if (timerState === 'FOCUSING' && activeTask && startTime && !recoveryInProgress && recoveryCompleted) {
      // Environment-based auto-save interval
      const isDevelopment = process.env.NODE_ENV === 'development';
      const saveInterval = isDevelopment ? 5000 : 30000; // 5s dev, 30s prod
      
      const interval = setInterval(() => {
        // ✅ CRITICAL: Calculate actual elapsed time for accurate sync
        const now = new Date();
        const startTimeDate = new Date(startTime);
        const actualElapsedSeconds = Math.floor((now.getTime() - startTimeDate.getTime()) / 1000);
        
        // Only save if there's a significant difference (more than 2 seconds)
        if (Math.abs(actualElapsedSeconds - secondsElapsed) > 2) {
          // Update local timer state with correct time
          useTimerStore.getState().incrementSeconds();
        }
        
        debouncedSave();
      }, saveInterval);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [timerState, activeTask, startTime, secondsElapsed, debouncedSave]);

  return { debouncedSave };
}
