import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Bell, 
  BellOff, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  TestTube
} from 'lucide-react';

interface WalletAnalysis {
  address: string;
  totalValue: number;
  positions: Position[];
  pnl1d: number;
  pnl7d: number;
  pnl30d: number;
}

interface Position {
  token: string;
  amount: number;
  value: number;
  price: number;
  pnl: number;
  pnlPercentage: number;
}

interface NotificationSettings {
  hasSubscription: boolean;
  walletNotifications: WalletNotification[];
}

interface WalletNotification {
  id: number;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
}

export default function UserWalletExplorer() {
  const [searchAddress, setSearchAddress] = useState('');
  const [walletAnalysis, setWalletAnalysis] = useState<WalletAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState('explorer');

  // Wallet analizi yap
  const analyzeWallet = async () => {
    if (!searchAddress.trim()) {
      alert('Lütfen bir wallet adresi girin');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/wallet/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchAddress })
      });

      if (response.ok) {
        const data = await response.json();
        setWalletAnalysis(data);
      } else {
        alert('Wallet analizi yapılamadı');
      }
    } catch (error) {
      console.error('Wallet analizi hatası:', error);
      alert('Wallet analizi yapılamadı');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Bildirim ayarlarını yükle
  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings');
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings(data);
      }
    } catch (error) {
      console.error('Bildirim ayarları yükleme hatası:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Push notification subscription'ı kaydet
  const subscribeToNotifications = async () => {
    try {
      // VAPID public key'i al
      const vapidResponse = await fetch('/api/notifications/vapid-public-key');
      const vapidData = await vapidResponse.json();

      // Service worker'ı kaydet
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Push notification izni iste
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Bildirim izni verilmedi');
          return;
        }

        // Subscription oluştur
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidData.publicKey
        });

        // Subscription'ı backend'e kaydet
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });

        if (response.ok) {
          alert('Bildirim aboneliği başarıyla kaydedildi');
          loadNotificationSettings();
        } else {
          alert('Bildirim aboneliği kaydedilemedi');
        }
      } else {
        alert('Bu tarayıcı push notification desteklemiyor');
      }
    } catch (error) {
      console.error('Bildirim aboneliği hatası:', error);
      alert('Bildirim aboneliği yapılamadı');
    }
  };

  // Wallet bildirimi ekle
  const addWalletNotification = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/notifications/wallet/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });

      if (response.ok) {
        alert('Wallet bildirimi eklendi');
        loadNotificationSettings();
      } else {
        alert('Wallet bildirimi eklenemedi');
      }
    } catch (error) {
      console.error('Wallet bildirimi ekleme hatası:', error);
      alert('Wallet bildirimi eklenemedi');
    }
  };

  // Wallet bildirimi kaldır
  const removeWalletNotification = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/notifications/wallet/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });

      if (response.ok) {
        alert('Wallet bildirimi kaldırıldı');
        loadNotificationSettings();
      } else {
        alert('Wallet bildirimi kaldırılamadı');
      }
    } catch (error) {
      console.error('Wallet bildirimi kaldırma hatası:', error);
      alert('Wallet bildirimi kaldırılamadı');
    }
  };

  // Test bildirimi gönder
  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST'
      });

      if (response.ok) {
        alert('Test bildirimi gönderildi');
      } else {
        alert('Test bildirimi gönderilemedi');
      }
    } catch (error) {
      console.error('Test bildirimi hatası:', error);
      alert('Test bildirimi gönderilemedi');
    }
  };

  // Sayfa yüklendiğinde bildirim ayarlarını yükle
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wallet Explorer</h1>
        <Badge variant="outline">
          {notificationSettings?.hasSubscription ? "Bildirimler Aktif" : "Bildirimler Pasif"}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="explorer">Wallet Analizi</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
        </TabsList>

        {/* Wallet Explorer Tab */}
        <TabsContent value="explorer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Wallet Analizi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Wallet adresi girin (0x...)"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={analyzeWallet} disabled={isAnalyzing}>
                  {isAnalyzing ? 'Analiz Ediliyor...' : 'Analiz Et'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {walletAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Analiz Sonuçları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Wallet Özeti */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">${walletAnalysis.totalValue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Toplam Değer</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${walletAnalysis.pnl1d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {walletAnalysis.pnl1d >= 0 ? '+' : ''}{walletAnalysis.pnl1d.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">24 Saat PnL</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${walletAnalysis.pnl7d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {walletAnalysis.pnl7d >= 0 ? '+' : ''}{walletAnalysis.pnl7d.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">7 Gün PnL</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${walletAnalysis.pnl30d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {walletAnalysis.pnl30d >= 0 ? '+' : ''}{walletAnalysis.pnl30d.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">30 Gün PnL</div>
                  </div>
                </div>

                {/* Pozisyonlar */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Pozisyonlar</h3>
                  <div className="space-y-2">
                    {walletAnalysis.positions.map((position, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{position.token}</div>
                            <div className="text-sm text-muted-foreground">
                              {position.amount.toFixed(4)} {position.token}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${position.value.toLocaleString()}</div>
                          <div className={`text-sm ${position.pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.pnlPercentage >= 0 ? '+' : ''}{position.pnlPercentage.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bildirim Ekle Butonu */}
                <div className="flex justify-center">
                  <Button 
                    onClick={() => addWalletNotification(walletAnalysis.address)}
                    className="flex items-center gap-2"
                  >
                    <Bell className="h-4 w-4" />
                    Bu Wallet'ı Takip Et
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bildirimler Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Bildirim Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!notificationSettings?.hasSubscription ? (
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    Push notification'ları almak için önce bildirim aboneliği yapmanız gerekiyor.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    Bildirim aboneliğiniz aktif. Wallet hareketlerini takip edebilirsiniz.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {!notificationSettings?.hasSubscription ? (
                  <Button onClick={subscribeToNotifications} className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Bildirim Aboneliği Yap
                  </Button>
                ) : (
                  <Button onClick={sendTestNotification} variant="outline" className="flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    Test Bildirimi Gönder
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Takip Edilen Wallet'lar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingNotifications ? (
                <div className="text-center py-4">Yükleniyor...</div>
              ) : notificationSettings?.walletNotifications.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Henüz takip ettiğiniz wallet yok
                </div>
              ) : (
                <div className="space-y-4">
                  {notificationSettings?.walletNotifications.map((wallet) => (
                    <div key={wallet.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{wallet.walletAddress}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(wallet.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={wallet.isActive ? "default" : "secondary"}>
                          {wallet.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeWalletNotification(wallet.walletAddress)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
