// Timer recovery logic

import { useEffect, useState } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { getActiveTimerSession, updateSessionWithActualTime } from '../../actions/timerSessionActions';
import { getGlobalState, setGlobalRecoveryInProgress, setGlobalRecoveryCompleted } from '../globalState';
import { isTimerEnabledInDev } from '@/lib/timerDevUtils';

export function useRecovery() {
  const [isRecovering, setIsRecovering] = useState(getGlobalState().recoveryInProgress);

  // Recovery on app load
  useEffect(() => {
    // ✅ DEV CONTROL: Don't recover if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      return;
    }
    
    const recoverSession = async () => {
      const { recoveryInProgress, recoveryCompleted } = getGlobalState();
      
      // ✅ FIX: Hanya jalankan jika belum pernah recovery
      if (recoveryInProgress || recoveryCompleted) return;
      
      setGlobalRecoveryInProgress(true);
      setIsRecovering(true);
      
      try {
        const activeSession = await getActiveTimerSession();
        
        if (activeSession) {
          // ✅ SERVER-SIDE TIMER: Update session with actual elapsed time
          try {
            const result = await updateSessionWithActualTime(activeSession.id);
            
            if (result.completed) {
              // ✅ FIX: Timer completed while app was closed - trigger completion
              console.log('⏰ Timer completed while app was closed');
              
              // Trigger timer completion in frontend
              useTimerStore.getState().completeTimerFromDatabase({
                taskId: activeSession.task_id,
                taskTitle: activeSession.task_title,
                startTime: activeSession.start_time,
                duration: result.elapsedSeconds,
                status: 'COMPLETED'
              });
            } else {
              // Resume with actual elapsed time from server
              console.log('▶️ Resuming timer with server-calculated duration:', result.elapsedSeconds);
              useTimerStore.getState().resumeFromDatabase({
                taskId: activeSession.task_id,
                taskTitle: activeSession.task_title,
                startTime: activeSession.start_time,
                currentDuration: result.elapsedSeconds,
                status: activeSession.status,
                focus_duration: activeSession.focus_duration // ✅ TAMBAHKAN
              });
            }
          } catch (error) {
            console.error('❌ Failed to update session with actual time:', error);
            // Fallback to database duration
            const currentDuration = activeSession.current_duration_seconds;
            useTimerStore.getState().resumeFromDatabase({
              taskId: activeSession.task_id,
              taskTitle: activeSession.task_title,
              startTime: activeSession.start_time,
              currentDuration: currentDuration,
              status: activeSession.status,
              focus_duration: activeSession.focus_duration // ✅ TAMBAHKAN
            });
          }
        }
      } catch (error) {
        console.error('❌ Failed to recover timer session:', error);
      } finally {
        setGlobalRecoveryCompleted(true);
        setGlobalRecoveryInProgress(false);
        setIsRecovering(false);
      }
    };

    // ✅ FIX: Hanya jalankan recovery jika belum pernah dilakukan
    if (!getGlobalState().recoveryCompleted) {
      recoverSession();
    }
  }, []);

  return { isRecovering };
}
