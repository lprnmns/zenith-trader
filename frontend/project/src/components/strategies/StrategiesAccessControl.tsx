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

  // If user is USER, show the locked interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Reduced blur background overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10" />
      
      {/* Background content (slightly visible) */}
      <div className="relative z-0 opacity-30">
        {children}
      </div>

      {/* Framed original design at top */}
      <div className="relative z-20 pt-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Highly visible frame */}
          <div className="bg-slate-800/95 border-4 border-amber-400/50 rounded-2xl shadow-2xl backdrop-blur-lg p-8">
            <div className="space-y-8">
              
              {/* Lock Icon - Original size but framed */}
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>

              {/* Title - Original */}
              <h1 className="text-4xl font-bold text-white text-center mb-4">
                Unlock Automated Copy Trading
              </h1>

              {/* Description - Original */}
              <p className="text-slate-400 text-lg text-center mb-8 leading-relaxed max-w-2xl mx-auto">
                Your current role does not have permission to create and manage automated trading strategies. 
                To upgrade your access, please submit a request.
              </p>

              {/* Premium Features - Original design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-6 text-center">
                  <Crown className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Premium Features</h3>
                  <p className="text-sm text-slate-400">
                    Create unlimited automated trading strategies
                  </p>
                </div>
                
                <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-6 text-center">
                  <Target className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Smart Trading</h3>
                  <p className="text-sm text-slate-400">
                    Advanced copy trading with AI-powered signals
                  </p>
                </div>
                
                <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Real Analytics</h3>
                  <p className="text-sm text-slate-400">
                    Detailed performance tracking and insights
                  </p>
                </div>
              </div>

              {/* Additional Benefits - Original design */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-6 rounded-lg border border-emerald-500/30 mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-400">Everything You Get</h3>
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Unlimited strategy creation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Real-time trade execution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Advanced risk management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Priority support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">AI-powered trading signals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Advanced analytics dashboard</span>
                  </div>
                </div>
              </div>

              {/* Info - Original */}
              <p className="text-sm text-slate-500 text-center">
                Request approval typically takes 1-3 business days. 
                You'll receive email confirmation once your account is upgraded.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Request Button */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30">
        <Button 
          className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
          onClick={() => setIsUpgradeDialogOpen(true)}
        >
          <Crown className="mr-2 h-4 w-4" />
          Request Upgrade
        </Button>
      </div>

      {/* Upgrade Request Dialog */}
      <UpgradeRequestDialog
        isOpen={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
      />
    </div>
  );
}