// PWA Service Worker Registration and Management
class PWAManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    this.registration = null;
    this.updateAvailable = false;
    this.offlineReady = false;
    
    if (this.isSupported) {
      this.init();
    }
  }
  
  async init() {
    try {
      // Temporarily disable service worker registration due to errors
      console.log('[PWA] Service Worker registration temporarily disabled');
      
      // Set up online/offline event listeners
      this.setupConnectivityListeners();
      
      // Set up IndexedDB for offline storage
      await this.setupIndexedDB();
      
      // Request notification permission
      await this.requestNotificationPermission();
      
    } catch (error) {
      console.error('[PWA] PWA initialization failed:', error);
    }
  }
  
  async checkForUpdates() {
    if (!this.registration) return;
    
    try {
      await this.registration.update();
      console.log('[PWA] Update check completed');
    } catch (error) {
      console.error('[PWA] Update check failed:', error);
    }
  }
  
  startPeriodicUpdates() {
    // Check for updates every 30 minutes
    setInterval(() => {
      this.checkForUpdates();
    }, 30 * 60 * 1000);
  }
  
  setupMessageListener() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[PWA] Message from service worker:', event.data);
      
      switch (event.data.type) {
        case 'UPDATE_AVAILABLE':
          this.handleUpdateAvailable();
          break;
        case 'OFFLINE_READY':
          this.handleOfflineReady();
          break;
        case 'SYNC_COMPLETE':
          this.handleSyncComplete(event.data);
          break;
        default:
          console.log('[PWA] Unknown message type:', event.data.type);
      }
    });
  }
  
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('[PWA] App is online');
      this.handleOnline();
    });
    
    window.addEventListener('offline', () => {
      console.log('[PWA] App is offline');
      this.handleOffline();
    });
  }
  
  async setupIndexedDB() {
    try {
      const request = indexedDB.open('ZenithTraderDB', 1);
      
      request.onerror = () => {
        console.error('[PWA] IndexedDB error:', request.error);
      };
      
      request.onsuccess = () => {
        console.log('[PWA] IndexedDB initialized successfully');
        this.db = request.result;
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('pendingSync')) {
          const pendingSyncStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
          pendingSyncStore.createIndex('timestamp', 'timestamp', { unique: false });
          pendingSyncStore.createIndex('type', 'type', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('auth')) {
          const authStore = db.createObjectStore('auth', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('trades')) {
          const tradesStore = db.createObjectStore('trades', { keyPath: 'id', autoIncrement: true });
          tradesStore.createIndex('strategyId', 'strategyId', { unique: false });
          tradesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('wallets')) {
          const walletsStore = db.createObjectStore('wallets', { keyPath: 'id', autoIncrement: true });
          walletsStore.createIndex('address', 'address', { unique: false });
          walletsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        console.log('[PWA] IndexedDB schema upgraded');
      };
      
    } catch (error) {
      console.error('[PWA] IndexedDB setup failed:', error);
    }
  }
  
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      console.log('[PWA] Notification permission:', permission);
      
      if (permission === 'granted') {
        this.subscribeToPushNotifications();
      }
    } catch (error) {
      console.error('[PWA] Notification permission request failed:', error);
    }
  }
  
  async subscribeToPushNotifications() {
    try {
      // Get VAPID public key from backend
      const response = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await response.json();
      
      if (!publicKey) {
        throw new Error('Failed to get VAPID public key');
      }
      
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });
      
      console.log('[PWA] Push notification subscription:', subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
    } catch (error) {
      console.error('[PWA] Push notification subscription failed:', error);
    }
  }
  
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(subscription)
      });
      
      if (response.ok) {
        console.log('[PWA] Subscription sent to server successfully');
      } else {
        console.error('[PWA] Failed to send subscription to server:', response.status);
      }
    } catch (error) {
      console.error('[PWA] Error sending subscription to server:', error);
    }
  }
  
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
  
  handleUpdateAvailable() {
    this.updateAvailable = true;
    console.log('[PWA] Update available');
    
    // Show update notification to user
    this.showUpdateNotification();
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }
  
  handleOfflineReady() {
    this.offlineReady = true;
    console.log('[PWA] Offline ready');
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
  }
  
  handleOnline() {
    console.log('[PWA] Handling online state');
    
    // Trigger background sync
    this.triggerBackgroundSync();
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-online'));
  }
  
  handleOffline() {
    console.log('[PWA] Handling offline state');
    
    // Show offline notification
    this.showOfflineNotification();
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-offline'));
  }
  
  handleSyncComplete(data) {
    console.log('[PWA] Sync complete:', data);
    
    // Show success notification
    this.showSyncNotification(data);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-sync-complete', { detail: data }));
  }
  
  showUpdateNotification() {
    if (this.updateAvailable && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Update Available', {
        body: 'A new version of Zenith Trader is available. Click to update.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'update-available',
        requireInteraction: true,
        actions: [
          { action: 'update', title: 'Update Now' },
          { action: 'dismiss', title: 'Later' }
        ]
      });
    }
  }
  
  showOfflineNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Offline Mode', {
        body: 'You are now offline. Some features may be limited.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'offline-mode'
      });
    }
  }
  
  showSyncNotification(data) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Sync Complete', {
        body: `${data.count || 'All'} items synced successfully.`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'sync-complete'
      });
    }
  }
  
  async triggerBackgroundSync() {
    if (!this.registration) return;
    
    try {
      const tag = 'background-sync';
      await this.registration.sync.register(tag);
      console.log('[PWA] Background sync registered:', tag);
    } catch (error) {
      console.error('[PWA] Background sync registration failed:', error);
    }
  }
  
  async triggerTradeSync() {
    if (!this.registration) return;
    
    try {
      const tag = 'sync-trades';
      await this.registration.sync.register(tag);
      console.log('[PWA] Trade sync registered:', tag);
    } catch (error) {
      console.error('[PWA] Trade sync registration failed:', error);
    }
  }
  
  async triggerWalletSync() {
    if (!this.registration) return;
    
    try {
      const tag = 'sync-wallets';
      await this.registration.sync.register(tag);
      console.log('[PWA] Wallet sync registered:', tag);
    } catch (error) {
      console.error('[PWA] Wallet sync registration failed:', error);
    }
  }
  
  async forceUpdate() {
    if (!this.registration) return;
    
    try {
      // Send message to service worker to skip waiting
      if (this.registration.active) {
        this.registration.active.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[PWA] Force update failed:', error);
    }
  }
  
  async clearCache() {
    if (!this.registration) return;
    
    try {
      // Send message to service worker to clear cache
      if (this.registration.active) {
        this.registration.active.postMessage({ type: 'CACHE_CLEAR' });
      }
      
      console.log('[PWA] Cache clear requested');
      
    } catch (error) {
      console.error('[PWA] Cache clear failed:', error);
    }
  }
  
  async saveOfflineData(type, data) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['pendingSync'], 'readwrite');
      const store = transaction.objectStore('pendingSync');
      
      const item = {
        type,
        data,
        timestamp: Date.now()
      };
      
      await store.add(item);
      console.log('[PWA] Offline data saved:', item);
      
    } catch (error) {
      console.error('[PWA] Failed to save offline data:', error);
    }
  }
  
  getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }
  
  isOnline() {
    return navigator.onLine;
  }
  
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
  }
}

// Initialize PWA manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pwaManager = new PWAManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
} else if (typeof window !== 'undefined') {
  window.PWAManager = PWAManager;
}