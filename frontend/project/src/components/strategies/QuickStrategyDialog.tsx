import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Zap, Shield, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface QuickStrategyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (strategy: any) => void;
}

export default function QuickStrategyDialog({ isOpen, onClose, onSuccess }: QuickStrategyDialogProps) {
  const { user, token } = useAuthStore();
  const [walletAddress, setWalletAddress] = useState('');
  const [strategyName, setStrategyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/strategies/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          walletAddress: walletAddress.trim(),
          name: strategyName.trim() || `Quick Strategy - ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Strateji oluşturulamadı');
      }

      setSuccess(true);
      onSuccess(data);

      // Form'u temizle
      setWalletAddress('');
      setStrategyName('');

      // 2 saniye sonra dialog'u kapat
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Sadece hex karakterlerini al
    const hexValue = value.replace(/[^0-9a-fA-Fx]/g, '');
    setWalletAddress(hexValue);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Strateji Oluşturuldu!</h3>
        <p className="text-slate-400 text-center">
          Quick strateji başarıyla oluşturuldu.<br />
          Cüzdan 30 saniyede bir kontrol edilecek.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Wallet Address */}
      <div className="space-y-2">
        <Label htmlFor="walletAddress" className="text-white font-medium">
          Cüzdan Adresi *
        </Label>
        <Input
          id="walletAddress"
          type="text"
          placeholder="0x..."
          value={walletAddress}
          onChange={handleWalletAddressChange}
          className="bg-slate-800 border-slate-600 text-white placeholder-slate-400"
          required
        />
        <p className="text-xs text-slate-400">
          Kopyalanacak cüzdanın Ethereum adresini girin
        </p>
      </div>

      {/* Strategy Name */}
      <div className="space-y-2">
        <Label htmlFor="strategyName" className="text-white font-medium">
          Strateji Adı (Opsiyonel)
        </Label>
        <Input
          id="strategyName"
          type="text"
          placeholder="Quick Strategy"
          value={strategyName}
          onChange={(e) => setStrategyName(e.target.value)}
          className="bg-slate-800 border-slate-600 text-white placeholder-slate-400"
        />
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Strategy Features */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            Quick Strateji Özellikleri
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                OKX
              </Badge>
              <span className="text-sm text-slate-300">Borsa</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                3x LONG
              </Badge>
              <span className="text-sm text-slate-300">Alışlarda kaldıraç</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30">
                1x SHORT
              </Badge>
              <span className="text-sm text-slate-300">Satışlarda kısmi kapatma</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                100%
              </Badge>
              <span className="text-sm text-slate-300">Kopyalama oranı</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Alert className="border-blue-500 bg-blue-500/10">
        <Shield className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200">
          <strong>Güvenli:</strong> OKX bilgileriniz şifrelenerek saklanır, tekrar girmenize gerek yoktur.
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
        disabled={isLoading || !walletAddress || walletAddress.length !== 42}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Oluşturuluyor...
          </>
        ) : (
          <>
            <TrendingUp className="w-4 h-4 mr-2" />
            Quick Strateji Oluştur
          </>
        )}
      </Button>
    </form>
  );
}