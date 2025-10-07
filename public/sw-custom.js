// Custom Service Worker for Warlob App
// Handles PWA functionality and timer notifications

const CACHE_NAME = 'warlob-app-v1';
const urlsToCache = [
  '/',
  '/signin',
  '/absensi',
  '/manifest.json',
  '/images/logo/logo-icon.svg'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔧 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Message handling for timer notifications
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'TIMER_COMPLETE':
        handleTimerComplete(event.data);
        break;
      case 'TIMER_PAUSE':
        handleTimerPause(event.data);
        break;
      case 'TIMER_RESUME':
        handleTimerResume(event.data);
        break;
      case 'LIVE_TIMER_UPDATE':
        handleLiveTimerUpdate(event.data);
        break;
      default:
        console.log('🤷 Unknown message type:', event.data.type);
    }
  }
});

// Timer completion handler
function handleTimerComplete(data) {
  console.log('⏰ Timer completed:', data);
  
  // Show notification
  if (data.taskTitle) {
    self.registration.showNotification('Timer Selesai!', {
      body: `Sesi ${data.taskTitle} telah selesai`,
      icon: '/images/logo/logo-icon.svg',
      badge: '/images/logo/logo-icon.svg',
      tag: 'timer-complete',
      requireInteraction: true,
      actions: [
        {
          action: 'continue',
          title: 'Lanjutkan'
        },
        {
          action: 'break',
          title: 'Istirahat'
        }
      ]
    });
  }
}

// Timer pause handler
function handleTimerPause(data) {
  console.log('⏸️ Timer paused:', data);
  
  // Show pause notification
  self.registration.showNotification('Timer Dijeda', {
    body: `Sesi ${data.taskTitle || 'Timer'} dijeda`,
    icon: '/images/logo/logo-icon.svg',
    tag: 'timer-pause',
    silent: true
  });
}

// Timer resume handler
function handleTimerResume(data) {
  console.log('▶️ Timer resumed:', data);
  
  // Show resume notification
  self.registration.showNotification('Timer Dilanjutkan', {
    body: `Sesi ${data.taskTitle || 'Timer'} dilanjutkan`,
    icon: '/images/logo/logo-icon.svg',
    tag: 'timer-resume',
    silent: true
  });
}

// Live timer update handler
function handleLiveTimerUpdate(data) {
  console.log('🔄 Live timer update:', data);
  
  // Update notification with current time
  if (data.taskTitle && data.remainingTime) {
    self.registration.showNotification('Timer Berjalan', {
      body: `${data.taskTitle} - ${data.remainingTime} tersisa`,
      icon: '/images/logo/logo-icon.svg',
      tag: 'live-timer',
      silent: true,
      requireInteraction: false
    });
  }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'continue') {
    // Send message to app to continue timer
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_ACTION',
          action: 'continue'
        });
      });
    });
  } else if (event.action === 'break') {
    // Send message to app to start break
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_ACTION',
          action: 'break'
        });
      });
    });
  } else {
    // Default: focus the app
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        } else {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

console.log('🚀 Warlob App Service Worker loaded');
