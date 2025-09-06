// Zenith Trader Service Worker - Optimized for Vite
// Version: 2.0.0

const CACHE_NAME = 'zenith-cache-v2';
const STATIC_CACHE_NAME = 'zenith-static-v2';
const DYNAMIC_CACHE_NAME = 'zenith-dynamic-v2';

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-72x72.svg',
  '/icon-96x96.svg',
  '/icon-128x128.svg',
  '/icon-144x144.svg',
  '/icon-152x152.svg',
  '/icon-192x192.svg',
  '/icon-384x384.svg',
  '/icon-512x512.svg',
  '/badge-72x72.svg'
];

// API endpoints to cache
const API_CACHE = [
  '/api/wallet/analyze',
  '/api/admin/copy-trading/status',
  '/api/notifications/vapid-public-key'
];

// Install event - minimal setup
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2.0.0...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2.0.0...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove old version caches
          if (!cacheName.includes('-v2')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - smart caching strategy with bypass
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Check if this is a navigation request (HTML)
  const isNavigationRequest = request.mode === 'navigate';
  
  // Check if this is a Vite dev server asset
  const isViteDevAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/@vite') ||
     url.pathname.startsWith('/src/') ||
     url.pathname.startsWith('/node_modules') ||
     url.pathname.includes('.ts') ||
     url.pathname.includes('.tsx') ||
     url.pathname.includes('.jsx'));

  // Check if this is an API request
  const isApiRequest = 
    url.pathname.startsWith('/api') ||
    url.origin.includes('localhost:3001') ||
    url.origin.includes('localhost:3000');

  // Check if this is OAuth related
  const isOAuthRequest = 
    url.pathname.includes('/auth') ||
    url.searchParams.has('token') ||
    url.searchParams.has('code') ||
    url.searchParams.has('state');

  // Check if this is a hot module reload request
  const isHMR = url.pathname.includes('hot-update');
  
  // Check if this is a browser extension request
  const isBrowserExtension = url.protocol === 'chrome-extension:' || 
                             url.protocol === 'moz-extension:' ||
                             url.protocol === 'ms-browser-extension:';

  // BYPASS: Don't cache these types of requests
  if (isNavigationRequest || isViteDevAsset || isApiRequest || isOAuthRequest || isHMR || isBrowserExtension) {
    // Let the browser handle these directly
    return;
  }

  // For static assets only, use stale-while-revalidate
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
  const isStaticAsset = staticExtensions.some(ext => url.pathname.endsWith(ext));
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Helper: Handle message events for cache control
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CACHE_CLEAR') {
    console.log('[SW] Cache clear requested');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let notificationData = {
    title: 'Zenith Trader',
    body: 'Yeni bildirim',
    icon: '/icon-192x192.svg',
    badge: '/badge-72x72.svg',
    data: {
      url: '/'
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    console.log('[SW] Performing background sync...');
    
    // Example: Sync pending notifications
    const pendingNotifications = await getPendingNotifications();
    
    for (const notification of pendingNotifications) {
      await sendNotification(notification);
    }
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync error:', error);
  }
}

// Get pending notifications (placeholder)
async function getPendingNotifications() {
  // This would typically fetch from IndexedDB or local storage
  return [];
}

// Send notification (placeholder)
async function sendNotification(notification) {
  // This would typically send to a notification service
  console.log('[SW] Sending notification:', notification);
}

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Error event
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

// Unhandled rejection event
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[SW] Service Worker script loaded');
