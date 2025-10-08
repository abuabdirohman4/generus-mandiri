/**
 * Timer Service Worker Communication Utilities
 * Handles communication between the main app and the service worker for timer notifications
 */

// Service Worker message types
export type TimerMessageType = 
  | 'TIMER_COMPLETED'
  | 'TIMER_STARTED'
  | 'TIMER_UPDATED'
  | 'TIMER_PAUSED'
  | 'TIMER_STOPPED'
  | 'REQUEST_NOTIFICATION_PERMISSION'
  | 'TIMER_ACTION'
  | 'PLAY_COMPLETION_SOUND';

export interface TimerMessage {
  type: TimerMessageType;
  data?: any;
  action?: string;
}

export interface TimerData {
  taskTitle?: string;
  duration?: number;
  remainingSeconds?: number;
  totalDuration?: number;
  soundId?: string;
  startTime?: number;
  paused?: boolean;
}

/**
 * Send a message to the service worker - DISABLED
 */
export function sendMessageToServiceWorker(message: TimerMessage): void {
  // Service worker communication disabled
  console.log('Service Worker communication disabled:', message);
}

/**
 * Request notification permission from the main thread
 */
export function requestNotificationPermission(): Promise<NotificationPermission> {
  return new Promise((resolve) => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      resolve('denied');
      return;
    }

    if (Notification.permission === 'granted') {
      resolve('granted');
      return;
    }

    if (Notification.permission === 'denied') {
      resolve('denied');
      return;
    }

    // Request permission
    Notification.requestPermission().then((permission) => {
      resolve(permission);
    });
  });
}

/**
 * Send timer completion notification
 */
export function sendTimerCompletion(data: TimerData): void {
  sendMessageToServiceWorker({
    type: 'TIMER_COMPLETED',
    data
  });
}

/**
 * Send timer started notification
 */
export function sendTimerStarted(data: TimerData): void {
  sendMessageToServiceWorker({
    type: 'TIMER_STARTED',
    data
  });
}

/**
 * Send timer updated notification
 */
export function sendTimerUpdated(data: TimerData): void {
  sendMessageToServiceWorker({
    type: 'TIMER_UPDATED',
    data
  });
}

/**
 * Send timer paused notification
 */
export function sendTimerPaused(data: TimerData): void {
  sendMessageToServiceWorker({
    type: 'TIMER_PAUSED',
    data
  });
}

/**
 * Send timer stopped notification
 */
export function sendTimerStopped(): void {
  sendMessageToServiceWorker({
    type: 'TIMER_STOPPED'
  });
}

/**
 * Request notification permission from service worker
 */
export function requestNotificationPermissionFromSW(): void {
  sendMessageToServiceWorker({
    type: 'REQUEST_NOTIFICATION_PERMISSION'
  });
}

/**
 * Listen for service worker messages
 */
export function addServiceWorkerMessageListener(
  callback: (message: TimerMessage) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object') {
      callback(event.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}

/**
 * Check if service worker is ready - DISABLED
 */
export function isServiceWorkerReady(): boolean {
  return false; // Service worker disabled
}

/**
 * Wait for service worker to be ready - DISABLED
 */
export function waitForServiceWorker(): Promise<ServiceWorker> {
  return Promise.reject(new Error('Service Worker disabled'));
}
