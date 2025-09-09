import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

interface NotificationBellProps {
  walletAddress: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ walletAddress }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, token } = useAuthStore();

  useEffect(() => {
    checkSubscription();
  }, [walletAddress]);

  const checkSubscription = async () => {
    if (!user || !token) return;
    
    try {
      console.log('[NotificationBell] Checking subscription for:', walletAddress);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await response.json();
      console.log('[NotificationBell] Subscription status:', data);
      setIsSubscribed(data.isSubscribed);
    } catch (error) {
      console.error('[NotificationBell] Failed to check subscription:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      console.log('[NotificationBell] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[NotificationBell] Permission result:', permission);
      return permission === 'granted';
    }

    toast.error('Notification permission denied. Please enable notifications in your browser settings.');
    return false;
  };

  const subscribeToPush = async () => {
    try {
      console.log('[NotificationBell] Getting service worker registration...');
      
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers are not supported in this browser');
      }
      
      const registration = await navigator.serviceWorker.ready;
      console.log('[NotificationBell] Service worker registration ready');
      
      // Check if push manager is available
      if (!registration.pushManager) {
        throw new Error('Push manager is not available');
      }
      
      // Get VAPID public key from server
      console.log('[NotificationBell] Fetching VAPID key...');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/vapid-public-key`);
      const { publicKey } = await response.json();
      
      if (!publicKey) {
        throw new Error('Failed to get VAPID public key from server');
      }
      
      console.log('[NotificationBell] VAPID public key received, length:', publicKey.length);
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[NotificationBell] Already subscribed, using existing subscription');
        return existingSubscription;
      }
      
      console.log('[NotificationBell] Creating new push subscription...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      console.log('[NotificationBell] Push subscription created successfully');
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Service workers are not supported')) {
        throw new Error('This browser does not support push notifications. Please try Chrome, Firefox, or Edge.');
      } else if (error.message.includes('Push manager is not available')) {
        throw new Error('Push notifications are not available in this browser.');
      } else if (error.message.includes('registration failed')) {
        throw new Error('Push service registration failed. This might be due to browser restrictions or network issues.');
      } else {
        throw new Error(`Failed to subscribe to push notifications: ${error.message}`);
      }
    }
  };

  const toggleNotification = async () => {
    console.log('[NotificationBell] Toggle clicked, current state:', { isSubscribed, user, walletAddress });
    
    if (!user) {
      toast.error('Please login to enable notifications');
      return;
    }

    setIsLoading(true);

    try {
      if (!isSubscribed) {
        // Request permission
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
          setIsLoading(false);
          return;
        }

        // Try to subscribe to push notifications
        let subscription;
        let pushEnabled = false;
        
        try {
          subscription = await subscribeToPush();
          pushEnabled = true;
          console.log('[NotificationBell] Push notifications enabled');
        } catch (pushError) {
          console.warn('[NotificationBell] Push notifications failed, falling back to browser notifications:', pushError);
          // Continue with browser notifications even if push fails
          subscription = { 
            endpoint: 'browser-notification', 
            keys: { auth: 'browser', p256dh: 'fallback' } 
          };
        }

        // Save subscription to server
        console.log('[NotificationBell] Saving subscription to server...');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            walletAddress,
            subscription,
            isPushEnabled: pushEnabled
          })
        });

        if (response.ok) {
          setIsSubscribed(true);
          
          if (pushEnabled) {
            toast.success(`🔔 Push notifications enabled for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
          } else {
            toast.success(`🔔 Browser notifications enabled for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
          }
          
          // Show test notification
          try {
            new Notification('Zenith Trader', {
              body: `You will receive notifications for wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
              icon: '/pwa-192x192.png',
              badge: '/pwa-96x96.svg',
              tag: `wallet-${walletAddress}`
            });
          } catch (notifError) {
            console.warn('[NotificationBell] Could not show test notification:', notifError);
          }
        } else {
          throw new Error('Failed to save subscription');
        }
      } else {
        // Unsubscribe
        console.log('[NotificationBell] Unsubscribing...');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ walletAddress })
        });

        if (response.ok) {
          setIsSubscribed(false);
          toast.success('🔕 Notifications disabled');
        }
      }
    } catch (error) {
      console.error('Notification error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to update notification settings';
      
      if (error.message.includes('Service workers are not supported')) {
        errorMessage = 'Push notifications are not supported in this browser';
      } else if (error.message.includes('Push manager is not available')) {
        errorMessage = 'Push notifications are not available';
      } else if (error.message.includes('registration failed')) {
        errorMessage = 'Push service registration failed. Please try again later.';
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'Notification permission was denied. Please enable notifications in your browser settings.';
      } else if (error.message.includes('Failed to save subscription')) {
        errorMessage = 'Failed to save subscription to server. Please try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
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
  };

  // Modern button styling with enhanced visual feedback
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleNotification}
        disabled={isLoading || !user}
        className={`
          relative h-9 px-3 rounded-lg border transition-all duration-200 
          ${isSubscribed 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50' 
            : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:bg-slate-700/50 hover:border-slate-500/70 hover:text-slate-300'
          }
          ${isLoading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
          shadow-sm hover:shadow-md
        `}
        title={
          !user 
            ? "Please login to enable notifications" 
            : isLoading 
              ? "Processing..." 
              : isSubscribed 
                ? "Notifications enabled - Click to disable" 
                : "Click to enable wallet notifications"
        }
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isLoading ? 'Processing...' : isSubscribed ? 'Notifications On' : 'Enable Notifications'}
          </span>
        </div>
        
        {/* Active indicator dot */}
        {isSubscribed && !isLoading && (
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
        )}
      </Button>
    </div>
  );
};
