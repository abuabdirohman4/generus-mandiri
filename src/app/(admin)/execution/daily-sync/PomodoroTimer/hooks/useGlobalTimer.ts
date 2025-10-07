import { useEffect, useRef } from 'react';
import { useTimer, useTimerStore } from '@/stores/timerStore';
import { isTimerEnabledInDev } from '@/lib/timerDevUtils';

/**
 * Global Timer Hook - Singleton pattern
 * Hanya ada 1 interval yang berjalan untuk seluruh aplikasi
 * Mencegah multiple interval yang menyebabkan timer berjalan 2x lebih cepat
 * 
 * ✅ MOBILE FIX: Background timer recovery untuk handphone yang dikunci
 */
// Global interval reference to prevent multiple instances
let globalIntervalRef: NodeJS.Timeout | null = null;

export function useGlobalTimer() {
  const { timerState, incrementSeconds, secondsElapsed, activeTask, startTime } = useTimer();
  const lastActiveTimeRef = useRef<number>(Date.now());

  // ✅ MOBILE FIX: Background timer recovery
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState === 'FOCUSING') {
        // App kembali aktif, cek apakah timer perlu di-recover
        const now = Date.now();
        const timeSinceLastActive = now - lastActiveTimeRef.current;
        
        // Jika lebih dari 5 detik, kemungkinan timer terhenti
        if (timeSinceLastActive > 5000) {
          // Timer akan di-recover oleh useTimerPersistence hook
        }
      }
    };

    const handleFocus = () => {
      lastActiveTimeRef.current = Date.now();
    };

    const handleBlur = () => {
      lastActiveTimeRef.current = Date.now();
    };

    // Event listeners untuk mobile recovery
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [timerState]);

  useEffect(() => {
    // ✅ DEV CONTROL: Don't run timer if disabled in development
    if (!isTimerEnabledInDev()) {
      // Clear any existing interval
      if (globalIntervalRef) {
        clearInterval(globalIntervalRef);
        globalIntervalRef = null;
      }
      return;
    }
    
    // Clear existing global interval
    if (globalIntervalRef) {
      clearInterval(globalIntervalRef);
      globalIntervalRef = null;
    }

    if (timerState === 'FOCUSING' || timerState === 'BREAK' || timerState === 'PAUSED') {
      globalIntervalRef = setInterval(() => {
        // ✅ AUTO-COMPLETION CHECK: Check if timer should be completed
        if (activeTask && startTime) {
          const now = new Date();
          const startTimeDate = new Date(startTime);
          const elapsedSeconds = Math.floor((now.getTime() - startTimeDate.getTime()) / 1000);
          const targetDuration = (activeTask.focus_duration || 25) * 60;
          
          // If elapsed time >= target duration, complete the timer
          if (elapsedSeconds >= targetDuration) {
            useTimerStore.getState().completeTimerFromDatabase({
              taskId: activeTask.id,
              taskTitle: activeTask.title,
              startTime: startTime,
              duration: targetDuration, // Use target duration, not actual elapsed
              status: 'COMPLETED'
            });
            return; // Don't increment seconds
          }
        }
        
        incrementSeconds();
        lastActiveTimeRef.current = Date.now(); // Update last active time
      }, 1000);
    }

    return () => {
      if (globalIntervalRef) {
        clearInterval(globalIntervalRef);
        globalIntervalRef = null;
      }
    };
  }, [timerState, activeTask, startTime]); // Add activeTask and startTime to deps for auto-completion check
}
