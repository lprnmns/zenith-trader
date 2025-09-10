// Frontend notification service for PWA push notifications
const API_BASE = 'http://20.79.186.203:3001/api';

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string | null = null;

  async init(): Promise<boolean> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('[Notifications] Service Workers not supported');
        return false;
      }

      // Check if push notifications are supported
      if (!('PushManager' in window)) {
        console.warn('[Notifications] Push messaging not supported');
        return false;
      }

      // Service Worker registration temporarily disabled
      console.log('[Notifications] Service Worker registration temporarily disabled');
      this.swRegistration = null;

      // Get VAPID public key from backend
      await this.getVapidPublicKey();

      return true;
    } catch (error) {
      console.error('[Notifications] Initialization failed:', error);
      return false;
    }
  }

  private async getVapidPublicKey(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/notifications/vapid-public-key`);
      const data = await response.json();
      
      if (data.success) {
        this.vapidPublicKey = data.publicKey;
        console.log('[Notifications] VAPID public key received');
      } else {
        throw new Error('Failed to get VAPID public key');
      }
    } catch (error) {
      console.error('[Notifications] Failed to get VAPID key:', error);
      throw error;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('[Notifications] Permission result:', permission);
    return permission;
  }

  async subscribe(userId: string): Promise<boolean> {
    try {
      if (!this.swRegistration || !this.vapidPublicKey) {
        throw new Error('Service worker or VAPID key not ready');
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      // Subscribe to push notifications
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('[Notifications] Push subscription created');

      // Send subscription to backend
      const response = await fetch(`${API_BASE}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          subscription: subscription.toJSON()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('[Notifications] Successfully subscribed to push notifications');
        localStorage.setItem('notifications_subscribed', 'true');
        localStorage.setItem('notifications_userId', userId);
        return true;
      } else {
        throw new Error(result.error || 'Subscription failed');
      }
    } catch (error) {
      console.error('[Notifications] Subscription failed:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        throw new Error('Service worker not ready');
      }

      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('[Notifications] Push subscription cancelled');
      }

      const userId = localStorage.getItem('notifications_userId');
      if (userId) {
        // Notify backend
        await fetch(`${API_BASE}/notifications/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        });
      }

      localStorage.removeItem('notifications_subscribed');
      localStorage.removeItem('notifications_userId');
      
      return true;
    } catch (error) {
      console.error('[Notifications] Unsubscribe failed:', error);
      return false;
    }
  }

  async sendTestNotification(userId: string, message?: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          message: message || 'Bu bir test bildirimidir!'
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('[Notifications] Test notification failed:', error);
      return false;
    }
  }

  isSubscribed(): boolean {
    return localStorage.getItem('notifications_subscribed') === 'true';
  }

  getSubscribedUserId(): string | null {
    return localStorage.getItem('notifications_userId');
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        return false;
      }

      const subscription = await this.swRegistration.pushManager.getSubscription();
      return subscription !== null && this.isSubscribed();
    } catch (error) {
      console.error('[Notifications] Failed to check subscription status:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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
}

export const notificationService = new NotificationService();
