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
  Play, 
  Square, 
  Settings, 
  History, 
  TrendingUp, 
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react';

interface CopyTradingConfig {
  hasConfig: boolean;
  isActive: boolean;
  engineStatus: {
    isRunning: boolean;
    activeWalletCount: number;
    copyTradingStatus: {
      isInitialized: boolean;
      instrumentCount: number;
      hasOKXClient: boolean;
    };
    lastScanTime: string;
  } | null;
}

interface PositionSignal {
  id: number;
  walletAddress: string;
  signalType: 'BUY' | 'SELL';
  token: string;
  amount: number;
  percentage: number;
  price: number;
  timestamp: string;
  processed: boolean;
  copyTrades: CopyTrade[];
}

interface CopyTrade {
  id: number;
  signalId: number;
  okxOrderId: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  executedAt: string | null;
  createdAt: string;
}

interface WalletNotification {
  id: number;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
  user: {
    email: string;
  };
}

interface CopyTradingStats {
  totalSignals: number;
  successTrades: number;
  failedTrades: number;
  activeWallets: number;
  successRate: string;
}

export default function AdminCopyTrading() {
  const [config, setConfig] = useState<CopyTradingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [okxCredentials, setOkxCredentials] = useState({
    apiKey: '',
    secretKey: '',
    passphrase: ''
  });
  const [signals, setSignals] = useState<PositionSignal[]>([]);
  const [wallets, setWallets] = useState<WalletNotification[]>([]);
  const [stats, setStats] = useState<CopyTradingStats | null>(null);
  const [activeTab, setActiveTab] = useState('config');

  // OKX credentials'ları kaydet
  const saveOKXConfig = async () => {
    try {
      const response = await fetch('/api/admin/copy-trading/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(okxCredentials)
      });

      if (response.ok) {
        alert('OKX ayarları başarıyla kaydedildi');
        loadConfig();
      } else {
        alert('OKX ayarları kaydedilemedi');
      }
    } catch (error) {
      console.error('OKX config kaydetme hatası:', error);
      alert('OKX ayarları kaydedilemedi');
    }
  };

  // Copy trading başlat
  const startCopyTrading = async () => {
    try {
      const response = await fetch('/api/admin/copy-trading/start', {
        method: 'POST'
      });

      if (response.ok) {
        alert('Copy trading başlatıldı');
        loadConfig();
      } else {
        alert('Copy trading başlatılamadı');
      }
    } catch (error) {
      console.error('Copy trading başlatma hatası:', error);
      alert('Copy trading başlatılamadı');
    }
  };

  // Copy trading durdur
  const stopCopyTrading = async () => {
    try {
      const response = await fetch('/api/admin/copy-trading/stop', {
        method: 'POST'
      });

      if (response.ok) {
        alert('Copy trading durduruldu');
        loadConfig();
      } else {
        alert('Copy trading durdurulamadı');
      }
    } catch (error) {
      console.error('Copy trading durdurma hatası:', error);
      alert('Copy trading durdurulamadı');
    }
  };

  // Config durumunu yükle
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/copy-trading/status');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Config yükleme hatası:', error);
    }
  };

  // Sinyal geçmişini yükle
  const loadSignals = async () => {
    try {
      const response = await fetch('/api/admin/copy-trading/history');
      if (response.ok) {
        const data = await response.json();
        setSignals(data.signals);
      }
    } catch (error) {
      console.error('Sinyal geçmişi yükleme hatası:', error);
    }
  };

  // Wallet listesini yükle
  const loadWallets = async () => {
    try {
      const response = await fetch('/api/admin/copy-trading/wallets');
      if (response.ok) {
        const data = await response.json();
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error('Wallet listesi yükleme hatası:', error);
    }
  };

  // İstatistikleri yükle
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/copy-trading/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    }
  };

  // Sayfa yüklendiğinde verileri al
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadConfig(),
        loadSignals(),
        loadWallets(),
        loadStats()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Copy Trading Yönetimi</h1>
        <Badge variant={config?.engineStatus?.isRunning ? "default" : "secondary"}>
          {config?.engineStatus?.isRunning ? "Çalışıyor" : "Durdu"}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Konfigürasyon</TabsTrigger>
          <TabsTrigger value="status">Durum</TabsTrigger>
          <TabsTrigger value="history">Geçmiş</TabsTrigger>
          <TabsTrigger value="wallets">Wallet'lar</TabsTrigger>
        </TabsList>

        {/* Konfigürasyon Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                OKX API Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={okxCredentials.apiKey}
                    onChange={(e) => setOkxCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="OKX API Key"
                  />
                </div>
                <div>
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={okxCredentials.secretKey}
                    onChange={(e) => setOkxCredentials(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="OKX Secret Key"
                  />
                </div>
                <div>
                  <Label htmlFor="passphrase">Passphrase</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={okxCredentials.passphrase}
                    onChange={(e) => setOkxCredentials(prev => ({ ...prev, passphrase: e.target.value }))}
                    placeholder="OKX Passphrase"
                  />
                </div>
              </div>
              <Button onClick={saveOKXConfig} className="w-full">
                OKX Ayarlarını Kaydet
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Copy Trading Kontrolü
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Copy Trading Durumu</span>
                <Switch checked={config?.engineStatus?.isRunning || false} disabled />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={startCopyTrading} 
                  disabled={config?.engineStatus?.isRunning}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Başlat
                </Button>
                <Button 
                  onClick={stopCopyTrading} 
                  disabled={!config?.engineStatus?.isRunning}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Durdur
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Durum Tab */}
        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Toplam Sinyal</span>
                </div>
                <div className="text-2xl font-bold">{stats?.totalSignals || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Başarılı İşlem</span>
                </div>
                <div className="text-2xl font-bold">{stats?.successTrades || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Başarısız İşlem</span>
                </div>
                <div className="text-2xl font-bold">{stats?.failedTrades || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Aktif Wallet</span>
                </div>
                <div className="text-2xl font-bold">{stats?.activeWallets || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engine Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Durum:</span>
                  <Badge variant={config?.engineStatus?.isRunning ? "default" : "secondary"}>
                    {config?.engineStatus?.isRunning ? "Çalışıyor" : "Durdu"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Aktif Wallet Sayısı:</span>
                  <span>{config?.engineStatus?.activeWalletCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Enstrüman Sayısı:</span>
                  <span>{config?.engineStatus?.copyTradingStatus?.instrumentCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Son Tarama:</span>
                  <span>{config?.engineStatus?.lastScanTime ? new Date(config.engineStatus.lastScanTime).toLocaleString() : 'Bilinmiyor'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geçmiş Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Sinyal Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {signals.map((signal) => (
                  <div key={signal.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={signal.signalType === 'BUY' ? 'default' : 'secondary'}>
                          {signal.signalType}
                        </Badge>
                        <span className="font-medium">{signal.token}</span>
                        <span className="text-sm text-muted-foreground">
                          {signal.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(signal.timestamp).toLocaleString()}
                        </span>
                        {signal.copyTrades[0] && (
                          <Badge variant={signal.copyTrades[0].status === 'SUCCESS' ? 'default' : 'destructive'}>
                            {signal.copyTrades[0].status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Wallet: {signal.walletAddress.slice(0, 8)}...{signal.walletAddress.slice(-6)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet'lar Tab */}
        <TabsContent value="wallets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Takip Edilen Wallet'lar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{wallet.walletAddress}</div>
                        <div className="text-sm text-muted-foreground">
                          {wallet.user.email} - {new Date(wallet.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={wallet.isActive ? "default" : "secondary"}>
                        {wallet.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
