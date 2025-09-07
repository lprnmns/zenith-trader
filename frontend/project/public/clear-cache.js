// Cache clearing script for development
console.log('Clearing browser cache...');

// Clear localStorage
localStorage.clear();
console.log('LocalStorage cleared');

// Clear sessionStorage
sessionStorage.clear();
console.log('SessionStorage cleared');

// Clear service worker cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('Service Worker unregistered');
    });
  });
}

// Clear caches
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log('Cache deleted:', cacheName);
    });
  });
}

console.log('Cache clearing complete! Please refresh the page.');