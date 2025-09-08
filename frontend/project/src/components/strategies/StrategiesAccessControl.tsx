import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UpgradeRequestDialog } from './UpgradeRequestDialog';
import { Lock, Crown, Sparkles, Target, TrendingUp, CheckCircle2, Shield } from 'lucide-react';

interface StrategiesAccessControlProps {
  children: React.ReactNode;
}

export function StrategiesAccessControl({ children }: StrategiesAccessControlProps) {
  const { user } = useAuthStore();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  // If user is ADMIN, show the normal strategies page
  if (user?.role === 'ADMIN') {
    return <>{children}</>;
  }

  // USER rolü için KİLİTLİ GÖRÜNÜM
  return (
    // 1. Ana Kapsayıcı: İçeriği dikeyde ortalar ve tüm alanı kaplar
    <div className="flex h-full w-full items-center justify-center p-4">
      
      {/* Arka plan olarak bulanık admin içeriği (Bu akıllı bir dokunuş) */}
      <div className="absolute inset-0 z-0 opacity-10 blur-md">
        {children}
      </div>

      {/* İçerik Kutusu: max-w-3xl -> max-w-2xl olarak küçültüldü */}
      <div className="relative z-10 w-full max-w-2xl space-y-4 rounded-2xl border-2 border-amber-400/50 bg-slate-800/80 p-6 shadow-2xl backdrop-blur-lg md:p-6">
        
        {/* Kilit İkonu ve Başlıklar */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Unlock Automated Copy Trading</h1>
          <p className="max-w-xl text-slate-400">
            Your current role does not have permission to create and manage automated trading strategies.
          </p>
        </div>

        {/* Özellik Kartları */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Premium Features Kartı */}
          <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-3 text-center">
            <Crown className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <h3 className="font-semibold text-white mb-1">Premium Features</h3>
            <p className="text-xs text-slate-400">
              Create unlimited automated trading strategies
            </p>
          </div>
          
          {/* Smart Trading Kartı */}
          <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-3 text-center">
            <Target className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <h3 className="font-semibold text-white mb-1">Smart Trading</h3>
            <p className="text-xs text-slate-400">
              Advanced copy trading with AI-powered signals
            </p>
          </div>
          
          {/* Real Analytics Kartı */}
          <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-3 text-center">
            <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-white mb-1">Real Analytics</h3>
            <p className="text-xs text-slate-400">
              Detailed performance tracking and insights
            </p>
          </div>
        </div>
        
        {/* "Everything You Get" Bölümü */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-3 rounded-lg border border-emerald-500/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400">Everything You Get</h3>
            <Sparkles className="w-3 h-3 text-emerald-400" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-left max-w-xl mx-auto">
            <div className="flex items-center gap-1">
              <Shield className="w-2 h-2 text-emerald-400" />
              <span className="text-xs text-slate-300">Unlimited strategy creation</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-2 h-2 text-emerald-400" />
              <span className="text-xs text-slate-300">Real-time trade execution</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-2 h-2 text-emerald-400" />
              <span className="text-xs text-slate-300">Advanced risk management</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-2 h-2 text-emerald-400" />
              <span className="text-xs text-slate-300">Priority support</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-2 h-2 text-emerald-400" />
              <span className="text-xs text-slate-300">AI-powered trading signals</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-2 h-2 text-emerald-400" />
              <span className="text-xs text-slate-300">Advanced analytics dashboard</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <p className="text-center text-sm text-slate-500">
          Request approval typically takes 1-3 business days. 
          You'll receive email confirmation once your account is upgraded.
        </p>

        {/* Buton (Kutunun içinde) */}
        <div className="pt-2">
          <Button
            className="h-11 w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-emerald-500/25"
            onClick={() => setIsUpgradeDialogOpen(true)}
          >
            Request Upgrade Access
          </Button>
        </div>
      </div>
      
      <UpgradeRequestDialog isOpen={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen} />
    </div>
  );
}