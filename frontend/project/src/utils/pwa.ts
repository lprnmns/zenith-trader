// PWA Service Worker registration and install prompt utilities

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isStandalone = false;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.isStandalone = this.checkIfStandalone();
    this.init();
  }

  private checkIfStandalone(): boolean {
    // Check if app is running in standalone mode
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.href.includes('mode=standalone')
    );
  }

  private async init() {
    // Only initialize if not already in standalone mode
    if (!this.isStandalone) {
      this.setupInstallPrompt();
    }

    // Register service worker
    await this.registerServiceWorker();

    // Setup online/offline detection
    this.setupNetworkDetection();

    // Check for updates
    this.checkForUpdates();
  }

  private setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      
      // Dispatch custom event for UI components to listen to
      window.dispatchEvent(new CustomEvent('pwa-install-available', {
        detail: { prompt: this.deferredPrompt }
      }));

      // Show install prompt automatically after 30 seconds (if user hasn't dismissed it)
      const hasPromptedBefore = localStorage.getItem('pwa-install-prompted');
      const lastPromptTime = localStorage.getItem('pwa-install-prompt-time');
      const now = Date.now();
      
      // Show prompt if never shown or if it's been more than 7 days
      if (!hasPromptedBefore || (lastPromptTime && now - parseInt(lastPromptTime) > 7 * 24 * 60 * 60 * 1000)) {
        setTimeout(() => {
          if (this.deferredPrompt) {
            this.showInstallPrompt();
          }
        }, 30000); // 30 seconds
      }
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.deferredPrompt = null;
      
      // Track installation
      localStorage.setItem('pwa-installed', 'true');
      localStorage.setItem('pwa-installed-date', Date.now().toString());
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        this.swRegistration = registration;
        console.log('[PWA] Service Worker registered successfully:', registration);

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Listen for update found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[PWA] New service worker available');
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            });
          }
        });

        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] Service Worker updated, reloading...');
          window.location.reload();
        });

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    } else {
      console.log('[PWA] Service Workers not supported');
    }
  }

  private setupNetworkDetection() {
    // Online event
    window.addEventListener('online', () => {
      console.log('[PWA] Network: Online');
      window.dispatchEvent(new CustomEvent('pwa-online'));
    });

    // Offline event
    window.addEventListener('offline', () => {
      console.log('[PWA] Network: Offline');
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    });

    // Initial check
    if (!navigator.onLine) {
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    }
  }

  private checkForUpdates() {
    // Check for updates on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.swRegistration) {
        this.swRegistration.update();
      }
    });
  }

  // Public methods
  public async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      await this.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const result = await this.deferredPrompt.userChoice;
      console.log(`[PWA] User response to install prompt: ${result.outcome}`);
      
      // Track the response
      localStorage.setItem('pwa-install-prompted', 'true');
      localStorage.setItem('pwa-install-prompt-time', Date.now().toString());
      localStorage.setItem('pwa-install-response', result.outcome);
      
      // Clear the deferred prompt
      this.deferredPrompt = null;
      
      return result.outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error);
      return false;
    }
  }

  public canShowInstallPrompt(): boolean {
    return this.deferredPrompt !== null && !this.isStandalone;
  }

  public isAppInstalled(): boolean {
    return this.isStandalone || localStorage.getItem('pwa-installed') === 'true';
  }

  public async skipWaiting() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  public async checkNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return 'denied';
    }
    return Notification.permission;
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.error('[PWA] Service Worker not registered');
      return null;
    }

    try {
      // Request notification permission first
      const permission = await this.requestNotificationPermission();
      if (permission !== 'granted') {
        console.log('[PWA] Notification permission denied');
        return null;
      }

      // Get VAPID public key from server
      const response = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await response.json();

      // Convert base64 to Uint8Array
      const vapidPublicKey = this.urlBase64ToUint8Array(publicKey);

      // Subscribe to push notifications
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      console.log('[PWA] Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Create and export singleton instance
export const pwaManager = new PWAManager();

// Export utility functions
export const showInstallPrompt = () => pwaManager.showInstallPrompt();
export const canShowInstallPrompt = () => pwaManager.canShowInstallPrompt();
export const isAppInstalled = () => pwaManager.isAppInstalled();
export const skipWaiting = () => pwaManager.skipWaiting();
export const requestNotificationPermission = () => pwaManager.requestNotificationPermission();
export const subscribeToPushNotifications = () => pwaManager.subscribeToPushNotifications();