import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatPercentage, safeNumber, truncateAddress } from '@/lib/utils';
import { Search, ExternalLink, Copy, Star, Shield, Bell, BarChart3, Wallet, BrainCircuit } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { NotificationBell } from '@/components/NotificationBell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSuggestedWallets, getWalletAnalysis } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';

export function ExplorerPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [walletAddress, setWalletAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [performanceData, setPerformanceData] = useState<{ date: string; value: number }[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ winRatePercent: number; totalTrades: number; avgTradeSizeUsd: number } | null>(null);
  const [sortBy, setSortBy] = useState<'consistency' | 'smartScore' | 'pnl1d' | 'pnl7d' | 'pnl30d' | 'pnl180d' | 'pnl365d'>('consistency');
  const [copied, setCopied] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await getSuggestedWallets();
        setSuggested(res.data);
      } catch (e) {
        setSuggested([]);
      } finally {
        setLoadingSuggested(false);
      }
    })();
  }, []);

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) return;
    
    console.log('[ExplorerPage] Starting analysis for:', walletAddress);
    
    // Force clear all previous data
    setPerformanceData([]);
    setTradeHistory([]);
    setSummary(null);
    setExpanded({});
    setHasAnalyzed(false);
    
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setIsAnalyzing(true);
    try {
      console.log('[ExplorerPage] Fetching data from API...');
      const res = await getWalletAnalysis(walletAddress.trim());
      const data = res.data || {};
      
      console.log('[ExplorerPage] API Response:', {
        summary: data.summary,
        chartLength: data.cumulativePnlChart?.length,
        tradeHistoryLength: data.tradeHistory?.length
      });
      
      // Process and set summary with explicit new object
      const newSummary = data.summary ? { ...data.summary } : null;
      setSummary(newSummary);
      
      // Process chart data with validation and new array
      const newChart = Array.isArray(data.cumulativePnlChart) 
        ? [...data.cumulativePnlChart].map((p: any, idx: number) => ({ 
            date: p.date || `Point ${idx}`, 
            value: typeof p.cumulativePnl === 'number' ? p.cumulativePnl : 0 
          })) 
        : [];
      
      console.log('[ExplorerPage] New chart data:', newChart.length, 'points');
      console.log('[ExplorerPage] Chart sample:', newChart.slice(0, 3));
      
      // Force update with new array reference
      setPerformanceData([...newChart]);
      
      // Process trade history with new array
      const newTrades = Array.isArray(data.tradeHistory) 
        ? [...data.tradeHistory] 
        : [];
      
      console.log('[ExplorerPage] New trade history:', newTrades.length, 'trades');
      setTradeHistory([...newTrades]);
      
      setHasAnalyzed(true);
      console.log('[ExplorerPage] Analysis complete');
    } catch (e) {
      console.error('[ExplorerPage] Analysis error:', e);
      setPerformanceData([]);
      setTradeHistory([]);
      setSummary(null);
      setHasAnalyzed(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatShort = (addr: string) => (addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr);

  const handleCopy = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(addr);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  // Format large currency values (e.g., $1.2M, $250.3k)
  const formatLargeCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  };

  // Handle analyze for suggested wallets
  const handleAnalyzeWallet = async (address: string) => {
    setWalletAddress(address);
    await handleAnalyze();
  };

  // Get risk badge variant with enhanced styling
  const getRiskVariant = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get risk badge styling for better visual hierarchy
  const getRiskBadgeStyle = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20';
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20';
    }
  };

  const handleCopyWallet = () => {
    if (!walletAddress) return;
    
    if (user?.role === 'ADMIN') {
      // Navigate to strategies page with pre-filled wallet address
      navigate('/strategies?open=true&wallet=' + encodeURIComponent(walletAddress));
    } else {
      // Navigate to strategies page (will show locked interface)
      navigate('/strategies');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const list = suggested as any[];
    const byKey = (w: any) => {
      switch (sortBy) {
        case 'consistency': return w.consistencyScore ?? -Infinity;
        case 'pnl1d': return w.pnlPercent1d ?? -Infinity;
        case 'pnl7d': return w.pnlPercent7d ?? -Infinity;
        case 'pnl30d': return w.pnlPercent30d ?? -Infinity;
        case 'pnl180d': return w.pnlPercent180d ?? -Infinity;
        case 'pnl365d': return w.pnlPercent365d ?? -Infinity;
        default: return w.smartScore ?? -Infinity;
      }
    };
    return [...list].sort((a, b) => (byKey(b) as number) - (byKey(a) as number));
  }, [suggested, sortBy]);

  // Summary - Use comprehensive PnL from backend
  const totalPnL = safeNumber(summary?.totalPnl ?? 
    (performanceData.length > 0 ? performanceData[performanceData.length - 1]?.value ?? 0 : 0)
  );
  const realizedPnL = safeNumber(summary?.realizedPnl ?? 0);
  const unrealizedPnL = safeNumber(summary?.unrealizedPnl ?? 0);
  
  const winRate = safeNumber(summary?.winRatePercent ?? 0);
  const totalTradesCount = safeNumber(summary?.totalTrades ?? 0);
  const avgTradeSize = safeNumber(summary?.avgTradeSizeUsd ?? 0);
  const openPositions = safeNumber(summary?.openPositions ?? 0);
  
  // Debug logging
  React.useEffect(() => {
    console.log('[ExplorerPage] State updated:', {
      performanceDataLength: performanceData.length,
      totalPnL,
      winRate,
      totalTradesCount,
      avgTradeSize,
      hasAnalyzed
    });
  }, [performanceData, summary, hasAnalyzed]);
  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Wallet Explorer</h1>
        <p className="text-slate-400">Analyze any wallet's trading performance and copy their strategies</p>
      </div>

      {/* Wallet Input */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Input
              placeholder="Enter wallet address (0x...)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="flex-1 h-12 bg-slate-700/50 border-slate-600 focus:border-emerald-400 text-white placeholder:text-slate-400"
            />
            <Button onClick={handleAnalyze} disabled={!walletAddress.trim() || isAnalyzing} className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600">
              {isAnalyzing ? 'Analyzing...' : (<><Search className="w-5 h-5 mr-2" />Analyze</>)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Wallets shown initially (above results) until analyze is clicked) */}
      {!hasAnalyzed && (
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-emerald-400" /> Suggested Wallets
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Sort by</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-48 bg-slate-700/50 border-slate-600">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectItem value="consistency">Consistency (desc)</SelectItem>
                    <SelectItem value="smartScore">Smart Score (desc)</SelectItem>
                    <SelectItem value="pnl1d">1D PnL% (desc)</SelectItem>
                    <SelectItem value="pnl7d">7D PnL% (desc)</SelectItem>
                    <SelectItem value="pnl30d">30D PnL% (desc)</SelectItem>
                    <SelectItem value="pnl180d">6M PnL% (desc)</SelectItem>
                    <SelectItem value="pnl365d">1Y PnL% (desc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingSuggested ? (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-1">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="min-w-[280px] snap-start">
                  <div className="w-16">
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className="flex-grow grid grid-cols-5 gap-4 items-center">
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-5 w-20 ml-auto" />
                      <Skeleton className="h-3 w-16 ml-auto mt-1" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-5 w-16 ml-auto" />
                      <Skeleton className="h-3 w-12 ml-auto mt-1" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-5 w-12 ml-auto" />
                      <Skeleton className="h-3 w-16 ml-auto mt-1" />
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                  <div className="w-10">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No wallets found</h3>
              <p className="text-slate-400 max-w-md">
                We couldn't find any suggested wallets at the moment. Please check back later or try analyzing a specific wallet address.
              </p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-1">
              {filteredAndSorted.map((wallet, index) => (
                <div key={wallet.address || wallet.id || index} className="min-w-[280px] snap-start">
                  {/* Mobile card */}
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{wallet.name || 'Suggested Wallet'}</div>
                          <div className="text-xs text-slate-400 font-mono">{truncateAddress(wallet.address)}</div>
                        </div>
                        <Badge className={`${getRiskBadgeStyle(wallet.riskLevel)} text-[10px] px-2 py-0.5`} variant="outline">{wallet.riskLevel || 'Medium'}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-slate-900/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Wallet className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-400">Portfolio</span>
                          </div>
                          <p className="text-white font-bold text-sm">{formatLargeCurrency(wallet.totalValueUsd || 0)}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 mb-1">
                            <BrainCircuit className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-400">Score</span>
                          </div>
                          <p className="text-white font-bold text-sm">{wallet.smartScore == null ? '-' : Math.round(wallet.smartScore)}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400">7D PnL</span>
                          <span className={`text-xs font-semibold ${Number(wallet.pnlPercent7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{wallet.pnlPercent7d == null ? '-' : `${Number(wallet.pnlPercent7d) >= 0 ? '+' : ''}${Number(wallet.pnlPercent7d).toFixed(2)}%`}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400">30D PnL</span>
                          <span className={`text-xs font-semibold ${Number(wallet.pnlPercent30d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{wallet.pnlPercent30d == null ? '-' : `${Number(wallet.pnlPercent30d) >= 0 ? '+' : ''}${Number(wallet.pnlPercent30d).toFixed(2)}%`}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] text-slate-400">1Y PnL</span>
                          <span className={`text-xs font-semibold ${Number(wallet.pnlPercent365d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{wallet.pnlPercent365d == null ? '-' : `${Number(wallet.pnlPercent365d) >= 0 ? '+' : ''}${Number(wallet.pnlPercent365d).toFixed(2)}%`}</span>
                        </div>
                      </div>
                      <Button size="sm" className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => { setWalletAddress(wallet.address); handleAnalyze(); }}>
                        <BarChart3 className="w-3 h-3 mr-1" /> Analyze Wallet
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                    {/* Wallet Name & Address */}
                    <div className="col-span-2">
                      <div className="text-white font-medium">
                        {wallet.name || 'Unknown Wallet'}
                      </div>
                      <div className="text-slate-400 text-xs font-mono">
                        {truncateAddress(wallet.address)}
                      </div>
                    </div>

                    {/* Total Value */}
                    <div className="text-right">
                      <div className="text-white text-lg font-bold">
                        {formatLargeCurrency(wallet.totalValueUsd || 0)}
                      </div>
                      <div className="text-slate-500 text-xs font-medium flex items-center justify-end">
                        Portfolio Value
                        <Wallet className="h-3 w-3 inline-block ml-1 text-slate-400" />
                      </div>
                    </div>

                    {/* PnL (1W/1M/1Y) - modern badge style */}
                    <div className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${Number(wallet.pnlPercent7d ?? 0) >= 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                          {wallet.pnlPercent7d == null ? '-' : `${Number(wallet.pnlPercent7d) >= 0 ? '+' : ''}${Number(wallet.pnlPercent7d).toFixed(2)}%`} <span className="text-slate-400">· 1W</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${Number(wallet.pnlPercent30d ?? 0) >= 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                          {wallet.pnlPercent30d == null ? '-' : `${Number(wallet.pnlPercent30d) >= 0 ? '+' : ''}${Number(wallet.pnlPercent30d).toFixed(2)}%`} <span className="text-slate-400">· 1M</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${Number(wallet.pnlPercent365d ?? 0) >= 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                          {wallet.pnlPercent365d == null ? '-' : `${Number(wallet.pnlPercent365d) >= 0 ? '+' : ''}${Number(wallet.pnlPercent365d).toFixed(2)}%`} <span className="text-slate-400">· 1Y</span>
                        </span>
                      </div>
                      <div className="text-slate-500 text-xs font-medium mt-1">PnL</div>
                    </div>

                    {/* Smart Score */}
                    <div className="text-right">
                      <div className="text-white text-lg font-bold">
                        {wallet.smartScore == null ? '-' : Math.round(wallet.smartScore)}
                      </div>
                      <div className="text-slate-500 text-xs font-medium flex items-center justify-end">
                        Smart Score
                        <BrainCircuit className="h-3 w-3 inline-block ml-1 text-slate-400" />
                      </div>
                    </div>

                    {/* Risk Level */}
                    <div className="flex justify-end">
                      <Badge 
                        variant="outline" 
                        className={`${getRiskBadgeStyle(wallet.riskLevel)} font-semibold px-3 py-1 text-xs`}
                      >
                        {wallet.riskLevel || 'Medium'}
                      </Badge>
                    </div>
                  </div>

                  {/* Right side - Analyze button that appears on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-4">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setWalletAddress(wallet.address);
                        handleAnalyze();
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Analyze
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {isAnalyzing && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {hasAnalyzed && !isAnalyzing && (
        <>
          {/* Metrics Cards - Show comprehensive PnL breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8" key={`metrics-${walletAddress}-${Date.now()}`}>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50" key={`total-pnl-${totalPnL}`}>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Total PnL (Live)</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold mb-1 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(totalPnL)}
                </div>
                <p className="text-xs text-slate-400">
                  Realized + Unrealized
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50" key={`realized-${realizedPnL}`}>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Realized PnL</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold mb-1 ${realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(realizedPnL)}
                </div>
                <p className="text-xs text-slate-400">From closed positions</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50" key={`unrealized-${unrealizedPnL}`}>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Unrealized PnL</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold mb-1 ${unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(unrealizedPnL)}
                </div>
                <p className="text-xs text-slate-400">{openPositions} open positions</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50" key={`winrate-${winRate}`}>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Win Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{formatPercentage(winRate).replace('+','')}</div>
                <p className="text-xs text-slate-400">{totalTradesCount} closed trades</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50" key={`avgsize-${avgTradeSize}`}>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Avg Trade Size</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{formatCurrency(avgTradeSize)}</div>
                <p className="text-xs text-slate-400">Per transaction</p>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Value Chart */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-white">Portfolio Value (Realized + Unrealized)</CardTitle>
                  <NotificationBell walletAddress={walletAddress} />
                </div>
                <div className="flex items-center gap-3">
                  {walletAddress && (
                    <Button
                      onClick={handleCopyWallet}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  )}
                  {performanceData.length > 0 && (
                    <span className="text-sm text-slate-400">
                      {performanceData[0]?.date} - {performanceData[performanceData.length - 1]?.date}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mb-2">
                  Data points: {performanceData.length} | 
                  Last value: ${performanceData[performanceData.length - 1]?.value?.toFixed(2) || 0} |
                  Last update: {new Date().toLocaleTimeString()}
                </div>
              )}
              <div className="h-80">
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" key={`chart-${walletAddress}-${performanceData.length}-${performanceData[0]?.date}-${performanceData[performanceData.length - 1]?.value}`}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF" 
                        tick={{ fontSize: 12 }} 
                      />
                      <YAxis 
                        stroke="#9CA3AF" 
                        tick={{ fontSize: 12 }} 
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151', 
                          borderRadius: '8px', 
                          color: '#F3F4F6' 
                        }} 
                        formatter={(value) => [formatCurrency(value as number), 'PnL (USD)']} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10B981" 
                        strokeWidth={2} 
                        dot={true} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400">No chart data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Suggested Wallets moved below all analysis blocks */}

          {/* Position Ledger */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Position Ledger</CardTitle>
              <p className="text-sm text-slate-400">Focused view with Open Positions and Trade History</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="open_positions" className="w-full">
                <TabsList className="bg-slate-700/50">
                  <TabsTrigger value="open_positions" className="data-[state=active]:bg-emerald-600">Open Positions</TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-emerald-600">Trade History</TabsTrigger>
                </TabsList>

                <TabsContent value="open_positions" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-400">Asset</TableHead>
                        <TableHead className="text-slate-400">Cost / Unit</TableHead>
                        <TableHead className="text-slate-400">Amount ($)</TableHead>
                        <TableHead className="text-slate-400">Unrealized PnL ($)</TableHead>
                        <TableHead className="text-slate-400">Unrealized PnL (%)</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {(() => {
                        const openRows = (tradeHistory || []).filter((r: any) => {
                          const s = String(r.status || '').toUpperCase();
                          return s === 'OPEN' || s === 'PARTIALLY_CLOSED';
                        });
                        if (openRows.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-slate-400">There are no open positions.</TableCell>
                            </TableRow>
                          );
                        }
                        return openRows.map((row: any, idx: number) => {
                          const status = String(row.status || '').toUpperCase();
                          const rowColor = status === 'PARTIALLY_CLOSED' ? 'bg-yellow-500/10' : '';
                          const id = row.id || `${row.date}-${row.asset}-${idx}`;
                          const isOpen = !!expanded[id];
                          const expandable = status === 'PARTIALLY_CLOSED' && Array.isArray(row.sales) && row.sales.length > 0;
                          return (
                            <React.Fragment key={id}>
                              <TableRow className={`border-slate-700 ${rowColor} ${expandable ? 'cursor-pointer' : ''}`} onClick={() => expandable && toggleExpand(id)}>
                                <TableCell className="text-slate-300">{row.date}</TableCell>
                                <TableCell className="text-slate-300 font-medium">{row.asset}</TableCell>
                                <TableCell className="text-slate-300">{row.costPerUnit != null ? formatCurrency(safeNumber(row.costPerUnit)) : '-'}</TableCell>
                                <TableCell className="text-slate-300">{formatCurrency(Number(safeNumber(row.amountUsd)).toFixed(2) as any)}</TableCell>
                                <TableCell className={`${(row.unrealizedPnlUsd ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {row.unrealizedPnlUsd == null ? '-' : formatCurrency(Number(Number(row.unrealizedPnlUsd).toFixed(2)))}
                      </TableCell>
                                <TableCell className={`${(row.unrealizedPnlPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {row.unrealizedPnlPercent == null ? '-' : `${Number(row.unrealizedPnlPercent).toFixed(2)}%`}
                      </TableCell>
                                <TableCell className="text-slate-300">{status.replace('_',' ')}</TableCell>
                              </TableRow>
                              {isOpen && expandable && (
                                <TableRow className="border-slate-700">
                                  <TableCell colSpan={7}>
                                    <div className="bg-slate-900/50 rounded-md p-3">
                                      <div className="text-slate-400 text-sm mb-2">Sales</div>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-slate-800">
                                            <TableHead className="text-slate-500">Date</TableHead>
                                            <TableHead className="text-slate-500">Amount Sold ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL (%)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {row.sales.map((s: any, i: number) => (
                                            <TableRow key={`${id}-sale-${i}`} className="border-slate-800">
                                              <TableCell className="text-slate-300">{s.date}</TableCell>
                                              <TableCell className="text-slate-300">{formatCurrency(safeNumber(s.amountSoldUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlUsd) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(safeNumber(s.realizedPnlUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.realizedPnlPercent == null ? '-' : formatPercentage(safeNumber(s.realizedPnlPercent))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Close Date</TableHead>
                        <TableHead className="text-slate-400">Asset</TableHead>
                        <TableHead className="text-slate-400">Total Investment ($)</TableHead>
                        <TableHead className="text-slate-400">Realized PnL ($)</TableHead>
                        <TableHead className="text-slate-400">Realized PnL (%)</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const closedRows = (tradeHistory || [])
                          .filter((r: any) => {
                            const s = String(r.status || '').toUpperCase();
                            return s === 'CLOSED_PROFIT' || s === 'CLOSED_LOSS';
                          })
                          .map((r: any) => {
                            const totalRealizedUsd = (Array.isArray(r.sales) ? r.sales : []).reduce((sum: number, s: any) => sum + Number(s.realizedPnlUsd || 0), 0);
                            const cost = Number(r.amountUsd || 0);
                            const totalRealizedPct = cost > 0 ? (totalRealizedUsd / cost) * 100 : 0;
                            const lastSaleDate = (Array.isArray(r.sales) ? r.sales : []).slice().sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))[0]?.date || r.date;
                            return { ...r, totalRealizedUsd, totalRealizedPct, lastSaleDate };
                          })
                          .sort((a: any, b: any) => (b.lastSaleDate || '').localeCompare(a.lastSaleDate || ''));
                        if (closedRows.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-slate-400">No trade history yet.</TableCell>
                            </TableRow>
                          );
                        }
                        return closedRows.map((row: any, idx: number) => {
                          const status = String(row.status || '').toUpperCase();
                          const rowColor = status === 'CLOSED_PROFIT' ? 'bg-emerald-900/50' : status === 'CLOSED_LOSS' ? 'bg-red-900/50' : '';
                          const id = row.id || `${row.lastSaleDate}-${row.asset}-${idx}`;
                          const isOpen = !!expanded[id];
                          const hasSales = Array.isArray(row.sales) && row.sales.length > 0;
                          return (
                            <React.Fragment key={id}>
                              <TableRow className={`border-slate-700 ${rowColor} ${hasSales ? 'cursor-pointer' : ''}`} onClick={() => hasSales && toggleExpand(id)}>
                                <TableCell className="text-slate-300">{row.lastSaleDate}</TableCell>
                                <TableCell className="text-slate-300 font-medium">{row.asset}</TableCell>
                                <TableCell className="text-slate-300">{formatCurrency(Number(safeNumber(row.amountUsd)).toFixed(2) as any)}</TableCell>
                                <TableCell className={`${row.totalRealizedUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(Number(row.totalRealizedUsd.toFixed(2)))}</TableCell>
                                <TableCell className={`${row.totalRealizedPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{`${row.totalRealizedPct.toFixed(2)}%`}</TableCell>
                                <TableCell className="text-slate-300">{status.replace('_',' ')}</TableCell>
                              </TableRow>
                              {isOpen && hasSales && (
                                <TableRow className="border-slate-700">
                                  <TableCell colSpan={6}>
                                    <div className="bg-slate-900/50 rounded-md p-3">
                                      <div className="text-slate-400 text-sm mb-2">Sales</div>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-slate-800">
                                            <TableHead className="text-slate-500">Date</TableHead>
                                            <TableHead className="text-slate-500">Amount Sold ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL (%)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {row.sales.map((s: any, i: number) => (
                                            <TableRow key={`${id}-sale-${i}`} className="border-slate-800">
                                              <TableCell className="text-slate-300">{s.date}</TableCell>
                                              <TableCell className="text-slate-300">{formatCurrency(safeNumber(s.amountSoldUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlUsd) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(safeNumber(s.realizedPnlUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.realizedPnlPercent == null ? '-' : formatPercentage(safeNumber(s.realizedPnlPercent))}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
