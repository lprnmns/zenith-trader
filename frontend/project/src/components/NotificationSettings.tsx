import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, Smartphone, TestTube } from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  userId?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ 
  userId = 'user1' // Default test user
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
        const success = await notificationService.subscribe(userId);
        if (success) {
          setIsEnabled(true);
          setPermission('granted');
          toast.success('Bildirimler başarıyla etkinleştirildi!', {
            description: 'Artık trade bildirimlerini alacaksınız.'
          });
        } else {
          throw new Error('Subscription failed');
        }
      } else {
        // Unsubscribe from notifications
        const success = await notificationService.unsubscribe();
        if (success) {
          setIsEnabled(false);
          toast.info('Bildirimler devre dışı bırakıldı', {
            description: 'Artık trade bildirimleri almayacaksınız.'
          });
        } else {
          throw new Error('Unsubscription failed');
        }
      }
    } catch (error) {
      console.error('Notification toggle failed:', error);
      toast.error('Bildirim ayarları güncellenemedi', {
        description: 'Lütfen tekrar deneyin veya tarayıcı ayarlarınızı kontrol edin.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    
    try {
      const success = await notificationService.sendTestNotification(
        userId,
        '🚀 Test bildirimi! Zenith Trader bildirimleriniz çalışıyor.'
      );
      
      if (success) {
        toast.success('Test bildirimi gönderildi!', {
          description: 'Birkaç saniye içinde bildirim gelecek.'
        });
      } else {
        throw new Error('Test notification failed');
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      toast.error('Test bildirimi gönderilemedi', {
        description: 'Bildirimlerinizin etkin olduğundan emin olun.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (!isSupported) {
      return {
        icon: <BellOff className="h-5 w-5 text-gray-400" />,
        title: 'Bildirimler Desteklenmiyor',
        description: 'Tarayıcınız push bildirimleri desteklemiyor.',
        color: 'text-gray-600'
      };
    }

    if (permission === 'denied') {
      return {
        icon: <BellOff className="h-5 w-5 text-red-500" />,
        title: 'Bildirimler Engellendi',
        description: 'Tarayıcı ayarlarından bildirimlere izin vermeniz gerekiyor.',
        color: 'text-red-600'
      };
    }

    if (isEnabled) {
      return {
        icon: <Bell className="h-5 w-5 text-green-500" />,
        title: 'Bildirimler Etkin',
        description: 'Trade bildirimlerini alacaksınız.',
        color: 'text-green-600'
      };
    }

    return {
      icon: <BellOff className="h-5 w-5 text-yellow-500" />,
      title: 'Bildirimler Devre Dışı',
      description: 'Trade bildirimlerini almayacaksınız.',
      color: 'text-yellow-600'
    };
  };

  const status = getStatusMessage();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <CardTitle>Push Bildirimler</CardTitle>
        </div>
        <CardDescription>
          Trade işlemleriniz için anında bildirim alın
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
              <strong>Bildirim izni gerekli:</strong>
              <br />
              1. Tarayıcınızın adres çubuğundaki kilit simgesine tıklayın
              <br />
              2. "Bildirimler" ayarını "İzin ver" olarak değiştirin
              <br />
              3. Sayfayı yenileyin
            </div>
          </div>
        )}

        {isEnabled && (
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={isLoading}
              className="w-full"
            >
              <TestTube className="mr-2 h-4 w-4" />
              Test Bildirimi Gönder
            </Button>
            
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm text-blue-800">
                <strong>Bildirim türleri:</strong>
                <br />
                🟢 Pozisyon açılması
                <br />
                🟡 Kısmi pozisyon kapanması
                <br />
                🔴 Pozisyon tamamen kapanması
              </div>
            </div>
          </div>
        )}

        {!isSupported && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm text-gray-600">
              Push bildirimler için modern bir tarayıcı gereklidir.
              Chrome, Firefox, Safari veya Edge kullanmayı deneyin.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
