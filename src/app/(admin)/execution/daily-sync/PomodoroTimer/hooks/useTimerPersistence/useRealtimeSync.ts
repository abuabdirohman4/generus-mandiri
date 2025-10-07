// Real-time synchronization with Supabase

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTimer } from '@/stores/timerStore';
import { useTimerStore } from '@/stores/timerStore';
import { isTimerEnabledInDev } from '@/lib/timerDevUtils';
import { getActiveTimerSession } from '../../actions/timerSessionActions';

export function useRealtimeSync() {
  const { activeTask } = useTimer();
  const [user, setUser] = useState<any>(null);

  // Get user for real-time sync
  useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Subscribe to timer_sessions changes
  useEffect(() => {
    // ✅ DEV CONTROL: Don't sync if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      return;
    }
    
    if (!user?.id) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel('timer-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timer_sessions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔄 Real-time timer session update:', payload);
          
          // Handle different event types
          if (payload.eventType === 'UPDATE') {
            const session = payload.new;
            
            // Check if this is our current active session
            if (session.status === 'COMPLETED' && session.task_id === activeTask?.id) {
              console.log('⏰ Timer completed on another device - syncing...');
              
              // Sync timer state with database
              useTimerStore.getState().completeTimerFromDatabase({
                taskId: session.task_id,
                taskTitle: session.task_title || 'Unknown Task',
                startTime: session.start_time,
                duration: session.current_duration_seconds,
                status: session.status
              });
            } else if (session.status === 'FOCUSING' && session.task_id === activeTask?.id) {
              console.log('🔄 Timer session updated on another device - syncing...');
              
              // Use real-time payload data, only fetch focus_duration if missing
              let focusDuration = session.focus_duration;
              if (!focusDuration) {
                try {
                  const activeSession = await getActiveTimerSession();
                  focusDuration = activeSession?.focus_duration;
                } catch (error) {
                  console.error('Failed to fetch focus_duration:', error);
                }
              }
              
              // Sync current duration
              useTimerStore.getState().resumeFromDatabase({
                taskId: session.task_id,
                taskTitle: session.task_title || 'Unknown Task',
                startTime: session.start_time,
                currentDuration: session.current_duration_seconds,
                status: session.status,
                focus_duration: focusDuration
              });
            }
          } else if (payload.eventType === 'INSERT') {
            const session = payload.new;
            
            // Check if this is a new session for the same task
            if (session.status === 'FOCUSING' && session.task_id === activeTask?.id) {
              console.log('⚠️ New timer session created on another device for same task');
              
              // This might indicate a race condition
              // We should handle this appropriately
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeTask?.id]);

  // Subscribe to activity_logs changes
  useEffect(() => {
    // ✅ DEV CONTROL: Don't sync if timer is disabled in development
    if (!isTimerEnabledInDev()) {
      return;
    }
    
    if (!user?.id || !activeTask) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel('activity-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('📝 New activity log created:', payload);
          
          const activityLog = payload.new;
          
          // Check if this is for our current active task
          if (activityLog.task_id === activeTask.id) {
            console.log('⏰ Activity log created for current task - timer should be completed');
            
            // Complete timer state
            useTimerStore.getState().completeTimerFromDatabase({
              taskId: activityLog.task_id,
              taskTitle: activeTask.title,
              startTime: activityLog.start_time,
              duration: activityLog.duration_minutes * 60,
              status: 'COMPLETED'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeTask?.id]);
}
