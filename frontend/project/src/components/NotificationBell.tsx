import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from './ui/button';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'react-hot-toast';

interface NotificationBellProps {
  walletAddress: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ walletAddress }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    checkSubscription();
  }, [walletAddress]);

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ walletAddress })
      });
      
      const data = await response.json();
      setIsSubscribed(data.isSubscribed);
    } catch (error) {
      console.error('Failed to check subscription:', error);
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
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    toast.error('Notification permission denied');
    return false;
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const response = await fetch('/api/notifications/vapid-key');
      const { publicKey } = await response.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      throw error;
    }
  };

  const toggleNotification = async () => {
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

        // Subscribe to push
        const subscription = await subscribeToPush();

        // Save subscription to server
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            walletAddress,
            subscription
          })
        });

        if (response.ok) {
          setIsSubscribed(true);
          toast.success(`Notifications enabled for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
          
          // Show test notification
          new Notification('Zenith Trader', {
            body: `You will receive notifications for wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-96x96.svg'
          });
        } else {
          throw new Error('Failed to save subscription');
        }
      } else {
        // Unsubscribe
        const response = await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ walletAddress })
        });

        if (response.ok) {
          setIsSubscribed(false);
          toast.success('Notifications disabled');
        }
      }
    } catch (error) {
      console.error('Notification error:', error);
      toast.error('Failed to update notification settings');
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

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="icon"
      onClick={toggleNotification}
      disabled={isLoading}
      className="relative"
      title={isSubscribed ? "Disable notifications" : "Enable notifications"}
    >
      {isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {isSubscribed && (
        <span className="absolute top-0 right-0 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      )}
    </Button>
  );
};
