// Simple Service Worker for PWA Installation
// Minimal functionality for mobile installation only

const CACHE_NAME = 'warlob-app-v1';
// ⚠️ UBAH INI: Hanya cache file static, bukan routes yang redirect
const urlsToCache = [
  '/manifest.json',
  '/images/logo/logo-icon.svg'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential files');
        // ⚠️ TAMBAHKAN ERROR HANDLING
        return cache.addAll(urlsToCache).catch(err => {
          console.error('❌ Failed to cache files:', err);
          // Continue anyway, don't block installation
        });
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Service Worker installation failed:', err);
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

  // ⚠️ TAMBAHKAN INI: Skip Next.js internal files dan API routes
  if (event.request.url.includes('/_next/') || 
      event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return to network
        return fetch(event.request);
      })
  );
});

console.log('🚀 Simple PWA Service Worker loaded');