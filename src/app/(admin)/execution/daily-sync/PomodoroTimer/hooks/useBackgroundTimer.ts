// Background timer hook for notifications and completion handling

import { useEffect, useRef } from 'react';
import { useTimer } from '@/stores/timerStore';
import { useSoundStore } from '@/stores/soundStore';
import { playSound } from '@/lib/soundUtils';

export function useBackgroundTimer() {
  const { timerState, activeTask, secondsElapsed, startTime } = useTimer();
  const { settings } = useSoundStore();
  const notificationPermissionRef = useRef<NotificationPermission>('default');
  const backgroundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const soundPlayedRef = useRef<boolean>(false);
  const lastCompletionTimeRef = useRef<number>(0);

  // Request notification permission when timer starts
  useEffect(() => {
    if (timerState === 'FOCUSING' && activeTask && notificationPermissionRef.current === 'default') {
      requestNotificationPermission();
    }
  }, [timerState, activeTask]);

  // Handle timer completion notifications
  useEffect(() => {
    if (timerState === 'IDLE' && activeTask && startTime) {
      // Reset sound flag when timer starts
      soundPlayedRef.current = false;
      lastCompletionTimeRef.current = 0;
    }
  }, [timerState, activeTask, startTime]);

  // Listen for Service Worker sound requests (disabled to prevent double sound)
  // Sound is now handled only by the main timer completion in useGlobalTimer
  // useEffect(() => {
  //   const handleServiceWorkerMessage = (event: MessageEvent) => {
  //     if (event.data?.type === 'PLAY_COMPLETION_SOUND') {
  //       const { soundId } = event.data.data;
  //       playCompletionSound(soundId);
  //     }
  //   };

  //   navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
  //   return () => {
  //     navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
  //   };
  // }, []);

  // Cleanup background timeout on unmount
  useEffect(() => {
    return () => {
      if (backgroundTimeoutRef.current) {
        clearTimeout(backgroundTimeoutRef.current);
      }
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        notificationPermissionRef.current = permission;
        console.log('🔔 Notification permission:', permission);
      } catch (error) {
        console.error('❌ Failed to request notification permission:', error);
      }
    }
  };

  const showCompletionNotification = () => {
    if ('Notification' in window && notificationPermissionRef.current === 'granted') {
      // Try to use Service Worker first, fallback to direct notification
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TIMER_COMPLETED',
          data: {
            taskTitle: activeTask?.title,
            soundId: settings.soundId
          }
        });
      } else {
        // Fallback to direct notification
        const notification = new Notification('Timer Completed! 🎉', {
          body: `Your ${activeTask?.title || 'focus session'} is complete!`,
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          tag: 'timer-completion',
          requireInteraction: true
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);
      }
    }
  };

  const playCompletionSound = async (soundId?: string) => {
    try {
      // Prevent multiple sound plays within 2 seconds
      const now = Date.now();
      if (soundPlayedRef.current || (now - lastCompletionTimeRef.current) < 2000) {
        console.log('🔇 Sound already played recently, skipping...');
        return;
      }

      const targetSoundId = soundId || settings.soundId;
      if (targetSoundId && targetSoundId !== 'none') {
        soundPlayedRef.current = true;
        lastCompletionTimeRef.current = now;
        await playSound(targetSoundId, settings.volume);
        console.log('🔊 Played completion sound:', targetSoundId);
      }
    } catch (error) {
      console.error('❌ Failed to play completion sound:', error);
    }
  };

  // Schedule background completion when tab becomes hidden
  const scheduleBackgroundCompletion = (remainingSeconds: number) => {
    if (backgroundTimeoutRef.current) {
      clearTimeout(backgroundTimeoutRef.current);
    }

    if (remainingSeconds > 0) {
      backgroundTimeoutRef.current = setTimeout(async () => {
        // Timer completed in background - only show notification
        // Sound will be handled by Service Worker or main timer completion
        showCompletionNotification();
      }, remainingSeconds * 1000);
    }
  };

  // Cancel background completion when tab becomes visible
  const cancelBackgroundCompletion = () => {
    if (backgroundTimeoutRef.current) {
      clearTimeout(backgroundTimeoutRef.current);
      backgroundTimeoutRef.current = null;
    }
  };

  return {
    scheduleBackgroundCompletion,
    cancelBackgroundCompletion,
    showCompletionNotification,
    playCompletionSound
  };
}
