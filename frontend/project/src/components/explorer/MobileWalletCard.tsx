import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, BrainCircuit, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';

interface MobileWalletCardProps {
  wallet: any;
  onAnalyze: (address: string) => void;
}

export const MobileWalletCard: React.FC<MobileWalletCardProps> = ({ wallet, onAnalyze }) => {
  const formatLargeCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  const getRiskBadgeStyle = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getPnLColor = (value: number | null | undefined) => {
    if (value == null) return 'text-slate-400';
    return value >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  const formatPnL = (value: number | null | undefined) => {
    if (value == null) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 min-w-[280px] snap-start">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-white text-sm">
              {wallet.name || 'Suggested Wallet'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {truncateAddress(wallet.address)}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={`${getRiskBadgeStyle(wallet.riskLevel)} text-[10px] px-2 py-0.5`}
          >
            {wallet.riskLevel || 'Medium'}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Portfolio Value */}
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <Wallet className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-400">Portfolio</span>
            </div>
            <p className="text-white font-bold text-sm">
              {formatLargeCurrency(wallet.totalValueUsd || 0)}
            </p>
          </div>

          {/* Smart Score */}
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <BrainCircuit className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-400">Score</span>
            </div>
            <p className="text-white font-bold text-sm">
              {wallet.smartScore == null ? '-' : Math.round(wallet.smartScore)}
            </p>
          </div>
        </div>

        {/* PnL Stats */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400">7D PnL</span>
            <span className={`text-xs font-semibold ${getPnLColor(wallet.pnlPercent7d)}`}>
              {formatPnL(wallet.pnlPercent7d)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400">30D PnL</span>
            <span className={`text-xs font-semibold ${getPnLColor(wallet.pnlPercent30d)}`}>
              {formatPnL(wallet.pnlPercent30d)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400">1Y PnL</span>
            <span className={`text-xs font-semibold ${getPnLColor(wallet.pnlPercent365d)}`}>
              {formatPnL(wallet.pnlPercent365d)}
            </span>
          </div>
        </div>

        {/* Analyze Button */}
        <Button 
          size="sm"
          className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
          onClick={() => onAnalyze(wallet.address)}
        >
          <BarChart3 className="w-3 h-3 mr-1" />
          Analyze Wallet
        </Button>
      </CardContent>
    </Card>
  );
};