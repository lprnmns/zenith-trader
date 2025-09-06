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
  TestTube,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface WalletAnalysis {
  address: string;
  totalValue: number;
  positions: Position[];
  pnl1d: number;
  pnl7d: number;
  pnl30d: number;
  historicalData: HistoricalData[];
  tokenDistribution: TokenDistribution[];
  lastUpdated: string;
}

interface Position {
  token: string;
  amount: number;
  value: number;
  price: number;
  pnl: number;
  pnlPercentage: number;
}

interface HistoricalData {
  date: string;
  value: number;
  pnl: number;
}

interface TokenDistribution {
  token: string;
  value: number;
  percentage: number;
  color: string;
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
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Wallet analizi yap
  const analyzeWallet = async () => {
    if (!searchAddress.trim()) {
      alert('Lütfen bir wallet adresi girin');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Clear previous analysis to show loading state
      setWalletAnalysis(null);
      setLastRefreshed(null);
      
      const response = await fetch(`/api/wallet/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchAddress })
      });

      if (response.ok) {
        const data = await response.json();
        // Mock historical data and token distribution for demo
        const enhancedData = {
          ...data,
          historicalData: generateHistoricalData(data.totalValue),
          tokenDistribution: generateTokenDistribution(data.positions),
          lastUpdated: new Date().toISOString()
        };
        setWalletAnalysis(enhancedData);
        setLastRefreshed(new Date());
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

  // Generate mock historical data for demo
  const generateHistoricalData = (currentValue: number): HistoricalData[] => {
    const data: HistoricalData[] = [];
    const days = 30;
    let baseValue = currentValue * 0.8; // Starting value
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some realistic variation
      const variation = (Math.random() - 0.5) * 0.1;
      const value = baseValue * (1 + variation);
      const pnl = ((value - baseValue) / baseValue) * 100;
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value),
        pnl: Math.round(pnl * 100) / 100
      });
      
      baseValue = value;
    }
    
    return data;
  };

  // Generate token distribution data
  const generateTokenDistribution = (positions: Position[]): TokenDistribution[] => {
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    
    return positions.map((position, index) => ({
      token: position.token,
      value: position.value,
      percentage: Math.round((position.value / positions.reduce((sum, p) => sum + p.value, 0)) * 100),
      color: colors[index % colors.length]
    }));
  };

  // Refresh wallet analysis
  const refreshAnalysis = async () => {
    if (walletAnalysis) {
      await analyzeWallet();
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

          {(walletAnalysis || isAnalyzing) && (
            <div className="space-y-6">
              {/* Wallet Özeti ve Refresh Butonu */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Analiz Sonuçları
                      {lastRefreshed && (
                        <span className="text-sm text-muted-foreground ml-2">
                          Son güncelleme: {lastRefreshed.toLocaleTimeString()}
                        </span>
                      )}
                    </CardTitle>
                    <Button
                      onClick={refreshAnalysis}
                      disabled={isAnalyzing}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      Yenile
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Wallet Özeti */}
                  {isAnalyzing ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="text-center">
                          <div className="h-8 bg-gray-700 rounded animate-pulse mb-2"></div>
                          <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
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
                  )}

                  {/* Grafik Türü Seçimi */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-medium">Grafik Türü:</span>
                    <Button
                      variant={chartType === 'line' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartType('line')}
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      Çizgi
                    </Button>
                    <Button
                      variant={chartType === 'bar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartType('bar')}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Çubuk
                    </Button>
                    <Button
                      variant={chartType === 'pie' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartType('pie')}
                    >
                      <PieChart className="h-4 w-4 mr-1" />
                      Pasta
                    </Button>
                  </div>

                  {/* Grafikler */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Değer Grafiği */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Değer Geçmişi</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          {isAnalyzing ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                                <p className="text-sm text-muted-foreground">Grafik yükleniyor...</p>
                              </div>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              {chartType === 'line' ? (
                                <LineChart data={walletAnalysis.historicalData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#8884d8" 
                                    strokeWidth={2}
                                    name="Değer ($)"
                                  />
                                </LineChart>
                              ) : chartType === 'bar' ? (
                                <BarChart data={walletAnalysis.historicalData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="value" fill="#8884d8" name="Değer ($)" />
                                </BarChart>
                              ) : (
                                <RechartsPieChart>
                                  <Pie
                                    data={walletAnalysis.tokenDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ token, percentage }) => `${token} ${percentage}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {walletAnalysis.tokenDistribution.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </RechartsPieChart>
                              )}
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* PnL Grafiği */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">PnL Geçmişi</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          {isAnalyzing ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                                <p className="text-sm text-muted-foreground">Grafik yükleniyor...</p>
                              </div>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={walletAnalysis.historicalData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="pnl" 
                                  stroke="#82ca9d" 
                                  strokeWidth={2}
                                  name="PnL (%)"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pozisyonlar */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pozisyonlar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isAnalyzing ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="h-4 bg-gray-700 rounded animate-pulse mb-1"></div>
                                  <div className="h-3 bg-gray-600 rounded animate-pulse w-24"></div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="h-4 bg-gray-700 rounded animate-pulse mb-1"></div>
                                <div className="h-3 bg-gray-600 rounded animate-pulse w-16"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
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
                      )}
                    </CardContent>
                  </Card>

                  {/* Bildirim Ekle Butonu */}
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => addWalletNotification(walletAnalysis.address)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2"
                    >
                      <Bell className="h-4 w-4" />
                      Bu Wallet'ı Takip Et
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
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
