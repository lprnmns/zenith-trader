import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  userId?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ 
  userId 
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const initNotifications = async () => {
      // Check if notifications are supported
      const supported = await notificationService.init();
      setIsSupported(supported);

      if (supported) {
        // Check current permission
        setPermission(Notification.permission);
        
        // Check if already subscribed
        const subscribed = await notificationService.checkSubscriptionStatus();
        setIsEnabled(subscribed);
      }
    };

    initNotifications();
  }, []);

  const handleToggleNotifications = async (enabled: boolean) => {
    setIsLoading(true);
    
    try {
      if (enabled) {
        // Subscribe to notifications
        const success = userId ? await notificationService.subscribe(userId) : false;
        if (success) {
          setIsEnabled(true);
          setPermission('granted');
          toast.success('Notifications enabled successfully!', {
            description: 'You will now receive trade notifications.'
          });
        } else {
          throw new Error('Subscription failed');
        }
      } else {
        // Unsubscribe from notifications
        const success = await notificationService.unsubscribe();
        if (success) {
          setIsEnabled(false);
          toast.info('Notifications disabled', {
            description: 'You will no longer receive trade notifications.'
          });
        } else {
          throw new Error('Unsubscription failed');
        }
      }
    } catch (error) {
      console.error('Notification toggle failed:', error);
      toast.error('Could not update notification settings', {
        description: 'Please try again or check your browser settings.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  const getStatusMessage = () => {
    if (!isSupported) {
      return {
        icon: <BellOff className="h-5 w-5 text-gray-400" />,
        title: 'Notifications Not Supported',
        description: 'Your browser does not support push notifications.',
        color: 'text-gray-600'
      };
    }

    if (permission === 'denied') {
      return {
        icon: <BellOff className="h-5 w-5 text-red-500" />,
        title: 'Notifications Blocked',
        description: 'You need to allow notifications in your browser settings.',
        color: 'text-red-600'
      };
    }

    if (isEnabled) {
      return {
        icon: <Bell className="h-5 w-5 text-green-500" />,
        title: 'Notifications Active',
        description: 'You will receive trade notifications.',
        color: 'text-green-600'
      };
    }

    return {
      icon: <BellOff className="h-5 w-5 text-yellow-500" />,
      title: 'Notifications Disabled',
      description: 'You will not receive trade notifications.',
      color: 'text-yellow-600'
    };
  };

  const status = getStatusMessage();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <CardTitle>Push Notifications</CardTitle>
        </div>
        <CardDescription>
          Get instant notifications for your trade operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {status.icon}
            <div>
              <div className="font-medium">{status.title}</div>
              <div className="text-sm text-gray-500">{status.description}</div>
            </div>
          </div>
          
          {isSupported && permission !== 'denied' && (
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={isLoading}
            />
          )}
        </div>

        {permission === 'denied' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="text-sm text-red-800">
              <strong>Notification permission required:</strong>
              <br />
              1. Click the lock icon in your browser's address bar
              <br />
              2. Change "Notifications" setting to "Allow"
              <br />
              3. Refresh the page
            </div>
          </div>
        )}

        {isEnabled && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="text-sm text-blue-800">
              <strong>Notification types:</strong>
              <br />
              🟢 Position opened
              <br />
              🟡 Partial position closed
              <br />
              🔴 Position fully closed
            </div>
          </div>
        )}

        {!isSupported && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm text-gray-600">
              A modern browser is required for push notifications.
              Try using Chrome, Firefox, Safari, or Edge.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
