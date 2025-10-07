import { useState, useTransition, useEffect, useCallback } from 'react';
import { useTimer } from '@/stores/timerStore';
import { useActivityStore } from '@/stores/activityStore';
import { logActivity } from '../../ActivityLog/actions/activityLoggingActions';
import { completeTimerSession, getActiveTimerSession } from '../actions/timerSessionActions';
import { getClientDeviceId } from './deviceUtils';
import { createClient } from '@/lib/supabase/client';
import { isTimerEnabledInDev } from '@/lib/timerDevUtils';

export function useTimerManagement(selectedDateStr: string, openJournalModal: (data: {
  activityId?: string;
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  taskTitle?: string;
  duration: number;
}) => void) {
  const { startFocusSession, timerState, secondsElapsed, activeTask: activeTaskCtx, lastSessionComplete, setLastSessionComplete, isProcessingCompletion, setProcessingCompletion } = useTimer();
  const [activityLogRefreshKey, setActivityLogRefreshKey] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const defaultTitle = 'Daily Sync | Better Planner';
    function formatTime(secs: number) {
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = (secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }
    if (timerState === 'FOCUSING' && activeTaskCtx) {
      document.title = `${formatTime(secondsElapsed)} ${activeTaskCtx.title}`;
    } else {
      document.title = defaultTitle;
    }
    return () => {
      document.title = defaultTitle;
    };
  }, [timerState, secondsElapsed, activeTaskCtx]);

  const handleSessionComplete = useCallback(async (sessionData: {
    taskId: string;
    taskTitle: string;
    type: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
    startTime: string;
    endTime: string;
  }) => {
    // ✅ DEV CONTROL: Don't complete session if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      console.log('⏸️ Session completion disabled in development mode');
      return;
    }
    
    // ✅ Set loading state
    setProcessingCompletion(true);
    
    startTransition(async () => {
      try {
        if (!sessionData.taskId || !sessionData.type || !sessionData.startTime || !sessionData.endTime) {
          console.error('Missing required fields', sessionData);
          return;
        }

        // ✅ FIX: Use completeTimerSession for FOCUS sessions
        let activityLogId: string | undefined = undefined;
        
        if (sessionData.type === 'FOCUS') {
          try {
            // Get active timer session
            const activeSession = await getActiveTimerSession();
            if (activeSession) {
              // Get client device ID
              const deviceId = getClientDeviceId();
              
              // ✅ FIX: Add completion lock to prevent multiple database completions
              const completionKey = `${sessionData.taskId}-${sessionData.startTime}`;
              const lastCompletion = sessionStorage.getItem(`completion-${completionKey}`);
              const now = Date.now();
              
              if (lastCompletion && (now - parseInt(lastCompletion)) < 5000) {
                console.log('🔇 Database completion already processed recently, skipping...');
                return;
              }
              
              // Complete the timer session (this will create activity log and mark session as completed)
              await completeTimerSession(activeSession.id, deviceId);
              console.log('✅ Timer session completed successfully');
              
              // Mark completion in sessionStorage
              sessionStorage.setItem(`completion-${completionKey}`, now.toString());
              
              // ✅ FIX: Get the activity log ID after creation
              const supabase = await createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: activityLog } = await supabase
                  .from('activity_logs')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('task_id', sessionData.taskId)
                  .eq('start_time', sessionData.startTime)
                  .eq('type', 'FOCUS')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                
                if (activityLog) {
                  activityLogId = activityLog.id;
                  console.log('✅ Activity log ID found:', activityLogId);
                }
              }
            } else {
              // Fallback to old method if no active session found
              console.log('⚠️ No active session found, using fallback method');
              const formData = new FormData();
              formData.append('taskId', sessionData.taskId);
              formData.append('taskTitle', sessionData.taskTitle);
              formData.append('sessionType', sessionData.type);
              formData.append('date', selectedDateStr);
              formData.append('startTime', sessionData.startTime);
              formData.append('endTime', sessionData.endTime);
              const result = await logActivity(formData);
              if (result && result.id) {
                activityLogId = result.id;
                console.log('✅ Activity log ID from fallback:', activityLogId);
              }
            }
          } catch (error) {
            console.error('Error completing timer session:', error);
            // Fallback to old method
            const formData = new FormData();
            formData.append('taskId', sessionData.taskId);
            formData.append('taskTitle', sessionData.taskTitle);
            formData.append('sessionType', sessionData.type);
            formData.append('date', selectedDateStr);
            formData.append('startTime', sessionData.startTime);
            formData.append('endTime', sessionData.endTime);
            const result = await logActivity(formData);
            if (result && result.id) {
              activityLogId = result.id;
              console.log('✅ Activity log ID from error fallback:', activityLogId);
            }
          }
        } else {
          // For break sessions, use old method
          const formData = new FormData();
          formData.append('taskId', sessionData.taskId);
          formData.append('taskTitle', sessionData.taskTitle);
          formData.append('sessionType', sessionData.type);
          formData.append('date', selectedDateStr);
          formData.append('startTime', sessionData.startTime);
          formData.append('endTime', sessionData.endTime);
          await logActivity(formData);
        }

        setActivityLogRefreshKey((k) => k + 1);
        useActivityStore.getState().triggerRefresh();
        
        // ✅ FIX: Open journal modal for FOCUS sessions only, with activity log ID
        if (sessionData.type === 'FOCUS') {
          const durationInSeconds = Math.round((new Date(sessionData.endTime).getTime() - new Date(sessionData.startTime).getTime()) / 1000);
          const durationInMinutes = Math.max(1, Math.round(durationInSeconds / 60));
          openJournalModal({
            activityId: activityLogId, // ✅ Pass the activity log ID
            taskId: sessionData.taskId,
            date: selectedDateStr,
            startTime: sessionData.startTime,
            endTime: sessionData.endTime,
            taskTitle: sessionData.taskTitle,
            duration: durationInMinutes,
          });
        }
      } catch (err) {
        console.error('Error logging session:', err);
      } finally {
        // ✅ Clear loading state
        setProcessingCompletion(false);
      }
    });
  }, [selectedDateStr, setActivityLogRefreshKey, openJournalModal, setProcessingCompletion]);

  const handleSetActiveTask = (task: { id: string; title: string; item_type: string; focus_duration?: number }) => {
    startFocusSession(task);
    // Auto-scroll to top when timer starts
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (lastSessionComplete) {
      handleSessionComplete(lastSessionComplete);
      setLastSessionComplete(null);
    }
  }, [lastSessionComplete, handleSessionComplete, setLastSessionComplete]);

  return {
    handleSetActiveTask,
    activityLogRefreshKey
  };
}
