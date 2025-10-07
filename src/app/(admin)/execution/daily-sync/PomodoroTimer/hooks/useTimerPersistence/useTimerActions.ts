// Timer actions (complete, pause, resume)

import { useCallback } from 'react';
import { 
  completeTimerSession,
  pauseTimerSession,
  resumeTimerSession
} from '../../actions/timerSessionActions';
import { isTimerEnabledInDev } from '@/lib/timerDevUtils';

export function useTimerActions() {
  // Handle timer completion
  const handleTimerComplete = useCallback(async (sessionId: string) => {
    // ✅ DEV CONTROL: Don't complete if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      console.log('⏸️ Timer completion disabled in development mode');
      return;
    }
    
    try {
      await completeTimerSession(sessionId);
    } catch (error) {
      console.error('❌ Failed to complete timer session:', error);
    }
  }, []);

  // Handle timer pause
  const handleTimerPause = useCallback(async (sessionId: string) => {
    // ✅ DEV CONTROL: Don't pause if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      console.log('⏸️ Timer pause disabled in development mode');
      return;
    }
    
    try {
      await pauseTimerSession(sessionId);
    } catch (error) {
      console.error('❌ Failed to pause timer session:', error);
    }
  }, []);

  // Handle timer resume
  const handleTimerResume = useCallback(async (sessionId: string) => {
    // ✅ DEV CONTROL: Don't resume if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      console.log('⏸️ Timer resume disabled in development mode');
      return;
    }
    
    try {
      await resumeTimerSession(sessionId);
    } catch (error) {
      console.error('❌ Failed to resume timer session:', error);
    }
  }, []);

  return {
    handleTimerComplete,
    handleTimerPause,
    handleTimerResume
  };
}
