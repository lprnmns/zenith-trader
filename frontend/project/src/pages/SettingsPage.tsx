import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Smartphone, Bell } from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';

export const SettingsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Ayarlar</h1>
          <p className="text-gray-600">Uygulama tercihlerinizi yönetin</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Notification Settings */}
        <div className="md:col-span-2">
          <NotificationSettings />
        </div>

        {/* PWA Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>Mobil Uygulama</CardTitle>
            </div>
            <CardDescription>
              Progressive Web App özellikleri
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="text-sm text-green-800">
                ✅ <strong>Offline Erişim</strong>
                <br />
                İnternet olmadan da uygulamayı kullanabilirsiniz
              </div>
            </div>
            
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm text-blue-800">
                📱 <strong>Ana Ekran Kısayolu</strong>
                <br />
                Uygulamayı telefonunuzun ana ekranına ekleyebilirsiniz
              </div>
            </div>
            
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="text-sm text-purple-800">
                ⚡ <strong>Hızlı Yükleme</strong>
                <br />
                Gelişmiş önbellekleme ile hızlı performans
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Uygulama Bilgisi</CardTitle>
            <CardDescription>
              Zenith Trader hakkında
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div>
                <strong>Versiyon:</strong> 1.0.0-beta
              </div>
              <div>
                <strong>Son Güncelleme:</strong> {new Date().toLocaleDateString('tr-TR')}
              </div>
              <div>
                <strong>Platform:</strong> Progressive Web App
              </div>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-600">
                🚀 <strong>Beta Sürümü</strong>
                <br />
                Bu uygulamanın test sürümünü kullanıyorsunuz.
                Geri bildirimleriniz değerlidir!
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Bildirim Türleri</CardTitle>
            </div>
            <CardDescription>
              Hangi durumlarda bildirim alacaksınız
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🟢</div>
                  <div className="font-semibold text-green-800">Pozisyon Açılması</div>
                  <div className="text-sm text-green-600 mt-1">
                    Takip ettiğiniz trader yeni bir pozisyon açtığında
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🟡</div>
                  <div className="font-semibold text-yellow-800">Kısmi Kapanma</div>
                  <div className="text-sm text-yellow-600 mt-1">
                    Pozisyonun bir kısmı kar realization için kapatıldığında
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🔴</div>
                  <div className="font-semibold text-red-800">Pozisyon Kapanması</div>
                  <div className="text-sm text-red-600 mt-1">
                    Pozisyon tamamen kapatıldığında (kar/zarar realization)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
