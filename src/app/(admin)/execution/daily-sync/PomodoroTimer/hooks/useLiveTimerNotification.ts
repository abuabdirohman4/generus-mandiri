// Live timer notification hook for PWA
// Shows running timer in notification when app is minimized

import { useEffect, useRef } from 'react';
import { useTimer, useTimerStore } from '@/stores/timerStore';
import { useSoundStore } from '@/stores/soundStore';

export function useLiveTimerNotification() {
  const { timerState, activeTask, secondsElapsed, startTime } = useTimer();
  const { settings } = useSoundStore();
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationTimeRef = useRef<number>(0);

  // Handle timer state changes
  useEffect(() => {
    if (timerState === 'FOCUSING' && activeTask && startTime) {
      // Timer started - show live notification
      showLiveTimerNotification();
      startNotificationUpdates();
    } else if (timerState === 'PAUSED' && activeTask) {
      // Timer paused - update notification
      showPausedTimerNotification();
      stopNotificationUpdates();
    } else if (timerState === 'IDLE') {
      // Timer stopped - clear notification
      clearLiveTimerNotification();
      stopNotificationUpdates();
    }
  }, [timerState, activeTask, startTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopNotificationUpdates();
    };
  }, []);

  // Listen for Service Worker actions
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIMER_ACTION') {
        const { action } = event.data;
        handleNotificationAction(action);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const showLiveTimerNotification = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const totalDuration = (activeTask?.focus_duration || 25) * 60;
      const remainingSeconds = Math.max(0, totalDuration - secondsElapsed);
      
      navigator.serviceWorker.controller.postMessage({
        type: 'TIMER_STARTED',
        data: {
          taskTitle: activeTask?.title,
          duration: totalDuration,
          remainingSeconds,
          totalDuration,
          soundId: settings.soundId
        }
      });
    }
  };

  const showPausedTimerNotification = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const totalDuration = (activeTask?.focus_duration || 25) * 60;
      const remainingSeconds = Math.max(0, totalDuration - secondsElapsed);
      
      navigator.serviceWorker.controller.postMessage({
        type: 'TIMER_PAUSED',
        data: {
          taskTitle: activeTask?.title,
          remainingSeconds,
          totalDuration
        }
      });
    }
  };

  const updateLiveTimerNotification = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller && timerState === 'FOCUSING') {
      const totalDuration = (activeTask?.focus_duration || 25) * 60;
      const remainingSeconds = Math.max(0, totalDuration - secondsElapsed);
      
      navigator.serviceWorker.controller.postMessage({
        type: 'TIMER_UPDATED',
        data: {
          taskTitle: activeTask?.title,
          remainingSeconds,
          totalDuration,
          duration: totalDuration
        }
      });
    }
  };

  const clearLiveTimerNotification = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TIMER_STOPPED',
        data: {}
      });
    }
  };

  const startNotificationUpdates = () => {
    // Update notification every 5 seconds for more responsive updates
    updateIntervalRef.current = setInterval(() => {
      updateLiveTimerNotification();
    }, 5000);
  };

  const stopNotificationUpdates = () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };

  const handleNotificationAction = (action: string) => {
    switch (action) {
      case 'pause':
        // Pause timer
        if (timerState === 'FOCUSING') {
          useTimerStore.getState().pauseTimer();
        }
        break;
      case 'resume':
        // Resume timer
        if (timerState === 'PAUSED') {
          useTimerStore.getState().resumeTimer();
        }
        break;
      case 'stop':
        // Stop timer
        useTimerStore.getState().stopTimer();
        break;
      case 'view':
        // Focus app window
        window.focus();
        break;
    }
  };

  return {
    showLiveTimerNotification,
    showPausedTimerNotification,
    updateLiveTimerNotification,
    clearLiveTimerNotification
  };
}

