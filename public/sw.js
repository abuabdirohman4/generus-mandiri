// Optimized Service Worker for Warlob App
// School Management System PWA

const CACHE_NAME = 'warlob-school-v1.0.0';
const STATIC_CACHE = 'warlob-static-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/manifest.json',
  '/images/logo/logo-icon.svg',
  '/images/logo/logo-icon.png',
  '/images/logo/logo.svg'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('🔧 Warlob Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('⚠️ Some static assets failed to cache:', err);
        });
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ]).then(() => {
      console.log('✅ Warlob Service Worker installed');
    }).catch(err => {
      console.error('❌ Service Worker installation failed:', err);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔧 Warlob Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Warlob Service Worker activated');
    })
  );
});

// Fetch event - optimized caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Skip non-GET requests
  if (method !== 'GET') {
    return;
  }

  // Skip non-http requests
  if (!url.startsWith('http')) {
    return;
  }

  // Skip Next.js internal files and API routes
  if (url.includes('/_next/') || 
      url.includes('/api/') ||
      url.includes('/auth/')) {
    return;
  }

  // Handle different types of requests
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // For static assets, try cache first
    if (isStaticAsset(url)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // For HTML pages, try network first with cache fallback
    if (isHTMLPage(url)) {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          // Cache successful responses
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      }
    }

    // For other requests, try network first
    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      // Fallback to cache if available
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Fetch failed:', error);
    // Return a basic offline page for HTML requests
    if (isHTMLPage(url)) {
      return new Response(
        '<html><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>',
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 503 
        }
      );
    }
    throw error;
  }
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/images/') ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.startsWith('/audio/') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.gif') ||
         url.pathname.endsWith('.webp');
}

function isHTMLPage(url) {
  return url.pathname.endsWith('/') ||
         !url.pathname.includes('.') ||
         url.pathname.endsWith('.html');
}

console.log('🚀 Warlob School Management Service Worker loaded');